/**
 * Utilitaires pour gérer les erreurs avec Supabase
 */

export function logSupabaseError(context: string, error: unknown): void {
  console.error(`❌ Supabase error in ${context}:`, error)
  
  // Log connection details
  console.log('Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL)
  console.log('Supabase Key exists:', !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
  
  // Check if it's an empty error object which often indicates connection issues
  if (error && typeof error === 'object' && Object.keys(error).length === 0) {
    console.error('Empty error object detected. This may indicate a connection issue with Supabase.')
  }
}

export async function retryWithFetch<T>(
  url: string,
  apiKey: string
): Promise<T> {
  console.log('Trying direct fetch as fallback...')
  const response = await fetch(url, {
    headers: {
      'apikey': apiKey,
      'Authorization': `Bearer ${apiKey}`,
    }
  })
  
  if (!response.ok) {
    throw new Error(`Fetch failed: ${response.status} ${response.statusText}`)
  }
  
  return await response.json()
}
