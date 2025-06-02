import { supabase } from './supabase';

/**
 * Utilitaire pour effectuer une opération Supabase avec plusieurs tentatives
 */
export async function trySupabaseOperation<T>(
  operation: () => Promise<{ data: T | null; error: any }>,
  fallbackOperation?: () => Promise<{ data: T | null; error: any }>,
  options = { retries: 1, logErrors: true }
): Promise<{ data: T | null; error: any }> {
  try {
    // Première tentative
    const result = await operation();
    
    // Si succès, retourner immédiatement
    if (!result.error) {
      return result;
    }
    
    // Si erreur et qu'on a une opération de secours
    if (fallbackOperation) {
      if (options.logErrors) {
        console.warn('First operation failed, trying fallback:', result.error);
      }
      return await fallbackOperation();
    }
    
    // Si erreur et qu'on a des tentatives restantes
    if (options.retries > 0) {
      if (options.logErrors) {
        console.warn(`Operation failed, retrying (${options.retries} attempts left):`, result.error);
      }
      
      // Attendre 500ms avant de réessayer
      await new Promise(resolve => setTimeout(resolve, 500));
      
      return trySupabaseOperation(
        operation,
        undefined,
        { ...options, retries: options.retries - 1 }
      );
    }
    
    // Si toutes les tentatives ont échoué
    return result;
  } catch (e) {
    if (options.logErrors) {
      console.error('Unexpected error in Supabase operation:', e);
    }
    return { data: null, error: e };
  }
}

/**
 * Récupère tous les détails d'un quiz avec ses questions de manière robuste
 */
export async function fetchQuizWithQuestions(quizId: string) {
  console.log('Fetching quiz with questions, ID:', quizId);
  
  try {
    // Essayer d'abord la méthode normale avec la relation explicite
    try {
      console.log('Method 1: Using explicit relationship');
      const { data, error } = await supabase
        .from('quizzes')
        .select('*, questions!questions_quiz_id_fkey(*)')
        .eq('id', quizId)
        .single();
      
      if (error) {
        console.log('Method 1 failed:', error);
        throw error;
      }
      
      console.log('Method 1 succeeded with data');
      return { data, error: null };
    } catch (error) {
      console.log('Trying fallback method...');
      
      // Méthode de secours: deux requêtes distinctes
      const { data: quizData, error: quizError } = await supabase
        .from('quizzes')
        .select('*')
        .eq('id', quizId)
        .single();
      
      if (quizError) {
        console.log('Quiz fetch failed:', quizError);
        throw quizError;
      }
      
      const { data: questionsData, error: questionsError } = await supabase
        .from('questions')
        .select('*')
        .eq('quiz_id', quizId);
      
      if (questionsError) {
        console.log('Questions fetch failed:', questionsError);
        // On peut continuer même si on n'a pas les questions
      }
      
      // Combiner les résultats
      const result = {
        ...quizData,
        questions: questionsData || []
      };
      
      console.log('Fallback method succeeded with data');
      return { data: result, error: null };
    }
  } catch (error) {
    console.error('All fetch methods failed:', error);
    return { data: null, error };
  }
}

/**
 * Check if a quiz is launched and started
 */
export async function checkQuizLaunched(quizId: string) {
  try {
    const { data, error } = await supabase
      .from('quizzes')
      .select('active, quiz_started')
      .eq('id', quizId)
      .single();
    
    if (error) throw error;
    
    return {
      launched: data?.active || false,
      started: data?.quiz_started || false
    };
  } catch (error) {
    console.error('Error checking quiz launch status:', error);
    return { launched: false, started: false };
  }
}

/**
 * Lance un quiz en le marquant comme actif
 */
