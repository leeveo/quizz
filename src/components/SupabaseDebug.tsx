'use client'

import { useState, useEffect } from 'react'

export default function SupabaseDebug() {
  const [testResult, setTestResult] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [envVars, setEnvVars] = useState({
    url: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    keyDefined: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  })

  const runConnectionTest = async () => {
    setIsLoading(true)
    try {
      // Direct REST API call to bypass Supabase client
      const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/quizzes?select=count`, {
        headers: {
          'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''}`
        }
      });
      
      const responseText = await response.text();
      
      setTestResult({
        success: response.ok,
        status: response.status,
        response: responseText
      });
    } catch (error) {
      setTestResult({ 
        success: false, 
        error: String(error) 
      })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    runConnectionTest()
  }, [])

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 max-w-4xl mx-auto my-6">
      <h2 className="text-xl font-bold text-red-600 mb-4">⚠️ Supabase Connection Diagnostic</h2>
      
      <div className="bg-gray-50 p-4 rounded-md mb-4">
        <h3 className="font-semibold mb-2">Environment Variables:</h3>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="font-mono">NEXT_PUBLIC_SUPABASE_URL</div>
          <div className={envVars.url ? "text-green-600" : "text-red-600"}>
            {envVars.url ? envVars.url : "Not defined ❌"}
          </div>
          
          <div className="font-mono">NEXT_PUBLIC_SUPABASE_ANON_KEY</div>
          <div className={envVars.keyDefined ? "text-green-600" : "text-red-600"}>
            {envVars.keyDefined ? "Defined ✓" : "Not defined ❌"}
          </div>
        </div>
      </div>
      
      {testResult && (
        <div className={`p-4 rounded-md mb-4 ${testResult.success ? 'bg-green-50' : 'bg-red-50'}`}>
          <h3 className="font-semibold mb-2">Connection Test Result:</h3>
          <pre className="whitespace-pre-wrap text-sm bg-black/5 p-3 rounded overflow-auto max-h-60">
            {JSON.stringify(testResult, null, 2)}
          </pre>
        </div>
      )}
      
      <div className="flex gap-4">
        <button 
          onClick={runConnectionTest}
          disabled={isLoading}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {isLoading ? 'Testing...' : 'Test Connection Again'}
        </button>
      </div>
      
      <div className="mt-6 text-sm text-gray-600">
        <h3 className="font-semibold mb-2">Fix Instructions:</h3>
        <ol className="list-decimal pl-5">
          <li>Go to Supabase Dashboard</li>
          <li>Navigate to SQL Editor</li>
          <li>Run the SQL script provided to fix the infinite recursion in RLS policy</li>
          <li>Return to this page and click "Test Connection Again"</li>
        </ol>
      </div>
    </div>
  )
}
