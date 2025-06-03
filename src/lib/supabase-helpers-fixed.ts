import { supabase } from './supabase';

/**
 * Launches a quiz by updating its active state
 */
export const launchQuiz = async (quizId: number | string) => {
  try {
    const { error } = await supabase
      .from('quizzes')
      .update({
        active: true,
        launched_at: new Date().toISOString()
      })
      .eq('id', quizId);
    
    if (error) {
      console.error('Error launching quiz:', error);
      return { success: false, error: error.message };
    }
    
    return { success: true, error: null };
  } catch (err: unknown) {
    console.error('Exception in launchQuiz:', err);
    return { 
      success: false, 
      error: err instanceof Error ? err.message : 'Unknown error' 
    };
  }
};

/**
 * Resets participant answers for a specific quiz
 */
export const resetParticipantAnswers = async (quizId: string) => {
  try {
    // First, get all questions for this quiz
    const { data: questions, error: questionsError } = await supabase
      .from('questions')
      .select('id')
      .eq('quiz_id', quizId);
      
    if (questionsError) {
      console.error('Error fetching questions:', questionsError);
      return { success: false, error: questionsError.message };
    }
    
    if (!questions || questions.length === 0) {
      return { success: true, message: 'No questions found for this quiz' };
    }
    
    // Get all question IDs
    const questionIds = questions.map(q => q.id);
    
    // Delete all answers for these questions
    const { error: deleteError } = await supabase
      .from('participant_answers')
      .delete()
      .in('question_id', questionIds);
      
    if (deleteError) {
      console.error('Error deleting participant answers:', deleteError);
      return { success: false, error: deleteError.message };
    }
    
    return { success: true, error: null };
  } catch (err: unknown) {
    console.error('Exception in resetParticipantAnswers:', err);
    return { 
      success: false, 
      error: err instanceof Error ? err.message : 'Unknown error' 
    };
  }
};

/**
 * Updates the active question in a quiz
 */
export const updateActiveQuestionHelper = async (
  quizId: string,
  questionId: string,
  showResults: boolean,
  correctOption?: number,
  stage?: string
) => {
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
};

/**
 * Check if a quiz is launched and/or started
 */
export const checkQuizLaunched = async (quizId: string) => {
  try {
    const { data, error } = await supabase
      .from('quizzes')
      .select('active, quiz_started')
      .eq('id', quizId)
      .single();
    
    if (error) {
      console.error('Error checking quiz status:', error);
      return { launched: false, started: false, error };
    }
    
    return { 
      launched: !!data?.active,
      started: !!data?.quiz_started,
      error: null
    };
  } catch (err) {
    console.error('Exception in checkQuizLaunched:', err);
    return { launched: false, started: false, error: err };
  }
};

/**
 * Start the first question of a quiz
 */
export const startQuizFirstQuestion = async (quizId: string, firstQuestionId: string) => {
  try {
    // Update quiz status
    const { error: quizError } = await supabase
      .from('quizzes')
      .update({
        quiz_started: true,
        active_question_id: firstQuestionId,
        started_at: new Date().toISOString()
      })
      .eq('id', quizId);
    
    if (quizError) {
      return { success: false, error: quizError };
    }
    
    // Set up the active question
    const { error: activeQuestionError } = await supabase
      .from('active_question')
      .upsert({
        quiz_id: quizId,
        question_id: firstQuestionId,
        show_results: false,
        stage: 'question'
      });
    
    return {
      success: !activeQuestionError,
      error: activeQuestionError
    };
  } catch (err) {
    console.error('Exception in startQuizFirstQuestion:', err);
    return { success: false, error: err };
  }
};
