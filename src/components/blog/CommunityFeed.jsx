import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { PenLine, Zap, Users } from 'lucide-react'
import { getCommunityFeed } from '@/lib/supabase'
import { formatDate } from '@/lib/utils'

const MOOD_EMOJI = {
  ecstatic: '🤩',
  happy: '😊',
  neutral: '😐',
  sad: '😞',
  angry: '😤',
}

function TeamCrest({ name, crest }) {
  return (
    <span className="relative inline-flex h-5 w-5 shrink-0 items-center justify-center overflow-hidden rounded-sm border border-black/10 bg-white text-[8px] font-black align-middle">
      {name?.slice(0, 2).toUpperCase()}
      {crest && (
        <img
          src={crest}
          alt={name}
          className="absolute inset-0 h-full w-full object-contain bg-white p-0.5"
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={e => { e.currentTarget.style.display = 'none' }}
        />
      )}
    </span>
  )
}

function DiaryCard({ entry }) {
  const mood = MOOD_EMOJI[entry.mood] || ''
  const hasScore = entry.final_home_score != null && entry.final_away_score != null

  return (
    <div className="border border-gray-200 bg-white p-4">
      <div className="flex items-center gap-2 mb-2">
        <PenLine className="h-3 w-3 text-juve-gold shrink-0" />
        <span className="text-[10px] font-black uppercase tracking-widest text-juve-gold">Diario</span>
        <span className="text-[10px] text-gray-400 ml-auto">{entry.username}</span>
      </div>
      <div className="flex items-center gap-1.5 flex-wrap">
        {entry.home_team_name && (
          <TeamCrest name={entry.home_team_name} crest={entry.home_team_crest} />
        )}
        <span className="text-xs font-black text-juve-black">
          {entry.home_team_name || 'Casa'}
        </span>
        {hasScore && (
          <span className="font-display text-sm font-black text-juve-gold px-1">
            {entry.final_home_score}–{entry.final_away_score}
          </span>
        )}
        {entry.away_team_name && (
          <TeamCrest name={entry.away_team_name} crest={entry.away_team_crest} />
        )}
        <span className="text-xs font-black text-juve-black">
          {entry.away_team_name || 'Ospite'}
        </span>
      </div>
      <div className="flex items-center gap-2 mt-2">
        {mood && <span className="text-base">{mood}</span>}
        {entry.rating != null && (
          <span className="font-display text-sm font-black text-juve-gold">{entry.rating}/10</span>
        )}
      </div>
      {entry.note && (
        <p className="mt-2 text-xs text-gray-600 line-clamp-2">{entry.note}</p>
      )}
      <p className="mt-2 text-[10px] text-gray-400">{formatDate(entry.created_at)}</p>
    </div>
  )
}

function PredictionCard({ entry }) {
  return (
    <div className="border border-gray-200 bg-white p-4">
      <div className="flex items-center gap-2 mb-2">
        <Zap className="h-3 w-3 text-juve-gold shrink-0" />
        <span className="text-[10px] font-black uppercase tracking-widest text-juve-gold">Pronostico</span>
        <span className="text-[10px] text-gray-400 ml-auto">{entry.username}</span>
      </div>
      <div className="flex items-center gap-1.5 flex-wrap">
        {entry.home_team_name && (
          <TeamCrest name={entry.home_team_name} crest={entry.home_team_crest} />
        )}
        <span className="text-xs font-black text-juve-black">
          {entry.home_team_name || 'Casa'}
        </span>
        <span className="font-display text-sm font-black text-juve-gold px-1">
          {entry.home_score}–{entry.away_score}
        </span>
        {entry.away_team_name && (
          <TeamCrest name={entry.away_team_name} crest={entry.away_team_crest} />
        )}
        <span className="text-xs font-black text-juve-black">
          {entry.away_team_name || 'Ospite'}
        </span>
      </div>
      {entry.motm && (
        <p className="mt-2 text-xs text-gray-500">MVP: <strong>{entry.motm}</strong></p>
      )}
      <p className="mt-2 text-[10px] text-gray-400">{formatDate(entry.created_at)}</p>
    </div>
  )
}

export default function CommunityFeed() {
  const { data: feed = [], isLoading } = useQuery({
    queryKey: ['community-feed'],
    queryFn: async () => {
      const { data } = await getCommunityFeed({ limit: 8 })
      return data || []
    },
    staleTime: 60000,
  })

  if (isLoading || feed.length === 0) return null

  return (
    <div className="max-w-7xl mx-auto px-4 pb-8">
      <div className="border border-gray-200 bg-white p-5">
        <div className="mb-4 flex items-center justify-between border-b border-gray-100 pb-3">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-juve-gold" />
            <h2 className="text-xs font-black uppercase tracking-widest text-juve-black">
              La community bianconera
            </h2>
          </div>
          <Link
            to="/area-bianconera"
            className="text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-juve-gold transition-colors"
          >
            Scrivi anche tu
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {feed.map((entry, i) => (
            <motion.div
              key={entry.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
            >
              {entry.type === 'diary'
                ? <DiaryCard entry={entry} />
                : <PredictionCard entry={entry} />
              }
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  )
}
