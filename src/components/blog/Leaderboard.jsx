import { motion } from 'framer-motion'
import { Trophy, Flame, BookOpen, MessageSquare } from 'lucide-react'
import { useReader } from '@/hooks/useReader'

const DEMO_LEADERBOARD = [
  { name: 'Alessandro M.', articles: 87, streak: 12, comments: 34, points: 1240 },
  { name: 'Francesca L.',  articles: 72, streak: 9,  comments: 28, points: 1080 },
  { name: 'Giovanni R.',   articles: 65, streak: 15, comments: 19, points: 980 },
  { name: 'Chiara B.',     articles: 58, streak: 7,  comments: 42, points: 920 },
  { name: 'Davide P.',     articles: 51, streak: 5,  comments: 15, points: 780 },
  { name: 'Laura T.',      articles: 44, streak: 8,  comments: 22, points: 720 },
  { name: 'Simone C.',     articles: 39, streak: 4,  comments: 11, points: 610 },
  { name: 'Martina G.',    articles: 35, streak: 6,  comments: 9,  points: 540 },
  { name: 'Andrea F.',     articles: 28, streak: 3,  comments: 7,  points: 420 },
  { name: 'Valentina S.',  articles: 22, streak: 2,  comments: 5,  points: 340 },
]

const MEDAL_COLORS = ['bg-juve-gold text-black', 'bg-gray-300 text-black', 'bg-amber-700 text-white']

export default function Leaderboard({ variant = 'full' }) {
  const { reader, stats } = useReader()

  // Insert current reader into leaderboard
  const userPoints = (stats.totalArticles * 10) + (stats.articlesThisMonth * 5)
  const entries = [...DEMO_LEADERBOARD]

  if (reader) {
    const userEntry = {
      name: reader.name,
      articles: stats.totalArticles,
      streak: 0,
      comments: 0,
      points: userPoints,
      isCurrentUser: true,
    }
    entries.push(userEntry)
    entries.sort((a, b) => b.points - a.points)
  }

  const displayed = variant === 'compact' ? entries.slice(0, 5) : entries

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
              key={entry.name}
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

      {/* Top 3 podium */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {entries.slice(0, 3).map((entry, i) => (
          <motion.div
            key={entry.name}
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

      {/* Full list */}
      <div className="border-2 border-gray-200">
        <div className="grid grid-cols-12 gap-2 px-4 py-2 bg-gray-50 text-[10px] font-black uppercase tracking-widest text-gray-500">
          <span className="col-span-1">#</span>
          <span className="col-span-4">Lettore</span>
          <span className="col-span-2 text-center">Articoli</span>
          <span className="col-span-2 text-center">Streak</span>
          <span className="col-span-3 text-right">Punti</span>
        </div>
        {displayed.map((entry, i) => (
          <motion.div
            key={entry.name}
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
