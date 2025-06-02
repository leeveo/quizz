'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function QuizLive() {
  const [question, setQuestion] = useState<any>(null)
  const [selected, setSelected] = useState<number | null>(null)
  const [timer, setTimer] = useState<number>(20)

  useEffect(() => {
    const channel = supabase
      .channel('quiz-questions')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'questions' }, (payload) => {
        setQuestion(payload.new)
        setTimer(20)
        setSelected(null)
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  useEffect(() => {
    if (timer > 0) {
      const interval = setInterval(() => setTimer((t) => t - 1), 1000)
      return () => clearInterval(interval)
    }
  }, [timer])

  const sendAnswer = async (choice: number) => {
    setSelected(choice)
    await supabase.from('answers').insert({
      participant_id: 1, // à remplacer dynamiquement
      question_id: question.id,
      selected: choice,
    })
  }

  if (!question) return <p>En attente de la question...</p>

  return (
    <div className="p-4">
      <h2 className="text-xl">{question.title}</h2>
      <p>Temps restant: {timer}s</p>
      <ul>
        {question.options.map((opt: string, idx: number) => (
          <li key={idx}>
            <button
              className={`p-2 border m-2 ${selected === idx ? 'bg-green-300' : ''}`}
              onClick={() => sendAnswer(idx)}
              disabled={!!selected}
            >
              {opt}
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
