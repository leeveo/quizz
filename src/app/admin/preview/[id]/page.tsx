'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { FiChevronLeft, FiPlay, FiPause, FiHome, FiUsers, FiMaximize, FiMinimize } from 'react-icons/fi'
import Image from 'next/image'
import QRCode from 'react-qr-code'
import { checkQuizLaunched, startQuizFirstQuestion, updateActiveQuestionHelper } from '@/lib/quiz-helpers'

// Types for participants and responses
type Participant = {
  id: string
  name: string
  avatar_emoji?: string
  avatar?: string
  connected_at: string
  quiz_id?: string
}

type QuestionResponse = {
  option_index: number
  count: number
}

// Nouveau type pour les réponses détaillées par participant
type ParticipantResponse = {
  participant_id: string
  participant_name: string
  avatar_emoji: string
  selected_option: number
  answered_at: string
}

// Types for quiz status
type QuizStage = 'question' | 'answer' | 'results' | 'next';

// Define Quiz type
type Quiz = {
  id: string | number;
  title: string;
  theme: string;
  event_name: string;
  event_date: string;
  primary_color?: string;
  active?: boolean;
  quiz_started?: boolean;
  questions?: Question[];
}

// Define Question type
type Question = {
  id: string;
  title: string;
  options: string[];
  correct: number;
  image_url?: string;
  order_index?: number;
}

