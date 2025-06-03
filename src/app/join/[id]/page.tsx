'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

// Define proper types
type Quiz = {
  id: string;
  title: string;
  active: boolean;
  quiz_started: boolean;
  theme: string;
  event_name?: string;
  event_date?: string;
}

// Avatars disponibles pour les participants
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
  { id: 'penguin', emoji: '🐧' },
  { id: 'elephant', emoji: '🐘' },
]

export default function JoinQuizPage() {
  const params = useParams()
  const quizId = params.id as string
  const router = useRouter()
  
  const [quiz, setQuiz] = useState<Quiz | null>(null)
  const [loading, setLoading] = useState(true)
  const [joining, setJoining] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [selectedAvatar, setSelectedAvatar] = useState(AVATARS[0].id)
  const [selectedEmoji, setSelectedEmoji] = useState(AVATARS[0].emoji)
  
  // Nouvel état pour gérer la phase d'attente
  const [waitingForStart, setWaitingForStart] = useState(false)
  const [participantId, setParticipantId] = useState<string | null>(null)
  
  // Vérifier si le quiz existe et est actif
  useEffect(() => {
    const fetchQuizDetails = async () => {
      try {
        setLoading(true)
        
        const { data, error } = await supabase
          .from('quizzes')
          .select('*')
          .eq('id', quizId)
          .single()
        
        if (error) {
          throw error
        }
        
        if (!data) {
          setError("Ce quiz n'existe pas")
          return
        }
        
        setQuiz(data as Quiz)
        
        // Si le quiz est déjà démarré (quiz_started=true) et que l'utilisateur avait déjà rejoint
        const storedParticipantId = localStorage.getItem(`participant_${quizId}`)
        if (storedParticipantId && data.quiz_started) {
          // Rediriger directement vers la page de jeu seulement si le quiz est DÉMARRÉ (pas seulement lancé)
          router.push(`/play/${quizId}`)
          return
        }
        
        // Si l'utilisateur a déjà rejoint mais que le quiz n'est pas encore démarré
        if (storedParticipantId && data.active && !data.quiz_started) {
          const storedName = localStorage.getItem(`participantName_${quizId}`) || '';
          const storedAvatar = localStorage.getItem(`participantAvatar_${quizId}`) || AVATARS[0].emoji;
          
          setParticipantId(storedParticipantId);
          setName(storedName);
          setSelectedEmoji(storedAvatar);
          
          // Afficher l'écran d'attente directement
          setWaitingForStart(true);
        }
        
      } catch (err: unknown) {
        console.error('Erreur lors de la récupération du quiz:', err)
        setError("Impossible de charger le quiz")
      } finally {
        setLoading(false)
      }
    }
    
    if (quizId) {
      fetchQuizDetails()
    }
  }, [quizId, router])
  
  // Écouter les changements d'état du quiz (démarrage)
  useEffect(() => {
    if (!quizId) return
    
    // S'abonner aux changements d'état du quiz (pour tous les utilisateurs, pas seulement ceux en attente)
    const quizChannel = supabase
      .channel('quiz-status-join')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'quizzes',
          filter: `id=eq.${quizId}`,
        },
        (payload) => {
          console.log('Changement d\'état du quiz:', payload)
          
          // Vérifier si le quiz vient d'être démarré (pas juste lancé)
          if (payload.new.quiz_started && !payload.old.quiz_started) {
            console.log('Le quiz vient d\'être démarré, redirection vers la page de jeu')
            
            // Si l'utilisateur a déjà rejoint, le rediriger
            if (participantId) {
              router.push(`/play/${quizId}`)
            }
          }
        }
      )
      .subscribe()
    
    return () => {
      supabase.removeChannel(quizChannel)
    }
  }, [quizId, router, participantId]) // Add participantId to dependencies
  
  // Rejoindre le quiz
  const handleJoinQuiz = async () => {
    if (!name.trim()) {
      alert('Veuillez entrer votre nom')
      return
    }
    
    try {
      setJoining(true)
      setError(null)
      
      console.log('Tentative d\'inscription au quiz:', {
        quizId,
        name: name.trim(),
        avatar: selectedAvatar,
        emoji: selectedEmoji
      })
      
      // Essayons d'insérer avec l'avatar et avatar_emoji
      try {
        console.log('Méthode complète: avec tous les champs');
        const { data, error } = await supabase
          .from('participants')
          .insert([{
            name: name.trim(),
            quiz_id: quizId,
            avatar: selectedEmoji, 
            avatar_id: selectedAvatar,
            avatar_emoji: selectedEmoji
          }])
          .select();
        
        console.log('Résultat de la méthode complète:', { data, error });
        
        if (error) {
          throw error;
        }
        
        if (data && data[0]) {
          console.log('Inscription réussie avec tous les champs:', data[0]);
          
          // Stocker l'ID du participant et les infos pour la reconnexion
          localStorage.setItem(`participant_${quizId}`, data[0].id);
          localStorage.setItem(`participantName_${quizId}`, name);
          localStorage.setItem(`participantAvatar_${quizId}`, selectedEmoji);
          
          setParticipantId(data[0].id);
          
          // Vérifier si le quiz est déjà démarré (pas seulement lancé)
          const { data: quizData } = await supabase
            .from('quizzes')
            .select('quiz_started, active')
            .eq('id', quizId)
            .single();
            
          if (quizData && quizData.quiz_started) {
            // Si déjà démarré, rediriger directement vers la page de jeu
            router.push(`/play/${quizId}`);
          } else if (quizData && quizData.active) {
            // Si quiz est lancé mais pas démarré, afficher l'écran d'attente
            setWaitingForStart(true);
          } else {
            // Quiz ni lancé ni démarré
            setError("Ce quiz n'est pas encore disponible.");
          }
          
          return;
        }
      } catch (completeError: unknown) {
        console.error('Erreur avec méthode complète:', completeError);
        
        // Si erreur liée aux colonnes manquantes, essayer autrement
        if (completeError.code === 'PGRST204') {
          console.log('Colonnes inconnues détectées, essai avec champs essentiels');
        } else {
          console.error('Erreur spécifique:', completeError.message);
        }
      }
      
      // Méthode simplifiée mais avec avatar (pour respecter la contrainte NOT NULL)
      try {
        console.log('Méthode simplifiée: avec avatar essentiel');
        const { data: simpleData, error: simpleError } = await supabase
          .from('participants')
          .insert([{
            name: name.trim(),
            avatar: selectedEmoji,
            quiz_id: quizId
          }])
          .select();
        
        console.log('Résultat méthode simplifiée:', { simpleData, simpleError });
        
        if (simpleError) {
          throw simpleError;
        }
        
        if (simpleData && simpleData[0]) {
          console.log('Inscription réussie avec avatar essentiel:', simpleData[0]);
          
          // Stocker l'ID du participant et les infos pour la reconnexion
          localStorage.setItem(`participant_${quizId}`, simpleData[0].id);
          localStorage.setItem(`participantName_${quizId}`, name);
          localStorage.setItem(`participantAvatar_${quizId}`, selectedEmoji);
          
          setParticipantId(simpleData[0].id);
          
          // Vérifier si le quiz est déjà démarré (pas seulement lancé)
          const { data: quizData } = await supabase
            .from('quizzes')
            .select('quiz_started, active')
            .eq('id', quizId)
            .single();
            
          if (quizData && quizData.quiz_started) {
            // Si déjà démarré, rediriger directement vers la page de jeu
            router.push(`/play/${quizId}`);
          } else if (quizData && quizData.active) {
            // Si quiz est lancé mais pas démarré, afficher l'écran d'attente
            setWaitingForStart(true);
          } else {
            // Quiz ni lancé ni démarré
            setError("Ce quiz n'est pas encore disponible.");
          }
          
          return;
        }
      } catch (simpleError) {
        console.error('Erreur avec la méthode simplifiée:', simpleError);
      }
      
      // Si on arrive ici, c'est que toutes les méthodes ont échoué
      throw new Error("Échec de l&apos;inscription. Veuillez rafraîchir la page et réessayer.");
      
    } catch (err: unknown) {
      console.error('Erreur détaillée lors de la participation au quiz:', err);
      setError(`Une erreur s&apos;est produite: ${err instanceof Error ? err.message : 'Erreur inconnue'}`);
    } finally {
      setJoining(false);
    }
  }
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-500 to-purple-600">
        <div className="text-center text-white">
          <div className="w-16 h-16 border-4 border-white border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-4">Chargement...</p>
        </div>
      </div>
    )
  }
  
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-500 to-purple-600 p-4">
        <div className="bg-white rounded-2xl shadow-lg max-w-md w-full p-8">
          <div className="w-20 h-20 mx-auto bg-red-100 rounded-full flex items-center justify-center mb-6">
            <span className="text-3xl">❌</span>
          </div>
          <h1 className="text-2xl font-bold text-center text-gray-800 mb-4">Erreur</h1>
          <p className="text-center text-gray-600 mb-6">{error}</p>
          <button 
            onClick={() => router.push('/')}
            className="w-full bg-indigo-600 text-white py-3 px-4 rounded-xl font-medium hover:bg-indigo-700 transition"
          >
            Retour Accueil
          </button>
        </div>
      </div>
    )
  }
  
  if (!quiz) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-500 to-purple-600 p-4">
        <div className="bg-white rounded-2xl shadow-lg max-w-md w-full p-8">
          <div className="w-20 h-20 mx-auto bg-yellow-100 rounded-full flex items-center justify-center mb-6">
            <span className="text-3xl">🤔</span>
          </div>
          <h1 className="text-2xl font-bold text-center text-gray-800 mb-4">Quiz introuvable</h1>
          <p className="text-center text-gray-600 mb-6">Ce quiz est indisponible.</p>
          <button 
            onClick={() => router.push('/')}
            className="w-full bg-indigo-600 text-white py-3 px-4 rounded-xl font-medium hover:bg-indigo-700 transition"
          >
            Retour Accueil
          </button>
        </div>
      </div>
    )
  }
  
  // Écran d'attente après avoir rejoint le quiz
  if (waitingForStart) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-500 to-purple-600 flex flex-col items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="w-20 h-20 mx-auto bg-green-100 rounded-full flex items-center justify-center mb-6">
            <span className="text-4xl">{selectedEmoji}</span>
          </div>
          
          <h1 className="text-2xl font-bold text-gray-800 mb-2">
            Vous avez rejoint le quiz!
          </h1>
          
          <p className="text-gray-600 mb-8">
            En attente du démarrage du quiz ...
          </p>
          
          <div className="bg-indigo-50 p-4 rounded-lg">
            <div className="flex items-center justify-center">
              <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center">
                <span className="text-xl">{selectedEmoji}</span>
              </div>
              <div className="ml-3 text-left">
                <div className="font-medium text-gray-800">{name}</div>
                <div className="text-xs text-gray-500">Participant</div>
              </div>
            </div>
          </div>
          
          <div className="mt-8 bg-yellow-50 p-4 rounded-lg text-sm text-yellow-800">
            <p>Ne fermez pas cette fenêtre! Le quiz commencera bientôt.</p>
            <div className="mt-3 flex items-center justify-center">
              <div className="w-4 h-4 bg-yellow-500 rounded-full animate-pulse"></div>
            </div>
          </div>

          <p className="text-white text-center max-w-md mb-8">
            Vous avez rejoint le quiz avec succès. Veuillez patienter jusqu&apos;à ce que l&apos;animateur démarre le quiz.
          </p>
        </div>
      </div>
    );
  }
  
  // Écran de connexion normal
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-500 to-purple-600 flex flex-col items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 md:p-8">
        <div className="text-center mb-6 md:mb-8">
          <h1 className="text-xl md:text-2xl font-bold text-gray-800">{quiz.title}</h1>
          <p className="text-gray-600 mt-1">{quiz.event_name}</p>
          <p className="text-sm text-gray-500 mt-1">
            {quiz.event_date && new Date(quiz.event_date).toLocaleDateString()}
          </p>
        </div>
        
        <div className="space-y-4 md:space-y-6">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
              Votre nom
            </label>
            <input
              type="text"
              id="name"
              placeholder="Comment vous appelez-vous?"
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              value={name}
              onChange={e => setName(e.target.value)}
              maxLength={20}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Choisissez un avatar
            </label>
            <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 md:gap-3">
              {AVATARS.map(avatar => (
                <button
                  key={avatar.id}
                  className={`h-12 w-12 md:h-16 md:w-16 text-xl md:text-2xl flex items-center justify-center rounded-xl transition-all ${
                    selectedAvatar === avatar.id
                      ? 'bg-indigo-100 border-2 border-indigo-500 ring-2 ring-indigo-500 scale-105'
                      : 'bg-gray-100 border border-gray-200 hover:bg-indigo-50'
                  }`}
                  onClick={() => {
                    setSelectedAvatar(avatar.id)
                    setSelectedEmoji(avatar.emoji)
                  }}
                >
                  {avatar.emoji}
                </button>
              ))}
            </div>
          </div>
          
          <button
            className={`w-full mt-4 bg-indigo-600 text-white rounded-lg py-3 px-4 font-medium hover:bg-indigo-700 transition flex items-center justify-center ${
              joining || !name.trim() ? 'opacity-70 cursor-not-allowed' : ''
            }`}
            onClick={handleJoinQuiz}
            disabled={joining || !name.trim()}
          >
            {joining ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                Connexion...
              </>
            ) : (
              'Rejoindre le quiz'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
