import { supabase } from './supabase'

/**
 * Ajoute un participant à un quiz
 */
export async function addParticipant(quizId: string, name: string, avatarId: string, avatarEmoji: string) {
  try {
    // Essaie d'abord avec quiz_id
    const { data, error } = await supabase
      .from('participants')
      .insert([
        {
          name,
          avatar_id: avatarId,
          avatar_emoji: avatarEmoji,
          quiz_id: quizId
        }
      ])
      .select()
    
    if (error) {
      // Si erreur de colonne manquante, essaie sans quiz_id
      if (error.code === '42703') {
        const { data: fallbackData, error: fallbackError } = await supabase
          .from('participants')
          .insert([
            {
              name,
              avatar_id: avatarId,
              avatar_emoji: avatarEmoji
            }
          ])
          .select()
        
        if (fallbackError) throw fallbackError
        return fallbackData?.[0] || null
      }
      
      throw error
    }
    
    return data?.[0] || null
  } catch (err) {
    console.error('Erreur lors de l\'ajout du participant:', err)
    throw err
  }
}

/**
 * Récupère les participants d'un quiz
 */
export async function getParticipants(quizId: string) {
  try {
    // Essaie d'abord avec quiz_id
    const { data, error } = await supabase
      .from('participants')
      .select('*')
      .eq('quiz_id', quizId)
    
    if (error) {
      // Si erreur de colonne manquante, essaie de récupérer tous les participants
      if (error.code === '42703') {
        const { data: allData, error: allError } = await supabase
          .from('participants')
          .select('*')
        
        if (allError) throw allError
        return allData || []
      }
      
      throw error
    }
    
    return data || []
  } catch (err) {
    console.error('Erreur lors de la récupération des participants:', err)
    throw err
  }
}

/**
 * Enregistre la réponse d'un participant
 */
export async function submitAnswer(participantId: string, questionId: string, quizId: string, selectedOption: number) {
  try {
    const { error } = await supabase
      .from('participant_answers')
      .insert([
        {
          participant_id: participantId,
          question_id: questionId,
          quiz_id: quizId,
          selected_option: selectedOption
        }
      ])
    
    if (error) throw error
    return true
  } catch (err) {
    console.error('Erreur lors de l\'enregistrement de la réponse:', err)
    throw err
  }
}
