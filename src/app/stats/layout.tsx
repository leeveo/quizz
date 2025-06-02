'use client'

import { useState } from 'react'
import { FiGrid, FiPlusCircle, FiBarChart2 } from 'react-icons/fi'
import { useRouter } from 'next/navigation'

// Define navItems outside the component to ensure it's always available
const navItems = [
  { label: 'Dashboard', icon: <FiGrid />, tab: 'dashboard', path: '/dashboard' },
  { label: 'Créer Quiz', icon: <FiPlusCircle />, tab: 'create', path: '/admin?tab=create' },
  { label: 'Stats', icon: <FiBarChart2 />, tab: 'stats', path: '/stats' }
];

export default function StatsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [activeTab, setActiveTab] = useState('stats')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const router = useRouter()

  const handleNavigation = (path: string, tab: string) => {
    setActiveTab(tab)
    router.push(path)
  }

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-blue-100 text-[var(--foreground)] font-sans">
      {/* Mobile menu button */}
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
      
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-30 md:hidden"
          onClick={() => setSidebarOpen(false)} 
        />
      )}
      
      {/* Responsive Sidebar */}
      <aside className={`w-64 flex flex-col bg-white/80 backdrop-blur-md border-r border-indigo-100 shadow-2xl min-h-screen fixed left-0 top-0 z-40 transition-transform duration-300 ${
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
          {navItems.map(({ label, icon, tab, path }) => (
            <button
              key={tab}
              onClick={() => handleNavigation(path, tab)}
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
          <button
            onClick={() => router.push('/')}
            className="flex items-center px-4 py-3 rounded-lg text-gray-700 hover:bg-red-50 hover:text-red-600 transition"
          >
            <span className="text-lg">⬅️</span>
            <span className="ml-3">Retour à l'accueil</span>
          </button>
        </nav>
      </aside>

      {/* Main Content - adjust for mobile */}
      <div className="flex-1 md:ml-64 flex flex-col min-h-screen">
        <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-md shadow border-b border-indigo-100">
          <div className="flex items-center px-4 md:px-8 py-5">
            <h2 className="font-extrabold text-xl md:text-2xl text-indigo-700 tracking-tight ml-8 md:ml-0">
              Statistiques des Quiz
            </h2>
          </div>
        </header>
        <main className="flex-1">
          {children}
        </main>
      </div>
    </div>
  )
}
