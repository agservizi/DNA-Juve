import { useState, useEffect, useMemo } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, Menu, X, Zap, UserCircle, Moon, Sun, ChevronDown, Users, BarChart3, MessageSquare, Vote, Play, Shirt } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { getCategories, getPublishedArticles } from '@/lib/supabase'
import { getTransferNews } from '@/lib/newsApi'
import { getLatestFinishedMatch, getLiveMatch, getMatchFinishedAt, getRecentFinishedMatches, JUVE_ID, shouldRetryFootballQuery } from '@/lib/footballApi'
import { formatDate } from '@/lib/utils'
import { useReader } from '@/hooks/useReader'
import { useTheme } from '@/hooks/useTheme'

const FINAL_BADGE_WINDOW_MS = 3 * 60 * 60 * 1000

function getLiveMatchLabel(match) {
  if (!match) return ''
  const home = match.homeTeam?.shortName || match.homeTeam?.name || 'Casa'
  const away = match.awayTeam?.shortName || match.awayTeam?.name || 'Ospite'
  const homeScore = match.score?.fullTime?.home
  const awayScore = match.score?.fullTime?.away
  const hasScore = homeScore != null && awayScore != null
  return hasScore ? `${home} ${homeScore}-${awayScore} ${away}` : `${home} vs ${away}`
}

function getLiveMinute(match) {
  const minute = match?.minute
  if (typeof minute === 'number' && Number.isFinite(minute)) return `${minute}'`
  if (match?.status === 'PAUSED') return 'INT'
  if (match?.status === 'LIVE' || match?.status === 'IN_PLAY') return 'LIVE'
  return ''
}

