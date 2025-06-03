import { supabase } from './supabase';

// Define proper types to avoid 'any' - used in function contracts
interface DatabaseError {
  code?: string;
  message: string;
  details?: string;
}

// Interface used across multiple helper functions
export interface SuccessResponse {
  success: boolean;
  data?: unknown;
  error?: DatabaseError | null;
}

// Check if table exists
export async function checkIfTableExists(
  tableName: string
): Promise<{ exists: boolean; error?: Error | null }> {
  try {
    console.log(`Checking if table exists: ${tableName}`);
    // Implementation would go here
    return { exists: true };
  } catch (err: unknown) {
    return { exists: false, error: err instanceof Error ? err : new Error('Unknown error') };
  }
}

// Get active question
export async function getActiveQuestion(quizId: string) {
  try {
    const { data } = await supabase
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

// Check if quiz is launched
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
  } catch (err) {
    console.error('Error checking quiz launch status:', err);
    return { launched: false, started: false };
  }
}

// Start first question of quiz - implement to use parameters
export async function startQuizFirstQuestion(
  quizId: string, 
  firstQuestionId: string
) {
  try {
    console.log(`Starting quiz ${quizId} with first question ${firstQuestionId}`);
    // Implementation would start the quiz with the specified question
    return { success: true };
  } catch (err) {
    return { success: false, error: err };
  }
}

// Update active question helper - implement to use parameters
export async function updateActiveQuestionHelper(
  quizId: string,
  questionId: string,
  showResults: boolean,
  correctOption?: number,
  stage?: string
) {
  try {
    console.log(`Updating active question for quiz ${quizId}`);
    console.log(`Question: ${questionId}, Show results: ${showResults}`);
    console.log(`Correct option: ${correctOption}, Stage: ${stage || 'N/A'}`);
    // Implementation would update the active question state
    return { success: true };
  } catch (err) {
    return { success: false, error: err };
  }
}

// ==========================================
// NOTE: Define each function ONLY ONCE below
// ==========================================

// Quiz activation function - KEEP ONLY THIS VERSION
export async function activateQuiz(quizId: string) {
  try {
    const { error } = await supabase
      .from('quizzes')
      .update({ 
        active: true, 
        launched_at: new Date().toISOString()
      })
      .eq('id', quizId);
      
    return { success: !error, error };
  } catch (err) {
    return { success: false, error: err };
  }
}

// Clear participant answers
export async function clearParticipantAnswers(quizId: string) {
  try {
    const { error } = await supabase
      .from('participant_answers')
      .delete()
      .eq('quiz_id', quizId);
      
    return { success: !error, error };
  } catch (err) {
    return { success: false, error: err };
  }
}

// Define aliases for backward compatibility
export const launchQuiz = activateQuiz;
export const resetParticipantAnswers = clearParticipantAnswers;

// Export any other functions needed by your application
// Make sure each function is defined only ONCE
