'use server'

import { createClient } from '@supabase/supabase-js'

// Server-side Supabase client that bypasses RLS completely
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!, // Service role key has admin privileges
  { 
    auth: { 
      persistSession: false,
      autoRefreshToken: false 
    }
  }
)

// Server action to create a quiz, bypassing RLS completely
export async function createQuiz(quizData: {
  title: string
  theme: string
  event_name: string
  event_date: string
  primary_color?: string
}) {
  try {
    // Validate required fields
    if (!quizData.title || !quizData.theme || !quizData.event_name || !quizData.event_date) {
      return { success: false, error: 'Tous les champs sont obligatoires' }
    }

    // Insert directly using server-side admin privileges
    const { data, error } = await supabaseAdmin
      .from('quizzes')
      .insert({
        title: quizData.title,
        theme: quizData.theme,
        event_name: quizData.event_name,
        event_date: quizData.event_date,
        primary_color: quizData.primary_color || '#4f46e5', // Add primary color with default
        created_by: null
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating quiz:', error)
      return { success: false, error: error.message, data: null }
    }

    return { success: true, error: null, data }
  } catch (e: any) {
    console.error('Unexpected error in server action:', e)
    return { success: false, error: e.message, data: null }
  }
}

// Helper function to list tables (for debugging)
export async function listTables() {
  try {
    const { data, error } = await supabaseAdmin.rpc('get_tables');
    return { success: !error, data, error: error?.message };
  } catch (e: any) {
    return { success: false, error: e.message, data: null };
  }
}
