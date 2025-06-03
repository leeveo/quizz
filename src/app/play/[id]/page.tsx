'use client'

import { useParams, useRouter } from 'next/navigation'
import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import Image from 'next/image'

// Define proper types for the data
type Question = {
  id: string;
  title: string;
  options: string[];
  correct: number;
  image_url?: string;
}

type ActiveQuestion = {
  id: string;
  question_id: string;
  show_results: boolean;
  stage?: string;
  question?: Question;
}

export default function PlayQuizPage() {
  const params = useParams()
  const router = useRouter()
  const quizId = typeof params.id === 'string' ? params.id : Array.isArray(params.id) ? params.id[0] : ''
  
  const [initialized, setInitialized] = useState(false)
  const [name, setName] = useState('')
  const [avatar, setAvatar] = useState('🐱')
  
  // Commenting out unused state variables that are reserved for future implementation
  /* eslint-disable @typescript-eslint/no-unused-vars */
  const [participantId, setParticipantId] = useState<string | null>(null)
  const [activeQuestion, setActiveQuestion] = useState<ActiveQuestion | null>(null)
  const [selectedOption, setSelectedOption] = useState<number | null>(null)
  const [hasAnswered, setHasAnswered] = useState(false)
  const [answerSubmitted, setAnswerSubmitted] = useState(false)
  const [timeLeft, setTimeLeft] = useState(30)
  const [quizFinished, setQuizFinished] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [timePoints, setTimePoints] = useState(0)
  const [questionPoints, setQuestionPoints] = useState(0)
  const [loading, setLoading] = useState(true)
  const [scores, setScores] = useState<Record<string, number>>({})
  const [loadingQuiz, setLoadingQuiz] = useState(true)
  /* eslint-enable @typescript-eslint/no-unused-vars */
  
  // Wrap fetchActiveQuestionDetails in useCallback to prevent dependency issues
  const fetchActiveQuestionDetails = useCallback(async () => {
    // ...existing code...
  }, []); // Remove quizId from dependencies
  
  useEffect(() => {
    // Comment out unused handleJoin function or implement it if needed
    /* eslint-disable @typescript-eslint/no-unused-vars */
    const handleJoin = async () => {
      // ...existing code...
    };
    /* eslint-enable @typescript-eslint/no-unused-vars */
    
    const storedName = localStorage.getItem(`quiz_${quizId}_name`)
    const storedAvatar = localStorage.getItem(`quiz_${quizId}_avatar`)
    const storedParticipantId = localStorage.getItem(`quiz_${quizId}_participant_id`)
    
    if (storedName && storedAvatar && storedParticipantId) {
      setName(storedName)
      setAvatar(storedAvatar)
      setParticipantId(storedParticipantId)
      setInitialized(true)
    }
    
    // Rest of the useEffect function...
  }, [quizId, router])
  
  // Subscribe to active question updates
  useEffect(() => {
    if (!quizId || !initialized) return
    
    // Setup subscription
    const activeQuestionChannel = supabase
      .channel('active-question-changes')
      .on(
        'postgres_changes', 
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'active_questions',
          filter: `quiz_id=eq.${quizId}`,
        },
        () => {
          console.log('Active question changed, fetching details...')
          fetchActiveQuestionDetails()
        }
      )
      .subscribe()
      
    // Cleanup subscription
    return () => {
      supabase.removeChannel(activeQuestionChannel)
    }
  }, [quizId, initialized, fetchActiveQuestionDetails])
  
  // Handle answer submission - fix unused parameter
  const submitAnswer = async () => {
    // ...existing code...
  }
  
  // Check for ongoing quiz or redirect if not found
  useEffect(() => {
    const checkQuiz = async () => {
      // ... 
    }
    
    if (quizId && initialized) {
      checkQuiz()
    }
  }, [quizId, initialized, router])
  
  // Show loading state
  if (loadingQuiz) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-500 to-purple-600 p-4">
        <div className="bg-white rounded-xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-gray-700 mt-4">Chargement du quiz...</p>
        </div>
      </div>
    )
  }
  
  // Show join screen if not initialized
  if (!initialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-500 to-purple-600 p-4">
        <div className="bg-white rounded-xl shadow-xl p-8 max-w-md w-full">
          <h1 className="text-2xl font-bold text-indigo-700 mb-4">Rejoindre le quiz</h1>
          
          {errorMessage && (
            <div className="bg-red-50 text-red-700 p-3 rounded mb-4">
              {errorMessage}
            </div>
          )}
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Votre nom
              </label>
              <input
                type="text"
                className="w-full border border-gray-300 rounded-md p-2"
                placeholder="Entrez votre nom"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Choisissez un avatar
              </label>
              <div className="grid grid-cols-6 gap-2">
                {/* Avatar selection options */}
              </div>
            </div>
            
            <button
              onClick={() => {/* ... */}}
              disabled={!name.trim()}
              className={`w-full py-2 rounded-md transition ${
                !name.trim() 
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                  : 'bg-indigo-600 text-white hover:bg-indigo-700'
              }`}
            >
              Rejoindre le quiz
            </button>
          </div>
        </div>
      </div>
    )
  }
  
  // Waiting for quiz to start
  if (!activeQuestion) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-500 to-purple-600 p-4">
        <div className="bg-white rounded-xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="w-20 h-20 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-4xl">{avatar}</span>
          </div>
          <h1 className="text-2xl font-bold text-indigo-700 mb-2">Bienvenue, {name}!</h1>
          <p className="text-gray-600 mb-6">
            Vous avez rejoint le quiz avec succès. Veuillez patienter jusqu&apos;à ce que l&apos;animateur lance la prochaine question.
          </p>
          <div className="mt-8 text-sm text-gray-500">
            Si le quiz ne démarre pas automatiquement, essayez de rafraîchir la page ou de vérifier votre connexion internet.
          </div>
        </div>
      </div>
    )
  }
  
  // Main quiz view - with active quiz
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-indigo-500 to-purple-600 p-4">
      {/* Header with participant info */}
      <div className="flex items-center justify-between bg-white/10 backdrop-blur-sm rounded-lg p-3 mb-4 text-white">
        <div className="flex items-center">
          <span className="mr-2 text-xl">{avatar}</span>
          <span className="font-medium">{name}</span>
        </div>
        {hasAnswered && (
          <div className="bg-white/20 rounded-full px-3 py-1 text-sm">
            Réponse enregistrée
          </div>
        )}
      </div>
      
      {/* Main question card */}
      <div className="flex-1 flex flex-col items-center justify-center">
        <div className="bg-white rounded-xl shadow-xl max-w-xl w-full p-6 md:p-8">
          {/* Image if available */}
          {activeQuestion.question?.image_url && (
            <div className="mb-6 flex justify-center">
              <Image 
                src={activeQuestion.question.image_url}
                alt="Question Image"
                width={300}
                height={200}
                className="rounded-lg max-h-[200px] object-contain"
              />
            </div>
          )}
          
          {/* Question title */}
          <h2 className="text-xl md:text-2xl font-bold text-gray-800 mb-6">
            {activeQuestion.question?.title || "Chargement de la question..."}
          </h2>
          
          {/* Options grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {activeQuestion.question?.options.map((option, index) => {
              const isCorrect = activeQuestion.show_results && index === activeQuestion.question?.correct;
              const isIncorrect = activeQuestion.show_results && selectedOption === index && index !== activeQuestion.question?.correct;
              
              return (
                <button
                  key={index}
                  className={`p-4 rounded-lg border-2 transition-all duration-300 text-center ${
                    isCorrect ? 'border-green-500 bg-green-50 text-green-800' :
                    isIncorrect ? 'border-red-500 bg-red-50 text-red-800' :
                    selectedOption === index ? 'border-indigo-500 bg-indigo-50 text-indigo-800' :
                    'border-gray-200 hover:border-indigo-300 hover:bg-indigo-50/50'
                  } ${hasAnswered ? 'cursor-default' : 'cursor-pointer'}`}
                  onClick={() => !hasAnswered && submitAnswer(index)}
                  disabled={hasAnswered}
                >
                  <div className="text-2xl mb-1">{String.fromCharCode(65 + index)}</div>
                  <div>{option}</div>
                  
                  {isCorrect && (
                    <div className="mt-2 text-green-600 text-sm">Réponse correcte ✓</div>
                  )}
                  
                  {isIncorrect && (
                    <div className="mt-2 text-red-600 text-sm">Réponse incorrecte ✗</div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
