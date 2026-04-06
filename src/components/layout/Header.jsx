import { useState, useEffect, useMemo } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, Menu, X, Zap, UserCircle } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { getCategories, getPublishedArticles } from '@/lib/supabase'
import { getTransferNews } from '@/lib/newsApi'
import { formatDate } from '@/lib/utils'
import { useReader } from '@/hooks/useReader'

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQ, setSearchQ] = useState('')
  const [scrolled, setScrolled] = useState(false)
  const navigate = useNavigate()
  const { reader } = useReader()

  const { data: cats } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const { data } = await getCategories()
      return data || []
    },
  })

  const { data: latestArticles } = useQuery({
    queryKey: ['ticker-articles'],
    queryFn: async () => {
      const { data } = await getPublishedArticles({ page: 1, limit: 8 })
      return data || []
    },
  })

  const { data: transferNews } = useQuery({
    queryKey: ['transfer-news'],
    queryFn: getTransferNews,
    staleTime: 15 * 60 * 1000,
    retry: 1,
  })

  const tickerItems = useMemo(() => {
    const articleTitles = (latestArticles || []).map(a => a.title)
    const newsTitles = (transferNews || []).slice(0, 5).map(n => `📰 ${n.title}`)
    return [...articleTitles, ...newsTitles].filter(Boolean)
  }, [latestArticles, transferNews])

  const tickerText = useMemo(() => {
    if (!tickerItems.length) return ''
    return tickerItems.join('   •   ') + '   •   ' + tickerItems.join('   •   ') + '   •   '
  }, [tickerItems])

  const mobileTickerText = tickerText || 'Le ultime notizie bianconere in aggiornamento   •   Le ultime notizie bianconere in aggiornamento   •   '

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 60)
    window.addEventListener('scroll', handler, { passive: true })
    return () => window.removeEventListener('scroll', handler)
  }, [])

  const handleSearch = (e) => {
    e.preventDefault()
    if (searchQ.trim()) {
      navigate(`/cerca?q=${encodeURIComponent(searchQ.trim())}`)
      setSearchOpen(false)
      setSearchQ('')
    }
  }

  return (
    <>
      {/* Breaking news ticker */}
      <div className="bg-juve-black text-white overflow-hidden">
        <div className="flex items-center gap-2 sm:gap-4">
          <div className="shrink-0 flex items-center gap-1.5 bg-juve-gold text-black px-2 sm:px-3 py-1 sm:py-0.5 ml-2 sm:ml-4">
            <Zap className="h-3.5 w-3.5" />
            <span className="text-[10px] sm:text-xs font-black uppercase tracking-widest">Breaking</span>
          </div>
          <div className="min-w-0 flex-1 overflow-hidden py-2 sm:hidden">
            <div className="breaking-ticker-mobile text-[11px] font-medium leading-none tracking-[0.02em] text-white/90">
              {mobileTickerText}
            </div>
          </div>
          <div className="hidden overflow-hidden flex-1 py-1.5 sm:block">
            <div className="breaking-ticker text-xs font-medium tracking-wide">
              {tickerText}
            </div>
          </div>
        </div>
      </div>

      {/* Main header */}
      <header className={`bg-white border-b-2 border-juve-black sticky top-0 z-40 transition-shadow duration-300 ${scrolled ? 'shadow-xl' : ''}`}>
        {/* Top bar: date + logo + search/menu */}
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between py-3 border-b border-gray-100">
            <span className="text-xs text-gray-500 font-medium hidden md:block">
              {formatDate(new Date().toISOString())}
            </span>

            {/* Logo */}
            <Link to="/" className="flex flex-col items-center group min-w-0 flex-1 md:flex-none">
              <div className="flex items-baseline gap-1">
                <span className="font-display text-[1.85rem] sm:text-4xl md:text-5xl font-black text-juve-black leading-none tracking-tight">BIANCONERI</span>
                <span className="font-display text-[1.85rem] sm:text-4xl md:text-5xl font-black text-juve-gold leading-none tracking-tight">HUB</span>
              </div>
              <span className="text-[8px] sm:text-[9px] uppercase tracking-[0.22em] sm:tracking-[0.3em] text-gray-500 font-medium mt-0.5 text-center">
                Il Magazine Bianconero
              </span>
            </Link>

            <div className="flex items-center gap-1 sm:gap-2 shrink-0">
              <button
                onClick={() => setSearchOpen(true)}
                className="p-2 hover:bg-gray-100 transition-colors"
                aria-label="Cerca"
              >
                <Search className="h-5 w-5" />
              </button>
              <Link
                to="/area-bianconera"
                className="p-2 hover:bg-gray-100 transition-colors relative"
                aria-label="Area Bianconera"
              >
                <UserCircle className="h-5 w-5" />
                {reader && (
                  <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 bg-juve-gold border-2 border-white" />
                )}
              </Link>
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="p-2 hover:bg-gray-100 transition-colors md:hidden"
              >
                {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
            </div>
          </div>

          {/* Category nav — desktop */}
          <nav className="hidden md:flex items-center justify-center gap-0 py-0 overflow-x-auto">
            <NavLink
              to="/"
              end
              className={({ isActive }) =>
                `px-4 py-3 text-xs font-black uppercase tracking-widest border-b-2 transition-colors whitespace-nowrap ${
                  isActive ? 'bg-juve-gold text-juve-black border-juve-gold' : 'border-transparent text-gray-600 hover:text-juve-black hover:bg-juve-gold/20 hover:border-juve-gold'
                }`
              }
            >
              Home
            </NavLink>
            {cats?.map((cat) => (
              <NavLink
                key={cat.id}
                to={`/categoria/${cat.slug}`}
                className={({ isActive }) =>
                  `px-4 py-3 text-xs font-black uppercase tracking-widest border-b-2 transition-colors whitespace-nowrap ${
                    isActive ? 'bg-juve-gold text-juve-black border-juve-gold' : 'border-transparent text-gray-600 hover:text-juve-black hover:bg-juve-gold/20 hover:border-juve-gold'
                  }`
                }
              >
                {cat.name}
              </NavLink>
            ))}
            <NavLink
              to="/calciomercato"
              className={({ isActive }) =>
                `px-4 py-3 text-xs font-black uppercase tracking-widest border-b-2 transition-colors whitespace-nowrap ${
                  isActive ? 'bg-juve-gold text-juve-black border-juve-gold' : 'border-transparent text-gray-600 hover:text-juve-black hover:bg-juve-gold/20 hover:border-juve-gold'
                }`
              }
            >
              Mercato
            </NavLink>
            <NavLink
              to="/notizie-live"
              className={({ isActive }) =>
                `px-4 py-3 text-xs font-black uppercase tracking-widest border-b-2 transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                  isActive ? 'bg-juve-gold text-juve-black border-juve-gold' : 'border-transparent text-gray-600 hover:text-juve-black hover:bg-juve-gold/20 hover:border-juve-gold'
                }`
              }
            >
              <span className="h-1.5 w-1.5 bg-green-500 animate-pulse" />
              Live
            </NavLink>
          </nav>
        </div>
      </header>

      {/* Mobile menu */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-white border-b-2 border-juve-black md:hidden z-30 sticky top-[105px] overflow-hidden"
          >
            <nav className="max-w-7xl mx-auto px-4 py-4 flex flex-col gap-1">
              <Link
                to="/"
                onClick={() => setMenuOpen(false)}
                className="px-3 py-2 text-sm font-bold uppercase tracking-widest hover:bg-gray-50"
              >
                Home
              </Link>
              {cats?.map((cat) => (
                <Link
                  key={cat.id}
                  to={`/categoria/${cat.slug}`}
                  onClick={() => setMenuOpen(false)}
                  className="px-3 py-2 text-sm font-bold uppercase tracking-widest hover:bg-gray-50"
                >
                  {cat.name}
                </Link>
              ))}
              <Link
                to="/calciomercato"
                onClick={() => setMenuOpen(false)}
                className="px-3 py-2 text-sm font-bold uppercase tracking-widest hover:bg-gray-50"
              >
                Calciomercato
              </Link>
              <Link
                to="/notizie-live"
                onClick={() => setMenuOpen(false)}
                className="px-3 py-2 text-sm font-bold uppercase tracking-widest hover:bg-gray-50 flex items-center gap-2"
              >
                <span className="h-1.5 w-1.5 bg-green-500 animate-pulse" />
                Notizie Live
              </Link>
              <Link
                to="/area-bianconera"
                onClick={() => setMenuOpen(false)}
                className="px-3 py-2 text-sm font-bold uppercase tracking-widest hover:bg-gray-50 text-juve-gold"
              >
                {reader ? 'Area Bianconera' : 'Accedi'}
              </Link>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Search overlay */}
      <AnimatePresence>
        {searchOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/70 z-50"
              onClick={() => setSearchOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="fixed top-0 left-0 right-0 z-50 bg-white shadow-2xl p-4 sm:p-6"
            >
              <div className="max-w-2xl mx-auto">
                <div className="flex items-center justify-between mb-4">
                  <span className="font-display text-xl font-bold">Cerca nel magazine</span>
                  <button onClick={() => setSearchOpen(false)}>
                    <X className="h-6 w-6" />
                  </button>
                </div>
                <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3">
                  <input
                    autoFocus
                    value={searchQ}
                    onChange={e => setSearchQ(e.target.value)}
                    placeholder="Cerca articoli, notizie, analisi..."
                    className="flex-1 border-2 border-juve-black px-4 py-3 text-base font-medium focus:outline-none focus:border-juve-gold"
                  />
                  <button
                    type="submit"
                    className="bg-juve-black text-white px-6 py-3 font-bold uppercase tracking-widest text-sm hover:bg-juve-gray transition-colors sm:min-w-[132px]"
                  >
                    Cerca
                  </button>
                </form>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
