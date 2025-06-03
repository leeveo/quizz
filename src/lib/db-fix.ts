import { supabase } from './supabase'

/**
 * Vérifie et répare la structure de la base de données si nécessaire
 */
export async function checkAndFixDatabase() {
  try {
    console.log('Vérification et réparation de la base de données...')
    
    // Vérifier si la table participants existe
    const { error: tableError } = await supabase
      .from('participants')
      .select('id')
      .limit(1)
    
    // Si la table existe, vérifier la colonne quiz_id
    if (!tableError) {
      try {
        // Tenter une requête qui utilise quiz_id
        await supabase
          .from('participants')
          .select('quiz_id')
          .limit(1)
        
        console.log('La colonne quiz_id existe dans la table participants')
      } catch (columnError: unknown) {
        // Check if the error has the expected structure
        if (typeof columnError === 'object' && 
            columnError !== null && 
            'code' in columnError && 
            columnError.code === '42703') {
          console.log('La colonne quiz_id n\'existe pas, tentative de création...')
          
          // Exécuter du SQL pour ajouter la colonne
          const { error: fixError } = await supabase.rpc('fix_participants_table')
          
          if (fixError) {
            console.error('Erreur lors de la réparation:', fixError)
          } else {
            console.log('Table participants réparée avec succès')
          }
        }
      }
    }
    
    return { success: true }
  } catch (err) {
    console.error('Erreur lors de la vérification/réparation de la base de données:', err)
    return { success: false, error: err }
  }
}

/**
 * Ajoute un participant en gérant les erreurs de structure de la base de données
 */
export async function addParticipantSafely(participantData: {
  name: string,
  avatar_id: string,
  avatar_emoji: string,
  quiz_id: string
}) {
  try {
    // Essayer d'abord avec quiz_id
    const { data, error } = await supabase
      .from('participants')
      .insert([participantData])
      .select()
    
    if (error) {
      // Si l'erreur est due à la colonne manquante
      if (error.code === '42703') {
        // Essayer sans quiz_id
        const { name, avatar_id, avatar_emoji } = participantData
        const { data: fallbackData, error: fallbackError } = await supabase
          .from('participants')
          .insert([{ name, avatar_id, avatar_emoji }])
          .select()
        
        if (fallbackError) throw fallbackError
        return { data: fallbackData, error: null }
      }
      
      throw error
    }
    
    return { data, error: null }
  } catch (err) {
    console.error('Erreur lors de l\'ajout du participant:', err)
    return { data: null, error: err }
  }
}