export async function launchQuiz(quizId: number | string) {
  try {
    // Convertir en chaîne si c'est un nombre
    const id = String(quizId);
    
    // Mettre à jour le quiz pour qu'il soit actif
    const { error } = await supabase
      .from('quizzes')
      .update({
        active: true,
        launched_at: new Date().toISOString()
        // Ne pas utiliser launch_id car il n'existe pas dans le schéma
      })
      .eq('id', id);
      
    if (error) {
      console.error('Error launching quiz:', error);
      return { success: false, error: error.message };
    }
    
    return { success: true };
  } catch (err) {
    console.error('Exception in launchQuiz:', err);
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * Démarre la première question d'un quiz
 */
export async function startQuizFirstQuestion(quizId: string, firstQuestionId: string) {
  try {
    // 1. Mettre à jour la question active dans la table quizzes
    const { error: quizError } = await supabase
      .from('quizzes')
      .update({
        active_question_id: firstQuestionId,
        quiz_started: true,
        started_at: new Date().toISOString()
      })
      .eq('id', quizId);
    
    if (quizError) {
      console.error('Error updating quiz for first question:', quizError);
      throw quizError;
    }
    
    // 2. Supprimer toutes les entrées existantes pour ce quiz dans active_questions
    // Cette étape est importante pour éviter les conflits de clé unique
    try {
      const { error: deleteError } = await supabase
        .from('active_questions')
        .delete()
        .eq('quiz_id', quizId);
      
      if (deleteError) {
        console.warn('Warning: Could not delete existing active questions:', deleteError);
        // Continue malgré cette erreur - nous essaierons de toute façon de faire un upsert
      }
    } catch (deleteErr) {
      console.warn('Exception when trying to delete active questions:', deleteErr);
      // Continue malgré cette erreur
    }
    
    // 3. Ajouter la nouvelle entrée dans active_questions
    const { error: activeQuestionError } = await supabase
      .from('active_questions')
      .insert({
        quiz_id: quizId,
        question_id: firstQuestionId,
        show_results: false,
        correct_option: 0,
        stage: 'question' // Définir l'étape initiale
      });
    
    if (activeQuestionError) {
      console.error('Error creating active question entry:', activeQuestionError);
      throw activeQuestionError;
    }
    
    return { success: true };
  } catch (error) {
    console.error('Error in startQuizFirstQuestion:', error);
    return { success: false, error };
  }
}

/**
 * Réinitialise les réponses des participants pour un quiz
 */
export async function resetParticipantAnswers(quizId: string) {
  try {
    console.log('Resetting participant answers for quiz:', quizId);
    
    if (!quizId) {
      console.error('Invalid quiz ID for resetParticipantAnswers:', quizId);
      return { 
        success: false, 
        error: { message: 'ID de quiz invalide ou manquant' } 
      };
    }
    
    // Supprime toutes les réponses des participants pour ce quiz
    const { error } = await supabase
      .from('participant_answers')
      .delete()
      .eq('quiz_id', quizId);
    
    if (error) {
      console.error('Error deleting participant answers:', error);
      return { success: false, error };
    }
    
    console.log('Successfully reset participant answers for quiz:', quizId);
    return { success: true };
  } catch (error) {
    console.error('Error in resetParticipantAnswers:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error : { message: 'Erreur inconnue' }
    };
  }
}

/**
 * Met à jour la question active pour un quiz avec gestion avancée des erreurs
 */
export async function updateActiveQuestion(
  quizId: string, 
  questionId: string, 
  showResults: boolean, 
  correctOption: number,
  stage: string = 'question' // Nouveau paramètre pour l'étape
) {
  try {
    console.log('Updating active question:', {
      quizId, 
      questionId, 
      showResults, 
      correctOption,
      stage
    });

    // 1. Mettre à jour la question active dans la table quizzes
    const quizUpdate = await supabase
      .from('quizzes')
      .update({
        active_question_id: questionId
      })
      .eq('id', quizId);
    
    if (quizUpdate.error) {
      console.error('Error updating quiz active question:', quizUpdate.error);
    }
    
    // 2. Vérifier s'il existe déjà une entrée active_question
    const { data: existingData, error: checkError } = await supabase
      .from('active_questions')
      .select('*')
      .eq('quiz_id', quizId)
      .eq('question_id', questionId)
      .maybeSingle();
      
    if (checkError) {
      console.error('Error checking existing active question:', checkError);
    }
    
    // 3. Insérer ou mettre à jour l'active_question
    let activeQuestionUpsert;
    
    if (existingData) {
      // Mettre à jour si elle existe
      activeQuestionUpsert = await supabase
        .from('active_questions')
        .update({
          show_results: showResults,
          correct_option: correctOption,
          stage: stage
        })
        .eq('quiz_id', quizId)
        .eq('question_id', questionId);
    } else {
      // Insérer si elle n'existe pas
      activeQuestionUpsert = await supabase
        .from('active_questions')
        .insert({
          quiz_id: quizId,
          question_id: questionId,
          show_results: showResults,
          correct_option: correctOption,
          stage: stage
        });
    }
    
    if (activeQuestionUpsert.error) {
      console.error('Error upserting active question:', activeQuestionUpsert.error);
    }
    
    return {
      quizUpdate,
      activeQuestionUpsert,
      success: !quizUpdate.error && !activeQuestionUpsert.error
    };
  } catch (error) {
    console.error('Error in updateActiveQuestion:', error);
    return {
      quizUpdate: { error },
      activeQuestionUpsert: { error },
      success: false
    };
  }
}