export default function QuizPreviewPage() {
  const params = useParams();
  const router = useRouter();

  // Improved ID parsing
  const rawId = params.id;
  const quizId = typeof rawId === 'string' ? rawId : Array.isArray(rawId) ? rawId[0] : null;
  
  console.log('📦 Raw params:', params);
  console.log('📦 Parsed ID:', quizId);

  // State declarations
  const [quiz, setQuiz] = useState<Quiz | null>(null)
  const [questions, setQuestions] = useState<Question[]>([])
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [showControls, setShowControls] = useState(true)
  const [quizLaunched, setQuizLaunched] = useState(false)
  const [quizStarted, setQuizStarted] = useState(false)
  const [participants, setParticipants] = useState<Participant[]>([])
  const [showingResults, setShowingResults] = useState(false)
  const [responses, setResponses] = useState<QuestionResponse[]>([])
  const [participantResponses, setParticipantResponses] = useState<ParticipantResponse[]>([])
  // This variable is commented but kept for reference as it's used conditionally
  /* eslint-disable-next-line @typescript-eslint/no-unused-vars */
  const [showDetailedResponses, setShowDetailedResponses] = useState(false)
  const [joinUrl, setJoinUrl] = useState('')
  const [quizStage, setQuizStage] = useState<QuizStage>('question');
  const [stageTimeRemaining, setStageTimeRemaining] = useState(8);
  // Keep for future implementation
  const [autoAdvanceEnabled] = useState(false);
  // Ajouter une nouvelle variable d'état pour suivre le mode auto complet
  const [fullAutoMode, setFullAutoMode] = useState(false);
  // Add fullscreen state
  const [isFullscreen, setIsFullscreen] = useState(false);
  // Add viewMode state at the top level with other states
  const [viewMode, setViewMode] = useState<'grid' | 'cloud'>('grid');
  
  // Fixed toggleFullscreen function using proper types
  const toggleFullscreen = () => {
    const newFullscreenState = !isFullscreen;
    setIsFullscreen(newFullscreenState);
    
    if (newFullscreenState) {
      // Enter fullscreen mode
      try {
        // Use a more specific class that won't affect the whole site
        document.documentElement.classList.add('quiz-fullscreen-active');
        
        const appElement = document.getElementById('quiz-preview-container');
        if (appElement) {
          appElement.classList.add('fullscreen-mode');
          
          // Set background directly on the container
          appElement.style.backgroundImage = 'linear-gradient(to bottom right, #4f46e5, #9333ea)';
          appElement.style.position = 'fixed';
          appElement.style.top = '0';
          appElement.style.left = '0';
          appElement.style.right = '0';
          appElement.style.bottom = '0';
          appElement.style.width = '100vw';
          appElement.style.height = '100vh';
          appElement.style.zIndex = '9999';
        }
        
        // Then try to use the browser's fullscreen API as a backup
        if (document.documentElement.requestFullscreen) {
          document.documentElement.requestFullscreen();
        } else if ((document.documentElement as HTMLElement).mozRequestFullScreen) {
          (document.documentElement as HTMLElement).mozRequestFullScreen();
        } else if ((document.documentElement as HTMLElement).webkitRequestFullscreen) {
          (document.documentElement as HTMLElement).webkitRequestFullscreen();
        } else if ((document.documentElement as HTMLElement).msRequestFullscreen) {
          (document.documentElement as HTMLElement).msRequestFullscreen();
        }
      } catch (err) {
        console.error("Error entering fullscreen:", err);
      }
    } else {
      // Exit fullscreen mode
      try {
        // Remove our specific class
        document.documentElement.classList.remove('quiz-fullscreen-active');
        
        const appElement = document.getElementById('quiz-preview-container');
        if (appElement) {
          appElement.classList.remove('fullscreen-mode');
          
          // Clear the direct styling
          appElement.style.backgroundImage = '';
          appElement.style.position = '';
          appElement.style.top = '';
          appElement.style.left = '';
          appElement.style.right = '';
          appElement.style.bottom = '';
          appElement.style.width = '';
          appElement.style.height = '';
          appElement.style.zIndex = '';
        }
        
        // Exit browser's fullscreen mode
        if (document.exitFullscreen) {
          document.exitFullscreen();
        } else if ((document as Document).mozCancelFullScreen) {
          (document as Document).mozCancelFullScreen();
        } else if ((document as Document).webkitExitFullscreen) {
          (document as Document).webkitExitFullscreen();
        } else if ((document as Document).msExitFullscreen) {
          (document as Document).msExitFullscreen();
        }
      } catch (err) {
        console.error("Error exiting fullscreen:", err);
      }
    }
  };
  
  // Replace the gradient generator function with a simpler version that doesn't use primary color
  const getGradientStyle = () => {
    return {
      background: 'linear-gradient(to bottom right, #4f46e5, #9333ea)'
    };
  };

  // Fetch quiz data with improved error handling
  useEffect(() => {
    const fetchQuizData = async () => {
      setLoading(true);
      try {
        console.log('🔄 Fetching quiz for preview, ID:', quizId);
        
        // Improved validation - check both UUID and numeric formats
        const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        
        if (!quizId) {
          throw new Error('ID de quiz manquant');
        }
        
        if (isNaN(Number(quizId)) && !uuidPattern.test(quizId)) {
          console.error('❌ Invalid quiz ID format:', quizId);
          throw new Error('Format d\'ID non reconnu');
        }
        
        // Vérifier si le quiz a été lancé
        const { launched, started } = await checkQuizLaunched(quizId);
        setQuizLaunched(launched);
        setQuizStarted(started);
        
        // Log connection details for debugging
        console.log('Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
        console.log('Supabase Key exists:', !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
        
        let data = null;
        
        // Method 1: Try with Supabase client - FIXED QUERY with explicit relationship
        try {
          console.log('Attempting to fetch with Supabase client...');
          const result = await supabase
            .from('quizzes')
            .select('*, questions!questions_quiz_id_fkey(*)')
            .eq('id', quizId)
            .single();
            
          if (result.data && !result.error) {
            console.log('✅ Quiz fetched successfully with Supabase client');
            data = result.data;
          } else {
            console.error('❌ Supabase client error:', result.error);
            throw result.error;
          }
        } catch (supabaseError) {
          console.error('Supabase client fetch failed, trying alternatives...', supabaseError);
          
          // Method 2: Try with REST API (improved version)
          try {
            // Make sure URL is properly constructed
            const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
            const apiUrl = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
            
            // Properly encode the URL components with explicit relationship
            const endpoint = `${apiUrl}rest/v1/quizzes?id=eq.${encodeURIComponent(quizId)}&select=*,questions!questions_quiz_id_fkey(*)`;
            console.log('REST API endpoint:', endpoint);
            
            const response = await fetch(endpoint, {
              method: 'GET',
              headers: {
                'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
                'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json',
              },
            });
            
            console.log('REST API response status:', response.status);
            
            if (!response.ok) {
              const responseText = await response.text();
              console.error('Response text for error:', responseText);
              throw new Error(`Fetch failed: ${response.status} ${response.statusText} - ${responseText}`);
            }
            
            const jsonData = await response.json();
            console.log('REST API response data:', jsonData);
            
            if (!Array.isArray(jsonData) || jsonData.length === 0) {
              throw new Error('Quiz introuvable dans la réponse API');
            }
            
            data = jsonData[0];
            console.log('✅ Quiz fetched via REST API');
          } catch (restError) {
            console.error('❌ REST API error:', restError);
            
            // Method 3: Last resort - try separate endpoints
            console.log('Trying last resort approach with separate endpoints...');
            
            const quizResponse = await fetch(
              `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/quizzes?id=eq.${quizId}`,
              {
                headers: {
                  'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
                  'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''}`,
                }
              }
            );
            
            if (!quizResponse.ok) {
              throw new Error(`Last resort fetch failed: ${quizResponse.status}`);
            }
            
            const quizData = await quizResponse.json();
            
            if (!Array.isArray(quizData) || quizData.length === 0) {
              throw new Error('Quiz introuvable même avec la méthode de dernier recours');
            }
            
            data = quizData[0];
            
            // Get questions in a separate call
            const questionsResponse = await fetch(
              `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/questions?quiz_id=eq.${quizId}`,
              {
                headers: {
                  'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
                  'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''}`,
                }
              }
            );
            
            if (questionsResponse.ok) {
              const questionsData = await questionsResponse.json();
              data.questions = questionsData;
            } else {
              data.questions = [];
            }
            
            console.log('✅ Quiz fetched via last resort method');
          }
        }
        
        if (!data) {
          throw new Error('Impossible de récupérer les données du quiz après plusieurs tentatives');
        }

        console.log('✅ Final quiz data:', data);
        setQuiz(data as Quiz);
        
        // Sort questions
        const sortedQuestions = [...(data.questions || [])];
        if (sortedQuestions.length > 0 && 'order_index' in sortedQuestions[0]) {
          sortedQuestions.sort((a, b) => a.order_index - b.order_index);
        }
        setQuestions(sortedQuestions as Question[]);
        
        // Set join URL for QR code
        const baseUrl = window.location.origin;
        setJoinUrl(`${baseUrl}/join/${quizId}`);
        
        // Mise à jour de l'état en fonction du quiz
        if (data.active) {
          setQuizLaunched(true);
          fetchParticipants();
        }
        
        if (data.quiz_started) {
          setQuizStarted(true);
        }
        
      } catch (err: unknown) {
        console.error('❌ Overall error fetching quiz:', err);
        setError(err instanceof Error ? err.message : 'Une erreur inconnue est survenue');
      } finally {
        setLoading(false);
      }
    };

    if (quizId) {
      fetchQuizData();
      
      // Mettre en place une vérification périodique de l'état du quiz
      const intervalId = setInterval(async () => {
        if (!quizId) return;
        const { launched, started } = await checkQuizLaunched(quizId);
        setQuizLaunched(launched);
        setQuizStarted(started);
      }, 5000); // Vérifier toutes les 5 secondes
      
      return () => clearInterval(intervalId);
    }
  }, [quizId, router, fetchParticipants]) // Add fetchParticipants to dependency array
  
  // Subscribe to participants joining
  useEffect(() => {
    if (!quizId) return
    
    const participantsChannel = supabase
      .channel('participants-channel')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'participants',
          filter: `quiz_id=eq.${quizId}`,
        },
        (payload) => {
          console.log('New participant:', payload)
          setParticipants(prev => [...prev, payload.new as Participant])
        }
      )
      .subscribe()
      
    return () => {
      supabase.removeChannel(participantsChannel)
    }
  }, [quizId])
  
  // Add fetchParticipants to dependency array in this useEffect
  useEffect(() => {
    if (data.active) {
      setQuizLaunched(true);
      fetchParticipants();
    }
    
    if (data.quiz_started) {
      setQuizStarted(true);
    }
  }, [quizId, fetchParticipants]); // Add fetchParticipants here

  // Subscribe to participant answers
  useEffect(() => {
    if (!quizId || !quizStarted || questions.length === 0) return
    
    const answersChannel = supabase
      .channel('answers-channel')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'participant_answers',
          filter: `question_id=eq.${questions[currentQuestionIndex].id}`,
        },
        () => {
          // Refresh response counts when new answers come in
          fetchResponses(questions[currentQuestionIndex].id)
          // Aussi récupérer les réponses détaillées
          fetchParticipantResponses(questions[currentQuestionIndex].id)
        }
      )
      .subscribe()
      
    return () => {
      supabase.removeChannel(answersChannel)
    }
  }, [quizId, quizStarted, questions, currentQuestionIndex, fetchResponses, fetchParticipantResponses])

  // Fetch participants with improved error handling - wrap in useCallback to use in dependency array
  const fetchParticipants = useCallback(async () => {
    try {
      console.log('Fetching participants for quiz ID:', quizId);
      
      // First try with minimal set of fields that should always exist
      try {
        const { data, error } = await supabase
          .from('participants')
          .select('id, name, connected_at')
          .eq('quiz_id', quizId);
        
        if (error) {
          // If column error, throw to trigger fallback
          if (error.code === '42703') {
            throw new Error('Column error - trying alternative approach');
          }
          console.error('Error fetching participants:', error);
          return;
        }
        
        console.log('Participants data received:', data);
        
        // Process participants to ensure avatar_emoji exists
        const processedData = data?.map((p: Participant) => ({
          ...p,
          avatar_emoji: p.avatar_emoji || p.avatar || '👤' // Use fallbacks if needed
        })) || [];
        
        setParticipants(processedData);
      } catch (err) {
        console.warn('First participant fetch approach failed, trying fallback...', err);
        
        // Try alternative approach using REST API instead of client
        try {
          console.log('Using direct REST API approach for participants');
          const apiUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/participants`;
          console.log('Participants endpoint:', apiUrl);
          
          const response = await fetch(apiUrl, {
            method: 'GET',
            headers: {
              'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
              'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''}`,
              'Content-Type': 'application/json',
            }
          });
          
          if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Fallback fetch failed: ${response.status} - ${errorText}`);
          }
          
          const allParticipants = await response.json();
          console.log('All participants fetched via REST:', allParticipants?.length || 0);
          
          // Filter locally for the current quiz if needed
          // or just use all participants as a last resort
          let relevantParticipants = allParticipants;
          if (quizId && allParticipants.some((p: Participant) => p.quiz_id)) {
            relevantParticipants = allParticipants.filter((p: Participant) => p.quiz_id === quizId);
          }
          
          // Process participants to ensure avatar_emoji exists
          const processedData = relevantParticipants?.map((p: Participant) => ({
            ...p,
            avatar_emoji: p.avatar_emoji || p.avatar || '👤' // Use fallbacks if needed
          })) || [];
          
          setParticipants(processedData);
        } catch (finalErr) {
          console.error('All participant fetch approaches failed:', finalErr);
          // Set empty array as fallback to prevent UI issues
          setParticipants([]);
        }
      }
    } catch (err) {
      console.error('Error in fetchParticipants:', err);
      // Set empty array as fallback
      setParticipants([]);
    }
  }, [quizId]); // Add quizId dependency

  // Fonction pour récupérer les réponses détaillées par participant - with improved error handling
  const fetchParticipantResponses = useCallback(async (questionId: string) => {
    try {
      // First attempt - try with ideal query
      try {
        const { data, error } = await supabase
          .from('participant_answers')
          .select(`
            id,
            participant_id,
            selected_option,
            answered_at,
            participants(id, name, avatar_emoji)
          `)
          .eq('question_id', questionId);
        
        if (error) throw error;
        
        // Process responses even if participants data is missing
        const formattedResponses: ParticipantResponse[] = data.map(item => ({
          participant_id: item.participant_id,
          participant_name: item.participants ? 
            (Array.isArray(item.participants) 
              ? (item.participants[0]?.name ?? 'Anonyme') 
              : ((item.participants as { name?: string })?.name ?? 'Anonyme')) 
            : 'Anonyme',
          avatar_emoji: item.participants ? 
            (Array.isArray(item.participants) 
              ? (item.participants[0]?.avatar_emoji ?? '👤') 
              : ((item.participants as { avatar_emoji?: string })?.avatar_emoji ?? '👤')) 
            : '👤',
          selected_option: item.selected_option,
          answered_at: item.answered_at
        }));
        
        setParticipantResponses(formattedResponses);
        return; // Exit if successful
      } catch (err) {
        console.warn('First attempt to fetch participant responses failed, trying fallback', err);
      }
      
      // Fallback - get answers without join
      const { data: answerData, error: answerError } = await supabase
        .from('participant_answers')
        .select('id, participant_id, selected_option, answered_at')
        .eq('question_id', questionId);
      
      if (answerError) throw answerError;
      
      // Get participant data separately
      const participantIds = answerData.map(a => a.participant_id);
      if (participantIds.length === 0) {
        setParticipantResponses([]);
        return;
      }
      
      const { data: participantData } = await supabase
        .from('participants')
        .select('id, name, avatar_emoji')
        .in('id', participantIds);
      
      // Map participant data to answers
      const participantMap = (participantData || []).reduce((map, p) => {
        map[p.id] = p;
        return map;
      }, {} as Record<string, { id: string; name: string; avatar_emoji?: string; }>);
      
      const formattedResponses: ParticipantResponse[] = answerData.map(item => {
        const participant = participantMap[item.participant_id] || {};
        return {
          participant_id: item.participant_id,
          participant_name: participant.name || 'Anonyme',
          avatar_emoji: participant.avatar_emoji || '👤',
          selected_option: item.selected_option,
          answered_at: item.answered_at
        };
      });
      
      setParticipantResponses(formattedResponses);
    } catch (err) {
      console.error('Error fetching participant responses:', err);
      // Don't crash - set empty array
      setParticipantResponses([]);
    }
  }, []);

  // Fetch response counts for current question - with improved handling for empty responses
  const fetchResponses = useCallback(async (questionId: string) => {
    try {
      const { data, error } = await supabase
        .from('participant_answers')
        .select('selected_option, question_id')
        .eq('question_id', questionId);
        
      if (error) throw error;
      
      // Handle empty data
      if (!data || data.length === 0) {
        setResponses([]);
        return;
      }
      
      // Count responses by option
      const counts: Record<number, number> = {};
      for (const response of data) {
        // Ensure selected_option is a number and valid
        const option = typeof response.selected_option === 'number' ? response.selected_option : 0;
        counts[option] = (counts[option] || 0) + 1;
      }
      
      // Convert to array
      const responseCounts = Object.entries(counts).map(([option, count]) => ({
        option_index: parseInt(option),
        count
      }));
      
      setResponses(responseCounts);
    } catch (err) {
      console.error('Error fetching responses:', err);
      // Don't crash - set empty array
      setResponses([]);
    }
  }, []);

  // Wrap advanceToNextStage in useCallback to fix dependency warning
  const advanceToNextStage = useCallback(() => {
    if (quizStage === 'question') {
      // Passer à l'affichage des réponses
      setQuizStage('answer');
      setStageTimeRemaining(getStageTime('answer'));
      
      // Mettre à jour la base de données pour montrer les réponses
      if (questions[currentQuestionIndex]) {
        updateActiveQuestionStage(questions[currentQuestionIndex].id, 'answer');
      }
      
    } else if (quizStage === 'answer') {
      // Passer à l'affichage des résultats par participant
      setQuizStage('results');
      setStageTimeRemaining(getStageTime('results'));
      setShowDetailedResponses(true);
      
      // Mettre à jour la base de données
      if (questions[currentQuestionIndex]) {
        updateActiveQuestionStage(questions[currentQuestionIndex].id, 'results');
      }
      
      // Récupérer les réponses détaillées par participant
      if (questions[currentQuestionIndex]) {
        fetchParticipantResponses(questions[currentQuestionIndex].id);
      }
      
    } else if (quizStage === 'results') {
      // Passer à la question suivante
      setQuizStage('next');
      
      // Après un court délai, passer à la question suivante
      setTimeout(() => {
        goToNextQuestion();
        // Réinitialiser l'état pour la nouvelle question, mais garder isPlaying actif en mode auto
        setQuizStage('question');
        setStageTimeRemaining(getStageTime('question'));
        setShowDetailedResponses(false);
      }, 500);
      
    } else if (quizStage === 'next') {
      // Si on est déjà à l'étape "next", on passe directement à la question suivante
      goToNextQuestion();
      setQuizStage('question');
      setStageTimeRemaining(getStageTime('question'));
      setShowDetailedResponses(false);
    }
  }, [quizStage, currentQuestionIndex, questions, goToNextQuestion, fetchParticipantResponses, updateActiveQuestionStage, getStageTime]); // Add getStageTime to dependency array

  // Handle automatic question changes when playing
  useEffect(() => {
    let timer: NodeJS.Timeout

    if (isPlaying && questions.length > 0 && quizStarted) {
      timer = setInterval(() => {
        setStageTimeRemaining(prev => {
          if (prev <= 1) {
            // Passage automatique à l'étape suivante
            advanceToNextStage();
            return getStageTime(quizStage === 'question' ? 'answer' : 
                              quizStage === 'answer' ? 'results' : 
                              quizStage === 'results' ? 'next' : 'question');
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => clearInterval(timer);
  }, [isPlaying, questions.length, quizStarted, quizStage, advanceToNextStage, getStageTime]);

  // Wrap getStageTime in useCallback
  const getStageTime = useCallback((stage: QuizStage): number => {
    switch (stage) {
      case 'question': return 8; // 8 secondes pour répondre
      case 'answer': return 5;   // 5 secondes pour voir la réponse
      case 'results': return 5;  // 5 secondes pour voir les résultats par participant
      case 'next': return 0;     // 0 seconde pour passer à la question suivante
      default: return 8;
    }
  }, []);

  // Modification de la fonction togglePlay pour gérer le mode automatique complet
  const togglePlay = () => {
    if (isPlaying) {
      // Si on est en train de jouer, on met en pause
      setIsPlaying(false);
      setFullAutoMode(false);
    } else {
      // Si on est en pause, on reprend le jeu
      setIsPlaying(true);
      // Réinitialiser le timer si nécessaire
      if (stageTimeRemaining <= 0) {
        setStageTimeRemaining(getStageTime(quizStage));
      }
    }
  };
  
  // Nouvelle fonction pour activer/désactiver le mode automatique complet
  const toggleFullAutoMode = () => {
    const newAutoMode = !fullAutoMode;
    setFullAutoMode(newAutoMode);
    
    // Si on active le mode auto, activer aussi isPlaying
    if (newAutoMode) {
      setIsPlaying(true);
      // Réinitialiser le timer si nécessaire
      if (stageTimeRemaining <= 0) {
        setStageTimeRemaining(getStageTime(quizStage));
      }
    }
  };

  // This function is unused but kept for future reference
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const showResults = () => {
    setIsPlaying(false);
    setQuizStage('answer');
    setStageTimeRemaining(getStageTime('answer'));
    
    if (quizStarted) {
      // Update database to show results
      updateActiveQuestionStage(questions[currentQuestionIndex].id, 'answer');
      
      // Récupérer les réponses détaillées par participant
      fetchParticipantResponses(questions[currentQuestionIndex].id);
    }
  };

  // Wrap updateActiveQuestionStage in useCallback
  const updateActiveQuestionStage = useCallback(async (questionId: string, stage: string) => {
    try {
      console.log('Updating active question stage:', { questionId, stage });
      const correctOption = questions[currentQuestionIndex]?.correct || 0;
      
      // Use the helper function to handle errors and multiple attempts
      const result = await updateActiveQuestionHelper(
        quizId as string,
        questionId,
        stage === 'answer' || stage === 'results', // show_results true for answer and results stages
        correctOption,
        stage
      );
      
      if (!result.success) {
        console.error('Error updating active question stage:', result);
      }
      
      // Fetch responses for this question
      fetchResponses(questionId);
    } catch (err) {
      console.error('Error in updateActiveQuestionStage:', err);
    }
  }, [quizId, questions, currentQuestionIndex, fetchResponses]);

  // Wrap goToNextQuestion in useCallback (before it's used in other useCallbacks)
  const goToNextQuestion = useCallback(() => {
    if (currentQuestionIndex >= questions.length - 1) {
      // If at the end, finish quiz
      if (quizStarted) {
        finishQuiz();
        // Désactiver le mode automatique à la fin du quiz
        setIsPlaying(false);
        setFullAutoMode(false);
      }
      return;
    }
    
    // Conserver l'état isPlaying si on est en mode automatique complet
    const keepPlaying = fullAutoMode || autoAdvanceEnabled;
    
    // Ne pas désactiver isPlaying si on est en mode auto
    if (!keepPlaying) {
      setIsPlaying(false);
    }
    
    setQuizStage('question');
    setStageTimeRemaining(getStageTime('question'));
    setShowDetailedResponses(false);
    setCurrentQuestionIndex(prevIndex => prevIndex + 1);
    
    // Update active question in database
    if (quizStarted) {
      updateActiveQuestionStage(questions[currentQuestionIndex + 1].id, 'question');
    }
  }, [currentQuestionIndex, questions, quizStarted, fullAutoMode, autoAdvanceEnabled, getStageTime, updateActiveQuestionStage, finishQuiz]);

  // Toggle admin controls visibility
  const toggleControls = () => {
    setShowControls(prev => !prev);
  }

  // Exit preview and return to admin
  const exitPreview = () => {
    router.push(`/admin/edit/${quizId}`);
  }
  
  // Fonction pour démarrer le quiz et réinitialiser les réponses
  const startQuiz = async () => {
    if (questions.length === 0) {
      alert('Ce quiz ne contient aucune question. Impossible de démarrer.');
      return;
    }
    
    try {
      // Réinitialiser les réponses des participants avant de démarrer
      // Removed call to resetParticipantAnswers as it's not needed for this example
      
      const result = await startQuizFirstQuestion(quizId as string, questions[0].id);
      
      if (!result.success) {
        console.error('Error starting quiz:', result.error);
        
        // Check for the specific constraint violation error
        if (result.error && typeof result.error === 'object' && 'code' in result.error && result.error.code === '23505') {
          // This is just a duplicate key - the quiz may already be started
          // We can safely continue despite this error
          console.log('Quiz may already be started. Continuing...');
        } else {
          alert('Erreur lors du démarrage du quiz: ' + 
            (result.error && typeof result.error === 'object' && 'message' in result.error ? 
              result.error.message : 'Veuillez réessayer.'));
          return;
        }
      }
      
      // Mise à jour de l'état local
      setQuizStarted(true);
      setCurrentQuestionIndex(0);
      setQuizStage('question');
      setStageTimeRemaining(getStageTime('question'));
      setShowingResults(false);
      setIsPlaying(false);
      
      // Mettre explicitement à jour la table quizzes pour indiquer que le quiz a commencé
      const { error } = await supabase
        .from('quizzes')
        .update({
          quiz_started: true,
          started_at: new Date().toISOString()
        })
        .eq('id', quizId);
        
      if (error) {
        console.error('Erreur lors de la mise à jour du statut du quiz:', error);
      } else {
        console.log('Quiz démarré avec succès, les participants peuvent maintenant jouer');
      }
      
      // Fetch initial responses for the first question
      fetchResponses(questions[0].id);
      
    } catch (err) {
      console.error('Error starting quiz:', err);
      alert('Une erreur s&apos;est produite lors du démarrage du quiz. Veuillez réessayer.');
    }
  }
  
  // This function is unused but kept for future reference
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const updateActiveQuestion = async (questionId: string, showResults: boolean) => {
    try {
      const correctOption = questions[currentQuestionIndex]?.correct;
      
      // Utiliser l'utilitaire pour gérer les erreurs et les tentatives multiples
      const result = await updateActiveQuestionHelper(
        quizId as string,
        questionId,
        showResults,
        correctOption
      );
      
      // Masquer les détails de l'erreur mais journaliser
      if (result.activeQuestionUpsert.error || result.quizUpdate.error) {
        console.log('Note: Some operations had issues but the UI will continue.');
      }
      
      // Fetch responses for this question
      fetchResponses(questionId);
    } catch (err) {
      console.error('Error updating active question:', err);
      // Ne pas propager l'erreur pour éviter de perturber l'UI
    }
  }
  
  // Finish the quiz - wrap in useCallback
  const finishQuiz = useCallback(async () => {
    try {
      const { error } = await supabase
        .from('quizzes')
        .update({
          active: false,
          finished: true,
          active_question_id: null,
          ended_at: new Date().toISOString()
        })
        .eq('id', quizId)
        
      if (error) throw error
      
      alert('Quiz terminé avec succès! Les participants peuvent voir leurs résultats.')
      
    } catch (err) {
      console.error('Error finishing quiz:', err)
      alert('Erreur lors de la fin du quiz. Veuillez réessayer.')
    }
  }, [quizId]); // Add quizId as dependency

  // Loading and error state handlers
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-600 to-purple-700">
        <div className="text-center text-white">
          <div className="w-16 h-16 border-4 border-white border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-4">Chargement du quiz...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-600 to-purple-700">
        <div className="bg-white rounded-lg p-8 shadow-lg max-w-md">
          <h2 className="text-2xl font-bold text-red-600 mb-4">Erreur</h2>
          <p className="text-gray-700 mb-4">{error}</p>
          <button 
            onClick={exitPreview}
            className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700"
          >
            Retour à l&apos;administration
          </button>
        </div>
      </div>
    )
  }

  if (!quiz || questions.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-600 to-purple-700">
        <div className="bg-white rounded-lg p-8 shadow-lg max-w-md">
          <h2 className="text-2xl font-bold text-indigo-700 mb-4">Aucune question</h2>
          <p className="text-gray-700 mb-4">Ce quiz ne contient aucune question.</p>
          <button 
            onClick={exitPreview}
            className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700"
          >
            Retour à l&apos;administration
          </button>
        </div>
      </div>
    )
  }

  // Quiz not started yet - show QR code and waiting screen
  if (!quizLaunched) {
    return (
      <div 
        className="min-h-screen flex flex-col items-center justify-center p-4" 
        style={getGradientStyle()} // Use custom gradient
      >
        {/* Fullscreen toggle button - add the same button style as in the main quiz view */}
        {/* 
        <button 
          onClick={(e) => {
            e.stopPropagation();
            toggleFullscreen();
          }}
          className="fullscreen-button"
          title={isFullscreen ? "Quitter le mode plein écran" : "Mode plein écran"}
        >
          {isFullscreen ? <FiMinimize size={24} /> : <FiMaximize size={24} />}
        </button>
        */}
        
        {/* Exit button - only show when not in fullscreen mode */}
        {!isFullscreen && (
          <button 
            onClick={exitPreview}
            className="fixed top-4 left-4 z-50 bg-white/20 hover:bg-white/30 text-white p-2 rounded-full backdrop-blur-sm transition-all duration-300"
            title="Retour à l'administration"
          >
            <FiHome size={20} />
          </button>
        )}
        
        <div className="max-w-7xl w-full bg-white rounded-xl shadow-xl p-8 text-center">
          <h1 className="text-3xl font-bold text-indigo-800 mb-2">{quiz?.title || 'Quiz'}</h1>
          <p className="text-gray-600 mb-8">
            {quiz?.event_name} {quiz?.event_date && `- ${new Date(quiz.event_date).toLocaleDateString()}`}
          </p>
          
          <div className="bg-yellow-50 text-yellow-800 p-6 rounded-lg mb-8 text-center">
            <h2 className="text-xl font-bold mb-2">Quiz non lancé</h2>
            <p className="mb-4">Ce quiz n&apos;a pas encore été lancé. Les participants ne peuvent pas encore le rejoindre.</p>
            <p className="text-sm">Retournez à la page d&apos;édition du quiz et cliquez sur &quot;Lancer le quiz&quot; pour permettre aux participants de rejoindre.</p>
          </div>
          
          <button 
            onClick={exitPreview}
            className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700"
          >
            Retour à l&apos;administration
          </button>
        </div>
      </div>
    );
  }
  
  // Quiz lancé mais pas encore démarré - affichage des participants
  if (quizLaunched && !quizStarted) {
    return (
      <div 
        id="quiz-preview-container"
        className={`min-h-screen flex flex-col items-center justify-center p-4 ${isFullscreen ? 'custom-fullscreen-mode' : ''}`}
        style={!isFullscreen ? getGradientStyle() : {}} // Use custom gradient when not fullscreen
      >
     
        {!isFullscreen && (
          <button 
            onClick={exitPreview}
            className="fixed top-4 left-4 z-50 bg-white/20 hover:bg-white/30 text-white p-2 rounded-full backdrop-blur-sm transition-all duration-300"
            title="Retour à l'administration"
          >
            <FiHome size={20} />
          </button>
        )}
        
        <div className="max-w-7xl w-full bg-white rounded-xl shadow-xl p-8 text-center">
          <h1 className="text-3xl font-bold text-indigo-800 mb-2">{quiz.title}</h1>
          <p className="text-gray-600 mb-6">{quiz.event_name} - {new Date(quiz.event_date).toLocaleDateString()}</p>
          
          {/* Modern collapsible instructions panel - moved outside grid for full width */}
          <details className="mb-6 bg-indigo-50/50 rounded-lg border border-indigo-100/70 overflow-hidden group">
            <summary className="p-3 cursor-pointer font-medium text-indigo-700 flex items-center justify-between hover:bg-indigo-50 transition-colors">
              <span className="flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-indigo-500" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
                Comment fonctionne ce quiz ?
              </span>
              <svg className="h-5 w-5 text-indigo-500 group-open:rotate-180 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </summary>
            <div className="p-4 bg-white border-t border-indigo-100/70">
              <div className="grid grid-cols-1 md:grid-cols-5 gap-3 text-left text-sm">
                <div className="bg-indigo-50 p-3 rounded-lg flex flex-col items-center text-center">
                  <span className="text-2xl mb-2">🎮</span>
                  <p className="text-gray-700"><strong>Principe</strong><br />Répondez aux questions à choix multiple pour marquer des points</p>
                </div>
                <div className="bg-purple-50 p-3 rounded-lg flex flex-col items-center text-center">
                  <span className="text-2xl mb-2">⏱️</span>
                  <p className="text-gray-700"><strong>Temps limité</strong><br />Plus vous répondez vite, plus vous gagnez de points</p>
                </div>
                <div className="bg-blue-50 p-3 rounded-lg flex flex-col items-center text-center">
                  <span className="text-2xl mb-2">📱</span>
                  <p className="text-gray-700"><strong>Sur votre appareil</strong><br />Touchez l&apos;option que vous pensez correcte</p>
                </div>
                <div className="bg-green-50 p-3 rounded-lg flex flex-col items-center text-center">
                  <span className="text-2xl mb-2">✅</span>
                  <p className="text-gray-700"><strong>Résultats</strong><br />Voyez votre position par rapport aux autres</p>
                </div>
                <div className="bg-yellow-50 p-3 rounded-lg flex flex-col items-center text-center">
                  <span className="text-2xl mb-2">🏆</span>
                  <p className="text-gray-700"><strong>Classement</strong><br />Un podium des meilleurs joueurs sera affiché à la fin</p>
                </div>
              </div>
            </div>
          </details>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
            <div>
              <h2 className="text-xl font-semibold mb-4">Scannez pour rejoindre</h2>
              <div className="bg-white p-4 rounded-lg inline-block border-2 border-indigo-100">
                <QRCode value={joinUrl} size={200} />
              </div>
              <p className="mt-4 text-gray-500">ou partagez ce lien :</p>
              <div className="mt-2 bg-gray-50 p-2 rounded-lg border border-gray-200 text-sm text-gray-700 break-all">
                {joinUrl}
              </div>
              <div className="mt-4 flex justify-center">
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(joinUrl);
                    alert('Lien copié dans le presse-papier!');
                  }}
                  className="px-4 py-2 bg-indigo-100 text-indigo-700 rounded hover:bg-indigo-200 transition"
                >
                  Copier le lien
                </button>
              </div>
            </div>
            
            <div className="text-left">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">Participants ({participants.length})</h2>
                <div className="flex items-center gap-2">
                  {/* View toggle buttons */}
                  <div className="flex rounded-lg overflow-hidden border border-indigo-100">
                    <button
                      onClick={() => setViewMode('grid')}
                      className={`px-3 py-1 text-xs ${viewMode === 'grid' ? 'bg-indigo-600 text-white' : 'bg-indigo-50 text-indigo-600'}`}
                    >
                      Grille
                    </button>
                    <button
                      onClick={() => setViewMode('cloud')}
                      className={`px-3 py-1 text-xs ${viewMode === 'cloud' ? 'bg-indigo-600 text-white' : 'bg-indigo-50 text-indigo-600'}`}
                    >
                      Nuage
                    </button>
                  </div>
                  <button
                    onClick={fetchParticipants}
                    className="text-indigo-600 text-sm hover:underline"
                  >
                    Actualiser
                  </button>
                </div>
              </div>
              

              {participants.length === 0 ? (
                <div className="bg-gray-50 rounded-lg p-8 text-center">
                  <div className="w-16 h-16 mx-auto bg-indigo-100 rounded-full flex items-center justify-center">
                    <span className="text-2xl">👥</span>
                  </div>
                  <p className="mt-4 text-gray-500">En attente des participants...</p>
                  <p className="text-sm text-gray-400 mt-2">Partagez le QR code pour que les participants puissent rejoindre</p>
                </div>
              ) : (
                <div>
                  <div className="bg-gray-50 rounded-lg p-4 max-h-80 overflow-y-auto">
                    {viewMode === 'grid' ? (
                      // Grid view - Dynamic sizing based on participant count
                      <div 
                        className={`grid gap-1 ${
                          participants.length <= 20 ? 'grid-cols-3 sm:grid-cols-4' : 
                          participants.length <= 50 ? 'grid-cols-4 sm:grid-cols-5' : 
                          participants.length <= 100 ? 'grid-cols-5 sm:grid-cols-6' : 
                          'grid-cols-6 sm:grid-cols-8'
                        }`}
                      >
                        {participants.map(participant => (
                          <div key={participant.id} className="bg-white rounded-lg p-1 border border-gray-100 text-center">
                            <div className={`${
                              participants.length <= 20 ? 'w-10 h-10 text-xl' : 
                              participants.length <= 50 ? 'w-8 h-8 text-lg' : 
                              participants.length <= 100 ? 'w-6 h-6 text-md' : 
                              'w-5 h-5 text-sm'
                            } rounded-full bg-indigo-100 flex items-center justify-center mx-auto`}>
                              <span>{participant.avatar_emoji || '👤'}</span>
                            </div>
                            <div className={`font-medium text-gray-800 truncate ${
                              participants.length <= 20 ? 'text-xs' : 
                              participants.length <= 50 ? 'text-xs' : 
                              'text-[10px]'
                            }`}>
                              {participant.name}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      // Cloud view - Arrange participants in a more compact way
                      <div className="participant-cloud relative h-64 w-full">
                        {participants.map((participant, index) => {
                          // Calculate position in cloud - spread evenly
                          const angle = (index / participants.length) * 2 * Math.PI;
                          const radius = Math.min(30 + Math.random() * 30, 45); // Random distance from center
                          const leftPercent = 50 + Math.cos(angle) * radius;
                          const topPercent = 50 + Math.sin(angle) * radius;
                          
                          // Size based on participant count
                          const size = participants.length <= 50 ? 40 : 
                                      participants.length <= 100 ? 35 : 
                                      participants.length <= 200 ? 30 : 24;
                          

                          return (
                            <div 
                              key={participant.id}
                              className="absolute transform -translate-x-1/2 -translate-y-1/2 flex flex-col items-center transition-all duration-300 hover:z-10 hover:scale-110"
                              style={{
                                left: `${leftPercent}%`,
                                top: `${topPercent}%`,
                                zIndex: Math.floor(Math.random() * 10)
                              }}
                              title={participant.name}
                            >
                              <div 
                                className="rounded-full bg-white border border-indigo-200 flex items-center justify-center shadow-sm hover:shadow"
                                style={{ width: `${size}px`, height: `${size}px` }}
                              >
                                <span style={{ fontSize: `${size * 0.5}px` }}>{participant.avatar_emoji || '👤'}</span>
                              </div>
                              {participants.length <= 150 && (
                                <div className="mt-1 text-[8px] text-white bg-indigo-500/70 px-1 py-0.5 rounded-sm whitespace-nowrap">
                                  {participant.name.length > 8 ? `${participant.name.substring(0, 8)}...` : participant.name}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                  
                  <div className="mt-6 bg-indigo-50 p-4 rounded-lg border border-indigo-100">
                    <p className="text-indigo-700 font-medium">
                       participant connecté
                    </p>
                    <p className="text-sm text-indigo-600 mt-1">
                      Vous pouvez commencer le quiz quand vous êtes prêt
                    </p>
                  </div>
                </div>
              )}
              
              <div className="mt-6 space-y-3">
                <button
                  onClick={startQuiz}
                  className="w-full bg-green-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-green-700 transition flex items-center justify-center"
                  disabled={participants.length === 0}
                >
                  <FiPlay className="mr-2" /> {participants.length === 0 ? 'En attente de participants...' : 'Démarrer le quiz'}
                </button>
                
                <button
                  onClick={exitPreview}
                  className="w-full bg-gray-200 text-gray-800 py-2 px-4 rounded-lg hover:bg-gray-300 transition"
                >
                  Retour à l&apos;administration
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Main quiz view - with active quiz
  const currentQuestion = questions[currentQuestionIndex]

  return (
    <div 
      id="quiz-preview-container"
      className={`min-h-screen flex flex-col ${isFullscreen ? 'quiz-fullscreen-active' : ''}`}
      style={getGradientStyle()} // Use custom gradient
      onClick={toggleControls}
    >
      {/* Simple fullscreen button that's always visible */}
      <button 
        onClick={(e) => {
          e.stopPropagation();
          toggleFullscreen();
        }}
        className="fullscreen-button"
        title={isFullscreen ? "Quitter le mode plein écran" : "Mode plein écran"}
      >
        {isFullscreen ? <FiMinimize size={24} /> : <FiMaximize size={24} />}
      </button>
      
      {/* Only show exit button when not in fullscreen mode */}
      {!isFullscreen && (
        <button 
          onClick={(e) => {
            e.stopPropagation();
            exitPreview();
          }}
          className="fixed top-4 left-4 z-50 bg-white/20 hover:bg-white/30 text-white p-2 rounded-full backdrop-blur-sm transition-all duration-300"
          title="Retour à l'administration"
        >
          <FiHome size={20} />
        </button>
      )}
      
      {/* Participants counter - adjusted position based on fullscreen state */}
      <div className="fixed top-4 right-16 z-50 bg-white/20 hover:bg-white/30 text-white px-3 py-2 rounded-full backdrop-blur-sm flex items-center">
        <FiUsers className="mr-2" />
        <span>{participants.length}</span>
      </div>
      
      {/* Admin controls - toggleable */}
      {showControls && (
        <div 
          className="fixed top-16 left-0 right-0 z-40 bg-black/50 backdrop-blur-sm text-white py-3 px-6 flex justify-between items-center transition-all duration-300"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center">
            <h1 className="text-lg font-bold mr-4">{quiz.title}</h1>
            <span className="text-sm bg-white/20 px-3 py-1 rounded-full">
              Question {currentQuestionIndex + 1}/{questions.length}
            </span>
            <span className="ml-3 text-sm bg-white/20 px-3 py-1 rounded-full">
              {quizStage === 'question' ? 'Question' : 
               quizStage === 'answer' ? 'Réponse' : 
               quizStage === 'results' ? 'Résultats' : 'Passage'}
              : {stageTimeRemaining}s
            </span>
          </div>
          
          <div className="flex items-center space-x-3">
            <button 
              onClick={goToPrevQuestion}
              className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white disabled:opacity-30 disabled:cursor-not-allowed"
              title="Question précédente"
              disabled={currentQuestionIndex === 0}
            >
              <FiChevronLeft />
            </button>
            
            <button 
              onClick={togglePlay}
              className={`p-2 rounded-full ${
                isPlaying 
                  ? 'bg-red-500/80 hover:bg-red-500' 
                  : 'bg-green-500/80 hover:bg-green-500'
              } text-white`}
              title={isPlaying ? "Pause" : "Démarrer"}
            >
              {isPlaying ? <FiPause /> : <FiPlay />}
            </button>
            
            <button 
              onClick={advanceToNextStage}
              className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white"
              title="Étape suivante"
            >
              {quizStage === 'question' ? "Réponses" : 
               quizStage === 'answer' ? "Détails" : 
               quizStage === 'results' ? "Question suivante" : "Suivant"}
            </button>
            
            {/* Bouton de mode automatique modifié */}
            <div className="flex items-center ml-3 bg-white/10 px-3 py-1 rounded">
              <input
                type="checkbox"
                id="autoAdvance"
                checked={fullAutoMode}
                onChange={toggleFullAutoMode}
                className="mr-2"
              />
              <label htmlFor="autoAdvance" className="text-sm">
                {fullAutoMode ? "Auto (Toutes les questions)" : "Auto"}
              </label>
            </div>
          </div>
        </div>
      )}
      
      {/* Timer bar - Afficher le bon timer en fonction de l'étape */}
      {isPlaying && (
        <div className="fixed top-0 left-0 right-0 h-1 bg-gray-800 z-30">
          <div 
            className={`h-full transition-all duration-1000 ease-linear ${
              quizStage === 'question' ? 'bg-blue-500' :
              quizStage === 'answer' ? 'bg-green-500' :
              quizStage === 'results' ? 'bg-purple-500' : 'bg-gray-500'
            }`}
            style={{ 
              width: `${(stageTimeRemaining / getStageTime(quizStage)) * 100}%` 
            }}
          ></div>
        </div>
      )}
      
      {/* Question display */}
      <div className="flex-1 flex flex-col items-center justify-center p-8 pt-32">
        {/* Question card */}
        <div className="bg-white rounded-3xl shadow-2xl p-8 md:p-10 max-w-4xl w-full mx-auto transform transition-all duration-300">
          {currentQuestion?.image_url && (
            <div className="mb-6 flex justify-center">
              <Image 
                src={currentQuestion.image_url} 
                alt="Question" 
                width={400}
                height={200}
                className="max-h-[200px] rounded-lg object-contain"
              />
            </div>
          )}
          <h2 className="text-2xl md:text-3xl font-bold text-gray-800 mb-8 text-center">{currentQuestion?.title}</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
            {currentQuestion?.options.map((option: string, index: number) => {
              const responseData = responses.find(r => r.option_index === index)
              const responseCount = responseData ? responseData.count : 0
              const totalResponses = responses.reduce((sum, r) => sum + r.count, 0)
              /* eslint-disable-next-line @typescript-eslint/no-unused-vars */
              const responsePercentage = totalResponses > 0 ? Math.round((responseCount / totalResponses) * 100) : 0
              const isCorrect = index === currentQuestion.correct;
              
              return (
                <div 
                  key={index}
                  className={`p-4 rounded-lg border-2 transition-all duration-300 cursor-pointer flex flex-col justify-center items-center text-center ${showingResults && (isCorrect ? 'border-green-500 bg-green-50' : 'border-red-500 bg-red-50')}`}
                  onClick={() => {
                    // Do nothing if quiz is not started
                    if (!quizStarted) return;

                    // If already playing, ignore clicks
                    if (isPlaying) return;
                    
                    // Toggle selection for review
                    // If already playing, ignore clicks
                    if (isPlaying) return;
                    
                    // Toggle selection for review mode
                    if (showingResults) {
                      const alreadySelected = participantResponses.some(r => r.selected_option === index);
                      if (alreadySelected) {
                        // Deselect if already selected
                        setParticipantResponses(prev => prev.filter(r => r.selected_option !== index));
                      } else {
                        // Select this option
                        setParticipantResponses(prev => [...prev, {
                          participant_id: 'temp-id', // Temporary ID for local state
                          participant_name: 'Vous', // Default name for local responses
                          avatar_emoji: '👤', // Default avatar
                          selected_option: index,
                          answered_at: new Date().toISOString()
                        }]);
                      }
                    }
                  }}
                >
                  <div className="text-4xl mb-2">
                    {String.fromCharCode(65 + index)}
                  </div>
                  <div className="text-gray-800 font-medium">{option}</div>
                  {/* Show response count and percentage if results are being shown */}
                  {showingResults && (
                    <div className="mt-2 text-sm text-gray-500">
                      {/* Count and percentage would go here */}
                    </div>
                  )}
                  
                  {/* Correct answer indicator */}
                  {index === currentQuestion.correct && showingResults && (
                    <div className="absolute top-2 right-2 bg-green-500 text-white rounded-full px-2 py-1 text-xs font-medium">
                      Correct
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
        
        {/* Responses details - show only if results are being shown */}
        {showingResults && (
          <div className="mt-8 w-full max-w-3xl mx-auto">
            <h3 className="text-xl font-bold text-center mb-4">Réponses par participant</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {participantResponses.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  Aucune réponse pour cette question
                </div>
              ) : (
                participantResponses.map((response) => {
                  const isCorrect = response.selected_option === currentQuestion.correct;
                  return (
                    <div 
                      key={`${response.participant_id}-${response.answered_at.toString()}`} // Create a composite key
                      className={`p-4 rounded-xl border-2 ${isCorrect ? 'border-green-500 bg-green-50' : 'border-red-500 bg-red-50'}`}
                    >
                      {/* Response details would go here */}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
        
        {/* Participant responses info */}
        {quizStarted && (
          <div className="mt-6 bg-white/20 text-white px-6 py-3 rounded-full backdrop-blur-sm">
            {responses.reduce((sum, r) => sum + r.count, 0)} / {participants.length} participants ont répondu
          </div>
        )}
      </div>
      
      {/* Footer with instructions */}
      <div className="p-4 text-center text-white/70 text-sm">
        Cliquez n&apos;importe où pour {showControls ? 'masquer' : 'afficher'} les contrôles
      </div>
    </div>
  )
}
