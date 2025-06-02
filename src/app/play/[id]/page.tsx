'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

// Types
type Question = {
  id: string;
  title: string;
  options: string[];
  correct: number;
  image_url?: string;
}

type ActiveQuestion = {
  quiz_id: string;
  question_id: string;
  show_results: boolean;
  correct_option: number;
  stage: string;
}

// Available avatars
const AVATARS = [
  { id: 'cat', emoji: '🐱' },
  { id: 'dog', emoji: '🐶' },
  { id: 'fox', emoji: '🦊' },
  { id: 'panda', emoji: '🐼' },
  { id: 'monkey', emoji: '🐵' },
  { id: 'rabbit', emoji: '🐰' },
  { id: 'tiger', emoji: '🐯' },
  { id: 'unicorn', emoji: '🦄' },
  { id: 'koala', emoji: '🐨' },
  { id: 'bear', emoji: '🐻' },
];

export default function PlayQuizPage() {
  const params = useParams();
  const router = useRouter();
  const quizId = typeof params.id === 'string' ? params.id : Array.isArray(params.id) ? params.id[0] : null;

  // Quiz state
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [quizData, setQuizData] = useState<any>(null);
  const [quizLaunched, setQuizLaunched] = useState(false);
  const [quizStarted, setQuizStarted] = useState(false);
  const [quizFinished, setQuizFinished] = useState(false);
  
  // Participant state
  const [joinState, setJoinState] = useState<'initial' | 'joined' | 'playing'>('initial');
  const [participantId, setParticipantId] = useState<string | null>(null);
  const [participantName, setParticipantName] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState(AVATARS[0].emoji);
  
  // Question state
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [activeQuestion, setActiveQuestion] = useState<ActiveQuestion | null>(null);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [hasAnswered, setHasAnswered] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  
  // Timer and synchronization
  const [stageTimeRemaining, setStageTimeRemaining] = useState<number>(8);
  const [stageTimerMax, setStageTimerMax] = useState<number>(8);
  
  // Add a state to track redirect destinations
  const [redirectTo, setRedirectTo] = useState<string | null>(null);

  // Use this effect to handle all redirections
  useEffect(() => {
    if (redirectTo) {
      router.push(redirectTo);
    }
  }, [redirectTo, router]);

  // Check if quiz exists and get its status
  useEffect(() => {
    const fetchQuizStatus = async () => {
      try {
        setLoading(true);
        
        // First try with a basic query without the potentially missing columns
        const { data: basicData, error: basicError } = await supabase
          .from('quizzes')
          .select('id, active, quiz_started, finished, title, active_question_id, launched_at')
          .eq('id', quizId)
          .single();
        
        if (basicError) {
          console.error('Error fetching basic quiz data:', basicError);
          setError("Ce quiz n'existe pas ou n'est pas accessible");
          return;
        }
        
        if (!basicData) {
          setError("Ce quiz n'existe pas");
          return;
        }
        
        console.log('Initial quiz data:', basicData);
        setQuizData(basicData);
        setQuizLaunched(basicData.active || false);
        setQuizStarted(basicData.quiz_started || false);
        setQuizFinished(basicData.finished || false);
        
        // If the quiz isn't started yet, set redirect instead of immediately redirecting
        if (!basicData.quiz_started && joinState === 'initial') {
          console.log('Quiz not started yet, will redirect to join page');
          setRedirectTo(`/join/${quizId}`);
          return;
        }
        
        // Try to get launch_id separately (might not exist in schema)
        let launchId = null;
        try {
          const { data: launchData, error: launchError } = await supabase
            .from('quizzes')
            .select('launch_id')
            .eq('id', quizId)
            .single();
            
          if (!launchError && launchData) {
            launchId = launchData.launch_id;
          }
        } catch (e) {
          console.log('launch_id column probably does not exist yet, ignoring');
        }
        
        // Check if quiz was just relaunched using only launched_at
        const storedLaunchTimestamp = localStorage.getItem(`launchTimestamp_${quizId}`);
        const storedLaunchId = localStorage.getItem(`launchId_${quizId}`);
        const currentLaunchTimestamp = basicData.launched_at || '';
        
        let quizWasRelaunched = currentLaunchTimestamp !== storedLaunchTimestamp;
        
        // Also check launch_id if available
        if (launchId && storedLaunchId) {
          quizWasRelaunched = quizWasRelaunched || (launchId !== storedLaunchId);
        }
        
        // If the quiz was relaunched or is in waiting state (active but not started)
        if (quizWasRelaunched || (basicData.active && !basicData.quiz_started && joinState === 'initial')) {
          console.log('Quiz was relaunched or is in waiting state - resetting participant data');
          
          // Clear stored participant data
          localStorage.removeItem(`participant_${quizId}`);
          localStorage.removeItem(`participantName_${quizId}`);
          localStorage.removeItem(`participantAvatar_${quizId}`);
          localStorage.removeItem(`launchTimestamp_${quizId}`);
          localStorage.removeItem(`launchId_${quizId}`);
          
          // Store new launch data
          if (basicData.launched_at) {
            localStorage.setItem(`launchTimestamp_${quizId}`, basicData.launched_at);
          }
          if (launchId) {
            localStorage.setItem(`launchId_${quizId}`, launchId);
          }
          
          // Reset state to initial (avatar selection)
          setParticipantId(null);
          setParticipantName('');
          setSelectedAvatar(AVATARS[0].emoji);
          setJoinState('initial');
          
          setLoading(false);
          return;
        }
        
        // Normal flow - check if user already joined
        const storedParticipantId = localStorage.getItem(`participant_${quizId}`);
        if (!storedParticipantId && joinState === 'initial') {
          // If no participant ID is found, set redirect instead of immediately redirecting
          console.log('No participant ID found, will redirect to join page');
          setRedirectTo(`/join/${quizId}`);
          return;
        }
        
        // User has joined, set their info from localStorage
        const storedName = localStorage.getItem(`participantName_${quizId}`);
        const storedAvatar = localStorage.getItem(`participantAvatar_${quizId}`);
        
        setParticipantId(storedParticipantId);
        if (storedName) setParticipantName(storedName);
        if (storedAvatar) setSelectedAvatar(storedAvatar);
          
        // We're in the play page, so we should always be in playing state if we have a participant ID
        setJoinState('playing');
            
        // Immediately load active question if there is one
        if (basicData.active_question_id) {
          fetchActiveQuestionDetails(basicData.active_question_id);
        }
        
      } catch (err: any) {
        console.error('Error fetching quiz:', err);
        setError(err.message || "Impossible de charger le quiz");
      } finally {
        setLoading(false);
      }
    };
    
    if (quizId) {
      fetchQuizStatus();
      
      // Listen for quiz status changes
      const quizChannel = supabase
        .channel('quiz-status')
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'quizzes',
            filter: `id=eq.${quizId}`,
          },
          (payload) => {
            console.log('Quiz status update:', payload);
            
            // Update quiz state
            const newData = payload.new;
            const oldData = payload.old;
            setQuizData(newData);
            setQuizLaunched(newData.active || false);
            setQuizStarted(newData.quiz_started || false);
            setQuizFinished(newData.finished || false);
            
            // Check if quiz was just relaunched by comparing launched_at or quiz going from inactive to active
            const wasJustRelaunched = 
              (newData.launched_at !== oldData.launched_at) || 
              (newData.launch_id !== oldData.launch_id) ||
              (newData.active && !oldData.active);
              
            if (wasJustRelaunched) {
              console.log('Quiz was just relaunched - resetting participant state');
              
              // Clear stored participant data
              localStorage.removeItem(`participant_${quizId}`);
              localStorage.removeItem(`participantName_${quizId}`);
              localStorage.removeItem(`participantAvatar_${quizId}`);
              localStorage.removeItem(`launchTimestamp_${quizId}`);
              localStorage.removeItem(`launchId_${quizId}`);
              
              // Reset state to initial (avatar selection)
              setParticipantId(null);
              setParticipantName('');
              setSelectedAvatar(AVATARS[0].emoji);
              setJoinState('initial');
              
              // Force reload to ensure clean state
              window.location.reload();
              return;
            }
            
            // If quiz just started
            if (newData.quiz_started && !oldData.quiz_started && joinState === 'joined') {
              console.log('Quiz just started, moving to playing state');
              setJoinState('playing');
              
              // Force reload to ensure fresh state
              window.location.reload();
            }
            
            // If active question changed
            if (newData.active_question_id !== oldData.active_question_id) {
              console.log('Active question changed:', newData.active_question_id);
              if (newData.active_question_id) {
                fetchActiveQuestionDetails(newData.active_question_id);
              }
            }
          }
        )
        .subscribe();
  
      return () => {
        supabase.removeChannel(quizChannel);
      };
    }
  }, [quizId, router, joinState]);
  
  // Fetch active question details
  const fetchActiveQuestionDetails = async (questionId: string) => {
    try {
      console.log('Fetching question details for:', questionId);
      
      // 1. Get question details
      const { data: questionData, error: questionError } = await supabase
        .from('questions')
        .select('*')
        .eq('id', questionId)
        .single();
      
      if (questionError) {
        console.error('Error fetching question:', questionError);
        return;
      }
      
      console.log('Question data:', questionData);
      setCurrentQuestion(questionData);
      
      // 2. Get active question details (stage, show_results, etc.)
      const { data: activeQuestionData, error: activeQuestionError } = await supabase
        .from('active_questions')
        .select('*')
        .eq('quiz_id', quizId)
        .eq('question_id', questionId)
        .single();
      
      if (activeQuestionError && activeQuestionError.code !== 'PGRST116') {
        console.error('Error fetching active question:', activeQuestionError);
      }
      
      if (activeQuestionData) {
        console.log('Active question data:', activeQuestionData);
        setActiveQuestion(activeQuestionData);
        
        // Update timer based on stage
        updateTimerForStage(activeQuestionData.stage || 'question');
        
        // Check if participant already answered this question
        if (participantId) {
          checkParticipantAnswer(questionId, participantId, questionData.correct);
        }
      } else {
        // Default active question data if none exists yet
        setActiveQuestion({
          quiz_id: quizId as string,
          question_id: questionId,
          show_results: false,
          correct_option: questionData.correct,
          stage: 'question'
        });
        
        // Set default timer for question stage
        updateTimerForStage('question');
      }
    } catch (err) {
      console.error('Error in fetchActiveQuestionDetails:', err);
    }
  };
  
  // Subscribe to active question changes
  useEffect(() => {
    if (!quizId || !quizStarted || joinState !== 'playing') return;
    
    console.log('Setting up active question subscription');
    
    // Listen for active_questions changes
    const activeQuestionChannel = supabase
      .channel('active-question-changes')
      .on(
        'postgres_changes',
        {
          event: '*', // INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'active_questions',
          filter: `quiz_id=eq.${quizId}`,
        },
        (payload) => {
          console.log('Active question change:', payload);
          
          // Make sure this is for the current question
          if (currentQuestion && payload.new.question_id === currentQuestion.id) {
            setActiveQuestion(payload.new as ActiveQuestion);
            updateTimerForStage(payload.new.stage || 'question');
          }
        }
      )
      .subscribe();
    
    return () => {
      supabase.removeChannel(activeQuestionChannel);
    };
  }, [quizId, quizStarted, joinState, currentQuestion]);
  
  // Update timer based on stage
  const updateTimerForStage = (stage: string) => {
    let maxTime: number;
    switch(stage) {
      case 'question': maxTime = 8; break;
      case 'answer': maxTime = 5; break;
      case 'results': maxTime = 5; break;
      default: maxTime = 8;
    }
    
    setStageTimerMax(maxTime);
    setStageTimeRemaining(maxTime);
  };
  
  // Check if participant already answered
  const checkParticipantAnswer = async (questionId: string, partId: string, correctAnswer: number) => {
    try {
      const { data, error } = await supabase
        .from('participant_answers')
        .select('selected_option, is_correct')
        .eq('participant_id', partId)
        .eq('question_id', questionId)
        .single();
      
      if (!error && data) {
        setHasAnswered(true);
        setSelectedOption(data.selected_option);
        setIsCorrect(data.is_correct || data.selected_option === correctAnswer);
      } else {
        setHasAnswered(false);
        setSelectedOption(null);
        setIsCorrect(false);
      }
    } catch (err) {
      console.error('Error checking participant answer:', err);
    }
  };
  
  // Timer countdown
  useEffect(() => {
    if (!quizStarted || joinState !== 'playing' || !activeQuestion) return;
    
    const timer = setInterval(() => {
      setStageTimeRemaining(prev => {
        if (prev <= 0) return 0;
        return prev - 1;
      });
    }, 1000);
    
    return () => clearInterval(timer);
  }, [quizStarted, activeQuestion, joinState]);
  
  // Join quiz
  const handleJoinQuiz = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!participantName.trim()) {
      alert('Veuillez entrer votre nom');
      return;
    }
    
    try {
      setLoading(true);
      
      // Insert participant in database - try with quiz_id field first
      try {
        const { data, error } = await supabase
          .from('participants')
          .insert({
            name: participantName.trim(),
            quiz_id: quizId,
            avatar_emoji: selectedAvatar,
          })
          .select()
          .single();
        
        if (error) throw error;
        
        console.log('Participant added with quiz_id:', data);
        
        // Store participant info in localStorage
        localStorage.setItem(`participant_${quizId}`, data.id);
        localStorage.setItem(`participantName_${quizId}`, participantName);
        localStorage.setItem(`participantAvatar_${quizId}`, selectedAvatar);
        
        // Store current launch data
        if (quizData) {
          if (quizData.launched_at) {
            localStorage.setItem(`launchTimestamp_${quizId}`, quizData.launched_at);
          }
          if (quizData.launch_id) {
            localStorage.setItem(`launchId_${quizId}`, quizData.launch_id);
          }
        }
        
        setParticipantId(data.id);
        setJoinState('joined');
        
        // If quiz is already started, go directly to playing state
        if (quizStarted) {
          setJoinState('playing');
        }
        
      } catch (err: any) {
        console.warn('Error adding participant with quiz_id, trying without it:', err);
        
        // Fallback: Try without quiz_id if the column doesn't exist
        if (err.code === '42703') { // Column doesn't exist
          const { data, error: fallbackError } = await supabase
            .from('participants')
            .insert({
              name: participantName.trim(),
              avatar_emoji: selectedAvatar,
            })
            .select()
            .single();
          
          if (fallbackError) throw fallbackError;
          
          console.log('Participant added without quiz_id:', data);
          
          // Store participant info in localStorage
          localStorage.setItem(`participant_${quizId}`, data.id);
          localStorage.setItem(`participantName_${quizId}`, participantName);
          localStorage.setItem(`participantAvatar_${quizId}`, selectedAvatar);
          
          // Store current launch data
          if (quizData) {
            if (quizData.launched_at) {
              localStorage.setItem(`launchTimestamp_${quizId}`, quizData.launched_at);
            }
            if (quizData.launch_id) {
              localStorage.setItem(`launchId_${quizId}`, quizData.launch_id);
            }
          }
          
          setParticipantId(data.id);
          setJoinState('joined');
          
          // If quiz is already started, go directly to playing state
          if (quizStarted) {
            setJoinState('playing');
          }
        } else {
          throw err; // Re-throw other errors
        }
      }
      
    } catch (err: any) {
      console.error('Error joining quiz:', err);
      setError('Impossible de rejoindre le quiz: ' + (err.message || 'Erreur inconnue'));
    } finally {
      setLoading(false);
    }
  };
  
  // Submit answer - Prevent redirection after answering
  const submitAnswer = async (optionIndex: number) => {
    if (!participantId || !currentQuestion || hasAnswered) return;
    
    try {
      // Check if we're still in question stage
      if (activeQuestion?.stage !== 'question') {
        console.log('Cannot answer: not in question stage');
        return;
      }
      
      setSelectedOption(optionIndex);
      // Mark that we have answered this question to prevent redirections
      setHasAnswered(true);
      
      // Save answer to database without the is_correct field
      const { error } = await supabase.from('participant_answers').insert({
        participant_id: participantId,
        quiz_id: quizId,
        question_id: currentQuestion.id,
        selected_option: optionIndex,
        answered_at: new Date().toISOString(),
        // Remove is_correct field that's causing the error
      });
      
      if (error) {
        console.error('Error submitting answer:', error);
        throw error;
      } else {
        console.log('Answer submitted successfully');
        // Set to playing state explicitly after successful answer submission
        setJoinState('playing');
      }
      
    } catch (err) {
      console.error('Error submitting answer:', err);
    }
  };
  
  // Show appropriate message based on stage
  const renderStageMessage = () => {
    if (!activeQuestion) return null;
    
    switch (activeQuestion.stage) {
      case 'question':
        return hasAnswered 
          ? <p>Votre réponse a été enregistrée!</p>
          : <p>Choisissez votre réponse! ({stageTimeRemaining}s)</p>;
      case 'answer':
        return isCorrect
          ? <p>Bonne réponse! 🎉</p>
          : <p>Mauvaise réponse. La bonne réponse était: {String.fromCharCode(65 + (currentQuestion?.correct || 0))}</p>;
      case 'results':
        return <p>Résultats de tous les participants...</p>;
      case 'next':
        return <p>Passage à la question suivante...</p>;
      default:
        return <p>En attente de la prochaine question...</p>;
    }
  };
  
  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-500 to-purple-600 flex flex-col items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-gray-600">Chargement du quiz...</p>
        </div>
      </div>
    );
  }
  
  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-500 to-purple-600 flex flex-col items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-red-100 flex items-center justify-center rounded-full mx-auto">
            <span className="text-3xl">❌</span>
          </div>
          <h2 className="text-xl font-bold mt-4 text-red-600">Erreur</h2>
          <p className="mt-2 text-gray-600">{error}</p>
          <button
            onClick={() => router.push('/')}
            className="mt-6 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition"
          >
            Retour à l'accueil
          </button>
        </div>
      </div>
    );
  }
  
  // Quiz not launched yet
  if (!quizLaunched) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-500 to-purple-600 flex flex-col items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="w-20 h-20 mx-auto bg-yellow-100 rounded-full flex items-center justify-center">
            <span className="text-4xl">⏳</span>
          </div>
          <h2 className="text-2xl font-bold mt-4">Quiz en attente</h2>
          <p className="mt-2 text-gray-600">
            Ce quiz n'a pas encore été lancé par l'organisateur.
          </p>
          <p className="mt-4 text-sm text-gray-500">
            Revenez plus tard ou contactez l'organisateur.
          </p>
          <button
            onClick={() => router.push('/')}
            className="mt-6 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition"
          >
            Retour à l'accueil
          </button>
        </div>
      </div>
    );
  }
  
  // Join screen (choose name and avatar) - REMOVE THIS SECTION FROM PLAY PAGE
  if (joinState === 'initial') {
    // Set redirect state instead of direct navigation
    useEffect(() => {
      setRedirectTo(`/join/${quizId}`);
    }, [quizId, setRedirectTo]);
    
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-500 to-purple-600 flex flex-col items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-gray-600">Redirection vers la page de connexion...</p>
        </div>
      </div>
    );
  }
  
  // Waiting for quiz to start
  if (joinState === 'joined' && !quizStarted) {
    // Set redirect state instead of direct navigation
    useEffect(() => {
      setRedirectTo(`/join/${quizId}`);
    }, [quizId, setRedirectTo]);
    
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-500 to-purple-600 flex flex-col items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-gray-600">Redirection vers la salle d'attente...</p>
        </div>
      </div>
    );
  }
  
  // Playing state - main quiz interface
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-500 to-purple-600 flex flex-col items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-5 md:p-8 max-w-md w-full">
        <h1 className="text-xl md:text-2xl font-bold text-center mb-4">{quizData?.title}</h1>
        
        {/* Participant info */}
        <div className="flex items-center justify-between bg-gray-100 p-3 md:p-4 rounded-lg mb-4">
          <div className="flex items-center">
            <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-indigo-500 flex items-center justify-center text-white text-lg md:text-xl mr-2 md:mr-3">
              {selectedAvatar}
            </div>
            <div>
              <p className="text-xs md:text-sm text-gray-500">Vous participez en tant que:</p>
              <p className="font-semibold text-sm md:text-base">{participantName}</p>
            </div>
          </div>
        </div>
        
        {/* Current question */}
        {currentQuestion ? (
          <div className="bg-gray-50 rounded-lg p-4 mb-4">
            <h2 className="text-lg md:text-xl font-semibold mb-2">
              {currentQuestion.title}
            </h2>
            
            {/* Question image - show only if URL exists */}
            {currentQuestion.image_url && (
              <div className="mb-4">
                <img src={currentQuestion.image_url} alt="Question" className="w-full rounded-lg shadow-md" />
              </div>
            )}
            
            {/* Answer options */}
            <div className="grid grid-cols-1 gap-2 md:gap-3 mt-4">
              {currentQuestion.options.map((option, index) => (
                <button
                  key={index}
                  onClick={() => submitAnswer(index)}
                  className={`flex items-center justify-center px-3 md:px-4 py-2 md:py-3 rounded-lg font-semibold transition ${
                    selectedOption === index ? 'bg-indigo-600 text-white' : 
                    'bg-indigo-100 text-indigo-700 hover:bg-indigo-200'
                  }`}
                  disabled={hasAnswered}
                >
                  <span className="w-6 h-6 md:w-8 md:h-8 rounded-full bg-white text-indigo-700 flex items-center justify-center mr-2 md:mr-3 text-sm md:text-base">
                    {String.fromCharCode(65 + index)}
                  </span>
                  <span className="text-sm md:text-base">{option}</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="text-center py-6 bg-gray-50 rounded-lg">
            <p className="text-gray-500">En attente de la prochaine question...</p>
          </div>
        )}
        
        {/* Stage message */}
        <div className="p-3 md:p-4 text-center bg-indigo-50 rounded-lg text-sm md:text-base">
          {renderStageMessage()}
        </div>
        
        {/* Timer - show only if in question stage */}
        {activeQuestion?.stage === 'question' && (
          <div className="mt-4 bg-gray-100 h-2 rounded-full overflow-hidden">
            <div 
              className="h-full bg-indigo-600 transition-all duration-1000 ease-linear"
              style={{ width: `${(stageTimeRemaining / stageTimerMax) * 100}%` }}
            ></div>
          </div>
        )}
      </div>
    </div>
  );
}
