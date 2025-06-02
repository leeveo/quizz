import React, { useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function CreateProject() {
  const [title, setTitle] = useState('')
  const [theme, setTheme] = useState('')
  const [eventName, setEventName] = useState('')
  const [eventDate, setEventDate] = useState('')
  const [message, setMessage] = useState<{type: 'success' | 'error', text: string} | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage(null)

    if (!title || !theme || !eventName || !eventDate) {
      setMessage({type: 'error', text: 'Veuillez remplir tous les champs'})
      setLoading(false)
      return
    }

    try {
      const { data, error } = await supabase.from('quizzes').insert({
        title,
        theme,
        event_name: eventName,
        event_date: eventDate,
        created_by: null
      }).select().single()

      if (error) throw error

      setMessage({type: 'success', text: `Projet "${data.title}" créé avec succès!`})
      // Reset form
      setTitle('')
      setTheme('')
      setEventName('')
      setEventDate('')
    } catch (error: any) {
      setMessage({type: 'error', text: error.message})
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-8 bg-white rounded-xl shadow">
      <h2 className="text-xl font-bold text-indigo-700 mb-4">Créer un nouveau projet</h2>
      
      {message && (
        <div className={`p-3 rounded mb-4 ${message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
          {message.text}
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Titre du quiz</label>
          <input
            type="text"
            className="w-full border border-gray-300 rounded p-2"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ex: Quiz Culture Générale"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Thème</label>
          <input
            type="text"
            className="w-full border border-gray-300 rounded p-2"
            value={theme}
            onChange={(e) => setTheme(e.target.value)}
            placeholder="Ex: Culture Générale"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Nom de l'événement</label>
          <input
            type="text"
            className="w-full border border-gray-300 rounded p-2"
            value={eventName}
            onChange={(e) => setEventName(e.target.value)}
            placeholder="Ex: Soirée Quiz du 15 mai"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Date de l'événement</label>
          <input
            type="date"
            className="w-full border border-gray-300 rounded p-2"
            value={eventDate}
            onChange={(e) => setEventDate(e.target.value)}
          />
        </div>
        
        <button 
          type="submit" 
          className="btn-primary w-full"
          disabled={loading}
        >
          {loading ? 'Création en cours...' : 'Créer le projet'}
        </button>
      </form>
    </div>
  )
}
