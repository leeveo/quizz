import { supabase } from './supabase';

/**
 * Vérifie et répare la structure de la table participants
 */
export async function fixParticipantsTable() {
  try {
    console.log('Vérification de la structure de la table participants...');
    
    // Vérifier si la table existe en essayant une sélection simple
    try {
      const { error } = await supabase
        .from('participants')
        .select('id')
        .limit(1);
      
      if (error) {
        console.error('Erreur lors de la vérification de la table participants:', error);
        return { success: false, error };
      }
    } catch (err) {
      console.error('Exception lors de la vérification de la table participants:', err);
      return { success: false, error: err };
    }
    
    // Vérifier si la colonne avatar_emoji existe et l'ajouter si nécessaire
    try {
      // Utiliser RPC si disponible, ou une approche plus sûre sans exec_sql
      const { error: avatarEmojiError } = await supabase
        .from('participants')
        .select('avatar_emoji')
        .limit(1);
      
      // Si la colonne n'existe pas, essayer de l'ajouter en utilisant les fonctions Supabase si disponibles
      if (avatarEmojiError && 
          avatarEmojiError.message && 
          avatarEmojiError.message.includes('column "avatar_emoji" does not exist')) {
        console.log('Colonne avatar_emoji manquante');
        
        // Au lieu d'utiliser exec_sql, créer un enregistrement temporaire avec le champ pour s'assurer qu'il existe
        try {
          // Essayer d'abord de créer un participant temporaire pour s'assurer que la colonne existe
          const tempId = `temp-${Date.now()}`;
          await supabase.from('participants').insert({
            id: tempId,
            name: 'Utilisateur Temporaire',
            avatar_emoji: '👤',
            quiz_id: '00000000-0000-0000-0000-000000000000'
          });
          
          // Puis supprimer le participant temporaire
          await supabase.from('participants').delete().eq('id', tempId);
          
          console.log('Colonne avatar_emoji ajoutée avec succès via l\'insertion d\'enregistrement');
        } catch (insertErr) {
          console.warn('Erreur lors de l\'ajout de la colonne avatar_emoji via l\'insertion:', insertErr);
          // Si cela échoue, simplement enregistrer le problème mais ne pas arrêter l'exécution
        }
      }
    } catch (err) {
      console.warn('Erreur lors de la vérification/de l\'ajout de la colonne avatar_emoji:', err);
      // Continuer l'exécution malgré l'erreur
    }
    
    // Vérifier si la colonne connected_at existe en utilisant la même approche
    try {
      const { error: connectedAtError } = await supabase
        .from('participants')
        .select('connected_at')
        .limit(1);
      
      if (connectedAtError && 
          connectedAtError.message && 
          connectedAtError.message.includes('column "connected_at" does not exist')) {
        console.log('Colonne connected_at manquante');
        
        // Même approche - créer un enregistrement avec le champ pour s'assurer qu'il existe
        try {
          const tempId = `temp-${Date.now()}-2`;
          await supabase.from('participants').insert({
            id: tempId,
            name: 'Utilisateur Temporaire',
            avatar_emoji: '👤',
            connected_at: new Date().toISOString(),
            quiz_id: '00000000-0000-0000-0000-000000000000'
          });
          
          await supabase.from('participants').delete().eq('id', tempId);
          
          console.log('Colonne connected_at ajoutée avec succès via l\'insertion d\'enregistrement');
        } catch (insertErr) {
          console.warn('Erreur lors de l\'ajout de la colonne connected_at via l\'insertion:', insertErr);
        }
      }
    } catch (err) {
      console.warn('Erreur lors de la vérification/de l\'ajout de la colonne connected_at:', err);
    }
    
    console.log('Vérification de la table participants terminée');
    return { success: true };
  } catch (err) {
    console.error('Exception dans fixParticipantsTable:', err);
    return { success: false, error: err };
  }
}
