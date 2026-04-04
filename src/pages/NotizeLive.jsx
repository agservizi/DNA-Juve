import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import { Wifi, WifiOff, ChevronDown, ChevronUp, ExternalLink, Loader2, Newspaper, RefreshCw, ArrowRight } from 'lucide-react'
import { getTransferNews } from '@/lib/newsApi'
import SEO from '@/components/blog/SEO'

// ── News Card ───────────────────────────────────────────────────────────────

function NewsCard({ article, index }) {
  const [expanded, setExpanded] = useState(false)
  const timeAgo = useMemo(() => {
    const diff = Date.now() - new Date(article.date).getTime()
    const hours = Math.floor(diff / (1000 * 60 * 60))
    if (hours < 1) return 'Adesso'
    if (hours < 24) return `${hours}h fa`
    const days = Math.floor(hours / 24)
    if (days === 1) return 'Ieri'
    return `${days}g fa`
  }, [article.date])

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
      className="bg-white border border-gray-200 overflow-hidden"
    >
      <div className="p-4 cursor-pointer hover:bg-gray-50 transition-colors" onClick={() => setExpanded(!expanded)}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:gap-4">
          {article.image && (
            <div className="h-40 w-full shrink-0 bg-gray-100 overflow-hidden sm:h-20 sm:w-20">
              <img src={article.image} alt="" className="w-full h-full object-cover" onError={(e) => { e.target.style.display = 'none' }} />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="mb-1.5 flex flex-wrap items-center gap-x-2 gap-y-1">
              <span className="text-[10px] font-bold uppercase tracking-widest text-juve-gold">{article.source}</span>
              <span className="text-[10px] text-gray-400">{timeAgo}</span>
            </div>
            <h3 className="font-display text-base font-black text-juve-black leading-tight line-clamp-2">{article.title}</h3>
            {!expanded && article.description && (
              <p className="text-xs text-gray-500 mt-1 line-clamp-2">{article.description}</p>
            )}
          </div>
          <button className="self-end p-1 text-gray-400 shrink-0 sm:mt-1 sm:self-start">
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
        </div>
      </div>
      <AnimatePresence>
        {expanded && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="border-t border-gray-100 px-4 pb-4 pt-3">
              <p className="text-sm text-gray-600 leading-relaxed mb-3">{article.description}</p>
              {article.url && (
                <a href={article.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-xs font-bold text-juve-gold hover:text-juve-gold-dark transition-colors">
                  <ExternalLink className="h-3 w-3" />
                  Leggi su {article.source}
                </a>
              )}
              <p className="text-[10px] text-gray-400 mt-2">
                {new Date(article.date).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                {article.author && ` • ${article.author}`}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

// ── Main Page ───────────────────────────────────────────────────────────────

export default function NotizeLive() {
  const [sortBy, setSortBy] = useState('date')
  const [filterSource, setFilterSource] = useState('all')

  const { data: newsArticles, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ['transfer-news'],
    queryFn: getTransferNews,
    staleTime: 15 * 60 * 1000,
    retry: 1,
  })

  const hasNews = newsArticles && newsArticles.length > 0

  // Extract unique sources for filter
  const sources = useMemo(() => {
    if (!newsArticles?.length) return []
    const unique = [...new Set(newsArticles.map(a => a.source))]
    return unique.sort()
  }, [newsArticles])

  const filtered = useMemo(() => {
    if (!newsArticles?.length) return []
    let list = [...newsArticles]
    if (filterSource !== 'all') list = list.filter(a => a.source === filterSource)
    if (sortBy === 'date') list.sort((a, b) => new Date(b.date) - new Date(a.date))
    if (sortBy === 'source') list.sort((a, b) => a.source.localeCompare(b.source))
    return list
  }, [newsArticles, sortBy, filterSource])

  return (
    <>
      <SEO title="Notizie Live" description="Notizie in tempo reale sulla Juventus: calciomercato, trasferimenti e ultime dal mondo bianconero." url="/notizie-live" />

      {/* ── HERO ─────────────────────────────────────────────────────────── */}
      <section className="bg-juve-black text-white py-10 md:py-14">
        <div className="max-w-4xl mx-auto px-4">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center">
            <div className="flex items-center justify-center gap-2 mb-3">
              {hasNews ? (
                <span className="h-2 w-2 bg-green-500 animate-pulse" />
              ) : (
                <Wifi className="h-4 w-4 text-gray-500" />
              )}
              <span className="text-xs font-black uppercase tracking-widest text-juve-gold">
                {hasNews ? 'Live' : 'Feed'}
              </span>
            </div>
            <h1 className="font-display text-3xl sm:text-4xl md:text-5xl font-black leading-tight mb-2">NOTIZIE LIVE</h1>
            <p className="mx-auto max-w-2xl text-sm text-gray-400">
              Rassegna stampa Juventus in tempo reale da Gazzetta, Sky Sport, Tuttosport e Calciomercato.com
            </p>
          </motion.div>
        </div>
      </section>

      <div className="max-w-4xl mx-auto px-4 py-8">

        {/* ── TOOLBAR ────────────────────────────────────────────────────── */}
        {hasNews && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <Wifi className="h-4 w-4 text-green-500" />
              <span className="text-xs font-black uppercase tracking-widest text-gray-500">
                {filtered.length} notizie
              </span>
              <button
                onClick={() => refetch()}
                disabled={isFetching}
                className="ml-2 p-1.5 text-gray-400 hover:text-juve-gold transition-colors"
                title="Aggiorna"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? 'animate-spin' : ''}`} />
              </button>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              {/* Source filter */}
              {sources.length > 1 && (
                <select
                  value={filterSource}
                  onChange={(e) => setFilterSource(e.target.value)}
                  className="w-full text-[10px] font-bold uppercase tracking-widest border-2 border-gray-200 px-2 py-2 bg-white focus:outline-none focus:border-juve-gold sm:w-auto sm:py-1"
                >
                  <option value="all">Tutte le fonti</option>
                  {sources.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              )}

              {/* Sort */}
              <div className="grid grid-cols-2 gap-1 sm:flex">
                {[{ key: 'date', label: 'Recenti' }, { key: 'source', label: 'Fonte' }].map(s => (
                  <button
                    key={s.key}
                    onClick={() => setSortBy(s.key)}
                    className={`px-2 py-2 text-[10px] font-bold uppercase tracking-widest transition-colors sm:py-1 ${
                      sortBy === s.key ? 'text-juve-black bg-gray-100' : 'text-gray-400 hover:text-gray-600'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* ── LOADING ────────────────────────────────────────────────────── */}
        {isLoading && (
          <div className="text-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-juve-gold mx-auto mb-3" />
            <p className="text-sm text-gray-500">Caricamento notizie in tempo reale...</p>
            <p className="text-[10px] text-gray-400 mt-1">Controllo NewsAPI.org e feed RSS...</p>
          </div>
        )}

        {/* ── NEWS LIST ──────────────────────────────────────────────────── */}
        {hasNews && (
          <div className="space-y-3">
            {filtered.map((article, i) => (
              <NewsCard key={article.id} article={article} index={i} />
            ))}
          </div>
        )}

        {/* ── EMPTY / ERROR STATE ────────────────────────────────────────── */}
        {!isLoading && !hasNews && (
          <div className="text-center py-20">
            <WifiOff className="h-10 w-10 text-gray-300 mx-auto mb-4" />
            <p className="text-sm text-gray-500 mb-1">
              {isError ? 'Errore nel caricamento delle notizie.' : 'Nessuna notizia disponibile al momento.'}
            </p>
            <p className="text-[10px] text-gray-400 mb-4">Le fonti verranno controllate automaticamente ogni 15 minuti.</p>
            <button
              onClick={() => refetch()}
              className="inline-flex items-center gap-2 bg-juve-black text-white px-4 py-2 text-xs font-black uppercase tracking-widest hover:bg-juve-gold hover:text-juve-black transition-colors"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Riprova
            </button>
          </div>
        )}

        {/* ── SOURCE CREDITS ─────────────────────────────────────────────── */}
        {hasNews && (
          <div className="mt-8 flex flex-col items-center justify-center gap-2 border-t border-gray-200 pt-6 text-center sm:flex-row">
            <Newspaper className="h-3.5 w-3.5 text-gray-400" />
            <p className="text-[10px] text-gray-400">
              Fonti: NewsAPI.org, Gazzetta, Sky Sport, Tuttosport, Calciomercato.com | Aggiornamento ogni 15 min
            </p>
          </div>
        )}

        {/* ── CTA CALCIOMERCATO ──────────────────────────────────────────── */}
        <div className="mt-8 p-4 bg-juve-black text-center">
          <p className="text-xs text-gray-400 mb-2">Vuoi i rumors con l'indice di affidabilità?</p>
          <Link
            to="/calciomercato"
            className="inline-flex w-full items-center justify-center gap-2 bg-juve-gold px-5 py-2 text-xs font-black uppercase tracking-widest text-juve-black transition-colors hover:bg-juve-gold-dark sm:w-auto"
          >
            Voci di Mercato
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </>
  )
}
