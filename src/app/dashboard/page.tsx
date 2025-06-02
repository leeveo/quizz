'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

type Quiz = {
  id: number
  title: string
  theme: string
  event_name?: string
  event_date?: string
  created_by: string | null
  active?: boolean // Add this property
}

export default function DashboardPage() {
  const [quizzes, setQuizzes] = useState<Quiz[]>([])
  const [selectedQuizId, setSelectedQuizId] = useState<number | null>(null)
  const router = useRouter()

  // Fetch quizzes on mount
  const fetchQuizzes = async () => {
    try {
      console.log('Fetching quizzes for dashboard...');
      
      const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/quizzes?select=*`, {
        method: 'GET',
        headers: {
          'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''}`,
        }
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Fetch failed: ${response.status} ${response.statusText} - ${errorText}`);
      }
      
      const data = await response.json();
      console.log('Quizzes fetched:', data?.length || 0);
      setQuizzes(Array.isArray(data) ? data.sort((a, b) => (b.id || 0) - (a.id || 0)) : []);
    } catch (error) {
      console.error('Error in fetchQuizzes:', error);
      setQuizzes([]);
    }
  };

  useEffect(() => {
    fetchQuizzes()
  }, [])

  // Navigate to quiz details
  const handleQuizSelect = (quizId: number) => {
    setSelectedQuizId(quizId);
    router.push(`/admin?quizId=${quizId}`);
  }

  // Navigate to quiz customization/edit page
  const handleCustomizeQuiz = (quizId: number, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent triggering the card click
    router.push(`/admin/edit/${quizId}`);
  }

  return (
    <div className="max-w-8xl mx-auto p-4 md:p-6 lg:p-10">
      <div className="space-y-6 md:space-y-10">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          <div className="bg-gradient-to-br from-indigo-600 to-purple-600 rounded-xl shadow p-4 md:p-6 text-white flex flex-col items-center">
            <span className="text-3xl md:text-4xl font-bold">{quizzes.length}</span>
            <span className="mt-2 text-sm opacity-80">Quiz créés</span>
          </div>
          
          <div className="bg-gradient-to-br from-green-600 to-teal-600 rounded-xl shadow p-4 md:p-6 text-white flex flex-col items-center">
            <span className="text-3xl md:text-4xl font-bold">
              {quizzes.filter(q => q.active).length}
            </span>
            <span className="mt-2 text-sm opacity-80">Quiz actifs</span>
          </div>
          
          <div className="bg-gradient-to-br from-orange-500 to-red-600 rounded-xl shadow p-4 md:p-6 text-white flex flex-col items-center">
            <span className="text-3xl md:text-4xl font-bold">
              {new Set(quizzes.map(q => q.theme)).size}
            </span>
            <span className="mt-2 text-sm opacity-80">Thèmes utilisés</span>
          </div>
        </div>
        
        <div>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4 sm:gap-0">
            <h3 className="text-xl font-bold text-indigo-700">Liste des Quiz</h3>
            <button 
              onClick={() => router.push('/admin?tab=create')}
              className="btn-primary w-full sm:w-auto"
            >
              Créer un nouveau quiz
            </button>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
            {quizzes.map((q) => (
              <div
                key={q.id}
                className={`bg-white rounded-xl shadow-lg p-6 border border-gray-100 hover:border-indigo-200 cursor-pointer ${
                  selectedQuizId === q.id ? 'ring-2 ring-indigo-400' : ''
                }`}
                onClick={() => handleQuizSelect(q.id)}
              >
                <div className="flex items-center justify-between">
                  <span className="text-lg font-semibold text-indigo-700">{q.title}</span>
                  <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">{q.theme}</span>
                </div>
                <div className="mt-2 text-gray-600">{q.event_name}</div>
                <div className="mt-1 text-xs text-gray-400">
                  {q.event_date && new Date(q.event_date).toLocaleDateString()}
                </div>
                <div className="mt-4 flex justify-between items-center">
                  <button 
                    className="px-3 py-1.5 bg-indigo-100 hover:bg-indigo-200 text-indigo-700 text-sm rounded-md transition-colors"
                    onClick={(e) => handleCustomizeQuiz(q.id, e)}
                  >
                    Modifier
                  </button>
                  
                  {q.active ? (
                    <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">Actif</span>
                  ) : (
                    <span className="px-2 py-1 bg-gray-100 text-gray-500 text-xs rounded-full">Inactif</span>
                  )}
                </div>
              </div>
            ))}
            
            {quizzes.length === 0 && (
              <div className="col-span-full bg-white rounded-xl shadow-lg p-8 text-center">
                <p className="text-gray-500">Aucun quiz trouvé. Créez votre premier quiz!</p>
                <button 
                  onClick={() => router.push('/admin?tab=create')}
                  className="btn-primary mt-4"
                >
                  Créer un quiz
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
