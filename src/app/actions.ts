'use server'

import { supabase } from '@/lib/supabase'

// Define type for quiz input data
type QuizInput = {
  title: string
  theme: string
  event_name: string
  event_date: string
  primary_color?: string
  created_by?: string | null
}

// Define type for quiz response
type Quiz = {
  id: number
  title: string
  theme: string
  event_name: string
  event_date: string
  primary_color?: string
  created_by: string | null
  active?: boolean
  questions?: Array<{
    id: string
    title: string
    options: string[]
    correct: number
    image_url?: string
  }>
}

/**
 * Create a new quiz with the given information
 */
export async function createQuiz(data: QuizInput): Promise<{
  success: boolean
  data?: Quiz
  error?: string
}> {
  try {
    // Validate input
    if (!data.title || !data.theme || !data.event_name || !data.event_date) {
      return {
        success: false,
        error: 'Tous les champs sont obligatoires'
      }
    }

    // Insert quiz into the database
    const { data: newQuiz, error } = await supabase
      .from('quizzes')
      .insert({
        title: data.title,
        theme: data.theme,
        event_name: data.event_name,
        event_date: data.event_date,
        primary_color: data.primary_color,
        created_by: data.created_by || null
      })
      .select()
      .single()

    // Handle database error
    if (error) {
      console.error('Error creating quiz:', error)
      return {
        success: false,
        error: error.message || 'Échec de la création du quiz'
      }
    }

    return {
      success: true,
      data: newQuiz as Quiz
    }
  } catch (error: unknown) {
    // Handle unexpected errors with proper type checking
    const errorMessage =
      error instanceof Error ? error.message : 'Une erreur inconnue est survenue'

    console.error('Unexpected error in createQuiz:', error)
    return {
      success: false,
      error: errorMessage
    }
  }
}

/**
 * List all available database tables (for admin purposes)
 */
export async function listTables() {
  try {
    // Use regular supabase client instead of admin
    const { data, error } = await supabase.rpc('get_tables')

    if (error && error.message.includes('permission denied')) {
      // Handle permission errors gracefully
      console.warn('Permission denied when trying to list tables. This operation requires admin privileges.')
      return {
        success: false,
        error: 'This operation requires admin privileges',
        data: null
      }
    }

    return { success: !error, data, error: error?.message }
  } catch (e: unknown) {
    const errorMessage = e instanceof Error ? e.message : 'Unknown error'
    return { success: false, error: errorMessage, data: null }
  }
}
