'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

// Define proper types instead of using 'any'
interface Template {
  id: string;
  title: string;
  theme: string;
  event_name?: string;
}

interface Theme {
  id: string;
  name: string;
  description?: string;
}

interface ThemeQuestion {
  id: string;
  theme_id: string;
  content: string;
  options: string[];
  correct_option: string;
  image_url?: string;
  duration?: number;
}

export default function TemplateImporter({ onImport }: { onImport?: () => void }) {
  const [templates, setTemplates] = useState<Template[]>([])
  const [themes, setThemes] = useState<Theme[]>([])
  const [themeQuestions, setThemeQuestions] = useState<{ [themeId: string]: ThemeQuestion[] }>({})
  const [loading, setLoading] = useState(false)

  // Fetch quiz templates
  const fetchTemplates = async () => {
    const { data } = await supabase.from('quiz_templates').select('*')
    if (data) setTemplates(data)
  }

  // Fetch themes and their questions
  const fetchThemesAndQuestions = async () => {
    const { data: themesData } = await supabase.from('themes').select('*')
    setThemes(themesData || [])

    // Fetch all questions for all themes
    if (themesData && themesData.length > 0) {
      const { data: questionsData } = await supabase.from('theme_questions').select('*')
      const grouped: { [themeId: string]: ThemeQuestion[] } = {}
      if (questionsData) {
        for (const q of questionsData) {
          if (!grouped[q.theme_id]) grouped[q.theme_id] = []
          grouped[q.theme_id].push(q)
        }
      }
      setThemeQuestions(grouped)
    }
  }

  const importThemeAsQuiz = async (theme: Theme) => {
    setLoading(true)
    // Crée un quiz à partir du thème
    const quizRes = await supabase.from('quizzes').insert({
      title: theme.name,
      theme: theme.name,
      created_by: null
    }).select().single()

    const quizId = quizRes.data?.id
    if (!quizId) {
      setLoading(false)
      return
    }

    // Ajoute toutes les questions du thème comme questions du quiz
    const questions = (themeQuestions[theme.id] || []).map((q: ThemeQuestion, index: number) => ({
      quiz_id: quizId,
      title: q.content,
      options: q.options,
      correct: q.options.indexOf(q.correct_option),
      image_url: q.image_url,
      order_index: index,
      duration: q.duration
    }))

    if (questions.length > 0) {
      const { error } = await supabase.from('questions').insert(questions)
      if (!error) {
        alert('Quiz importé depuis le thème avec succès ✅')
        if (onImport) onImport()
      } else {
        alert('Erreur lors de l\'import des questions ❌')
      }
    } else {
      alert('Aucune question trouvée pour ce thème.')
    }

    setLoading(false)
  }

  // Add the missing importTemplate function
  const importTemplate = async (tpl: Template) => {
    setLoading(true);
    try {
      // Create a new quiz based on the template
      const { data, error } = await supabase.from('quizzes').insert({
        title: tpl.title,
        theme: tpl.theme,
        event_name: tpl.event_name || 'Event based on template',
        event_date: new Date().toISOString().split('T')[0], // Today's date
        created_by: null
      }).select().single();
      
      if (error) throw error;
      
      if (data) {
        alert(`Template "${tpl.title}" imported successfully!`);
        if (onImport) onImport();
      }
    } catch (err: unknown) {
      console.error('Error importing template:', err);
      alert(`Error importing template: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates()
    fetchThemesAndQuestions()
  }, [])

  return (
    <div className="max-w-3xl mx-auto mt-10">
      <h2 className="text-2xl font-bold text-indigo-700 mb-4">Templates de Quiz</h2>
      {templates.length === 0 && <p className="text-gray-500 mb-4">Aucun template trouvé.</p>}
      {templates.map((tpl) => (
        <div key={tpl.id} className="bg-white shadow p-4 rounded mb-4 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-indigo-600">{tpl.title}</h3>
              <p className="text-sm text-gray-500">Thème : {tpl.theme}</p>
            </div>
            <button
              onClick={() => importTemplate(tpl)}
              disabled={loading}
              className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700"
            >
              {loading ? 'Import...' : 'Importer'}
            </button>
          </div>
        </div>
      ))}

      <h2 className="text-2xl font-bold text-indigo-700 mb-4 mt-10">Thèmes disponibles</h2>
      {themes.length === 0 && <p className="text-gray-500 mb-4">Aucun thème trouvé.</p>}
      {themes.map((theme) => (
        <div key={theme.id} className="bg-white shadow p-4 rounded mb-4 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-indigo-600">{theme.name}</h3>
              <p className="text-sm text-gray-500">{theme.description}</p>
              <p className="text-xs text-gray-400 mt-1">{(themeQuestions[theme.id] || []).length} questions</p>
            </div>
            <button
              onClick={() => importThemeAsQuiz(theme)}
              disabled={loading}
              className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
            >
              {loading ? 'Import...' : 'Importer comme quiz'}
            </button>
          </div>
          {(themeQuestions[theme.id] || []).length > 0 && (
            <ul className="mt-4 text-sm text-gray-700 list-disc pl-5">
              {(themeQuestions[theme.id] || []).slice(0, 5).map((q) => (
                <li key={q.id}>
                  <span className="font-medium">{q.content}</span>
                  <span className="ml-2 text-gray-400">({q.options.join(', ')})</span>
                </li>
              ))}
              {(themeQuestions[theme.id] || []).length > 5 && (
                <li className="text-gray-400">...et {themeQuestions[theme.id].length - 5} autres</li>
              )}
            </ul>
          )}
        </div>
      ))}
    </div>
  )
}
