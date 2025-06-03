// app/admin/layout.tsx
'use client'

import { ReactNode, useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { FiGrid, FiPlusCircle, FiBarChart2 } from 'react-icons/fi'

// Define navItems outside the component to ensure it's always available
const navItems = [
  { label: 'Dashboard', icon: <FiGrid />, tab: 'dashboard', path: '/dashboard' },
  { label: 'Créer Quiz', icon: <FiPlusCircle />, tab: 'create', path: '/admin?tab=create' },
  { label: 'Stats', icon: <FiBarChart2 />, tab: 'stats', path: '/stats' }
];

export default function AdminLayout({ children }: { children: ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [activeTab, setActiveTab] = useState(() => {
    // Set active tab based on current path
    if (pathname.includes('/dashboard')) return 'dashboard'
    if (pathname.includes('/admin/edit')) return 'edit'
    if (pathname.includes('tab=create')) return 'create'
    if (pathname.includes('tab=stats')) return 'stats'
    return 'dashboard'
  })

  const handleNavigation = (path: string, tab: string) => {
    setActiveTab(tab)
    router.push(path)
  }

  // Keep activeTab in sync with URL changes
  useEffect(() => {
    if (pathname.includes('/dashboard')) setActiveTab('dashboard')
    else if (pathname.includes('/admin/edit')) setActiveTab('edit')
    else if (pathname.includes('tab=create')) setActiveTab('create')
    else if (pathname.includes('tab=stats')) setActiveTab('stats')
  }, [pathname])

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-blue-100 text-[var(--foreground)] font-sans">
      {/* Sidebar - Hide on mobile */}
      <aside className="hidden md:flex md:w-64 flex-col bg-white/80 backdrop-blur-md border-r border-indigo-100 shadow-2xl min-h-screen fixed left-0 top-0 z-20">
        <div className="p-6 border-b border-indigo-100">
          <h1 className="text-2xl font-extrabold text-indigo-700 tracking-tight">Quiz Admin</h1>
          <p className="text-xs text-gray-500 mt-1">Panel Administration</p>
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
          
          {/* Special case for edit page - show as active when on edit page */}
          {pathname.includes('/admin/edit') && (
            <div className="px-4 py-3 bg-gradient-to-r from-indigo-100 to-purple-100 text-indigo-700 shadow rounded-lg font-semibold">
              <span>🖊️ Édition de Quiz</span>
            </div>
          )}
          
          <hr className="my-6 border-gray-200" />
          <button
            onClick={() => router.push('/')}
            className="flex items-center px-4 py-3 rounded-lg text-gray-700 hover:bg-red-50 hover:text-red-600 transition"
          >
            <span className="text-lg">⬅️</span>
            <span className="ml-3">Retour Accueil</span>
          </button>
        </nav>
      </aside>

      {/* Main Content - Adjust for mobile */}
      <div className="flex-1 md:ml-64 flex flex-col min-h-screen">
        <header className="hidden md:flex sticky top-0 z-10 bg-white/80 backdrop-blur-md shadow border-b border-indigo-100">
          <div className="flex items-center px-8 py-5">
            <h2 className="font-extrabold text-2xl text-indigo-700 tracking-tight">
              {pathname.includes('/admin/edit') 
                ? 'Édition de Quiz' 
                : navItems.find((n) => n.tab === activeTab)?.label || 'Dashboard'}
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
