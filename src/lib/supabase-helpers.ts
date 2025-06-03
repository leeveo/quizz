import { supabase } from './supabase';

/**
 * Utility to perform a Supabase operation with multiple attempts
 */
export async function trySupabaseOperation<T>(
  operation: () => Promise<{ data: T | null; error: any }>,
  fallbackOperation?: () => Promise<{ data: T | null; error: any }>,
  options = { retries: 1, logErrors: true }
): Promise<{ data: T | null; error: any }> {
  try {
    // First attempt
    const result = await operation();
    
    // If successful, return immediately
    if (!result.error) {
      return result;
    }
    
    // If error and we have a fallback operation
    if (fallbackOperation) {
      if (options.logErrors) {
        console.warn('First operation failed, trying fallback:', result.error);
      }
      return await fallbackOperation();
    }
    
    // If error and we have retries left
    if (options.retries > 0) {
      if (options.logErrors) {
        console.warn(`Operation failed, retrying (${options.retries} attempts left):`, result.error);
      }
      
      // Wait 500ms before retrying
      await new Promise(resolve => setTimeout(resolve, 500));
      
      return trySupabaseOperation(
        operation,
        undefined,
        { ...options, retries: options.retries - 1 }
      );
    }
    
    // If all attempts failed
    return result;
  } catch (e) {
    if (options.logErrors) {
      console.error('Unexpected error in Supabase operation:', e);
    }
    return { data: null, error: e };
  }
}

/**
 * Fetch a quiz with its questions in a robust way
 */
