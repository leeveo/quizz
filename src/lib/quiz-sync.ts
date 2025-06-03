import { supabase } from './supabase';
import { create } from 'zustand';

// Types
export type ActiveQuestion = {
  quiz_id: string;
  question_id: string;
  show_results: boolean;
  correct_option: number;
};

export type QuizState = {
  activeQuestion: ActiveQuestion | null;
  isLoading: boolean;
  error: string | null;
  
  // Méthodes
  subscribeToQuizChanges: (quizId: string) => void;
  unsubscribeFromQuizChanges: () => void;
  fetchActiveQuestion: (quizId: string) => Promise<void>;
};

// Store Zustand pour gérer l'état global du quiz
export const useQuizStore = create<QuizState>((set, get) => ({
  activeQuestion: null,
  isLoading: false,
  error: null,
  
  // S'abonner aux changements en temps réel du quiz
  subscribeToQuizChanges: (quizId: string) => {
    // D'abord, récupérer l'état actuel
    get().fetchActiveQuestion(quizId);
    
    // S'abonner aux modifications de la table quizzes
    const quizChannel = supabase
      .channel('quiz-changes')
      .on(
        'postgres_changes',
        { 
          event: 'UPDATE',
          schema: 'public',
          table: 'quizzes',
          filter: `id=eq.${quizId}`
        },
        async (payload) => {
          console.log('Quiz updated:', payload);
          // Si active_question_id a changé, récupérer les détails
          if (payload.new && payload.new.active_question_id) {
            await get().fetchActiveQuestion(quizId);
          }
        }
      )
      .subscribe();
    
    // S'abonner aux modifications de la table active_questions
    const activeQuestionsChannel = supabase
      .channel('active-question-changes')
      .on(
        'postgres_changes',
        {
          event: '*', // INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'active_questions',
          filter: `quiz_id=eq.${quizId}`
        },
        async () => {
          console.log('Active question changed');
          await get().fetchActiveQuestion(quizId);
        }
      )
      .subscribe();
    
    return () => {
      supabase.removeChannel(quizChannel);
      supabase.removeChannel(activeQuestionsChannel);
    };
  },
  
  // Se désabonner des changements
  unsubscribeFromQuizChanges: () => {
    // La logique de désabonnement est gérée dans le retour de subscribeToQuizChanges
  },
  
  // Récupérer la question active pour un quiz
  fetchActiveQuestion: async (quizId: string) => {
    set({ isLoading: true, error: null });
    
    try {
      // 1. Récupérer l'ID de la question active depuis le quiz
      const { data: quizData, error: quizError } = await supabase
        .from('quizzes')
        .select('active_question_id')
        .eq('id', quizId)
        .single();
      
      if (quizError) throw quizError;
      
      // Si aucune question n'est active, réinitialiser l'état
      if (!quizData.active_question_id) {
        set({ activeQuestion: null, isLoading: false });
        return;
      }
      
      // 2. Récupérer les détails de la question active
      const { data: activeQuestionData, error: activeQuestionError } = await supabase
        .from('active_questions')
        .select('*')
        .eq('quiz_id', quizId)
        .eq('question_id', quizData.active_question_id)
        .single();
      
      if (activeQuestionError && activeQuestionError.code !== 'PGRST116') { // PGRST116 = no rows returned
        throw activeQuestionError;
      }
      
      set({ 
        activeQuestion: activeQuestionData || null, 
        isLoading: false 
      });
    } catch (error: unknown) {
      console.error('Error fetching active question:', error);
      set({ 
        error: error instanceof Error ? error.message : 'Une erreur est survenue', 
        isLoading: false 
      });
    }
  }
}));
