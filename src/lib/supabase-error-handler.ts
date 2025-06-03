/**
 * Utilitaire pour gérer les erreurs liées à Supabase
 */

type FetchOptions = {
  method?: string;
  headers?: Record<string, string>;
  body?: unknown; // Changed from any to unknown for better type safety
};

/**
 * Journaliser une erreur Supabase avec des détails supplémentaires
 */
export function logSupabaseError(context: string, error: unknown): void {
  console.error(`❌ Supabase error in ${context}:`, error);
  
  // Vérifier les détails de connexion
  console.log('Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
  console.log('Supabase Key exists:', !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  
  // Vérifier si c'est un objet d'erreur vide (souvent lié à des problèmes de connexion)
  if (error && typeof error === 'object' && Object.keys(error).length === 0) {
    console.error('Empty error object detected. This may indicate a connection issue with Supabase.');
  }
}

/**
 * Méthode de récupération en cas d'échec de la requête Supabase
 * Utilise fetch directement avec l'API REST
 */
export async function fetchWithFallback<T>(
  path: string,
  id: string | number,
  selectQuery: string,
  options: FetchOptions = {}
): Promise<T> {
  try {
    // S'assurer que l'URL est correctement construite
    const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const apiUrl = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
    
    // Construire l'URL avec les paramètres encodés
    const endpoint = `${apiUrl}rest/v1/${path}?id=eq.${encodeURIComponent(String(id))}&${selectQuery}`;
    console.log('Fallback endpoint:', endpoint);
    
    // Configurer les en-têtes par défaut
    const headers = {
      'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
      'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...options.headers
    };
    
    // Exécuter la requête
    const response = await fetch(endpoint, {
      method: options.method || 'GET',
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined
    });
    
    console.log('Fallback response status:', response.status);
    
    if (!response.ok) {
      const responseText = await response.text();
      throw new Error(`Fetch failed: ${response.status} ${response.statusText} - ${responseText}`);
    }
    
    const data = await response.json();
    
    // Retourner le premier élément si c'est un tableau
    if (Array.isArray(data)) {
      if (data.length === 0) {
        throw new Error('No data found');
      }
      return data[0] as T;
    }
    
    return data as T;
  } catch (error) {
    console.error('❌ Fallback fetch error:', error);
    throw error;
  }
}

/**
 * Teste la connexion à Supabase et retourne l'état
 */
export async function testSupabaseConnection(): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/`, {
      headers: {
        'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
        'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''}`,
      }
    });
    
    return { 
      success: response.ok,
      error: !response.ok ? `Status: ${response.status}` : undefined
    };
  } catch (error: unknown) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : String(error)
    };
  }
}
