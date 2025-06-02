'use client'

import { useEffect, useState, useCallback } from 'react'
import { FiGrid, FiPlusCircle, FiBarChart2 } from 'react-icons/fi'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { createQuiz } from '../actions'
// import SupabaseDebug from '@/components/SupabaseDebug'

// Define navItems outside the component to ensure it's always available
const navItems = [
  { label: 'Dashboard', icon: <FiGrid />, tab: 'dashboard' },
  { label: 'Créer Quiz', icon: <FiPlusCircle />, tab: 'create' },
  { label: 'Stats', icon: <FiBarChart2 />, tab: 'stats' }
];

type Quiz = {
  id: number
  title: string
  theme: string
  event_name?: string
  event_date?: string
  created_by: string | null
}

type Theme = {
  id: string
  name: string
  description: string
}

type ThemeQuestion = {
  id: string
  theme_id: string
  content: string
  options: string[]
  correct_option: string
  duration: number
  image_url?: string
}

// Add this function to help with error debugging
const logError = (message: string, error: any) => {
  console.error(message, error);
  // Check if it's an empty error object which often indicates connection issues
  if (error && Object.keys(error).length === 0) {
    console.error('Empty error object detected. This may indicate a connection issue with Supabase.');
    console.error('Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
    // Don't log the key for security reasons
    console.error('Supabase Key defined:', !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  }
  return error;
};

export default function AdminPage() {
  const searchParams = useSearchParams()
  const initialTab = searchParams.get('tab') as 'dashboard' | 'create' | 'stats' || 'dashboard'
  const initialQuizId = searchParams.get('quizId') ? Number(searchParams.get('quizId')) : null
  
  const [activeTab, setActiveTab] = useState<'dashboard' | 'create' | 'stats'>(initialTab)
  const router = useRouter()

  // Quiz creation state
  const [quizTitle, setQuizTitle] = useState('')
  const [quizTheme, setQuizTheme] = useState('')
  const [eventName, setEventName] = useState('')
  const [eventDate, setEventDate] = useState('')
  // Add state for primary color with a default value
  const [primaryColor, setPrimaryColor] = useState('#4f46e5') // Default indigo color
  const [quizzes, setQuizzes] = useState<Quiz[]>([])
  const [selectedQuizId, setSelectedQuizId] = useState<number | null>(null)
  const [quizCreationSuccess, setQuizCreationSuccess] = useState<string | null>(null)
  const [quizCreationError, setQuizCreationError] = useState<string | null>(null)
  const [questionAddSuccess, setQuestionAddSuccess] = useState<string | null>(null)
  const [selectedQuizDetails, setSelectedQuizDetails] = useState<Quiz | null>(null)

  // Questions personnalisées
  const [title, setTitle] = useState('')
  const [options, setOptions] = useState(['', '', '', ''])

  // Thèmes/questions depuis Supabase
  const [themes, setThemes] = useState<Theme[]>([])
  const [themeQuestions, setThemeQuestions] = useState<{ [themeId: string]: ThemeQuestion[] }>({})
  const [selectedTheme, setSelectedTheme] = useState<string | null>(null)
  const [selectedThemeQuestions, setSelectedThemeQuestions] = useState<{ [questionId: string]: boolean }>({})

  // Nouvel état pour gérer l'étape de création
  const [creationStep, setCreationStep] = useState<'initial' | 'customize'>('initial')

  // Add a state to track selected questions for the recap
  const [selectedQuestions, setSelectedQuestions] = useState<Array<{
    id: string;
    content: string;
    themeId?: string;
    themeName?: string;
    custom?: boolean;
  }>>([]);

  // Improved fetch quizzes function
  const fetchQuizzes = async () => {
    try {
      console.log('Fetching quizzes...');
      // Explicitly log the URL and credentials status
      console.log('Supabase URL defined:', !!process.env.NEXT_PUBLIC_SUPABASE_URL);
      console.log('Supabase Key defined:', !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
      
      // Use direct fetch instead of client to bypass potential issues
      const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/quizzes?select=*`, {
        method: 'GET',
        headers: {
          'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''}`,
        }
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Fetch failed: ${response.status} ${response.statusText} - ${errorText}`);
      }
      
      const data = await response.json();
      console.log('Quizzes fetched:', data?.length || 0);
      setQuizzes(Array.isArray(data) ? data.sort((a, b) => (b.id || 0) - (a.id || 0)) : []);
    } catch (error) {
      console.error('Error in fetchQuizzes:', error);
      setQuizzes([]);
    }
  };

  // Fetch themes and their questions from Supabase
  const fetchThemesAndQuestions = async () => {
    try {
      // 1. Récupère tous les thèmes
      const { data: themesData, error: themeErr } = await supabase.from('themes').select('*')
      if (themeErr) {
        alert('Erreur Supabase themes: ' + JSON.stringify(themeErr))
        console.error('Erreur Supabase themes:', themeErr)
      }
      // DEBUG: Affiche les thèmes dans la console
      console.log('THEMES:', themesData)
      setThemes(themesData || [])

      // 2. Récupère toutes les questions de tous les thèmes avec une limite élevée
      // FIXED: Added explicit limit to fetch all questions (default is usually 1000)
      const { data: questionsData, error: qErr } = await supabase
        .from('theme_questions')
        .select('*')
        .limit(5000) // Increased limit to ensure all questions are fetched

      if (qErr) {
        alert('Erreur Supabase theme_questions: ' + JSON.stringify(qErr))
        console.error('Erreur Supabase theme_questions:', qErr)
      }
      
      // DEBUG: Affiche les questions dans la console et compte par thème
      console.log('THEME_QUESTIONS total:', questionsData?.length || 0)
      
      // Log count of questions per theme for debugging
      if (questionsData) {
        const countByTheme: Record<string, number> = {};
        for (const q of questionsData) {
          countByTheme[q.theme_id] = (countByTheme[q.theme_id] || 0) + 1;
        }
        console.log('Questions count by theme:', countByTheme);
        console.log('History theme questions count:', countByTheme['e987982d-e44e-4f73-8136-8a4aa7d36dc0'] || 0);
      }
      
      const grouped: { [themeId: string]: ThemeQuestion[] } = {}
      if (questionsData) {
        for (const q of questionsData) {
          if (!grouped[q.theme_id]) grouped[q.theme_id] = []
          grouped[q.theme_id].push(q)
        }
      }
      setThemeQuestions(grouped)
      
      // For the specific history theme, log more details
      const historyThemeId = 'e987982d-e44e-4f73-8136-8a4aa7d36dc0';
      console.log(`History theme (${historyThemeId}) has ${grouped[historyThemeId]?.length || 0} questions loaded`);
    } catch (err) {
      console.error('Error fetching themes and questions:', err);
      alert('Une erreur est survenue lors du chargement des thèmes et questions.');
    }
  }

  // Add this function after fetchThemesAndQuestions
  const fetchHistoryThemeQuestions = async () => {
    try {
      const historyThemeId = 'e987982d-e44e-4f73-8136-8a4aa7d36dc0';
      console.log('Fetching questions specifically for History theme...');
      
      const { data, error } = await supabase
        .from('theme_questions')
        .select('*')
        .eq('theme_id', historyThemeId)
        .limit(5000);
        
      if (error) {
        console.error('Error fetching History questions:', error);
        return;
      }
      
      console.log(`Retrieved ${data?.length || 0} History theme questions`);
      
      // Update only the history theme questions in the state
      setThemeQuestions(prev => ({
        ...prev,
        [historyThemeId]: data || []
      }));
      
    } catch (err) {
      console.error('Error in fetchHistoryThemeQuestions:', err);
    }
  }

  // Load quiz details when one is selected
  const loadQuizDetails = async (quizId: number) => {
    if (!quizId) return;
    
    try {
      // Use the specific relationship as suggested in the error message
      const { data, error } = await supabase
        .from('quizzes')
        .select('*, questions!questions_quiz_id_fkey(*)')
        .eq('id', quizId)
        .single();
      
      if (error) {
        console.error('Erreur lors du chargement du quiz:', error);
        return;
      }
      
      console.log('Quiz details loaded successfully:', data);
      setSelectedQuizDetails(data);
    } catch (err) {
      console.error('Exception lors du chargement du quiz:', err);
    }
  }

  useEffect(() => {
    fetchQuizzes()
    fetchThemesAndQuestions()
    // Also fetch history theme questions specifically
    fetchHistoryThemeQuestions();
  }, [])

  useEffect(() => {
    if (selectedQuizId) {
      loadQuizDetails(selectedQuizId);
    } else {
      setSelectedQuizDetails(null);
    }
  }, [selectedQuizId]);

  // Update URL when tab changes
  const handleTabChange = useCallback((tab: 'dashboard' | 'create' | 'stats') => {
    setActiveTab(tab)
    
    if (tab === 'dashboard') {
      router.push('/dashboard')
    } else {
      router.push(`/admin?tab=${tab}${selectedQuizId ? `&quizId=${selectedQuizId}` : ''}`)
    }
  }, [router, selectedQuizId])

  // Initialize with URL params
  useEffect(() => {
    if (initialQuizId) {
      setSelectedQuizId(initialQuizId)
      setCreationStep('customize')
    }
  }, [initialQuizId])

  // Improved quiz creation function using server action
  const handleCreateQuiz = async () => {
    setQuizCreationError(null);
    setQuizCreationSuccess(null);
    
    if (!quizTitle || !quizTheme || !eventName || !eventDate) {
      setQuizCreationError("Veuillez remplir tous les champs obligatoires");
      return;
    }
    
    try {
      // Use server action instead of direct API call
      const result = await createQuiz({
        title: quizTitle,
        theme: quizTheme,
        event_name: eventName,
        event_date: eventDate,
        primary_color: primaryColor // Add primary color to the quiz data
      });
      
      if (!result.success) {
        throw new Error(result.error || "Erreur lors de la création du quiz");
      }
      
      // Process successful response
      const newQuiz = result.data;
      setQuizCreationSuccess(`Quiz "${newQuiz.title}" créé avec succès! (ID: ${newQuiz.id})`);
      setSelectedQuizId(newQuiz.id);
      setCreationStep('customize');
      
      // Rafraîchir la liste des quiz
      fetchQuizzes();
      
    } catch (e: any) {
      console.error("Exception complète:", e);
      setQuizCreationError(`Erreur: ${e.message}`);
    }
  }
  
  // Create a new question for the selected quiz (modified to add to recap)
  const handleCreateQuestion = async () => {
    setQuestionAddSuccess(null);
    
    if (!selectedQuizId || !title || options.some((o) => !o)) {
      alert("Veuillez remplir tous les champs de la question");
      return;
    }
    
    try {
      const { data, error } = await supabase.from('questions').insert([
        {
          quiz_id: selectedQuizId,
          title,
          options,
          correct: 0,
        },
      ]).select();
      
      if (error) {
        alert(`Erreur: ${error.message}`);
        return;
      }
      
      // Add to selected questions for recap
      if (data && data[0]) {
        setSelectedQuestions(prev => [...prev, {
          id: data[0].id,
          content: title,
          custom: true
        }]);
      }
      
      setQuestionAddSuccess("Question ajoutée avec succès!");
      setTitle('')
      setOptions(['', '', '', ''])
      // Reload quiz details to show new question
      loadQuizDetails(selectedQuizId);
      
    } catch (e: any) {
      alert(`Erreur inattendue: ${e.message}`);
    }
  }

  // Ajouter une ou plusieurs questions d'un thème à l'événement/quiz sélectionné (modified for recap)
  const handleAddThemeQuestions = async (themeId: string) => {
    if (!selectedQuizId) {
      showNotification("Veuillez d'abord sélectionner un quiz", 'error');
      return;
    }
    
    const questions = (themeQuestions[themeId] || []).filter(q => selectedThemeQuestions[q.id]);
    if (questions.length === 0) {
      showNotification("Veuillez sélectionner au moins une question", 'error');
      return;
    }
    
    try {
      // Format questions properly to match the required schema
      // Only include fields that exist in the questions table
      const formattedQuestions = questions.map(q => {
        // Find the index of the correct option
        const correctIndex = q.options.findIndex(opt => opt === q.correct_option);
        
        // Ensure the correct index is valid
        const correct = correctIndex >= 0 ? correctIndex : 0;
        
        // Ensure options is a proper array of strings
        const options = Array.isArray(q.options) ? 
          q.options.map(opt => String(opt)) : 
          [q.correct_option, "Option 2", "Option 3", "Option 4"];
        
        // Return only the fields that exist in the questions table
        return {
          quiz_id: selectedQuizId,
          title: q.content || "", // Ensure title is not null
          options: options,
          correct: correct,
          // Only include image_url if it exists, but NOT duration which causes the error
          ...(q.image_url && { image_url: q.image_url }),
        };
      });
      
      console.log("Données préparées pour insertion:", formattedQuestions);
      
      // Try to insert one by one if batch insert fails
      const { data, error } = await supabase.from('questions').insert(formattedQuestions).select();
      
      if (error) {
        console.error("Erreur lors de l'insertion:", error);
        
        // If batch insert failed, try inserting questions one by one
        let successCount = 0;
        let errorMessages = [];
        
        for (const q of formattedQuestions) {
          const { error: singleError } = await supabase.from('questions').insert(q);
          if (singleError) {
            errorMessages.push(`Question "${q.title}": ${singleError.message}`);
          } else {
            successCount++;
          }
        }
        
        if (successCount > 0) {
          showNotification(`${successCount}/${formattedQuestions.length} question(s) ajoutée(s) avec succès.`);
        } else {
          throw new Error(`Aucune question n'a pu être ajoutée.\n${errorMessages.join('\n')}`);
        }
      } else {
        // Add to selected questions for recap
        const theme = themes.find(t => t.id === themeId);
        const addedQuestions = questions.map(q => ({
          id: q.id,
          content: q.content,
          themeId: themeId,
          themeName: theme?.name || 'Thème inconnu'
        }));
        
        setSelectedQuestions(prev => [...prev, ...addedQuestions]);
        
        showNotification(`${questions.length} question(s) ajoutée(s) au quiz avec succès!`);
      }
      
      setSelectedThemeQuestions({})
      // Reload quiz details
      loadQuizDetails(selectedQuizId);
      
    } catch (e: any) {
      console.error("Exception complète:", e);
      showNotification(`Erreur inattendue: ${e.message}`, 'error');
    }
  }

  // New function to remove a question from the recap and optionally from the database
  const handleRemoveQuestion = async (questionId: string, removeFromDb = false) => {
    if (removeFromDb && selectedQuizId) {
      try {
        const { error } = await supabase
          .from('questions')
          .delete()
          .eq('id', questionId);
          
        if (error) {
          alert(`Erreur lors de la suppression: ${error.message}`);
          return;
        }
        
        // Reload quiz details
        loadQuizDetails(selectedQuizId);
      } catch (e: any) {
        alert(`Erreur inattendue: ${e.message}`);
      }
    }
    
    // Remove from recap
    setSelectedQuestions(prev => prev.filter(q => q.id !== questionId));
  }

  // Fonction pour lancer un quiz (ajoutez cette fonction dans la page admin)
  const handleLaunchQuiz = async (quizId: number) => {
    try {
      // Utiliser la fonction helper pour lancer le quiz
      const { error, success } = await launchQuiz(quizId);
      
      if (!success) {
        alert(`Erreur lors du lancement du quiz: ${error}`);
        return;
      }
      
      // Réinitialiser les réponses des participants si on relance un quiz
      await resetParticipantAnswers(quizId.toString());
      
      alert('Quiz lancé avec succès! Les participants peuvent maintenant rejoindre.');
      
      // Option: rediriger vers la page de prévisualisation
      if (confirm('Quiz lancé! Voulez-vous accéder à la prévisualisation?')) {
        router.push(`/admin/preview/${quizId}`);
      }
    } catch (error) {
      console.error('Error in handleLaunchQuiz:', error);
      alert('Une erreur s\'est produite lors du lancement du quiz.');
    }
  };

  // Création de quiz et questions - refonte avec onglets
  const renderCreate = () => {
    return (
      <div className="max-w-8xl mx-auto">
        {/* Tabs for the two steps - make scrollable on mobile */}
        <div className="bg-white rounded-t-xl shadow-lg p-2 md:p-4 mt-4 md:mt-8 border-b overflow-x-auto">
          <div className="flex space-x-2 md:space-x-4 min-w-max">
            <button
              onClick={() => setCreationStep('initial')}
              className={`px-3 py-2 md:px-6 md:py-3 text-sm md:text-base font-medium rounded-lg transition ${
                creationStep === 'initial' 
                  ? 'bg-indigo-600 text-white shadow-md' 
                  : 'text-gray-700 hover:bg-indigo-50'
              }`}
            >
              Étape 1: Créer l'événement
            </button>
            <button
              onClick={() => {
                if (selectedQuizId) setCreationStep('customize');
                else alert("Veuillez d'abord créer ou sélectionner un quiz");
              }}
              className={`px-3 py-2 md:px-6 md:py-3 text-sm md:text-base font-medium rounded-lg transition ${
                creationStep === 'customize' 
                  ? 'bg-indigo-600 text-white shadow-md' 
                  : 'text-gray-700 hover:bg-indigo-50'
              } ${!selectedQuizId ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              Étape 2: Personnaliser le quiz
            </button>
          </div>
        </div>
        
        {/* Content for the active step */}
        <div className="bg-white rounded-b-xl shadow-lg p-4 md:p-8">
          {creationStep === 'initial' ? (
            // Étape 1: Création initiale du quiz
            <div>
              <h2 className="text-xl md:text-2xl font-bold text-indigo-700 mb-2">Informations de l'événement Quiz</h2>
              
              <p className="text-sm md:text-base text-gray-600 mb-6">
                Renseignez les informations générales de votre quiz. Ces informations seront visibles par les participants 
                et permettront de catégoriser votre quiz. Tous les champs sont obligatoires pour créer un nouveau quiz.
              </p>
              
              {quizCreationSuccess && (
                <div className="bg-green-50 border border-green-200 text-green-700 p-4 rounded-md mb-4">
                  {quizCreationSuccess}
                </div>
              )}
              
              {quizCreationError && (
                <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-md mb-4">
                  {quizCreationError}
                </div>
              )}
              
              <div className="grid grid-cols-1 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Titre du quiz <span className="text-red-500">*</span>
                    </label>
                    <input
                      className="border border-gray-300 rounded p-2 w-full"
                      placeholder="Ex: Quiz Culture Générale"
                      value={quizTitle}
                      onChange={(e) => setQuizTitle(e.target.value)}
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Thème principal <span className="text-red-500">*</span>
                    </label>
                    <select
                      className="border border-gray-300 rounded p-2 w-full"
                      value={quizTheme}
                      onChange={(e) => setQuizTheme(e.target.value)}
                      required
                    >
                      <option value="">-- Choisir un thème principal --</option>
                      {themes.map((t) => (
                        <option key={t.id} value={t.name}>{t.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nom de l'événement <span className="text-red-500">*</span>
                    </label>
                    <input
                      className="border border-gray-300 rounded p-2 w-full"
                      placeholder="Ex: Soirée Quiz du 15 mai"
                      value={eventName}
                      onChange={(e) => setEventName(e.target.value)}
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Date de l'événement <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      className="border border-gray-300 rounded p-2 w-full"
                      value={eventDate}
                      onChange={(e) => setEventDate(e.target.value)}
                      required
                    />
                  </div>
                </div>
              </div>
              
              {/* Add color picker field */}
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Couleur principale <span className="text-red-500">*</span>
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    className="h-10 w-20 border border-gray-300 rounded cursor-pointer"
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                  />
                  <span className="text-sm text-gray-600">
                    Cette couleur sera utilisée pour personnaliser l'arrière-plan du quiz
                  </span>
                </div>
              </div>
              
              {/* Note indicating required fields */}
              <p className="text-sm text-gray-500 mt-4">
                <span className="text-red-500">*</span> Champs obligatoires
              </p>
              
              {/* Disabled button if fields are not filled */}
              <button 
                className={`w-full mt-8 py-3 text-lg transition-all ${
                  !quizTitle || !quizTheme || !eventName || !eventDate
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'btn-primary'
                }`} 
                onClick={handleCreateQuiz}
                disabled={!quizTitle || !quizTheme || !eventName || !eventDate}
              >
                Créer un nouveau quiz
              </button>
            </div>
          ) : (
            // Étape 2: Personnalisation du quiz
            <div>
              {selectedQuizDetails && (
                <div className="bg-indigo-50 p-4 rounded-lg mb-6">
                  <h4 className="font-bold text-indigo-700">Quiz sélectionné: {selectedQuizDetails.title}</h4>
                  <p className="text-sm text-gray-600">Événement: {selectedQuizDetails.event_name} - {selectedQuizDetails.event_date}</p>
                  <p className="text-sm text-gray-600">{selectedQuizDetails.questions?.length || 0} question(s) déjà ajoutée(s)</p>
                </div>
              )}
              
              <button
                className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors w-full sm:w-auto"
                onClick={() => router.push(`/admin/edit/${selectedQuizId}`)}
              >
                Éditer ce quiz
              </button>
              
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-8 mt-6">
                {/* Left column: Question creation and recap */}
                <div className="lg:col-span-1 space-y-4 md:space-y-6">
                  {/* Question personnalisée */}
                  <div className="bg-white rounded-xl border border-gray-200 shadow p-4">
                    <h3 className="text-xl font-bold text-indigo-700 mb-4">Ajouter une question personnalisée</h3>
                    
                    {questionAddSuccess && (
                      <div className="bg-green-50 border border-green-200 text-green-700 p-4 rounded-md mb-4">
                        {questionAddSuccess}
                      </div>
                    )}
                    
                    <input
                      className="border border-gray-300 rounded p-2 w-full mb-4"
                      placeholder="Intitulé de la question"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                    />
                    
                    {options.map((opt, idx) => (
                      <div key={idx} className="flex items-center gap-2 mb-2">
                        <input
                          className="border border-gray-300 rounded p-2 w-full"
                          placeholder={`Option ${idx + 1}`}
                          value={opt}
                          onChange={(e) => {
                            const newOptions = [...options]
                            newOptions[idx] = e.target.value
                            setOptions(newOptions)
                          }}
                        />
                        <div className="flex items-center">
                          <input 
                            type="radio" 
                            name="correctOption" 
                            id={`opt${idx}`}
                            className="accent-green-600" 
                          />
                          <label htmlFor={`opt${idx}`} className="ml-1 text-xs text-gray-600">Correct</label>
                        </div>
                      </div>
                    ))}
                    
                    <button 
                      className="btn-primary w-full mt-4" 
                      onClick={handleCreateQuestion}
                    >
                      Ajouter la question personnalisée
                    </button>
                  </div>
                  
                  {/* Récapitulatif des questions */}
                  <div className="bg-white rounded-xl border border-gray-200 shadow p-4">
                    <h3 className="text-xl font-bold text-indigo-700 mb-4">
                      Récapitulatif des questions ({selectedQuestions.length})
                    </h3>
                    
                    {selectedQuestions.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        Aucune question ajoutée pour le moment.
                      </div>
                    ) : (
                      <div className="max-h-[500px] overflow-y-auto space-y-2">
                        {selectedQuestions.map((q, idx) => (
                          <div key={q.id} className="p-3 bg-gray-50 rounded border flex justify-between items-start">
                            <div>
                              <div className="font-medium">{idx + 1}. {q.content}</div>
                              {q.themeName && (
                                <div className="text-xs text-gray-500 mt-1">
                                  Thème: {q.themeName}
                                </div>
                              )}
                              {q.custom && (
                                <div className="text-xs text-indigo-600 mt-1">
                                  Question personnalisée
                                </div>
                              )}
                            </div>
                            <button
                              className="text-red-500 hover:text-red-700"
                              onClick={() => handleRemoveQuestion(q.id, true)}
                            >
                              ×
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Right column: Theme questions */}
                <div className="lg:col-span-2">
                  <h3 className="text-lg md:text-xl font-bold text-indigo-700 mb-4">
                    Ajouter des questions depuis un thème
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                    {themes.length === 0 && (
                      <div className="col-span-full text-center text-gray-400 italic">Aucun thème disponible.</div>
                    )}
                    
                    {themes.map((theme) => (
                      <div key={theme.id} className="bg-white border border-indigo-100 rounded-xl shadow-lg overflow-hidden flex flex-col transition-all duration-300 hover:shadow-xl">
                        {/* Theme Header */}
                        <div className="bg-gradient-to-r from-indigo-500 to-purple-600 p-4 text-white">
                          <h4 className="text-xl font-bold">{theme.name}</h4>
                          <p className="text-indigo-100 text-sm mt-1">{theme.description || 'Sans description'}</p>
                        </div>
                        
                        {/* Theme Info */}
                        <div className="p-4 border-b border-indigo-100 bg-gradient-to-br from-indigo-50/50 to-purple-50/50 flex justify-between items-center">
                          <div className="flex items-center">
                            <span className="bg-indigo-100 text-indigo-800 text-sm px-3 py-1 rounded-full font-semibold">
                              {(themeQuestions[theme.id] || []).length} question{(themeQuestions[theme.id] || []).length !== 1 ? 's' : ''}
                            </span>
                            
                            {/* Add this debugging button for the History theme */}
                            {theme.id === 'e987982d-e44e-4f73-8136-8a4aa7d36dc0' && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  fetchHistoryThemeQuestions();
                                  alert(`Tentative de rechargement des questions d'Histoire. Vérifiez la console pour les détails.`);
                                }}
                                className="ml-2 text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded-full"
                              >
                                Recharger
                              </button>
                            )}
                          </div>
                          
                          <button
                            className={`px-4 py-2 rounded-md font-medium transition-colors ${
                              selectedTheme === theme.id 
                                ? 'bg-indigo-600 text-white hover:bg-indigo-700' 
                                : 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200'
                            }`}
                            onClick={() => setSelectedTheme(theme.id === selectedTheme ? null : theme.id)}
                          >
                            {selectedTheme === theme.id ? 'Masquer' : 'Voir les questions'}
                          </button>
                        </div>
                        
                        {/* Questions List - Expandable Section */}
                        {selectedTheme === theme.id && (
                          <div className="p-4">
                            <div className="flex justify-between mb-3">
                              <button 
                                className="text-xs bg-indigo-50 text-indigo-600 px-3 py-1 rounded-md hover:bg-indigo-100"
                                onClick={() => {
                                  // Sélectionner toutes les questions
                                  const newSelected = {...selectedThemeQuestions};
                                  themeQuestions[theme.id].forEach(q => {
                                    newSelected[q.id] = true;
                                  }); 
                                  setSelectedThemeQuestions(newSelected);
                                }}
                              >
                                Tout sélectionner
                              </button>
                              <button 
                                className="text-xs bg-purple-50 text-purple-600 px-3 py-1 rounded-md hover:bg-purple-100"
                                onClick={() => {
                                  // Désélectionner toutes les questions
                                  const newSelected = {...selectedThemeQuestions};
                                  themeQuestions[theme.id].forEach(q => {
                                    delete newSelected[q.id];
                                  });
                                  setSelectedThemeQuestions(newSelected);
                                }}
                              >
                                Tout désélectionner
                              </button>
                            </div>
                            
                            {(themeQuestions[theme.id] && themeQuestions[theme.id].length > 0) ? (
                              <>
                                <div className="max-h-[400px] overflow-y-auto pr-2 mt-2 space-y-2">
                                  {themeQuestions[theme.id].map((q) => (
                                    <label 
                                      key={q.id} 
                                      className={`flex items-start gap-3 rounded-lg p-3 border transition-all cursor-pointer ${
                                        selectedThemeQuestions[q.id]
                                          ? 'bg-indigo-50 border-indigo-200 shadow-sm'
                                          : 'bg-white border-gray-200 hover:border-indigo-200 hover:bg-indigo-50/30'
                                      }`}
                                    >
                                      <input
                                        type="checkbox"
                                        className="mt-1 h-4 w-4 accent-indigo-600 rounded"
                                        checked={!!selectedThemeQuestions[q.id]}
                                        onChange={() =>
                                          setSelectedThemeQuestions((prev) => ({
                                            ...prev,
                                            [q.id]: !prev[q.id],
                                          }))
                                        }
                                        disabled={!selectedQuizId}
                                      />
                                      <div className="flex-1">
                                        <div className="font-medium text-gray-800">{q.content}</div>
                                        <div className="mt-1 flex flex-wrap gap-1">
                                          {q.options.map((option, idx) => (
                                            <span
                                              key={idx} 
                                              className={`text-xs px-2 py-1 rounded ${
                                                option === q.correct_option
                                                  ? 'bg-green-100 text-green-800'
                                                  : 'bg-gray-100 text-gray-700'
                                              }`}
                                            >
                                              {option}
                                            </span>
                                          ))}
                                        </div>
                                      </div>
                                    </label>
                                  ))}
                                </div>
                                
                                <button
                                  className={`w-full mt-4 py-2 rounded-md transition ${
                                    !selectedQuizId || Object.keys(selectedThemeQuestions).filter(
                                      qid => selectedThemeQuestions[qid] && (themeQuestions[theme.id] || []).some(q => q.id === qid)
                                    ).length === 0
                                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                      : 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:from-indigo-700 hover:to-purple-700'
                                  }`}
                                  onClick={() => handleAddThemeQuestions(theme.id)}
                                  disabled={
                                    !selectedQuizId ||
                                    Object.keys(selectedThemeQuestions).filter(
                                      (qid) => selectedThemeQuestions[qid] && (themeQuestions[theme.id] || []).some(q => q.id === qid)
                                    ).length === 0
                                  }
                                >
                                  Ajouter {Object.keys(selectedThemeQuestions).filter(
                                    (qid) => selectedThemeQuestions[qid] && (themeQuestions[theme.id] || []).some(q => q.id === qid)
                                  ).length} question(s) au quiz
                                </button>
                              </>
                            ) : (
                              <div className="bg-gray-50 rounded-lg p-6 text-center">
                                <div className="text-gray-400 text-sm">Aucune question pour ce thème</div>
                                <button className="mt-3 text-indigo-600 text-sm hover:underline">Ajouter une question</button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  // Statistiques
  const renderStats = () => (
    <div className="max-w-2xl mx-auto bg-white rounded-xl shadow-lg p-8 mt-8 text-center text-gray-500">
      <h2 className="text-xl font-bold text-indigo-700 mb-4">Statistiques</h2>
      <p>Statistiques détaillées à venir…</p>
    </div>
  )

  // Add notification state
  const [notification, setNotification] = useState<{
    show: boolean;
    message: string;
    type: 'success' | 'error' | 'info';
  }>({
    show: false,
    message: '',
    type: 'success'
  });
  
  // Function to show notification
  const showNotification = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setNotification({ show: true, message, type });
    // Auto-hide after 5 seconds
    setTimeout(() => {
      setNotification(prev => ({ ...prev, show: false }));
    }, 5000);
  };

  // Add state for mobile sidebar
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-blue-100 text-[var(--foreground)] font-sans">
      {/* Notification Component */}
      {notification.show && (
        <div className="fixed top-4 right-4 z-50 max-w-md animate-slide-in-right">
          <div className={`rounded-lg shadow-lg p-4 ${
            notification.type === 'success' ? 'bg-green-50 border-l-4 border-green-500' :
            notification.type === 'error' ? 'bg-red-50 border-l-4 border-red-500' :
            'bg-blue-50 border-l-4 border-blue-500'
          }`}>
            <div className="flex items-center">
              <div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center ${
                notification.type === 'success' ? 'bg-green-100 text-green-600' :
                notification.type === 'error' ? 'bg-red-100 text-red-600' :
                'bg-blue-100 text-blue-600'
              }`}>
                {notification.type === 'success' ? '✓' : 
                 notification.type === 'error' ? '✕' : 'i'}
              </div>
              <div className="ml-3">
                <p className={`text-sm font-medium ${
                  notification.type === 'success' ? 'text-green-800' :
                  notification.type === 'error' ? 'text-red-800' : 
                  'text-blue-800'
                }`}>
                  {notification.message}
                </p>
              </div>
              <button 
                onClick={() => setNotification(prev => ({ ...prev, show: false }))}
                className="ml-auto bg-transparent text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Mobile sidebar toggle button */}
      <button
        onClick={() => setSidebarOpen(true)}
        className="fixed top-4 left-4 z-40 md:hidden bg-white p-2 rounded-lg shadow-md"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="3" y1="12" x2="21" y2="12"></line>
          <line x1="3" y1="6" x2="21" y2="6"></line>
          <line x1="3" y1="18" x2="21" y2="18"></line>
        </svg>
      </button>
      
      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-30 md:hidden" onClick={() => setSidebarOpen(false)}>
          <div className={`w-64 flex flex-col bg-white/80 backdrop-blur-md border-r border-indigo-100 shadow-2xl min-h-screen fixed left-0 top-0 z-40 transition-transform duration-300 ${
            sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
          }`}>
            <div className="p-6 border-b border-indigo-100 flex justify-between items-center">
              <h1 className="text-2xl font-extrabold text-indigo-700 tracking-tight">Quiz Admin</h1>
              <button 
                onClick={() => setSidebarOpen(false)}
                className="md:hidden text-gray-500"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">        
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
            <nav className="flex-1 flex flex-col gap-1 px-2 py-6">
              {navItems.map(({ label, icon, tab }) => (
                <button
                  key={tab}
                  onClick={() => handleTabChange(tab as any)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all font-semibold w-full text-left ${
                    activeTab === tab
                      ? 'bg-gradient-to-r from-indigo-100 to-purple-100 text-indigo-700 shadow'
                      : 'text-gray-700 hover:bg-indigo-50 hover:text-indigo-700'
                  }`}
                >
                  {icon}
                  <span>{label}</span>
                </button>
              ))}
              <hr className="my-6 border-gray-200" />
              <span className="ml-3">Retour à l'accueil</span>
              <button
                onClick={() => router.push('/')}
                className="flex items-center px-4 py-3 rounded-lg text-gray-700 hover:bg-red-50 hover:text-red-600 transition"
              >
                <span className="text-lg">⬅️</span>
                Retour à l'accueil
              </button>
            </nav>
          </div>
        </div>
      )}
      
      <aside className="w-64 flex flex-col bg-white/80 backdrop-blur-md border-r border-indigo-100 shadow-2xl min-h-screen fixed left-0 top-0 z-40 transition-transform duration-300 ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
      }">
        <div className="p-6 border-b border-indigo-100 flex justify-between items-center">
          <h1 className="text-2xl font-extrabold text-indigo-700 tracking-tight">Quiz Admin</h1>
          <button 
            onClick={() => setSidebarOpen(false)}
            className="md:hidden text-gray-500"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">        
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
        <nav className="flex-1 flex flex-col gap-1 px-2 py-6">
          {navItems.map(({ label, icon, tab }) => (
            <button
              key={tab}
              onClick={() => handleTabChange(tab as any)}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all font-semibold w-full text-left ${
                activeTab === tab
                  ? 'bg-gradient-to-r from-indigo-100 to-purple-100 text-indigo-700 shadow'
                  : 'text-gray-700 hover:bg-indigo-50 hover:text-indigo-700'
              }`}
            >
              {icon}
              <span>{label}</span>
            </button>
          ))}
          <hr className="my-6 border-gray-200" />
          <span className="ml-3">Retour à l'accueil</span>
          <button
            onClick={() => router.push('/')}
            className="flex items-center px-4 py-3 rounded-lg text-gray-700 hover:bg-red-50 hover:text-red-600 transition"
          >
            <span className="text-lg">⬅️</span>
            Retour à l'accueil
          </button>
        </nav>
      </aside>
      
      <div className="flex-1 flex flex-col min-h-screen md:ml-8">
        {/* Main Content - adjust padding for mobile */}
        <div className="flex-1 p-4 md:p-6 lg:p-10">
          {activeTab === 'dashboard' && (
            <div className="text-center py-8">
              <p className="text-gray-500 mb-4">Redirection vers le tableau de bord...</p>
              <button 
                onClick={() => router.push('/dashboard')}
                className="btn-primary"
              >
                Aller au tableau de bord
              </button>
            </div>
          )}
          {activeTab === 'create' && renderCreate()}
          {activeTab === 'stats' && renderStats()}
        </div>
      </div>
    </div>
  )
}