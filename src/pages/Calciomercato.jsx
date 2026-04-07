import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import { Clock, Star, AlertCircle, ChevronDown, ChevronUp, Newspaper, ExternalLink, Loader2, Wifi, WifiOff, RefreshCw } from 'lucide-react'
import { getTuttoJuveCalciomercato } from '@/lib/newsApi'
import SEO from '@/components/blog/SEO'

// ── Transfer windows ────────────────────────────────────────────────────────
function getNextTransferWindow() {
  const now = new Date()
  const year = now.getFullYear()
  const summerOpen = new Date(year, 6, 1, 0, 0, 0)
  const summerClose = new Date(year, 7, 31, 23, 59, 59)
  const winterOpen = new Date(year, 0, 1, 0, 0, 0)
  const winterClose = new Date(year, 0, 31, 23, 59, 59)
  const nextWinterOpen = new Date(year + 1, 0, 1, 0, 0, 0)
  const nextWinterClose = new Date(year + 1, 0, 31, 23, 59, 59)
  const nextSummerOpen = new Date(year + 1, 6, 1, 0, 0, 0)
  const nextSummerClose = new Date(year + 1, 7, 31, 23, 59, 59)

  if (now >= winterOpen && now <= winterClose)
    return { name: 'Mercato Invernale', open: winterOpen, close: winterClose, isOpen: true, label: 'Invernale' }
  if (now >= summerOpen && now <= summerClose)
    return { name: 'Mercato Estivo', open: summerOpen, close: summerClose, isOpen: true, label: 'Estivo' }

  const windows = [
    { name: 'Mercato Estivo', open: summerOpen, close: summerClose, label: 'Estivo' },
    { name: 'Mercato Invernale', open: nextWinterOpen, close: nextWinterClose, label: 'Invernale' },
    { name: 'Mercato Estivo', open: nextSummerOpen, close: nextSummerClose, label: 'Estivo' },
  ]
  const next = windows.find(w => w.open > now)
  return next ? { ...next, isOpen: false } : { ...windows[0], isOpen: false }
}

function getTimeRemaining(target) {
  const diff = target.getTime() - Date.now()
  if (diff <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0 }
  return {
    days: Math.floor(diff / (1000 * 60 * 60 * 24)),
    hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((diff / (1000 * 60)) % 60),
    seconds: Math.floor((diff / 1000) % 60),
  }
}

function CountdownUnit({ value, label }) {
  return (
    <div className="flex flex-col items-center">
      <div className="flex h-12 w-12 items-center justify-center border border-gray-700 bg-gray-900 sm:h-14 sm:w-14">
        <span className="font-display text-xl font-black text-juve-gold sm:text-2xl">{String(value).padStart(2, '0')}</span>
      </div>
      <span className="text-[9px] uppercase tracking-wider text-gray-500 mt-1.5">{label}</span>
    </div>
  )
}

// ── Time ago helper ─────────────────────────────────────────────────────────
function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const hours = Math.floor(diff / (1000 * 60 * 60))
  if (hours < 1) return 'Adesso'
  if (hours < 24) return `${hours}h fa`
  const days = Math.floor(hours / 24)
  if (days === 1) return 'Ieri'
  return `${days}g fa`
}

// ── News Card ───────────────────────────────────────────────────────────────

