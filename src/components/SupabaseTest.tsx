'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function SupabaseTest() {
  const [error, setError] = useState<string | null>(null)
  const [themes, setThemes] = useState<any[]>([])
  const [tableStatus, setTableStatus] = useState<any>({})
  const [loading, setLoading] = useState(true)

  // Test the connection by loading available tables
  const testConnection = async () => {
    try {
      setLoading(true)
      setError(null)
      
      // Test specific tables existence and count
      const tables = ['themes', 'theme_questions', 'quizzes', 'questions', 'participants', 'answers']
      const tableResults: Record<string, any> = {}
      
      for (const table of tables) {
        try {
          const { count, error } = await supabase
            .from(table)
            .select('*', { count: 'exact', head: true })
          
          tableResults[table] = {
            exists: !error,
            count: count || 0,
            error: error ? error.message : null
          }
        } catch (e: any) {
          tableResults[table] = {
            exists: false,
            count: 0,
            error: e.message
          }
        }
      }
      
      setTableStatus(tableResults)
      
      // Try to get themes with structure info
      const { data: themesData, error: themesError } = await supabase
        .from('themes')
        .select('*')
      
      if (themesError) {
        setError(`Themes error: ${themesError.message}`)
        console.error('Themes error:', themesError)
      } else {
        setThemes(themesData || [])
        console.log('Themes from Supabase:', themesData)
        
        // Get column info for themes table
        try {
          const { data: columnsData } = await supabase.rpc('get_columns_info', { table_name: 'themes' })
          console.log('Themes table structure:', columnsData || 'RPC not available')
        } catch (e) {
          console.log('Could not fetch columns info')
        }
      }
    } catch (err: any) {
      setError(`Unexpected error: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    testConnection()
  }, [])

  return (
    <div className="p-6 max-w-4xl mx-auto bg-white rounded-xl shadow-md my-10">
      <h2 className="text-2xl font-bold text-indigo-700 mb-4">Diagnostic Supabase</h2>
      
      {loading && <p className="text-gray-500">Chargement en cours...</p>}
      
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-md mb-4">
          <p className="font-bold">Erreur:</p>
          <p>{error}</p>
        </div>
      )}
      
      <div className="mt-4">
        <h3 className="text-lg font-semibold mb-2">État des tables:</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white border border-gray-200">
            <thead>
              <tr>
                <th className="py-2 px-4 border-b">Table</th>
                <th className="py-2 px-4 border-b">Statut</th>
                <th className="py-2 px-4 border-b">Nombre</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(tableStatus).map(([table, status]: [string, any]) => (
                <tr key={table}>
                  <td className="py-2 px-4 border-b font-medium">{table}</td>
                  <td className="py-2 px-4 border-b">
                    {status.exists ? (
                      <span className="text-green-600">Accessible ✓</span>
                    ) : (
                      <span className="text-red-600">Erreur ✗</span>
                    )}
                  </td>
                  <td className="py-2 px-4 border-b">
                    {status.exists ? status.count : 'N/A'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      
      <div className="mt-6">
        <h3 className="text-lg font-semibold mb-2">Thèmes trouvés ({themes.length}):</h3>
        {themes.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {themes.map((theme, index) => (
              <div key={index} className="border border-gray-200 rounded-md p-4">
                <p className="font-bold">{theme.name || 'Sans nom'}</p>
                <p className="text-sm text-gray-600">{theme.description || 'Sans description'}</p>
                <p className="text-xs text-gray-400 mt-1">ID: {theme.id}</p>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 p-4 rounded-md">
            <p className="font-bold">Aucun thème trouvé</p>
            <p>Vous devez créer des thèmes pour pouvoir ajouter des questions.</p>
          </div>
        )}
      </div>
      
      <div className="mt-6 flex gap-4">
        <button 
          onClick={testConnection}
          className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700"
        >
          Tester à nouveau
        </button>
        
        <button 
          onClick={async () => {
            if (!themes.length) {
              try {
                // Créer un thème de test - sans utiliser description si la colonne n'existe pas
                const themeData = {
                  name: 'Musique'
                }
                
                // On vérifie si un des thèmes existants a une propriété description
                const hasDescription = themes.length > 0 && themes.some(t => 'description' in t)
                
                if (hasDescription) {
                  // Si oui, on ajoute la description
                  themeData['description'] = 'Questions sur la musique, artistes, chansons et instruments'
                }
                
                const { data, error } = await supabase.from('themes').insert(themeData).select().single()
                
                if (error) {
                  alert(`Erreur lors de la création du thème: ${error.message}`)
                } else {
                  alert('Thème de test créé avec succès !')
                  testConnection()
                }
              } catch (e: any) {
                alert(`Erreur: ${e.message}`)
              }
            } else {
              alert('Des thèmes existent déjà dans la base de données.')
            }
          }}
          className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
        >
          Créer un thème de test
        </button>
      </div>
    </div>
  )
}
