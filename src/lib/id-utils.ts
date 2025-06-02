/**
 * Utilities for working with IDs in the application
 */

/**
 * Validates if the given ID is a valid UUID format
 */
export function isValidUuid(id: string): boolean {
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidPattern.test(id);
}

/**
 * Extracts a valid ID from the Next.js params object
 */
export function extractId(params: any): string | null {
  const rawId = params.id;
  return typeof rawId === 'string' ? rawId : Array.isArray(rawId) ? rawId[0] : null;
}

/**
 * Creates a query parameter for Supabase based on the ID type
 */
export function createIdQueryParam(id: string): string {
  // Check if it's a valid UUID
  if (isValidUuid(id)) {
    return `id=eq.${id}`;
  }
  
  // Check if it's a valid number
  if (!isNaN(Number(id))) {
    return `id=eq.${Number(id)}`;
  }
  
  // If neither, just use as-is but this might fail
  return `id=eq.${id}`;
}
