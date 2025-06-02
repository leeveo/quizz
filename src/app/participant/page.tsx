'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function ParticipantJoin() {
  const [name, setName] = useState('')
  const [avatar, setAvatar] = useState('🐱')
  const router = useRouter()

  const handleJoin = async () => {
    const { data, error } = await supabase
      .from('participants')
      .insert({ name, avatar })

    if (!error) {
      router.push(`/quiz`)
    }
  }

  return (
    <main className="p-4">
      <h1 className="text-xl font-bold">Rejoindre le Quiz</h1>
      <input
        type="text"
        placeholder="Ton nom"
        className="border p-2 mt-2"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <select value={avatar} onChange={(e) => setAvatar(e.target.value)} className="block mt-2 p-2 border">
        <option value="🐱">🐱</option>
        <option value="🐶">🐶</option>
        <option value="🐵">🐵</option>
      </select>
      <button className="mt-4 bg-blue-500 text-white px-4 py-2" onClick={handleJoin}>Rejoindre</button>
    </main>
  )
}
