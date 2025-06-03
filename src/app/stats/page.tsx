'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { FiBarChart2, FiDownload, FiUsers, FiChevronDown, FiChevronUp } from 'react-icons/fi'

type Quiz = {
  id: number
  title: string
  theme: string
  event_name?: string
  event_date?: string
  created_by: string | null
  active: boolean
  quiz_started: boolean
  finished: boolean
}

type QuizStats = {
  questionCount: number
  participantCount: number
  totalAnswers: number
  responseRate: number
}

type ParticipantStat = {
  id: string
  name: string
  avatar_emoji: string
  answeredCount: number
  correctCount: number
  responseRate: number
}

type QuestionStat = {
  id: string
  title: string
  options: string[]
  correct: number
  responseCount: number
  correctCount: number
  participantResponses: {
    participantId: string
    participantName: string
    avatar: string
    selectedOption: number
    isCorrect: boolean
  }[]
}

export default function StatsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [quizzes, setQuizzes] = useState<Quiz[]>([])
  const [selectedQuizId, setSelectedQuizId] = useState<number | null>(null)
  const [quizStats, setQuizStats] = useState<QuizStats | null>(null)
  const [participantStats, setParticipantStats] = useState<ParticipantStat[]>([])
  const [questionStats, /* unused setter removed */] = useState<QuestionStat[]>([])
  const [expandedParticipants, setExpandedParticipants] = useState<{ [key: string]: boolean }>({})
  const [expandedQuestions, setExpandedQuestions] = useState<{ [key: string]: boolean }>({})
  const [activeTab, setActiveTab] = useState<'overview' | 'participants' | 'questions'>('overview')

  // Wrap fetchQuizDetails in useCallback and define it before useEffect
  const fetchQuizDetails = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('quizzes')
        .select('*')
        .eq('id', selectedQuizId)
        .single();
      
      if (error) throw error;
      
      setQuizStats(data); // Or setQuizDetails if you have a separate state
    } catch (err) {
      console.error('Error fetching quiz details:', err);
      // setError('Failed to load quiz details'); // Uncomment if you have setError
    } finally {
      setLoading(false);
    }
  }, [selectedQuizId]);

  // Wrap fetchParticipantsAndAnswers in useCallback and define it before useEffect
  const fetchParticipantsAndAnswers = useCallback(async () => {
    if (!selectedQuizId) return

    try {
      setLoading(true)
      
      // Get participants
      const { data: participants, error: participantsError } = await supabase
        .from('participants')
        .select('*')
        .eq('quiz_id', selectedQuizId)
      
      if (participantsError) throw participantsError
      
      // Get answers
      const { data: answers, error: answersError } = await supabase
        .from('participant_answers')
        .select('*')
        .eq('quiz_id', selectedQuizId)
      
      if (answersError) throw answersError

      // Get questions for the selected quiz
      const { data: questions, error: questionsError } = await supabase
        .from('questions')
        .select('*')
        .eq('quiz_id', selectedQuizId);

      if (questionsError) throw questionsError;

      // Calculate participant stats
      const participantStatsData: ParticipantStat[] = participants?.map(p => {
        const participantAnswers = answers?.filter(a => a.participant_id === p.id) || []
        const correctAnswers = participantAnswers.filter(a => {
          const question = questions?.find(q => q.id === a.question_id)
          return question && a.selected_option === question.correct
        })
        
        return {
          id: p.id,
          name: p.name,
          avatar_emoji: p.avatar_emoji || p.avatar || '👤',
          answeredCount: participantAnswers.length,
          correctCount: correctAnswers.length,
          responseRate: questions && questions.length > 0 ? (participantAnswers.length / questions.length) * 100 : 0
        }
      }) || []
      
      setParticipantStats(participantStatsData)
      
    } catch (error) {
      console.error('Error fetching participants and answers:', error)
    } finally {
      setLoading(false)
    }
  }, [selectedQuizId]);

  // Fetch all quizzes
  useEffect(() => {
    const fetchQuizzes = async () => {
      try {
        setLoading(true)
        const { data, error } = await supabase
          .from('quizzes')
          .select('*')
          .order('created_at', { ascending: false })
        
        if (error) throw error
        
        setQuizzes(data || [])
        
        // Auto-select the first quiz if available
        if (data && data.length > 0 && !selectedQuizId) {
          setSelectedQuizId(data[0].id)
        }
      } catch (error) {
        console.error('Error fetching quizzes:', error)
      } finally {
        setLoading(false)
      }
    }
    
    fetchQuizzes()
  }, [selectedQuizId])

  // Fetch stats for the selected quiz
  useEffect(() => {
    if (selectedQuizId) {
      fetchQuizDetails();
      fetchParticipantsAndAnswers();
    }
  }, [selectedQuizId, fetchQuizDetails, fetchParticipantsAndAnswers]);

  // Real-time subscription to participant answers
  useEffect(() => {
    if (!selectedQuizId) return;
    const answersChannel = supabase
      .channel('participant-answers-changes')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'participant_answers',
        filter: `quiz_id=eq.${selectedQuizId}`,
      }, () => {
        fetchParticipantsAndAnswers();
      })
      .subscribe();
    return () => {
      supabase.removeChannel(answersChannel);
    };
  }, [selectedQuizId, fetchParticipantsAndAnswers]);

  // Helper to format percentage
  const formatPercentage = (value: number) => {
    return `${Math.round(value)}%`
  }

  // Add missing toggleParticipantExpand function
  const toggleParticipantExpand = (participantId: string) => {
    setExpandedParticipants(prev => ({
      ...prev,
      [participantId]: !prev[participantId]
    }));
  };

  // Add missing toggleQuestionExpand function (for completeness, if used)
  const toggleQuestionExpand = (questionId: string) => {
    setExpandedQuestions(prev => ({
      ...prev,
      [questionId]: !prev[questionId]
    }));
  };

  if (loading && quizzes.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-blue-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-indigo-700">Chargement des statistiques...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full h-full">
      {/* Two-column layout */}
      <div className="flex flex-col lg:flex-row h-full">
        {/* Left column: Quiz selector */}
        <div className="w-full lg:w-72 xl:w-80 lg:min-h-[calc(100vh-4rem)] bg-white/50 lg:border-r border-b lg:border-b-0 border-gray-200 p-4">
          <h2 className="text-lg font-semibold text-gray-700 mb-3">Sélectionner un quiz</h2>
          
          {quizzes.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <p>Aucun quiz trouvé.</p>
              <button
                className="mt-4 text-indigo-600 hover:underline"
                onClick={() => router.push('/admin?tab=create')}
              >
                Créer un quiz
              </button>
            </div>
          ) : (
            <div className="space-y-2 max-h-[calc(100vh-10rem)] overflow-y-auto pr-2">
              {quizzes.map(quiz => (
                <button
                  key={quiz.id}
                  className={`p-4 rounded-lg text-left transition w-full ${
                    selectedQuizId === quiz.id
                      ? 'bg-indigo-100 border-indigo-300 shadow-sm'
                      : 'bg-gray-50 border-gray-200 hover:bg-indigo-50'
                  } border`}
                  onClick={() => setSelectedQuizId(quiz.id)}
                >
                  <h3 className="font-semibold text-indigo-700 line-clamp-1">{quiz.title}</h3>
                  <div className="text-sm text-gray-500 mt-1 line-clamp-1">{quiz.event_name}</div>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-xs px-2 py-1 rounded-full bg-indigo-50 text-indigo-600 truncate max-w-[70%]">
                      {quiz.theme}
                    </span>
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      quiz.finished ? 'bg-green-100 text-green-800' : 
                      quiz.quiz_started ? 'bg-yellow-100 text-yellow-800' : 
                      quiz.active ? 'bg-blue-100 text-blue-800' : 
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {quiz.finished ? 'Terminé' : 
                       quiz.quiz_started ? 'En cours' : 
                       quiz.active ? 'Lancé' : 
                       'Non lancé'}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
        
        {/* Right column: Stats content */}
        <div className="flex-1 p-4">
          {selectedQuizId && quizStats ? (
            <>
              {/* Stats tabs */}
              <div className="bg-white rounded-t-xl shadow-md p-2">
                <div className="flex space-x-1 overflow-x-auto">
                  <button
                    className={`px-4 py-2 rounded-lg font-medium transition whitespace-nowrap ${
                      activeTab === 'overview' ? 'bg-indigo-600 text-white' : 'text-gray-700 hover:bg-gray-100'
                    }`}
                    onClick={() => setActiveTab('overview')}
                  >
                    <FiBarChart2 className="inline mr-1" /> Vue Globlale
                  </button>
                  <button
                    className={`px-4 py-2 rounded-lg font-medium transition whitespace-nowrap ${
                      activeTab === 'participants' ? 'bg-indigo-600 text-white' : 'text-gray-700 hover:bg-gray-100'
                    }`}
                    onClick={() => setActiveTab('participants')}
                  >
                    <FiUsers className="inline mr-1" /> Participants
                  </button>
                  <button
                    className={`px-4 py-2 rounded-lg font-medium transition whitespace-nowrap ${
                      activeTab === 'questions' ? 'bg-indigo-600 text-white' : 'text-gray-700 hover:bg-gray-100'
                    }`}
                    onClick={() => setActiveTab('questions')}
                  >
                    <FiDownload className="inline mr-1" /> Questions
                  </button>
                </div>
              </div>
              
              {/* Stats content */}
              <div className="bg-white rounded-b-xl shadow-md p-5 md:p-8">
                {/* Same content as before for each tab */}
                {activeTab === 'overview' && (
                  <div>
                    <h2 className="text-xl font-bold text-indigo-700 mb-4">Vue Globale</h2>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                      <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
                        <div className="flex items-center mb-2">
                          <FiDownload className="text-blue-500 mr-2" />
                          <h3 className="font-semibold text-blue-700">Questions</h3>
                        </div>
                        <p className="text-3xl font-bold text-blue-800">{quizStats.questionCount}</p>
                      </div>
                      
                      <div className="bg-green-50 rounded-xl p-4 border border-green-100">
                        <div className="flex items-center mb-2">
                          <FiUsers className="text-green-500 mr-2" />
                          <h3 className="font-semibold text-green-700">Participants</h3>
                        </div>
                        <p className="text-3xl font-bold text-green-800">{quizStats.participantCount}</p>
                      </div>
                      
                      <div className="bg-purple-50 rounded-xl p-4 border border-purple-100">
                        <div className="flex items-center mb-2">
                          <FiDownload className="text-purple-500 mr-2" />
                          <h3 className="font-semibold text-purple-700">Réponses</h3>
                        </div>
                        <p className="text-3xl font-bold text-purple-800">{quizStats.totalAnswers}</p>
                      </div>
                      
                      <div className="bg-indigo-50 rounded-xl p-4 border border-indigo-100">
                        <div className="flex items-center mb-2">
                          <FiBarChart2 className="text-indigo-500 mr-2" />
                          <h3 className="font-semibold text-indigo-700">Taux de réponse</h3>
                        </div>
                        <p className="text-3xl font-bold text-indigo-800">{formatPercentage(quizStats.responseRate)}</p>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Top Participants - same as before */}
                      <div className="bg-gray-50 rounded-xl p-5 border border-gray-200">
                        <h3 className="text-lg font-semibold text-gray-700 mb-3">Meilleurs participants</h3>
                        
                        {participantStats.length > 0 ? (
                          <div className="space-y-3">
                            {participantStats
                              .sort((a, b) => b.correctCount - a.correctCount)
                              .slice(0, 5)
                              .map(participant => (
                                <div key={participant.id} className="bg-white rounded-lg p-3 shadow-sm">
                                  <div className="flex items-center">
                                    <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-xl mr-3">
                                      {participant.avatar_emoji}
                                    </div>
                                    <div>
                                      <div className="font-semibold">{participant.name}</div>
                                      <div className="text-sm text-gray-500">
                                        <span className="text-green-600">{participant.correctCount}</span>
                                        <span className="mx-1">/</span>
                                        <span>{participant.answeredCount}</span> réponses correctes
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              ))}
                          </div>
                        ) : (
                          <div className="text-center py-6 text-gray-500">
                            <p>Aucune participation pour le moment</p>
                          </div>
                        )}
                      </div>
                      
                      {/* Hardest Questions - same as before */}
                      <div className="bg-gray-50 rounded-xl p-5 border border-gray-200">
                        <h3 className="text-lg font-semibold text-gray-700 mb-3">Questions les plus difficiles</h3>
                        
                        {questionStats.length > 0 ? (
                          <div className="space-y-3">
                            {questionStats
                              .filter(q => q.responseCount > 0) // Only questions with responses
                              .sort((a, b) => (a.correctCount / a.responseCount) - (b.correctCount / b.responseCount))
                              .slice(0, 5)
                              .map(question => (
                                <div key={question.id} className="bg-white rounded-lg p-3 shadow-sm">
                                  <div className="font-semibold line-clamp-1">{question.title}</div>
                                  <div className="flex justify-between items-center mt-2">
                                    <div className="text-sm text-gray-500">
                                      <span className="text-green-600">{question.correctCount}</span>
                                      <span className="mx-1">/</span>
                                      <span>{question.responseCount}</span> réponses correctes
                                    </div>
                                    <div className="text-sm font-semibold text-indigo-600">
                                      {question.responseCount > 0 
                                        ? formatPercentage((question.correctCount / question.responseCount) * 100)
                                        : 'N/A'}
                                    </div>
                                  </div>
                                </div>
                              ))}
                          </div>
                        ) : (
                          <div className="text-center py-6 text-gray-500">
                            <p>Aucune question répondue pour le moment</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Participants tab - same as before */}
                {activeTab === 'participants' && (
                  <div>
                    <h2 className="text-xl font-bold text-indigo-700 mb-4">
                      Statistiques par participant ({participantStats.length})
                    </h2>
                    
                    {participantStats.length > 0 ? (
                      <div className="space-y-4">
                        {participantStats.map(participant => (
                          <div key={participant.id} className="bg-gray-50 rounded-xl border border-gray-200 overflow-hidden">
                            <div 
                              className="p-4 flex items-center justify-between cursor-pointer hover:bg-gray-100"
                              onClick={() => toggleParticipantExpand(participant.id)}
                            >
                              <div className="flex items-center">
                                <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-xl mr-3">
                                  {participant.avatar_emoji}
                                </div>
                                <div>
                                  <div className="font-semibold">{participant.name}</div>
                                  <div className="text-sm text-gray-500">
                                    <span className="text-green-600">{participant.correctCount}</span>
                                    <span className="mx-1">/</span>
                                    <span>{participant.answeredCount}</span> réponses correctes
                                    <span className="mx-2">•</span>
                                    <span>Taux de réponse: {formatPercentage(participant.responseRate)}</span>
                                  </div>
                                </div>
                              </div>
                              {expandedParticipants[participant.id] ? <FiChevronUp size={20} /> : <FiChevronDown size={20} />
                            }</div>
                            
                            {expandedParticipants[participant.id] && (
                              <div className="p-4 border-t border-gray-200 bg-white">
                                <h3 className="font-semibold text-gray-700 mb-2">Réponses aux questions</h3>
                                
                                <div className="overflow-x-auto">
                                  <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                      <tr>
                                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Question</th>
                                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Réponse</th>
                                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Statut</th>
                                      </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                      {questionStats.map(question => {
                                        const response = question.participantResponses.find(
                                          r => r.participantId === participant.id
                                        );
                                        
                                        return (
                                          <tr key={question.id}>
                                            <td className="px-4 py-2 text-sm line-clamp-2">{question.title}</td>
                                            <td className="px-4 py-2 text-sm">
                                              {response ? (
                                                <span>
                                                  {response.selectedOption >= 0 && response.selectedOption < question.options.length
                                                    ? question.options[response.selectedOption]
                                                    : `Option ${response.selectedOption}`}
                                                </span>
                                              ) : (
                                                <span className="text-gray-400">Pas de réponse</span>
                                              )}
                                            </td>
                                            <td className="px-4 py-2">
                                              {response ? (
                                                response.isCorrect ? (
                                                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                                    Correct
                                                  </span>
                                                ) : (
                                                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                                    Incorrect
                                                  </span>
                                                )
                                              ) : (
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                                  Absent
                                                </span>
                                              )}
                                            </td>
                                          </tr>
                                        );
                                      })}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-10 text-gray-500">
                        <p>Aucun participant pour ce quiz</p>
                      </div>
                    )}
                  </div>
                )}
                
                {/* Questions tab - same as before */}
                {activeTab === 'questions' && (
                  <div>
                    <h2 className="text-xl font-bold text-indigo-700 mb-4">
                      Statistiques par question ({questionStats.length})
                    </h2>
                    
                    {questionStats.length > 0 ? (
                      <div className="space-y-4">
                        {questionStats.map(question => (
                          <div key={question.id} className="bg-gray-50 rounded-xl border border-gray-200 overflow-hidden">
                            <div 
                              className="p-4 cursor-pointer hover:bg-gray-100"
                              onClick={() => toggleQuestionExpand(question.id)}
                            >
                              <div className="flex justify-between">
                                <div>
                                  <div className="font-semibold line-clamp-2">{question.title}</div>
                                  <div className="text-sm text-gray-500 mt-1">
                                    <span className="text-green-600">{question.correctCount}</span>
                                    <span className="mx-1">/</span>
                                    <span>{question.responseCount}</span> réponses correctes
                                    <span className="mx-2">•</span>
                                    <span>Taux de réussite: {
                                      question.responseCount > 0 
                                        ? formatPercentage((question.correctCount / question.responseCount) * 100)
                                        : 'N/A'
                                    }</span>
                                  </div>
                                </div>
                                {expandedQuestions[question.id] ? <FiChevronUp size={20} /> : <FiChevronDown size={20} />}
                              </div>
                            </div>
                            
                            {expandedQuestions[question.id] && (
                              <div className="p-4 border-t border-gray-200 bg-white">
                                <div className="mb-4">
                                  <h3 className="font-semibold text-gray-700 mb-2">Options</h3>
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                    {question.options.map((option, index) => (
                                      <div 
                                        key={index}
                                        className={`p-2 rounded ${
                                          index === question.correct
                                            ? 'bg-green-100 border border-green-200'
                                            : 'bg-gray-100 border border-gray-200'
                                        }`}
                                      >
                                        <span className="text-sm font-medium">
                                          {String.fromCharCode(65 + index)}:
                                        </span> {option}
                                        {index === question.correct && (
                                          <span className="ml-1 text-green-600 text-sm font-medium">(Correcte)</span>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                                
                                <h3 className="font-semibold text-gray-700 mb-2">Réponses des participants</h3>
                                
                                {question.participantResponses.length > 0 ? (
                                  <div className="overflow-x-auto">
                                    <table className="min-w-full divide-y divide-gray-200">
                                      <thead className="bg-gray-50">
                                        <tr>
                                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Participant</th>
                                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Réponse choisie</th>
                                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Statut</th>
                                        </tr>
                                      </thead>
                                      <tbody className="bg-white divide-y divide-gray-200">
                                        {question.participantResponses.map((response, index) => (
                                          <tr key={`${response.participantId}-${index}`}>
                                            <td className="px-4 py-2">
                                              <div className="flex items-center">
                                                <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-lg mr-2">
                                                  {response.avatar}
                                                </div>
                                                <span className="font-medium">{response.participantName}</span>
                                              </div>
                                            </td>
                                            <td className="px-4 py-2">
                                              {response.selectedOption >= 0 && response.selectedOption < question.options.length
                                                ? question.options[response.selectedOption]
                                                : `Option ${response.selectedOption}`}
                                            </td>
                                            <td className="px-4 py-2">
                                              {response.isCorrect ? (
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                                  Correct
                                                </span>
                                              ) : (
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                                  Incorrect
                                                </span>
                                              )}
                                            </td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                ) : (
                                  <div className="text-center py-4 text-gray-500">
                                    <p>Aucune réponse pour cette question</p>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-10 text-gray-500">
                        <p>Aucune question pour ce quiz</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="h-full flex items-center justify-center bg-white/30 rounded-xl p-8">
              <div className="text-center text-gray-500">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center text-3xl mx-auto mb-4">
                  📊
                </div>
                <h3 className="text-xl font-medium text-gray-700 mb-2">Statistiques des quiz</h3>
                <p className="max-w-md mx-auto">
                  Sélectionnez un quiz dans la colonne de gauche pour consulter ses statistiques détaillées.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