function NewsCard({ article, index }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
      className="bg-white border border-gray-200 overflow-hidden"
    >
      <div className="p-4 cursor-pointer hover:bg-gray-50 transition-colors" onClick={() => setExpanded(!expanded)}>
        <div className="flex items-start gap-4">
          {article.image && (
            <div className="w-20 h-20 shrink-0 bg-gray-100 overflow-hidden">
              <img src={article.image} alt="" loading="lazy" decoding="async" className="w-full h-full object-cover" onError={(e) => { e.target.style.display = 'none' }} />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-[10px] font-bold uppercase tracking-widest text-juve-gold">{article.source}</span>
              <span className="text-[10px] text-gray-400">{timeAgo(article.date)}</span>
            </div>
            <h3 className="font-display text-base font-black text-juve-black leading-tight line-clamp-2">{article.title}</h3>
            {!expanded && article.description && (
              <p className="text-xs text-gray-500 mt-1 line-clamp-2">{article.description}</p>
            )}
          </div>
          <button className="p-1 text-gray-400 shrink-0 mt-1">
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
        </div>
      </div>
      <AnimatePresence>
        {expanded && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="px-4 pb-4 border-t border-gray-100 pt-3">
              <p className="text-sm text-gray-600 leading-relaxed mb-3">{article.description}</p>
              {article.url && (
                <a href={article.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-xs font-bold text-juve-gold hover:text-juve-gold-dark transition-colors">
                  <ExternalLink className="h-3 w-3" />
                  Leggi su {article.source}
                </a>
              )}
              <p className="text-[10px] text-gray-400 mt-2">
                {new Date(article.date).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

// ── Main Page ───────────────────────────────────────────────────────────────

export default function Calciomercato() {
  const transferWindow = getNextTransferWindow()
  const [countdown, setCountdown] = useState(() =>
    getTimeRemaining(transferWindow.isOpen ? transferWindow.close : transferWindow.open)
  )

  // Fetch from TuttoJuve RSS
  const { data: articles, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['tuttojuve-calciomercato'],
    queryFn: getTuttoJuveCalciomercato,
    staleTime: 15 * 60 * 1000,
    retry: 2,
  })

  const hasNews = articles && articles.length > 0

  useEffect(() => {
    const target = transferWindow.isOpen ? transferWindow.close : transferWindow.open
    const timer = setInterval(() => setCountdown(getTimeRemaining(target)), 1000)
    return () => clearInterval(timer)
  }, [transferWindow.isOpen])

  return (
    <>
      <SEO title="Calciomercato" description="Calciomercato Juventus: notizie, rumors e trattative in tempo reale da TuttoJuve." url="/calciomercato" />

      {/* ── HERO + COUNTDOWN ─────────────────────────────────────────────── */}
      <section className="bg-juve-black text-white py-12 md:py-16">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <div className="flex items-center justify-center gap-2 mb-3">
              <Star className="h-4 w-4 text-juve-gold" />
              <span className="text-xs font-black uppercase tracking-widest text-juve-gold">{transferWindow.label}</span>
              <Star className="h-4 w-4 text-juve-gold" />
            </div>
            <h1 className="font-display text-3xl sm:text-4xl md:text-5xl font-black leading-tight mb-2">CALCIOMERCATO</h1>
            <p className="mx-auto mb-8 max-w-xl text-sm text-gray-400">
              {transferWindow.isOpen ? 'La finestra di mercato chiude tra:' : 'La finestra di mercato apre tra:'}
            </p>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="mb-8 grid grid-cols-2 gap-4 sm:flex sm:flex-wrap sm:items-center sm:justify-center sm:gap-3 md:gap-5">
            <CountdownUnit value={countdown.days} label="Giorni" />
            <span className="mt-[-18px] hidden font-display text-2xl font-black text-juve-gold sm:block">:</span>
            <CountdownUnit value={countdown.hours} label="Ore" />
            <span className="mt-[-18px] hidden font-display text-2xl font-black text-juve-gold sm:block">:</span>
            <CountdownUnit value={countdown.minutes} label="Min" />
            <span className="mt-[-18px] hidden font-display text-2xl font-black text-juve-gold sm:block">:</span>
            <CountdownUnit value={countdown.seconds} label="Sec" />
          </motion.div>

          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="flex items-center justify-center gap-2">
            {transferWindow.isOpen ? (
              <span className="inline-flex items-center gap-1.5 bg-green-600 text-white text-xs font-black uppercase tracking-widest px-4 py-1.5">
                <span className="h-2 w-2 bg-white animate-pulse" />
                Mercato Aperto
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 bg-gray-800 text-gray-400 text-xs font-black uppercase tracking-widest px-4 py-1.5">
                <Clock className="h-3 w-3" />
                Mercato Chiuso
              </span>
            )}
          </motion.div>
        </div>
      </section>

      {/* ── NOTIZIE CALCIOMERCATO ────────────────────────────────────────── */}
      <div className="max-w-4xl mx-auto px-4 py-8">

        {/* Section header */}
        <div className="flex items-center gap-3 mb-2">
          <div className="h-6 w-1.5 bg-juve-gold" />
          <div className="flex items-center gap-2">
            {hasNews ? (
              <>
                <Wifi className="h-4 w-4 text-green-500" />
                <span className="h-2 w-2 bg-green-500 animate-pulse" />
              </>
            ) : (
              <WifiOff className="h-4 w-4 text-gray-400" />
            )}
            <h2 className="text-xs font-black uppercase tracking-[0.2em] text-gray-500">
              Voci di Mercato
            </h2>
          </div>
          <div className="flex-1 h-px bg-gray-200" />
          {hasNews && (
            <button
              onClick={() => refetch()}
              disabled={isFetching}
              className="p-1.5 text-gray-400 hover:text-juve-gold transition-colors"
              title="Aggiorna"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? 'animate-spin' : ''}`} />
            </button>
          )}
        </div>
        <p className="text-xs text-gray-400 mb-6">
          {hasNews
            ? `${articles.length} notizie di calciomercato Juventus in tempo reale da TuttoJuve`
            : 'Notizie di calciomercato Juventus da TuttoJuve'
          }
        </p>

        {/* Stats strip */}
        {hasNews && (
          <div className="grid grid-cols-3 gap-px bg-gray-200 mb-6">
            <div className="bg-white py-3 px-2 text-center">
              <div className="font-display text-xl md:text-2xl font-black text-juve-black">{articles.length}</div>
              <div className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Notizie</div>
            </div>
            <div className="bg-white py-3 px-2 text-center">
              <div className="font-display text-xl md:text-2xl font-black text-green-600">
                {articles.filter(a => {
                  const diff = Date.now() - new Date(a.date).getTime()
                  return diff < 24 * 60 * 60 * 1000
                }).length}
              </div>
              <div className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Ultime 24h</div>
            </div>
            <div className="bg-white py-3 px-2 text-center">
              <div className="font-display text-xl md:text-2xl font-black text-juve-gold">TuttoJuve</div>
              <div className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Fonte</div>
            </div>
          </div>
        )}

        {/* Loading */}
        {isLoading && (
          <div className="text-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-juve-gold mx-auto mb-3" />
            <p className="text-sm text-gray-500">Caricamento notizie calciomercato...</p>
          </div>
        )}

        {/* News list */}
        {hasNews && (
          <div className="space-y-3">
            {articles.map((article, i) => (
              <NewsCard key={article.id} article={article} index={i} />
            ))}
          </div>
        )}

        {/* Empty state */}
        {!isLoading && !hasNews && (
          <div className="text-center py-16">
            <WifiOff className="h-10 w-10 text-gray-300 mx-auto mb-4" />
            <p className="text-sm text-gray-500 mb-1">Nessuna notizia di calciomercato disponibile.</p>
            <p className="text-[10px] text-gray-400 mb-4">La pagina si aggiorna automaticamente ogni 15 minuti.</p>
            <button
              onClick={() => refetch()}
              className="inline-flex items-center gap-2 bg-juve-black text-white px-4 py-2 text-xs font-black uppercase tracking-widest hover:bg-juve-gold hover:text-juve-black transition-colors"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Riprova
            </button>
          </div>
        )}

        {/* Source credits */}
        {hasNews && (
          <div className="mt-8 flex flex-col items-center justify-center gap-2 border-t border-gray-200 pt-6 text-center sm:flex-row">
            <Newspaper className="h-3.5 w-3.5 text-gray-400" />
            <p className="text-[10px] text-gray-400">
              Fonte: TuttoJuve.com — Sezione Calciomercato | Aggiornamento ogni 15 min
            </p>
          </div>
        )}

        {/* CTA to Notizie Live */}
        <div className="mt-8 p-4 bg-juve-black text-center">
          <p className="text-xs text-gray-400 mb-2">Vuoi tutte le notizie Juve in tempo reale?</p>
          <Link
            to="/notizie-live"
            className="inline-flex w-full items-center justify-center gap-2 bg-juve-gold px-5 py-2 text-xs font-black uppercase tracking-widest text-juve-black transition-colors hover:bg-juve-gold-dark sm:w-auto"
          >
            <Newspaper className="h-3.5 w-3.5" />
            Vai a Notizie Live
          </Link>
        </div>

        <p className="text-[10px] text-gray-400 text-center mt-8 italic">
          Le notizie provengono da TuttoJuve.com e non costituiscono conferma ufficiale di trasferimento.
        </p>
      </div>
    </>
  )
}
