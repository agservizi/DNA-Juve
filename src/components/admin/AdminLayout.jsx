import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { NavLink, Outlet, matchPath, useLocation, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, FileText, PlusCircle, Tag, LogOut, Menu, X,
  ChevronRight, Settings, BarChart2, Users, UserCircle, Rss, MessagesSquare, ArrowUpDown, Film, Shield, Sun, Moon, Bell, BarChart3, Search,
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useTheme } from '@/hooks/useTheme'
import { useToast } from '@/hooks/useToast'
import { Toaster } from '@/components/ui/Toast'
import { getFanArticleSubmissionCount } from '@/lib/supabase'

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
      { icon: Search, label: 'SEO', to: '/admin/seo' },
      { icon: Users, label: 'Redattori', to: '/admin/redattori' },
      { icon: UserCircle, label: 'Lettori', to: '/admin/lettori' },
      { icon: MessagesSquare, label: 'Commenti', to: '/admin/commenti' },
      { icon: Shield, label: 'Forum', to: '/admin/forum' },
      { icon: MessagesSquare, label: 'Proposte Tifosi', to: '/admin/proposte-tifosi' },
      { icon: BarChart3, label: 'Sondaggi', to: '/admin/sondaggi' },
      { icon: Bell, label: 'Notifiche Push', to: '/admin/notifiche-push' },
      { icon: ArrowUpDown, label: 'Trasferimenti', to: '/admin/mercato' },
      { icon: Film, label: 'Video', to: '/admin/video' },
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
  const { user, profile, logout } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const { toasts, toast, dismiss } = useToast()
  const location = useLocation()
  const navigate = useNavigate()
  const { data: pendingFanSubmissions = 0 } = useQuery({
    queryKey: ['fan-article-submissions', 'pending-count', 'admin-layout'],
    queryFn: async () => {
      const { count, error } = await getFanArticleSubmissionCount({ status: 'submitted' })
      if (error) throw error
      return count || 0
    },
    refetchInterval: 30000,
    staleTime: 15000,
  })

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

  const isItemActive = (to) => {
    const pathname = location.pathname

    if (to === '/admin') return pathname === '/admin'
    if (to === '/admin/articoli') {
      return pathname === '/admin/articoli' || Boolean(matchPath('/admin/articoli/:id/modifica', pathname))
    }
    if (to === '/admin/articoli/nuovo') return pathname === '/admin/articoli/nuovo'

    return pathname === to
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 transition-colors dark:bg-neutral-950 dark:text-gray-100 flex">
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex h-screen shrink-0 flex-col overflow-hidden bg-juve-black text-white transition-[width,transform] duration-200 ease-in-out lg:sticky ${
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
            <nav className="flex-1 overflow-y-auto p-4 space-y-6">
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
                        end
                        className={() =>
                          `flex items-center gap-3 px-3 py-2 text-sm font-medium transition-colors ${
                            isItemActive(to)
                              ? 'bg-juve-gold text-black'
                              : 'text-gray-400 hover:text-white hover:bg-gray-800'
                          }`
                        }
                      >
                        {() => (
                          <>
                            <Icon className="h-4 w-4 shrink-0" />
                            <span>{label}</span>
                            {to === '/admin/proposte-tifosi' && pendingFanSubmissions > 0 && (
                              <span className={`ml-auto inline-flex min-w-[1.35rem] items-center justify-center rounded-full px-1.5 py-0.5 text-[10px] font-black ${
                                isItemActive(to)
                                  ? 'bg-black text-juve-gold'
                                  : 'bg-juve-gold text-black'
                              }`}>
                                {pendingFanSubmissions}
                              </span>
                            )}
                            {isItemActive(to) && <ChevronRight className={`h-3 w-3 ${to === '/admin/proposte-tifosi' && pendingFanSubmissions > 0 ? '' : 'ml-auto'}`} />}
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
                <div className="w-8 h-8 bg-juve-gold flex items-center justify-center overflow-hidden shrink-0">
                  {profile?.avatar_url ? (
                    <img
                      src={profile.avatar_url}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-black font-bold text-xs">
                      {user?.email?.[0]?.toUpperCase() || 'A'}
                    </span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-white truncate">{profile?.username || user?.email}</p>
                  <p className="text-xs text-gray-500">{profile?.role === 'admin' ? 'Amministratore' : 'Redazione'}</p>
                </div>
              </div>
              <button
                type="button"
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
        <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-gray-200 bg-white px-4 py-4 transition-colors dark:border-white/10 dark:bg-neutral-900 sm:px-6">
          <button type="button" onClick={() => setSidebarOpen(!sidebarOpen)} className="p-1.5 transition-colors hover:bg-gray-100 dark:hover:bg-white/10">
            {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
          <div className="h-5 w-px bg-gray-200 dark:bg-white/10" />
          <button
            type="button"
            onClick={toggleTheme}
            className="inline-flex items-center rounded-full border border-gray-200 p-2 text-gray-600 transition-colors hover:border-juve-gold hover:text-juve-gold dark:border-white/10 dark:text-gray-300 dark:hover:border-juve-gold dark:hover:text-juve-gold"
            aria-label={theme === 'dark' ? 'Passa alla modalità chiara' : 'Passa alla modalità scura'}
            title={theme === 'dark' ? 'Modalità chiara' : 'Modalità scura'}
          >
            {theme === 'dark'
              ? <Sun className="h-4 w-4 text-juve-gold" />
              : <Moon className="h-4 w-4" />
            }
          </button>
          <a href="/" target="_blank" rel="noopener noreferrer"
            className="ml-auto flex items-center gap-1.5 text-right text-xs text-gray-500 transition-colors hover:text-juve-gold dark:text-gray-400">
            Visualizza sito <ChevronRight className="h-3.5 w-3.5" />
          </a>
        </header>

        <main className="flex-1 overflow-x-hidden p-4 sm:p-6">
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
