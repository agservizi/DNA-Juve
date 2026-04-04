import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Trophy, Flame, BookOpen } from 'lucide-react'
import { useReader } from '@/hooks/useReader'
import { getReaderLeaderboard } from '@/lib/supabase'

const MEDAL_COLORS = ['bg-juve-gold text-black', 'bg-gray-300 text-black', 'bg-amber-700 text-white']

function buildCurrentUserEntry(reader, stats) {
  if (!reader) return null

  return {
    id: reader.id || reader.email || reader.name,
    name: reader.name,
    avatarUrl: reader.avatarUrl || null,
    articles: stats.totalArticles || 0,
    streak: 0,
    points: (stats.totalArticles * 10) + (stats.articlesThisMonth * 5),
    isCurrentUser: true,
  }
}

export default function Leaderboard({ variant = 'full' }) {
  const { reader, stats } = useReader()

  const { data: remoteEntries = [] } = useQuery({
    queryKey: ['reader-leaderboard', variant],
    queryFn: async () => {
      const { data, error } = await getReaderLeaderboard({ limit: variant === 'compact' ? 5 : 10 })
      if (error) throw error
      return data || []
    },
    staleTime: 60000,
    retry: 1,
  })

  const entries = useMemo(() => {
    const currentUserEntry = buildCurrentUserEntry(reader, stats)
    const deduped = [...remoteEntries]

    if (currentUserEntry) {
      const existingIndex = deduped.findIndex((entry) => entry.id === currentUserEntry.id)
      if (existingIndex >= 0) {
        deduped[existingIndex] = { ...deduped[existingIndex], ...currentUserEntry, isCurrentUser: true }
      } else {
        deduped.push(currentUserEntry)
      }
    }

    return deduped
      .map((entry) => ({
        ...entry,
        articles: Number(entry.articles || 0),
        streak: Number(entry.streak || 0),
        points: Number(entry.points || 0),
        isCurrentUser: Boolean(entry.isCurrentUser),
      }))
      .sort((a, b) => {
        if (b.points !== a.points) return b.points - a.points
        if (b.articles !== a.articles) return b.articles - a.articles
        return b.streak - a.streak
      })
  }, [reader, remoteEntries, stats])

  const displayed = variant === 'compact' ? entries.slice(0, 5) : entries

  if (!displayed.length) {
    return (
      <div>
        <div className="flex items-center gap-2 mb-4 pb-3 border-b-2 border-juve-black">
          <Trophy className="h-4 w-4 text-juve-gold" />
          <h3 className="text-xs font-black uppercase tracking-widest">Top Lettori</h3>
        </div>
        <p className="text-sm text-gray-500">La classifica si popolerà con i primi lettori attivi.</p>
      </div>
    )
  }

  if (variant === 'compact') {
    return (
      <div>
        <div className="flex items-center gap-2 mb-4 pb-3 border-b-2 border-juve-black">
          <Trophy className="h-4 w-4 text-juve-gold" />
          <h3 className="text-xs font-black uppercase tracking-widest">Top Lettori</h3>
        </div>
        <div className="space-y-2">
          {displayed.map((entry, i) => (
            <div
              key={entry.id || entry.name}
              className={`flex items-center gap-3 px-3 py-2 text-sm ${
                entry.isCurrentUser ? 'bg-juve-gold/10 border-l-2 border-juve-gold' : ''
              }`}
            >
              <span className={`w-6 h-6 flex items-center justify-center text-xs font-black shrink-0 ${
                i < 3 ? MEDAL_COLORS[i] : 'bg-gray-100 text-gray-500'
              }`}>
                {i + 1}
              </span>
              <span className={`flex-1 truncate text-xs font-medium ${entry.isCurrentUser ? 'font-bold text-juve-black' : 'text-gray-600'}`}>
                {entry.name} {entry.isCurrentUser && '(tu)'}
              </span>
              <span className="text-xs font-bold text-juve-gold">{entry.points} pt</span>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <div className="h-6 w-1.5 bg-juve-gold" />
        <h2 className="text-xs font-black uppercase tracking-[0.2em] text-gray-500">Classifica Lettori</h2>
        <div className="flex-1 h-px bg-gray-200" />
      </div>

      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {entries.slice(0, 3).map((entry, i) => (
          <motion.div
            key={entry.id || entry.name}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className={`text-center p-4 border-2 ${
              i === 0 ? 'border-juve-gold bg-juve-gold/5' : 'border-gray-200'
            } ${entry.isCurrentUser ? 'ring-2 ring-juve-gold' : ''}`}
          >
            <div className={`w-10 h-10 flex items-center justify-center mx-auto mb-2 text-sm font-black ${MEDAL_COLORS[i]}`}>
              {i + 1}
            </div>
            <p className="font-display text-sm font-bold truncate">
              {entry.name} {entry.isCurrentUser && <span className="text-juve-gold">(tu)</span>}
            </p>
            <p className="font-display text-2xl font-black text-juve-gold mt-1">{entry.points}</p>
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500">punti</p>
            <div className="flex items-center justify-center gap-3 mt-3 text-xs text-gray-500">
              <span className="flex items-center gap-1"><BookOpen className="h-3 w-3" />{entry.articles}</span>
              <span className="flex items-center gap-1"><Flame className="h-3 w-3" />{entry.streak}d</span>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="space-y-3 md:hidden">
        {displayed.map((entry, i) => (
          <motion.div
            key={entry.id || entry.name}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: i * 0.03 }}
            className={`border-2 border-gray-200 p-4 ${
              entry.isCurrentUser ? 'bg-juve-gold/10' : 'bg-white'
            }`}
          >
            <div className="mb-3 flex items-center gap-3">
              <span className={`flex h-8 w-8 items-center justify-center text-xs font-black ${
                i < 3 ? MEDAL_COLORS[i] : 'bg-gray-100 text-gray-500'
              }`}>
                {i + 1}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-display text-sm font-bold">
                  {entry.name} {entry.isCurrentUser && <span className="text-juve-gold">(tu)</span>}
                </p>
                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Lettore attivo</p>
              </div>
              <span className="font-bold text-juve-gold">{entry.points} pt</span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="border border-gray-100 px-2 py-2">
                <p className="text-lg font-display font-black text-juve-black">{entry.articles}</p>
                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Articoli</p>
              </div>
              <div className="border border-gray-100 px-2 py-2">
                <p className="flex items-center justify-center gap-1 text-lg font-display font-black text-juve-black">
                  <Flame className="h-3.5 w-3.5 text-orange-400" />
                  {entry.streak}
                </p>
                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Streak</p>
              </div>
              <div className="border border-gray-100 px-2 py-2">
                <p className="text-lg font-display font-black text-juve-gold">{entry.points}</p>
                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Punti</p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="hidden border-2 border-gray-200 md:block">
        <div className="grid grid-cols-12 gap-2 px-4 py-2 bg-gray-50 text-[10px] font-black uppercase tracking-widest text-gray-500">
          <span className="col-span-1">#</span>
          <span className="col-span-4">Lettore</span>
          <span className="col-span-2 text-center">Articoli</span>
          <span className="col-span-2 text-center">Streak</span>
          <span className="col-span-3 text-right">Punti</span>
        </div>
        {displayed.map((entry, i) => (
          <motion.div
            key={entry.id || entry.name}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: i * 0.03 }}
            className={`grid grid-cols-12 gap-2 px-4 py-3 border-t border-gray-100 items-center text-sm ${
              entry.isCurrentUser ? 'bg-juve-gold/10 font-bold' : ''
            }`}
          >
            <span className={`col-span-1 w-6 h-6 flex items-center justify-center text-xs font-black ${
              i < 3 ? MEDAL_COLORS[i] : 'text-gray-400'
            }`}>
              {i + 1}
            </span>
            <span className="col-span-4 truncate">
              {entry.name} {entry.isCurrentUser && <span className="text-juve-gold">(tu)</span>}
            </span>
            <span className="col-span-2 text-center text-gray-500">{entry.articles}</span>
            <span className="col-span-2 text-center text-gray-500 flex items-center justify-center gap-1">
              <Flame className="h-3 w-3 text-orange-400" />{entry.streak}
            </span>
            <span className="col-span-3 text-right font-bold text-juve-gold">{entry.points} pt</span>
          </motion.div>
        ))}
      </div>
    </div>
  )
}
