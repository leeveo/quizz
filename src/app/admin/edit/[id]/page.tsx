'use client'

import { useParams, useRouter } from 'next/navigation'
import { useEffect, useState, Fragment } from 'react'
import { supabase } from '@/lib/supabase'
import { FiArrowLeft, FiPlay, FiSave, FiEdit, FiEye, FiPlusCircle, FiUsers, FiX, FiFilter, FiPlus, FiCheck, FiChevronDown, FiChevronUp } from 'react-icons/fi'
import QRCode from 'react-qr-code';
import { generateJoinUrl } from '@/lib/qrcode';
// Remove unused import
import { Dialog, Transition } from '@headlessui/react'
import Image from 'next/image' // Import Image from next/image

// Define proper types for the data
// Remove unused Quiz interface since we use individual state variables instead
interface Question {
  id: string;
  title: string;
  options: string[];
  correct: number;
  image_url?: string;
  order_index?: number;
}

interface Theme {
  id: string;
  name: string;
  description?: string;
}

interface ThemeQuestion {
  id: string;
  theme_id: string;
  content: string;
  options: string[];
  correct_option: string;
  image_url?: string;
  duration?: number; // Add the missing duration property as optional
}

export default function EditQuizPage() {
  const params = useParams();
  const router = useRouter();

  // Improved ID parsing
  const rawId = params.id;
  const quizId = typeof rawId === 'string' ? rawId : Array.isArray(rawId) ? rawId[0] : null;
  
  console.log('📦 Raw params:', params);
  console.log('📦 Parsed ID:', quizId);

  const [loading, setLoading] = useState(true);
  // Remove unused quizData state and just use individual fields
  const [title, setTitle] = useState('')
  const [theme, setTheme] = useState('')
  const [eventName, setEventName] = useState('')
  const [eventDate, setEventDate] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [isQuestionsModalOpen, setIsQuestionsModalOpen] = useState(false)
  const [themes, setThemes] = useState<Theme[]>([])
  const [themeQuestions, setThemeQuestions] = useState<{ [themeId: string]: ThemeQuestion[] }>({})
  const [selectedThemeId, setSelectedThemeId] = useState<string | null>(null)
  const [expandedThemeId, setExpandedThemeId] = useState<string | null>(null)
  const [selectedQuestions, setSelectedQuestions] = useState<{ [id: string]: boolean }>({})
  const [addingQuestions, setAddingQuestions] = useState(false)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [questions, setQuestions] = useState<Question[]>([])

  // Add state for modals
  const [isLaunchModalOpen, setIsLaunchModalOpen] = useState(false)
  const [launchModalStatus, setLaunchModalStatus] = useState<'loading' | 'success' | 'error' | null>(null)
  const [launchModalMessage, setLaunchModalMessage] = useState('')

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      console.log('🔄 Fetching quiz for ID:', quizId);

      try {
        // Improved validation - UUID regex pattern for Supabase IDs
        const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        
        // Check for numeric ID as well since some tables might use numeric IDs
        if (!quizId || (isNaN(Number(quizId)) && !uuidPattern.test(quizId))) {
          console.error('❌ Invalid quiz ID format:', quizId);
          throw new Error('ID de quiz invalide ou mal formaté');
        }

        // Log connection details for debugging
        console.log('Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
        console.log('Supabase Key exists:', !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

        try {
          // Try fetching with the Supabase client
          console.log('Attempting to fetch quiz with Supabase client...');
          const { data, error } = await supabase
            .from('quizzes')
            .select('*, questions!questions_quiz_id_fkey(*)')
            .eq('id', quizId)
            .single();

          console.log('Raw response:', { data, error });

          if (error) {
            throw error;
          }

          if (!data) {
            throw new Error('Quiz introuvable');
          }

          console.log('✅ Quiz fetched successfully with Supabase client:', data);
          // Remove setQuizData since we're not using quizData
          setTitle(data.title || '');
          setTheme(data.theme || '');
          setEventName(data.event_name || '');
          setEventDate(data.event_date || '');
          setQuestions(data.questions || []);
          
          // Fetch themes
          const { data: themeList, error: themeError } = await supabase.from('themes').select('*');
          if (themeError) {
            console.error('❌ Error fetching themes:', themeError);
          } else {
            setThemes(themeList || []);
          }
          
          // Exit early with success
          return;
        } catch (supabaseError) {
          console.error('❌ Supabase client error:', supabaseError);
          // Continue to fallback methods
        }

        // Try with REST API (better error handling)
        console.log('Trying REST API approach...');
        try {
          // Make sure URL is properly constructed with trailing slash if needed
          const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
          const apiUrl = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
          
          // Properly encode the URL components
          const endpoint = `${apiUrl}rest/v1/quizzes?id=eq.${encodeURIComponent(quizId)}&select=*,questions(*)`;
          console.log('Fallback endpoint:', endpoint);
          
          const response = await fetch(endpoint, {
            method: 'GET', // Explicitly set method
            headers: {
              'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
              'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''}`,
              'Content-Type': 'application/json',
              'Accept': 'application/json',
            },
          });
          
          console.log('Fallback fetch response status:', response.status);
          
          if (!response.ok) {
            const responseText = await response.text();
            console.error('Response text for error:', responseText);
            throw new Error(`Fetch failed: ${response.status} ${response.statusText} - ${responseText}`);
          }
          
          const jsonData = await response.json();
          console.log('Fallback fetch data:', jsonData);
          
          if (!Array.isArray(jsonData) || jsonData.length === 0) {
            throw new Error('Quiz introuvable dans la réponse API');
          }
          
          const data = jsonData[0];
          console.log('✅ Quiz fetched via REST API:', data);
          setTitle(data.title || '');
          setTheme(data.theme || '');
          setEventName(data.event_name || '');
          setEventDate(data.event_date || '');
          setQuestions(data.questions || []);
          
          // Fetch themes (using Supabase client as fallback)
          try {
            const { data: themeList } = await supabase.from('themes').select('*');
            setThemes(themeList || []);
          } catch (themeError) {
            console.error('❌ Error fetching themes:', themeError);
            // Non-blocking error, continue
          }
        } catch (restError) {
          console.error('❌ REST API error:', restError);
          throw restError; // Re-throw to be caught by the outer catch
        }
      } catch (err) {
        console.error('❌ Overall error fetching quiz:', err);
        setError(`Erreur: ${err instanceof Error ? err.message : 'Une erreur inconnue est survenue'}`);
        
        // Try one final approach - direct endpoint with specific formatting
        try {
          console.log('Attempting emergency fallback fetch...');
          const emergencyEndpoint = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/quizzes?id=eq.${quizId}`;
          const response = await fetch(emergencyEndpoint, {
            headers: {
              'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
              'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''}`,
            }
          });
          
          if (response.ok) {
            const jsonData = await response.json();
            if (Array.isArray(jsonData) && jsonData.length > 0) {
              console.log('✅ Quiz fetched via emergency endpoint:', jsonData[0]);
              setError(null); // Clear error since we recovered
              // Remove setQuizData since we're not using quizData
              setTitle(jsonData[0].title || '');
              setTheme(jsonData[0].theme || '');
              setEventName(jsonData[0].event_name || '');
              setEventDate(jsonData[0].event_date || '');
              
              // Try to get questions in a separate call
              const questionsResponse = await fetch(
                `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/questions?quiz_id=eq.${quizId}`,
                {
                  headers: {
                    'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
                    'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''}`,
                  }
                }
              );
              
              if (questionsResponse.ok) {
                const questionsData = await questionsResponse.json();
                setQuestions(questionsData || []);
              }
            }
          }
        } catch (emergencyError) {
          console.error('❌ Emergency fallback also failed:', emergencyError);
          // We've tried everything, just show the error to the user
        }
      } finally {
        setLoading(false);
      }
    };

    if (quizId) fetchData();
  }, [quizId])

  const handleUpdate = async () => {
    setError(null)
    setSuccess(null)

    if (!title || !theme || !eventName || !eventDate) {
      setError('Tous les champs sont requis')
      return
    }

    const { error } = await supabase
      .from('quizzes')
      .update({
        title,
        theme,
        event_name: eventName,
        event_date: eventDate,
      })
      .eq('id', quizId)

    if (error) {
      console.error('❌ Update failed:', error)
      setError('Erreur lors de la mise à jour')
    } else {
      setSuccess('Quiz mis à jour avec succès')
    }
  }

  const handleLaunch = async () => {
    try {
      setIsLaunchModalOpen(true)
      setLaunchModalStatus('loading')
      setLaunchModalMessage('Lancement du quiz en cours...')
      
      console.log('Attempting to launch quiz:', quizId);
      
      if (!quizId) {
        setLaunchModalStatus('error')
        setLaunchModalMessage('ID de quiz manquant')
        return;
      }
      
      // Add explicit URL and token logging for debugging
      console.log('Using Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL)
      console.log('Supabase anon key defined:', !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
      
      // Use a direct fetch approach instead of the helper to avoid potential issues
      // FIXED: Removed launch_id from the request body since that column doesn't exist
      const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/quizzes?id=eq.${quizId}`, {
        method: 'PATCH',
        headers: {
          'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify({
          active: true,
          launched_at: new Date().toISOString()
          // Removed launch_id field which was causing the error
        })
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Launch failed: ${response.status} - ${errorText}`);
      }
      
      setLaunchModalStatus('success')
      setLaunchModalMessage('Quiz lancé avec succès! Les participants peuvent maintenant rejoindre.')
      setSuccess('Quiz lancé avec succès! Les participants peuvent maintenant rejoindre.');
      
    } catch (err) {
      console.error('❌ Unexpected error in handleLaunch:', err);
      setLaunchModalStatus('error')
      setLaunchModalMessage(`Une erreur inattendue est survenue: ${err instanceof Error ? err.message : 'Erreur inconnue'}`)
      setError(`Une erreur inattendue est survenue: ${err instanceof Error ? err.message : 'Erreur inconnue'}`);
    }
  }

  const handleDeleteQuestion = async (questionId: number | string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette question ?')) return;
    
    const { error } = await supabase
      .from('questions')
      .delete()
      .eq('id', questionId)
    
    if (error) {
      console.error('❌ Delete error:', error)
      setError('Erreur lors de la suppression de la question')
    } else {
      setSuccess('Question supprimée avec succès')
      // Update local questions list
      setQuestions(questions.filter(q => q.id !== questionId))
    }
  }

  // Fix the null check issue with generateJoinUrl
  const joinUrl = generateJoinUrl(quizId || ''); // Use empty string as fallback for null

  // Fetch themes and questions data
  const fetchThemesAndQuestions = async () => {
    try {
      // Fetch themes
      const { data: themesData, error: themeErr } = await supabase
        .from('themes')
        .select('*')
        .order('name', { ascending: true });
      
      if (themeErr) throw themeErr;
      setThemes(themesData || []);
      
      // Fetch questions for all themes
      const { data: questionsData, error: qErr } = await supabase
        .from('theme_questions')
        .select('*');
      
      if (qErr) throw qErr;
      
      // Group questions by theme
      const grouped: { [themeId: string]: ThemeQuestion[] } = {};
      if (questionsData) {
        for (const q of questionsData) {
          if (!grouped[q.theme_id]) grouped[q.theme_id] = [];
          grouped[q.theme_id].push(q);
        }
      }
      
      setThemeQuestions(grouped);
    } catch (err) {
      console.error('Error fetching themes and questions:', err);
    }
  };
  
  // Load themes when modal opens
  useEffect(() => {
    if (isQuestionsModalOpen) {
      fetchThemesAndQuestions();
    }
  }, [isQuestionsModalOpen]);
  
  // Toggle theme expansion
  const toggleThemeExpansion = (themeId: string) => {
    setExpandedThemeId(expandedThemeId === themeId ? null : themeId);
  };
  
  // Add selected questions to the quiz
  const addQuestionsToQuiz = async () => {
    const selectedIds = Object.keys(selectedQuestions).filter(id => selectedQuestions[id]);
    
    if (selectedIds.length === 0) {
      alert('Veuillez sélectionner au moins une question');
      return;
    }
    
    setAddingQuestions(true);
    
    try {
      // Find the selected theme questions
      const questionsToAdd = [];
      
      for (const themeId in themeQuestions) {
        const themeQs = themeQuestions[themeId];
        for (const q of themeQs) {
          if (selectedIds.includes(q.id)) {
            // Find the correct option index
            const correctIndex = q.options.findIndex((opt: string) => opt === q.correct_option);
            
            questionsToAdd.push({
              quiz_id: quizId,
              title: q.content,
              options: q.options,
              correct: correctIndex >= 0 ? correctIndex : 0,
              image_url: q.image_url || null
            });
          }
        }
      }
      
      if (questionsToAdd.length === 0) {
        throw new Error('Aucune question valide sélectionnée');
      }
      
      // Insert the questions
      const { error } = await supabase
        .from('questions')
        .insert(questionsToAdd);
      
      if (error) throw error;
      
      // Show success message
      setSuccessMessage(`${questionsToAdd.length} question(s) ajoutée(s) avec succès!`);
      
      // Clear selections
      setSelectedQuestions({});
      
      // Reload questions by refetching the data directly instead of calling loadQuizDetails
      if (quizId) {
        try {
          const { data, error } = await supabase
            .from('quizzes')
            .select('*, questions!questions_quiz_id_fkey(*)')
            .eq('id', quizId)
            .single();
          
          if (!error && data) {
            setTitle(data.title || '');
            setTheme(data.theme || '');
            setEventName(data.event_name || '');
            setEventDate(data.event_date || '');
            setQuestions(data.questions || []);
            console.log('Quiz data refreshed successfully after adding questions');
          } else {
            console.error('Error refreshing quiz data:', error);
          }
        } catch (err) {
          console.error('Exception while refreshing quiz data:', err);
        }
      }
      
      // Auto-hide success message after 3 seconds
      setTimeout(() => {
        setSuccessMessage(null);
      }, 3000);
      
    } catch (err) {
      console.error('Error adding questions:', err);
      alert(`Erreur: ${err instanceof Error ? err.message : 'Une erreur est survenue'}`);
    } finally {
      setAddingQuestions(false);
    }
  };
  
  // Select all questions in a theme
  const selectAllQuestionsInTheme = (themeId: string) => {
    const newSelected = { ...selectedQuestions };
    
    // Get questions for this theme
    const questions = themeQuestions[themeId] || [];
    
    // Set all to selected
    questions.forEach(q => {
      newSelected[q.id] = true;
    });
    
    setSelectedQuestions(newSelected);
  };
  
  // Deselect all questions in a theme
  const deselectAllQuestionsInTheme = (themeId: string) => {
    const newSelected = { ...selectedQuestions };
    
    // Get questions for this theme
    const questions = themeQuestions[themeId] || [];
    
    // Remove all from selected
    questions.forEach(q => {
      delete newSelected[q.id];
    });
    
    setSelectedQuestions(newSelected);
  };
  
  // Count selected questions
  const countSelectedQuestions = () => {
    return Object.values(selectedQuestions).filter(Boolean).length;
  };
  
  if (loading) {
    return <div className="p-10 text-center text-gray-600">Chargement...</div>
  }

  // Launch confirmation modal
  const renderLaunchModal = () => (
    <Transition appear show={isLaunchModalOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={() => {
        if (launchModalStatus !== 'loading') setIsLaunchModalOpen(false)
      }}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" />
        </Transition.Child>
        
        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                <Dialog.Title as="h3" className="text-xl font-bold text-gray-900 mb-4">
                  {launchModalStatus === 'loading' ? 'Lancement du quiz' :
                   launchModalStatus === 'success' ? 'Quiz lancé avec succès' :
                   launchModalStatus === 'error' ? 'Erreur' : 'Lancer le quiz'}
                </Dialog.Title>
                
                <div className="mt-3">
                  {launchModalStatus === 'loading' && (
                    <div className="flex items-center justify-center mb-4">
                      <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                  )}
                  
                  {launchModalStatus === 'success' && (
                    <div className="bg-green-50 border border-green-200 text-green-700 p-4 rounded-md mb-4 flex items-start">
                      <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center mr-3 flex-shrink-0">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                        </svg>
                      </div>
                      <p>{launchModalMessage}</p>
                    </div>
                  )}
                  
                  {launchModalStatus === 'error' && (
                    <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-md mb-4 flex items-start">
                      <div className="w-6 h-6 bg-red-100 rounded-full flex items-center justify-center mr-3 flex-shrink-0">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </div>
                      <p>{launchModalMessage}</p>
                    </div>
                  )}
                  
                  {launchModalStatus === null && (
                    <p className="text-gray-600 mb-4">
                      Êtes-vous sûr de vouloir lancer ce quiz ? Les participants pourront alors le rejoindre.
                    </p>
                  )}
                </div>
                
                <div className="mt-6 flex justify-end space-x-3">
                  {launchModalStatus === null && (
                    <>
                      <button
                        type="button"
                        className="inline-flex justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none"
                        onClick={() => setIsLaunchModalOpen(false)}
                      >
                        Annuler
                      </button>
                      <button
                        type="button"
                        className="inline-flex justify-center rounded-md border border-transparent bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 focus:outline-none"
                        onClick={handleLaunch}
                      >
                        Lancer le quiz
                      </button>
                    </>
                  )}
                  
                  {launchModalStatus === 'loading' && (
                    <button
                      type="button"
                      className="inline-flex justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-400 cursor-not-allowed"
                      disabled
                    >
                      Veuillez patienter...
                    </button>
                  )}
                  
                  {(launchModalStatus === 'success' || launchModalStatus === 'error') && (
                    <>
                      <button
                        type="button"
                        className="inline-flex justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none"
                        onClick={() => setIsLaunchModalOpen(false)}
                      >
                        Fermer
                      </button>
                      
                      {launchModalStatus === 'success' && (
                        <button
                          type="button"
                          className="inline-flex justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 focus:outline-none"
                          onClick={() => router.push(`/admin/preview/${quizId}`)}
                        >
                          Prévisualiser
                        </button>
                      )}
                    </>
                  )}
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  )

  return (
    <div className="max-w-6xl mx-auto px-4 md:px-0">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4 md:gap-0">
        <div className="flex items-center">
          <button
            onClick={() => router.push('/dashboard')}
            className="text-indigo-600 flex items-center gap-2 mr-4"
          >
            <FiArrowLeft /> Retour au tableau de bord
          </button>
          <h1 className="text-xl md:text-2xl font-bold text-indigo-700">Modifier le Quiz {title}</h1>
        </div>
        
        <div className="flex gap-2 w-full md:w-auto">
          <button
            onClick={() => router.push(`/admin/preview/${quizId}`)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded flex items-center gap-2 flex-1 md:flex-initial justify-center"
          >
            <FiEye /> <span className="md:inline">Prévisualiser</span>
          </button>
          <button
            onClick={() => setIsLaunchModalOpen(true)}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded flex items-center gap-2 flex-1 md:flex-initial justify-center"
          >
            <FiPlay /> <span className="md:inline">Lancer</span>
          </button>
        </div>
      </div>

      {error && <div className="bg-red-100 text-red-700 px-4 py-3 rounded mb-4">{error}</div>}
      {success && <div className="bg-green-100 text-green-700 px-4 py-3 rounded mb-4">{success}</div>}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
        {/* Colonne de gauche: Détails du quiz */}
        <div className="md:col-span-1">
          <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
            <h2 className="text-xl font-bold text-indigo-700 mb-4 flex items-center">
              <FiEdit className="mr-2" /> Informations du quiz
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Titre</label>
                <input
                  className="w-full border border-gray-300 p-2 rounded mt-1"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Thème</label>
                <select
                  className="w-full border border-gray-300 p-2 rounded mt-1"
                  value={theme}
                  onChange={(e) => setTheme(e.target.value)}
                >
                  <option value="">Sélectionnez un thème</option>
                  {themes.map((t) => (
                    <option key={t.id} value={t.name}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Nom de l&apos;événement</label>
                <input
                  className="w-full border border-gray-300 p-2 rounded mt-1"
                  value={eventName}
                  onChange={(e) => setEventName(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Date</label>
                <input
                  type="date"
                  className="w-full border border-gray-300 p-2 rounded mt-1"
                  value={eventDate}
                  onChange={(e) => setEventDate(e.target.value)}
                />
              </div>

              <button
                onClick={handleUpdate}
                className="mt-4 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded w-full flex items-center justify-center gap-2"
              >
                <FiSave /> Enregistrer les modifications
              </button>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-bold text-indigo-700 mb-4 flex items-center">
              <FiPlusCircle className="mr-2" /> Ajouter des questions
            </h2>
            <p className="text-gray-600 mb-4">Ajoutez des questions à votre quiz depuis les thèmes disponibles ou créez des questions personnalisées.</p>
            <button
              onClick={() => setIsQuestionsModalOpen(true)}
              className="w-full bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded flex items-center justify-center gap-2"
            >
              <FiPlus size={18} />
              Gérer les questions
            </button>
          </div>
        </div>
        
        {/* Colonne de droite: Questions */}
        <div className="md:col-span-2">
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-bold text-indigo-700 mb-4">
              Questions du quiz ({questions.length})
            </h2>
            
            {questions.length === 0 ? (
              <div className="text-center py-10 text-gray-500">
                <p>Aucune question ajoutée à ce quiz.</p>
                <button
                  onClick={() => router.push(`/admin?tab=create&quizId=${quizId}`)}
                  className="mt-4 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded"
                >
                  Ajouter des questions
                </button>
              </div>
            ) : (
              <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
                {questions.map((question, index) => (
                  <div key={question.id} className="bg-gray-50 hover:bg-indigo-50 rounded-lg p-4 border border-gray-200 transition-colors">
                    <div className="flex justify-between">
                      <h3 className="font-medium text-indigo-700">
                        {index + 1}. {question.title}
                      </h3>
                      <button
                        onClick={() => handleDeleteQuestion(question.id)}
                        className="text-red-500 hover:text-red-700"
                        title="Supprimer cette question"
                      >
                        ×
                      </button>
                    </div>
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      {question.options.map((option: string, optIndex: number) => (
                        <div
                          key={optIndex}
                          className={`text-sm p-2 rounded ${
                            optIndex === question.correct
                              ? 'bg-green-100 text-green-800 border border-green-200'
                              : 'bg-gray-100 text-gray-700 border border-gray-200'
                          }`}
                        >
                          {option}
                          {optIndex === question.correct && ' ✓'}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-lg p-6 mt-6">
        <h2 className="text-xl font-bold text-indigo-700 mb-4 flex items-center">
          <FiUsers className="mr-2" /> Participation
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
          <div>
            <p className="text-gray-600 mb-4">
              Partagez ce QR code pour permettre aux participants de rejoindre le quiz:
            </p>
            <div className="bg-white p-4 inline-flex rounded-lg border border-gray-200">
              <QRCode value={joinUrl} size={150} />
            </div>
          </div>
          
          <div>
            <p className="text-gray-600 mb-2">Lien de participation:</p>
            <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 text-sm break-all mb-4">
              {joinUrl}
            </div>
            <button
              onClick={() => {
                navigator.clipboard.writeText(joinUrl);
                setSuccess('Lien copié dans le presse-papier!');
                setTimeout(() => setSuccess(null), 3000);
              }}
              className="px-4 py-2 bg-indigo-100 text-indigo-700 rounded hover:bg-indigo-200 transition"
            >
              Copier le lien
            </button>
          </div>
        </div>
      </div>
      
      {/* Questions Management Modal */}
      <Transition appear show={isQuestionsModalOpen} as={Fragment}>
        <Dialog as="div" className="relative z-50" onClose={() => setIsQuestionsModalOpen(false)}>
          {/* Modal backdrop */}
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" />
          </Transition.Child>
          
          {/* Modal content */}
          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4 text-center">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <Dialog.Panel className="w-full max-w-5xl transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                  <div className="flex justify-between items-start mb-4">
                    <Dialog.Title as="h3" className="text-xl font-bold text-indigo-700">
                      Ajouter des questions à votre quiz
                    </Dialog.Title>
                    <button
                      onClick={() => setIsQuestionsModalOpen(false)}
                      className="text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      <FiX size={24} />
                    </button>
                  </div>
                  
                  {/* Success message */}
                  {successMessage && (
                    <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-700 rounded-lg flex items-center">
                      <FiCheck className="text-green-500 mr-2" size={20} />
                      {successMessage}
                    </div>
                  )}
                  
                  {/* Theme selection */}
                  <div className="mb-6">
                    <div className="flex justify-between items-center mb-3">
                      <h4 className="font-semibold text-gray-700 flex items-center">
                        <FiFilter className="mr-2" />
                        Sélectionner un thème
                      </h4>
                      <div className="text-sm text-indigo-600 font-medium">
                        {countSelectedQuestions()} question(s) sélectionnée(s)
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {themes.map(theme => (
                        <button
                          key={theme.id}
                          className={`text-left p-3 rounded-lg border transition-colors ${
                            selectedThemeId === theme.id
                              ? 'bg-indigo-50 border-indigo-300 shadow-sm'
                              : 'hover:bg-gray-50 border-gray-200'
                          }`}
                          onClick={() => setSelectedThemeId(theme.id)}
                        >
                          <h5 className="font-medium text-gray-800">{theme.name}</h5>
                          <p className="text-xs text-gray-500 mt-1 line-clamp-1">
                            {theme.description || 'Aucune description'}
                          </p>
                          <div className="mt-2 text-xs bg-indigo-100 text-indigo-800 rounded-full px-2 py-0.5 inline-block">
                            {(themeQuestions[theme.id] || []).length} question(s)
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                  
                  {/* Questions list for selected theme */}
                  {selectedThemeId && (
                    <div className="border rounded-xl overflow-hidden">
                      <div className="bg-indigo-50 p-4 flex justify-between items-center border-b">
                        <h4 className="font-bold text-indigo-700">
                          {themes.find(t => t.id === selectedThemeId)?.name || 'Thème sélectionné'}
                        </h4>
                        <div className="flex gap-2">
                          <button
                            className="px-3 py-1 text-sm bg-indigo-100 text-indigo-700 rounded hover:bg-indigo-200 transition-colors"
                            onClick={() => selectAllQuestionsInTheme(selectedThemeId)}
                          >
                            Tout sélectionner
                          </button>
                          <button
                            className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
                            onClick={() => deselectAllQuestionsInTheme(selectedThemeId)}
                          >
                            Tout désélectionner
                          </button>
                        </div>
                      </div>
                      
                      <div className="max-h-96 overflow-y-auto p-4 bg-white">
                        {(themeQuestions[selectedThemeId] || []).length > 0 ? (
                          <div className="space-y-3">
                            {(themeQuestions[selectedThemeId] || []).map(question => (
                              <div 
                                key={question.id}
                                className={`border rounded-lg transition-colors ${
                                  selectedQuestions[question.id]
                                    ? 'border-indigo-300 bg-indigo-50'
                                    : 'border-gray-200 hover:border-indigo-200 hover:bg-indigo-50/30'
                                }`}
                              >
                                <div className="p-3 flex items-start gap-3">
                                  <input
                                    type="checkbox"
                                    id={`q-${question.id}`}
                                    checked={!!selectedQuestions[question.id]}
                                    onChange={() => {
                                      setSelectedQuestions(prev => ({
                                        ...prev,
                                        [question.id]: !prev[question.id]
                                      }));
                                    }}
                                    className="mt-1 h-4 w-4 accent-indigo-600 rounded"
                                  />
                                  <div className="flex-1">
                                    <label 
                                      htmlFor={`q-${question.id}`}
                                      className="block font-medium text-gray-800 cursor-pointer"
                                    >
                                      {question.content}
                                    </label>
                                    
                                    <div className="mt-2 flex flex-wrap gap-1">
                                      {question.options.map((option: string, idx: number) => (
                                        <span 
                                          key={idx} 
                                          className={`text-xs px-2 py-1 rounded ${
                                            option === question.correct_option
                                              ? 'bg-green-100 text-green-800'
                                              : 'bg-gray-100 text-gray-700'
                                          }`}
                                        >
                                          {option}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                  
                                  <button
                                    onClick={() => toggleThemeExpansion(question.id)}
                                    className="text-gray-400 hover:text-gray-600"
                                  >
                                    {expandedThemeId === question.id ? (
                                      <FiChevronUp size={20} />
                                    ) : (
                                      <FiChevronDown size={20} />
                                    )}
                                  </button>
                                </div>
                                
                                {/* Expanded details */}
                                {expandedThemeId === question.id && (
                                  <div className="p-3 border-t bg-gray-50">
                                    {question.image_url && (
                                      <div className="mb-3">
                                        {/* Replace img with next/image */}
                                        <Image 
                                          src={question.image_url} 
                                          alt="Question image" 
                                          width={160}
                                          height={120}
                                          className="max-h-40 rounded border mx-auto object-contain"
                                        />
                                      </div>
                                    )}
                                    <div className="text-xs text-gray-500">
                                      <p>Durée: {question.duration || 'Non spécifiée'} secondes</p>
                                      <p>Réponse correcte: {question.correct_option}</p>
                                    </div>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-8 text-gray-500">
                            Aucune question disponible pour ce thème.
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  
                  {/* Action buttons */}
                  <div className="mt-6 flex justify-end gap-3">
                    <button
                      className="px-4 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
                      onClick={() => setIsQuestionsModalOpen(false)}
                    >
                      Annuler
                    </button>
                    <button
                      className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                      onClick={addQuestionsToQuiz}
                      disabled={countSelectedQuestions() === 0 || addingQuestions}
                    >
                      {addingQuestions ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          Ajout en cours...
                        </>
                      ) : (
                        <>
                          <FiPlus size={18} />
                          Ajouter {countSelectedQuestions()} question(s)
                        </>
                      )}
                    </button>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>

      {/* Add the launch modal to the render */}
      {renderLaunchModal()}
    </div>
  )
}
