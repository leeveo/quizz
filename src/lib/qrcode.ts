/**
 * Utilitaires pour générer des QR codes
 */

export function generateJoinUrl(quizId: string | number, baseUrl: string = ''): string {
  // Valider l'ID du quiz
  if (!quizId) {
    console.error('Invalid quizId for QR code generation');
    return '';
  }
  
  // If no base URL provided, try to use the browser's location
  if (!baseUrl && typeof window !== 'undefined') {
    baseUrl = window.location.origin;
  }
  
  // Fallback for server-side rendering
  if (!baseUrl) {
    baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  }
  
  return `${baseUrl}/join/${quizId}`;
}
