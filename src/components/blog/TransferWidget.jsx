import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import { Clock, TrendingUp, Newspaper, Wifi, WifiOff } from 'lucide-react'
import { getTuttoJuveCalciomercato } from '@/lib/newsApi'

// ── Transfer window logic ───────────────────────────────────────────────────
function getNextTransferWindow() {
  const now = new Date()
  const year = now.getFullYear()
  const summerOpen = new Date(year, 6, 1)
  const summerClose = new Date(year, 7, 31, 23, 59, 59)
  const winterOpen = new Date(year, 0, 1)
  const winterClose = new Date(year, 0, 31, 23, 59, 59)
  const nextWinterOpen = new Date(year + 1, 0, 1)
  const nextSummerOpen = new Date(year + 1, 6, 1)

  if (now >= winterOpen && now <= winterClose) return { target: winterClose, isOpen: true }
  if (now >= summerOpen && now <= summerClose) return { target: summerClose, isOpen: true }
  if (summerOpen > now) return { target: summerOpen, isOpen: false }
  if (nextWinterOpen > now) return { target: nextWinterOpen, isOpen: false }
  return { target: nextSummerOpen, isOpen: false }
}

export default function TransferWidget() {
  const tw = getNextTransferWindow()
  const [days, setDays] = useState(0)

  // Fetch from TuttoJuve RSS (same cache as Calciomercato page)
  const { data: articles } = useQuery({
    queryKey: ['tuttojuve-calciomercato'],
    queryFn: getTuttoJuveCalciomercato,
    staleTime: 15 * 60 * 1000,
    retry: 1,
  })

  const hasNews = articles && articles.length > 0

  useEffect(() => {
    const calc = () => {
      const diff = tw.target.getTime() - Date.now()
      setDays(Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24))))
    }
    calc()
    const timer = setInterval(calc, 60000)
    return () => clearInterval(timer)
  }, [])

  const timeAgo = (dateStr) => {
    const diff = Date.now() - new Date(dateStr).getTime()
    const hours = Math.floor(diff / (1000 * 60 * 60))
    if (hours < 1) return 'Ora'
    if (hours < 24) return `${hours}h`
    const d = Math.floor(hours / 24)
    return `${d}g`
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="border border-gray-200"
    >
      {/* Header */}
      <div className="bg-juve-black text-white p-4">
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp className="h-4 w-4 text-juve-gold" />
          <h3 className="text-xs font-black uppercase tracking-widest text-juve-gold">Calciomercato</h3>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] text-gray-400 uppercase tracking-wider">
              {tw.isOpen ? 'Chiude tra' : 'Apre tra'}
            </p>
            <span className="font-display text-3xl font-black text-juve-gold">{days}</span>
            <span className="text-xs text-gray-400 ml-1">giorni</span>
          </div>
          <div className="text-right">
            {tw.isOpen ? (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-green-400">
                <span className="h-1.5 w-1.5 bg-green-400 animate-pulse" />
                Aperto
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-gray-500">
                <Clock className="h-3 w-3" />
                Chiuso
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Source indicator */}
      <div className="px-4 py-1.5 bg-gray-50 border-b border-gray-200 flex items-center gap-1.5">
        {hasNews ? (
          <>
            <Wifi className="h-3 w-3 text-green-600" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-green-700">Live da TuttoJuve</span>
          </>
        ) : (
          <>
            <WifiOff className="h-3 w-3 text-gray-400" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">In attesa</span>
          </>
        )}
      </div>

      {/* News list (top 4) */}
      <div className="divide-y divide-gray-100">
        {hasNews ? (
          articles.slice(0, 4).map((article) => (
            <a
              key={article.id}
              href={article.url}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2.5 flex items-center gap-2 hover:bg-gray-50 transition-colors block"
            >
              <Newspaper className="h-3.5 w-3.5 shrink-0 text-juve-gold" />
              <div className="flex-1 min-w-0">
                <span className="text-xs font-bold line-clamp-1 block">{article.title}</span>
                <span className="text-[10px] text-gray-400">TuttoJuve</span>
              </div>
              <span className="text-[9px] font-bold text-gray-400 shrink-0">{timeAgo(article.date)}</span>
            </a>
          ))
        ) : (
          <div className="px-4 py-6 text-center">
            <p className="text-[10px] text-gray-400">Caricamento notizie...</p>
          </div>
        )}
      </div>

      {/* CTA */}
      <Link
        to="/calciomercato"
        className="block text-center py-2.5 text-xs font-black uppercase tracking-widest text-juve-gold hover:bg-juve-gold/10 transition-colors border-t border-gray-200"
      >
        Tutte le notizie →
      </Link>
    </motion.div>
  )
}
