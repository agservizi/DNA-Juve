import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Calendar, MapPin, Trophy, Loader2 } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { getNextMatch } from '@/lib/footballApi'

// Fallback demo match (7 giorni da ora)
function getDemoMatch() {
  const now = new Date()
  const matchDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
  matchDate.setHours(20, 45, 0, 0)
  return {
    home: 'Juventus',
    away: 'Inter',
    competition: 'Serie A — 30ª Giornata',
    venue: 'Allianz Stadium, Torino',
    date: matchDate,
  }
}

function pad(n) {
  return String(n).padStart(2, '0')
}

export default function MatchCountdown() {
  const { data: apiMatch, isLoading } = useQuery({
    queryKey: ['nextMatch'],
    queryFn: getNextMatch,
    staleTime: 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 1,
  })

  // Map API response or fallback to demo
  const match = apiMatch
    ? {
        home: apiMatch.homeTeam.shortName || apiMatch.homeTeam.name,
        away: apiMatch.awayTeam.shortName || apiMatch.awayTeam.name,
        competition: apiMatch.competition.name,
        venue: apiMatch.venue || 'Da definire',
        date: new Date(apiMatch.utcDate),
      }
    : getDemoMatch()

  const [remaining, setRemaining] = useState(null)

  useEffect(() => {
    function calc() {
      const diff = match.date.getTime() - Date.now()
      if (diff <= 0) return setRemaining(null)
      const d = Math.floor(diff / 86400000)
      const h = Math.floor((diff % 86400000) / 3600000)
      const m = Math.floor((diff % 3600000) / 60000)
      const s = Math.floor((diff % 60000) / 1000)
      setRemaining({ d, h, m, s })
    }
    calc()
    const id = setInterval(calc, 1000)
    return () => clearInterval(id)
  }, [match.date.getTime()])

  const dateStr = match.date.toLocaleDateString('it-IT', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
  })

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-juve-black text-white p-5"
    >
      <div className="flex items-center gap-2 mb-4">
        <Trophy className="h-4 w-4 text-juve-gold" />
        <h3 className="text-xs font-black uppercase tracking-widest text-juve-gold">Prossima Partita</h3>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-juve-gold" />
        </div>
      ) : (
        <>
          <p className="text-[10px] uppercase tracking-wider text-gray-400 mb-3">{match.competition}</p>

          {/* Teams */}
          <div className="flex items-center justify-center gap-4 mb-4">
            <div className="text-center flex-1">
              <div className="w-12 h-12 bg-white mx-auto mb-1.5 flex items-center justify-center">
                <span className="font-display text-xl font-black text-black">{match.home[0]}</span>
              </div>
              <span className="text-xs font-bold">{match.home}</span>
            </div>
            <span className="text-2xl font-display font-black text-juve-gold">vs</span>
            <div className="text-center flex-1">
              <div className="w-12 h-12 bg-white mx-auto mb-1.5 flex items-center justify-center">
                <span className="font-display text-xl font-black text-black">{match.away[0]}</span>
              </div>
              <span className="text-xs font-bold">{match.away}</span>
            </div>
          </div>

          {/* Countdown */}
          {remaining && (
            <div className="grid grid-cols-4 gap-2 mb-4">
              {[
                { val: remaining.d, label: 'Giorni' },
                { val: remaining.h, label: 'Ore' },
                { val: remaining.m, label: 'Min' },
                { val: remaining.s, label: 'Sec' },
              ].map(({ val, label }) => (
                <div key={label} className="text-center">
                  <div className="bg-gray-900 border border-gray-700 py-2">
                    <span className="font-display text-xl font-black text-juve-gold">{pad(val)}</span>
                  </div>
                  <span className="text-[9px] uppercase tracking-wider text-gray-500 mt-1 block">{label}</span>
                </div>
              ))}
            </div>
          )}

          {/* Info */}
          <div className="space-y-1.5 text-xs text-gray-400">
            <div className="flex items-center gap-2">
              <Calendar className="h-3.5 w-3.5 text-juve-gold" />
              <span className="capitalize">{dateStr}</span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="h-3.5 w-3.5 text-juve-gold" />
              <span>{match.venue}</span>
            </div>
          </div>
        </>
      )}
    </motion.div>
  )
}
