import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Validate environment variables are set
if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ MISSING SUPABASE CREDENTIALS:');
  console.error('NEXT_PUBLIC_SUPABASE_URL defined:', !!supabaseUrl);
  console.error('NEXT_PUBLIC_SUPABASE_ANON_KEY defined:', !!supabaseAnonKey);
}

// Create client with better error handling and debugging
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  },
  global: {
    headers: {
      'x-client-info': 'quiz-app'
    },
  },
  // Disable realtime to avoid potential connection issues
  realtime: {
    params: {
      eventsPerSecond: 1
    }
  }
})

// Helper to test connection and diagnose issues
export const testConnection = async () => {
  try {
    console.log('🔄 Testing Supabase connection...');
    console.log('URL:', supabaseUrl);
    console.log('Key defined:', !!supabaseAnonKey);
    
    // Try a simple query
    const start = Date.now();
    const response = await fetch(`${supabaseUrl}/rest/v1/quizzes?select=count`, {
      headers: {
        'apikey': supabaseAnonKey,
        'Authorization': `Bearer ${supabaseAnonKey}`
      }
    });
    
    const duration = Date.now() - start;
    const responseText = await response.text();
    
    console.log(`⏱️ Response time: ${duration}ms`);
    console.log(`📡 Status: ${response.status} ${response.statusText}`);
    console.log('📄 Response:', responseText);
    
    return {
      success: response.ok,
      status: response.status,
      response: responseText,
      duration
    };
  } catch (error) {
    console.error('❌ Connection test failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
};
