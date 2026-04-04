import { useEffect, useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, FileText, PlusCircle, Tag, LogOut, Menu, X,
  ChevronRight, Settings, BarChart2, Users, UserCircle, Rss, MessagesSquare,
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/hooks/useToast'
import { Toaster } from '@/components/ui/Toast'

const navGroups = [
  {
    label: 'Contenuti',
    items: [
      { icon: LayoutDashboard, label: 'Dashboard', to: '/admin' },
      { icon: FileText, label: 'Articoli', to: '/admin/articoli' },
      { icon: PlusCircle, label: 'Nuovo Articolo', to: '/admin/articoli/nuovo' },
      { icon: Tag, label: 'Categorie', to: '/admin/categorie' },
    ],
  },
  {
    label: 'Gestione',
    items: [
      { icon: BarChart2, label: 'Analytics', to: '/admin/analytics' },
      { icon: Users, label: 'Redattori', to: '/admin/redattori' },
      { icon: MessagesSquare, label: 'Proposte Tifosi', to: '/admin/proposte-tifosi' },
      { icon: Rss, label: 'RSS / Sitemap', to: '/admin/feed' },
    ],
  },
  {
    label: 'Account',
    items: [
      { icon: UserCircle, label: 'Profilo', to: '/admin/profilo' },
      { icon: Settings, label: 'Impostazioni', to: '/admin/impostazioni' },
    ],
  },
]

export default function AdminLayout() {
  const [isDesktop, setIsDesktop] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { user, logout } = useAuth()
  const { toasts, toast, dismiss } = useToast()
  const navigate = useNavigate()

  useEffect(() => {
    if (typeof window === 'undefined') return undefined
    const media = window.matchMedia('(min-width: 1024px)')
    const syncSidebar = (event) => {
      setIsDesktop(event.matches)
      setSidebarOpen(event.matches)
    }

    setIsDesktop(media.matches)
    setSidebarOpen(media.matches)
    if (media.addEventListener) {
      media.addEventListener('change', syncSidebar)
      return () => media.removeEventListener('change', syncSidebar)
    }

    media.addListener(syncSidebar)
    return () => media.removeListener(syncSidebar)
  }, [])

  const handleLogout = async () => {
    await logout()
    toast({ title: 'Logout effettuato', variant: 'success' })
    navigate('/admin/login')
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex h-screen shrink-0 flex-col overflow-y-auto overflow-x-hidden bg-juve-black text-white transition-[width,transform] duration-200 ease-in-out lg:sticky ${
          isDesktop
            ? (sidebarOpen ? 'w-64 translate-x-0' : 'w-0 translate-x-0')
            : (sidebarOpen ? 'w-64 translate-x-0' : 'w-64 -translate-x-full')
        }`}
      >
        <div className="flex h-full w-64 min-w-[16rem] flex-col">
            {/* Logo */}
            <div className="p-6 border-b border-gray-800 shrink-0">
              <div className="flex items-baseline gap-1">
                <span className="font-display text-2xl font-black text-white">BIANCONERI</span>
                <span className="font-display text-2xl font-black text-juve-gold">HUB</span>
              </div>
              <p className="text-xs text-gray-500 mt-0.5 uppercase tracking-widest">Admin Panel</p>
            </div>

            {/* Nav */}
            <nav className="flex-1 p-4 space-y-6">
              {navGroups.map(group => (
                <div key={group.label}>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-600 px-3 mb-2">
                    {group.label}
                  </p>
                  <div className="space-y-0.5">
                    {group.items.map(({ icon: Icon, label, to }) => (
                      <NavLink
                        key={to}
                        to={to}
                        end={to === '/admin'}
                        className={({ isActive }) =>
                          `flex items-center gap-3 px-3 py-2 text-sm font-medium transition-colors ${
                            isActive
                              ? 'bg-juve-gold text-black'
                              : 'text-gray-400 hover:text-white hover:bg-gray-800'
                          }`
                        }
                      >
                        {({ isActive }) => (
                          <>
                            <Icon className="h-4 w-4 shrink-0" />
                            <span>{label}</span>
                            {isActive && <ChevronRight className="h-3 w-3 ml-auto" />}
                          </>
                        )}
                      </NavLink>
                    ))}
                  </div>
                </div>
              ))}
            </nav>

            {/* User */}
            <div className="p-4 border-t border-gray-800 shrink-0">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 bg-juve-gold flex items-center justify-center">
                  <span className="text-black font-bold text-xs">
                    {user?.email?.[0]?.toUpperCase() || 'A'}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-white truncate">{user?.email}</p>
                  <p className="text-xs text-gray-500">Amministratore</p>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 w-full px-3 py-2 text-xs text-gray-400 hover:text-red-400 hover:bg-gray-800 transition-colors"
              >
                <LogOut className="h-4 w-4" />
                Esci
              </button>
            </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 transition-[margin] duration-200 ease-in-out">
        <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-gray-200 bg-white px-4 py-4 sm:px-6">
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-1.5 hover:bg-gray-100 transition-colors">
            {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
          <div className="h-5 w-px bg-gray-200" />
          <a href="/" target="_blank" rel="noopener noreferrer"
            className="ml-auto flex items-center gap-1.5 text-right text-xs text-gray-500 transition-colors hover:text-juve-gold">
            Visualizza sito <ChevronRight className="h-3.5 w-3.5" />
          </a>
        </header>

        <main className="flex-1 overflow-auto p-4 sm:p-6">
          <Outlet />
        </main>
      </div>

      {/* Mobile overlay */}
      <div
        className={`fixed inset-0 bg-black/50 z-40 lg:hidden transition-opacity duration-200 ${
          !isDesktop && sidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => setSidebarOpen(false)}
      />

      <Toaster toasts={toasts} dismiss={dismiss} />
    </div>
  )
}