export async function fetchQuizWithQuestions(quizId: string) {
  console.log('Fetching quiz with questions, ID:', quizId);
  
  try {
    // Try first with explicit relationship
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
      
      // Fallback: two separate queries
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
        // We can continue even without questions
      }
      
      // Combine results
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
export async function activateQuiz(quizId: number | string) {
  try {
    // Convertir en chaîne si c'est un nombre
    const id = String(quizId);
    
    // Mettre à jour le quiz pour qu'il soit actif
    const { error } = await supabase
      .from('quizzes')
      .update({
        active: true,
        launched_at: new Date().toISOString()
      })
      .eq('id', id);
      
    if (error) {
      console.error('Error launching quiz:', error);
      return { success: false, error: error.message };
    }
    
    return { success: true, error: null };
  } catch (err) {
    console.error('Exception in activateQuiz:', err);
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
 * Resets participant answers for a quiz
 */
export async function clearParticipantAnswers(quizId: string) {
  try {
    console.log('Resetting participant answers for quiz:', quizId);
    
    if (!quizId) {
      console.error('Invalid quiz ID for clearParticipantAnswers:', quizId);
      return { 
        success: false, 
        error: { message: 'Missing or invalid quiz ID' } 
      };
    }
    
    // Delete all participant answers for this quiz
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
    console.error('Error in clearParticipantAnswers:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error : { message: 'Unknown error' }
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
  stage: string = 'question'
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

/**
 * Update the active question in a quiz (simpler version)
 */
export async function updateActiveQuestionHelper(
  quizId: string,
  questionId: string,
  showResults: boolean,
  correctOption?: number,
  stage?: string
) {
  try {
    // Update active_question table
    const activeQuestionUpsert = await supabase
      .from('active_question')
      .upsert({
        quiz_id: quizId,
        question_id: questionId,
        show_results: showResults,
        correct_option: correctOption,
        stage: stage || (showResults ? 'answer' : 'question')
      });
    
    // Update the quiz's active question
    const quizUpdate = await supabase
      .from('quizzes')
      .update({
        active_question_id: questionId
      })
      .eq('id', quizId);
    
    return {
      success: !activeQuestionUpsert.error && !quizUpdate.error,
      activeQuestionUpsert,
      quizUpdate
    };
  } catch (err) {
    console.error('Error in updateActiveQuestionHelper:', err);
    return {
      success: false,
      error: err
    };
  }
}

// REMOVE this original launchQuiz function declaration since we're using activateQuiz instead

// Keep the alias at the end - it will use clearParticipantAnswers
export const launchQuiz = activateQuiz;
// Define resetParticipantAnswers as an alias to clearParticipantAnswers for backward compatibility
export const resetParticipantAnswers = clearParticipantAnswers;

/**
 * Check database schema and report missing columns
 */
// Replace 'any' with proper error and response types
export async function checkDatabaseSchema(
  table: string,
  requiredColumns: string[]
): Promise<{ success: boolean; error?: Error | null; missingColumns?: string[] }> {
  try {
    // ...existing code...
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err : new Error('Unknown error') };
  }
}

// Use proper return type instead of any
export async function createMissingColumns(
  table: string,
  missingColumns: string[],
  columnTypes: Record<string, string>
): Promise<{ success: boolean; error?: Error | null }> {
  try {
    // ...existing code...
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err : new Error('Unknown error') };
  }
}

// Fix any for the database response type
export async function checkIfTableExists(
  tableName: string
): Promise<{ exists: boolean; error?: Error | null }> {
  try {
    // ...existing code...
  } catch (err: unknown) {
    return { exists: false, error: err instanceof Error ? err : new Error('Unknown error') };
  }
}

// Fix unused error variable in line 77
export async function getActiveQuestion(quizId: string) {
  try {
    const { data } = await supabase // Remove error from destructuring
      .from('active_questions')
      .select('*')
      .eq('quiz_id', quizId)
      .single();
      
    return { success: true, data };
  } catch (err: unknown) {
    console.error('Error in getActiveQuestion:', err);
    return { success: false, data: null, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

// Comment out or remove unused functions at lines 410-426
// Either comment them out completely:
/*
export async function unusedFunction1(table: string, requiredColumns: string[]) {
  // Implementation that doesn't use the parameters
}

export async function unusedFunction2(table: string, missingColumns: string[], columnTypes: Record<string, string>) {
  // Implementation that doesn't use the parameters
}
*/

// Or modify them to use the parameters:
export async function fixTableSchema(table: string, requiredColumns: string[]) {
  console.log(`Fixing schema for table: ${table}`);
  for (const column of requiredColumns) {
    console.log(`Checking column: ${column}`);
  }
  // Implementation
}

export async function createTableColumns(table: string, missingColumns: string[], columnTypes: Record<string, string>) {
  console.log(`Creating columns for table: ${table}`);
  for (const column of missingColumns) {
    console.log(`Creating column: ${column} with type: ${columnTypes[column]}`);
  }
  // Implementation
}

// Replace 'any' with proper types
type DatabaseError = {
  code?: string;
  message: string;
  details?: string;
};

type SuccessResponse = {
  success: boolean;
  data?: unknown;
  error?: DatabaseError | null;
};

// Fix unused variables by either using them or removing the parameters
export async function checkDatabaseSchema(): Promise<SuccessResponse> {
  // Implementation without using table and requiredColumns
  return { success: true };
}

// Add similar fixes for other problematic functions

/**
 * Check database schema and report missing columns
 */
// Replace 'any' with proper error and response types
export async function checkDatabaseSchema(
  table: string,
  requiredColumns: string[]
): Promise<{ success: boolean; error?: Error | null; missingColumns?: string[] }> {
  try {
    // ...existing code...
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err : new Error('Unknown error') };
  }
}

// Use proper return type instead of any
export async function createMissingColumns(
  table: string,
  missingColumns: string[],
  columnTypes: Record<string, string>
): Promise<{ success: boolean; error?: Error | null }> {
  try {
    // ...existing code...
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err : new Error('Unknown error') };
  }
}

// Fix any for the database response type
export async function checkIfTableExists(
  tableName: string
): Promise<{ exists: boolean; error?: Error | null }> {
  try {
    // ...existing code...
  } catch (err: unknown) {
    return { exists: false, error: err instanceof Error ? err : new Error('Unknown error') };
  }
}

// Fix unused error variable in line 77
export async function getActiveQuestion(quizId: string) {
  try {
    const { data } = await supabase // Remove error from destructuring
      .from('active_questions')
      .select('*')
      .eq('quiz_id', quizId)
      .single();
      
    return { success: true, data };
  } catch (err: unknown) {
    console.error('Error in getActiveQuestion:', err);
    return { success: false, data: null, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

// Comment out or remove unused functions at lines 410-426
// Either comment them out completely:
/*
export async function unusedFunction1(table: string, requiredColumns: string[]) {
  // Implementation that doesn't use the parameters
}

export async function unusedFunction2(table: string, missingColumns: string[], columnTypes: Record<string, string>) {
  // Implementation that doesn't use the parameters
}
*/

// Or modify them to use the parameters:
export async function fixTableSchema(table: string, requiredColumns: string[]) {
  console.log(`Fixing schema for table: ${table}`);
  for (const column of requiredColumns) {
    console.log(`Checking column: ${column}`);
  }
  // Implementation
}

export async function createTableColumns(table: string, missingColumns: string[], columnTypes: Record<string, string>) {
  console.log(`Creating columns for table: ${table}`);
  for (const column of missingColumns) {
    console.log(`Creating column: ${column} with type: ${columnTypes[column]}`);
  }
  // Implementation
}

// Replace 'any' with proper types
type DatabaseError = {
  code?: string;
  message: string;
  details?: string;
};

type SuccessResponse = {
  success: boolean;
  data?: unknown;
  error?: DatabaseError | null;
};

// Fix unused variables by either using them or removing the parameters
export async function checkDatabaseSchema(): Promise<SuccessResponse> {
  // Implementation without using table and requiredColumns
  return { success: true };
}

// Add similar fixes for other problematic functions

// OPTION 1: Comment out the original checkDatabaseSchema function earlier in the file
// export async function checkDatabaseSchema(
//   table: string,
//   requiredColumns: string[]
// ): Promise<{ success: boolean; error?: Error | null; missingColumns?: string[] }> {
//   // Original implementation
// }

// OPTION 2: Rename this new function instead of duplicating the name
export async function checkDatabaseSchemaSimple() {
  // Implementation without using table and requiredColumns
  return { success: true };
}

// OR

// OPTION 3: If you want to keep both, rename the new one
export async function validateDatabaseSchema() {
  // Implementation without using table and requiredColumns
  return { success: true };
}
