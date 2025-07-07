'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

// Define a proper type for the question
type Question = {
  id: string
  title: string
  options: string[]
  correct: number
}

export default function QuizLive() {
  const [question, setQuestion] = useState<Question | null>(null)
  const [selected, setSelected] = useState<number | null>(null)
  const [timer, setTimer] = useState<number>(20)
  const [waiting, setWaiting] = useState(true)
  const [currentIndex, setCurrentIndex] = useState<number>(0)
  const [participantId, setParticipantId] = useState<number | null>(null)
  const quizId = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('id') : null

  useEffect(() => {
    if (!quizId) return
    // S'abonner à la table quizzes pour détecter le démarrage
    const channel = supabase
      .channel('quiz-started')
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'quizzes',
        filter: `id=eq.${quizId}`
      }, (payload) => {
        if (payload.new.quiz_started) {
          setWaiting(false)
        }
      })
      .subscribe()

    // Vérification initiale (au cas où le quiz est déjà démarré)
    supabase.from('quizzes').select('quiz_started').eq('id', quizId).single().then(({ data }) => {
      if (data?.quiz_started) {
        setWaiting(false)
      } else {
        setWaiting(true)
      }
    })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [quizId])

  // S'abonner à l'index de la question courante (current_question_index)
  useEffect(() => {
    if (!quizId) return
    const channel = supabase
      .channel('quiz-current-question')
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'quizzes',
        filter: `id=eq.${quizId}`
      }, (payload) => {
        if (typeof payload.new.current_question_index === 'number') {
          setCurrentIndex(payload.new.current_question_index)
        }
      })
      .subscribe()

    // Récupération initiale de l'index courant
    supabase.from('quizzes').select('current_question_index').eq('id', quizId).single().then(({ data }) => {
      if (typeof data?.current_question_index === 'number') {
        setCurrentIndex(data.current_question_index)
      }
    })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [quizId])

  // Charger la question courante à chaque changement d'index
  useEffect(() => {
    if (!quizId || waiting) return
    supabase
      .from('questions')
      .select('*')
      .eq('quiz_id', quizId)
      .order('order_index', { ascending: true })
      .then(({ data }) => {
        if (data && data.length > currentIndex) setQuestion(data[currentIndex])
        else setQuestion(null)
      })
  }, [quizId, waiting, currentIndex])

  // Correction : timer synchronisé sur chaque nouvelle question
  useEffect(() => {
    setTimer(20); // reset timer à chaque nouvelle question
    setSelected(null); // reset sélection
  }, [question]);

  // Correction : timer automatique, passage à la question suivante côté client (pour UX, mais la synchro reste côté admin)
  useEffect(() => {
    if (timer > 0) {
      const interval = setInterval(() => setTimer((t) => t - 1), 1000);
      return () => clearInterval(interval);
    }
  }, [timer])

  // Enregistrement du participant à l'arrivée sur la page
  useEffect(() => {
    if (!quizId) return
    // Vérifier si déjà inscrit (par exemple via localStorage)
    let pid = localStorage.getItem(`participant_id_${quizId}`)
    if (pid) {
      setParticipantId(Number(pid))
      return
    }
    // Sinon, inscription dans la table participants
    const name = prompt("Entrez votre nom pour rejoindre le quiz") || "Anonyme"
    supabase
      .from('participants')
      .insert({ quiz_id: quizId, name })
      .select('id')
      .single()
      .then(({ data }) => {
        if (data?.id) {
          setParticipantId(data.id)
          localStorage.setItem(`participant_id_${quizId}`, data.id)
        }
      })
  }, [quizId])

  const sendAnswer = async (choice: number) => {
    setSelected(choice)
    if (!question || !participantId) return // Prevent error if question is null or participant not registered
    await supabase.from('answers').insert({
      participant_id: participantId,
      question_id: question.id,
      selected: choice,
    })
  }

  if (waiting) return <p>En attente du lancement du quiz...</p>
  if (!question) return <p>En attente de la question...</p>

  // Affichage de la bonne réponse en vert côté participant
  return (
    <div className="p-4">
      <h2 className="text-xl">{question.title}</h2>
      <p>Temps restant: {timer}s</p>
      <ul>
        {question.options.map((opt: string, idx: number) => (
          <li key={idx}>
            <button
              className={`p-2 border m-2 ${selected === idx ? 'bg-green-300' : ''} ${selected !== null && idx === question.correct ? 'bg-green-200 border-green-600' : ''}`}
              onClick={() => sendAnswer(idx)}
              disabled={!!selected}
            >
              {opt}
              {selected !== null && idx === question.correct && (
                <span className="ml-2 text-green-700 font-bold">✔</span>
              )}
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