function shouldShowFinalBadge(match) {
  if (!match || match.status !== 'FINISHED') return false
  const finishedAt = getMatchFinishedAt(match)
  if (!finishedAt) return false
  return Date.now() - finishedAt <= FINAL_BADGE_WINDOW_MS
}

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQ, setSearchQ] = useState('')
  const [scrolled, setScrolled] = useState(false)
  const [communityOpen, setCommunityOpen] = useState(false)
  const navigate = useNavigate()
  const { reader } = useReader()
  const { theme, toggleTheme } = useTheme()

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

  const { data: matchHeaderState } = useQuery({
    queryKey: ['header-match-state'],
    queryFn: async () => {
      const [live, latestFinishedMatches] = await Promise.all([
        getLiveMatch(),
        getRecentFinishedMatches(JUVE_ID, 1),
      ])

      const latestFinished = getLatestFinishedMatch(latestFinishedMatches || [])

      return {
        liveMatch: live || null,
        finalMatch: shouldShowFinalBadge(latestFinished) ? latestFinished : null,
      }
    },
    staleTime: 60 * 1000,
    refetchInterval: 2 * 60 * 1000,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: false,
    retry: shouldRetryFootballQuery,
  })

  const liveMatch = matchHeaderState?.liveMatch || null
  const finalMatch = !liveMatch ? matchHeaderState?.finalMatch || null : null

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
          <div className="flex items-center justify-between py-3 border-b border-gray-100 md:grid md:grid-cols-[minmax(220px,1fr)_auto_minmax(220px,1fr)] md:items-center md:gap-4">
            <div className="hidden min-w-0 md:flex md:flex-col md:items-start md:gap-1">
              <span className="text-xs text-gray-500 font-medium">
                {formatDate(new Date().toISOString())}
              </span>
              {liveMatch && (
                <Link
                  to="/calendario-partite"
                  className="inline-flex max-w-full items-center gap-2 border border-red-200 bg-red-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-red-700 transition-colors hover:border-red-300 hover:bg-red-100"
                >
                  <span className="relative flex h-2 w-2 shrink-0">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-75" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-red-600" />
                  </span>
                  <span className="shrink-0">{getLiveMinute(liveMatch)}</span>
                  <span className="truncate normal-case tracking-normal text-[11px] font-bold text-red-800">
                    {getLiveMatchLabel(liveMatch)}
                  </span>
                  {(liveMatch.homeTeam?.id === JUVE_ID || liveMatch.awayTeam?.id === JUVE_ID) && (
                    <span className="shrink-0 text-[9px] font-black uppercase tracking-[0.2em] text-red-600">
                      In corso
                    </span>
                  )}
                </Link>
              )}
              {!liveMatch && finalMatch && (
                <Link
                  to="/calendario-partite"
                  className="inline-flex max-w-full items-center gap-2 border border-juve-gold/40 bg-juve-gold/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-juve-black transition-colors hover:bg-juve-gold/20"
                >
                  <span className="shrink-0 text-[9px] text-juve-gold">Finale</span>
                  <span className="truncate normal-case tracking-normal text-[11px] font-bold text-juve-black">
                    {getLiveMatchLabel(finalMatch)}
                  </span>
                </Link>
              )}
            </div>

            {/* Logo */}
            <Link to="/" className="flex flex-col items-center group min-w-0 flex-1 pr-2 md:flex-none md:justify-self-center md:pr-0">
              <div className="flex items-baseline gap-0.5 sm:gap-1">
                <span className="font-display text-[1.4rem] sm:text-4xl md:text-5xl font-black text-juve-black leading-none tracking-tight">BIANCONERI</span>
                <span className="font-display text-[1.4rem] sm:text-4xl md:text-5xl font-black text-juve-gold leading-none tracking-tight">HUB</span>
              </div>
              <span className="text-[7px] sm:text-[9px] uppercase tracking-[0.16em] sm:tracking-[0.3em] text-gray-500 font-medium mt-0.5 text-center">
                Il Magazine Bianconero
              </span>
            </Link>

            <div className="flex items-center gap-1 sm:gap-2 shrink-0 md:justify-self-end">
              <button
                onClick={() => setSearchOpen(true)}
                className="p-2 hover:bg-gray-100 transition-colors"
                aria-label="Cerca"
              >
                <Search className="h-5 w-5" />
              </button>
              <button
                onClick={toggleTheme}
                className="p-2 hover:bg-gray-100 transition-colors"
                aria-label={theme === 'dark' ? 'Modalità chiara' : 'Modalità scura'}
              >
                {theme === 'dark'
                  ? <Sun className="h-5 w-5 text-juve-gold" />
                  : <Moon className="h-5 w-5" />
                }
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
          <nav className="hidden md:flex items-center justify-center gap-0 py-0 flex-wrap">
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
            <NavLink
              to="/rosa"
              className={({ isActive }) =>
                `px-4 py-3 text-xs font-black uppercase tracking-widest border-b-2 transition-colors whitespace-nowrap ${
                  isActive ? 'bg-juve-gold text-juve-black border-juve-gold' : 'border-transparent text-gray-600 hover:text-juve-black hover:bg-juve-gold/20 hover:border-juve-gold'
                }`
              }
            >
              Rosa
            </NavLink>
            <NavLink
              to="/video"
              className={({ isActive }) =>
                `px-4 py-3 text-xs font-black uppercase tracking-widest border-b-2 transition-colors whitespace-nowrap ${
                  isActive ? 'bg-juve-gold text-juve-black border-juve-gold' : 'border-transparent text-gray-600 hover:text-juve-black hover:bg-juve-gold/20 hover:border-juve-gold'
                }`
              }
            >
              Video
            </NavLink>
            <div className="relative" onMouseEnter={() => setCommunityOpen(true)} onMouseLeave={() => setCommunityOpen(false)}>
              <button
                className={`px-4 py-3 text-xs font-black uppercase tracking-widest border-b-2 transition-colors whitespace-nowrap flex items-center gap-1 border-transparent text-gray-600 hover:text-juve-black hover:bg-juve-gold/20 hover:border-juve-gold`}
              >
                Community
                <ChevronDown className={`h-3 w-3 transition-transform ${communityOpen ? 'rotate-180' : ''}`} />
              </button>
              <AnimatePresence>
                {communityOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.15 }}
                    className="absolute top-full left-0 bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-gray-700 shadow-xl z-50 min-w-[200px]"
                  >
                    <Link to="/community/sondaggi" onClick={() => setCommunityOpen(false)} className="flex items-center gap-2.5 px-4 py-2.5 text-xs font-bold uppercase tracking-widest text-gray-600 hover:bg-juve-gold/10 hover:text-juve-black transition-colors">
                      <Vote className="h-3.5 w-3.5 text-juve-gold" /> Sondaggi
                    </Link>
                    <Link to="/community/pagelle" onClick={() => setCommunityOpen(false)} className="flex items-center gap-2.5 px-4 py-2.5 text-xs font-bold uppercase tracking-widest text-gray-600 hover:bg-juve-gold/10 hover:text-juve-black transition-colors">
                      <BarChart3 className="h-3.5 w-3.5 text-juve-gold" /> Pagelle
                    </Link>
                    <Link to="/community/forum" onClick={() => setCommunityOpen(false)} className="flex items-center gap-2.5 px-4 py-2.5 text-xs font-bold uppercase tracking-widest text-gray-600 hover:bg-juve-gold/10 hover:text-juve-black transition-colors">
                      <MessageSquare className="h-3.5 w-3.5 text-juve-gold" /> Forum
                    </Link>
                    <Link to="/calciomercato/tracker" onClick={() => setCommunityOpen(false)} className="flex items-center gap-2.5 px-4 py-2.5 text-xs font-bold uppercase tracking-widest text-gray-600 hover:bg-juve-gold/10 hover:text-juve-black transition-colors">
                      <Users className="h-3.5 w-3.5 text-juve-gold" /> Trasferimenti
                    </Link>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
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
                className="px-3 py-2 text-sm font-bold uppercase tracking-widest hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                Home
              </Link>
              {cats?.map((cat) => (
                <Link
                  key={cat.id}
                  to={`/categoria/${cat.slug}`}
                  onClick={() => setMenuOpen(false)}
                  className="px-3 py-2 text-sm font-bold uppercase tracking-widest hover:bg-gray-50 dark:hover:bg-gray-800"
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
                to="/rosa"
                onClick={() => setMenuOpen(false)}
                className="px-3 py-2 text-sm font-bold uppercase tracking-widest hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                Rosa
              </Link>
              <Link
                to="/video"
                onClick={() => setMenuOpen(false)}
                className="px-3 py-2 text-sm font-bold uppercase tracking-widest hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                Video
              </Link>
              <div className="h-px bg-gray-200 dark:bg-gray-700 mx-3 my-1" />
              <span className="px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-juve-gold">Community</span>
              <Link
                to="/community/sondaggi"
                onClick={() => setMenuOpen(false)}
                className="px-3 py-2 text-sm font-bold uppercase tracking-widest hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center gap-2"
              >
                <Vote className="h-3.5 w-3.5 text-juve-gold" /> Sondaggi
              </Link>
              <Link
                to="/community/pagelle"
                onClick={() => setMenuOpen(false)}
                className="px-3 py-2 text-sm font-bold uppercase tracking-widest hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center gap-2"
              >
                <BarChart3 className="h-3.5 w-3.5 text-juve-gold" /> Pagelle
              </Link>
              <Link
                to="/community/forum"
                onClick={() => setMenuOpen(false)}
                className="px-3 py-2 text-sm font-bold uppercase tracking-widest hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center justify-between gap-3"
              >
                <span className="flex items-center gap-2">
                  <MessageSquare className="h-3.5 w-3.5 text-juve-gold" /> Forum
                </span>
                <span className="rounded-full border border-juve-gold/40 bg-juve-gold/10 px-2 py-0.5 text-[9px] font-black tracking-[0.18em] text-juve-black">
                  Members
                </span>
              </Link>
              <Link
                to="/calciomercato/tracker"
                onClick={() => setMenuOpen(false)}
                className="px-3 py-2 text-sm font-bold uppercase tracking-widest hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center gap-2"
              >
                <Users className="h-3.5 w-3.5 text-juve-gold" /> Trasferimenti
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
              className="fixed top-0 left-0 right-0 z-50 bg-white dark:bg-[#121212] shadow-2xl p-4 sm:p-6"
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
                    className="flex-1 border-2 border-juve-black dark:border-gray-600 px-4 py-3 text-base font-medium focus:outline-none focus:border-juve-gold bg-transparent"
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
