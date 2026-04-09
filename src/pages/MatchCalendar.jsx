import { useState } from 'react'
import { motion } from 'framer-motion'
import { Calendar, MapPin, Loader2 } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import SEO from '@/components/blog/SEO'
import { getTeamMatches, shouldRetryFootballQuery } from '@/lib/footballApi'

// Fallback demo matches
const DEMO_MATCHES = [
  { id: 1, home: 'Juventus', away: 'Torino', homeScore: 3, awayScore: 1, competition: 'Serie A', venue: 'Allianz Stadium', date: '2026-03-29T20:45:00', played: true },
  { id: 2, home: 'Milan', away: 'Juventus', homeScore: 1, awayScore: 2, competition: 'Serie A', venue: 'San Siro', date: '2026-03-22T18:00:00', played: true },
  { id: 3, home: 'Juventus', away: 'Borussia Dortmund', homeScore: 3, awayScore: 0, competition: 'Champions', venue: 'Allianz Stadium', date: '2026-03-18T21:00:00', played: true },
  { id: 4, home: 'Genoa', away: 'Juventus', homeScore: 1, awayScore: 5, competition: 'Serie A', venue: 'Marassi', date: '2026-03-15T15:00:00', played: true },
  { id: 5, home: 'Juventus', away: 'Fiorentina', homeScore: 2, awayScore: 2, competition: 'Serie A', venue: 'Allianz Stadium', date: '2026-03-08T20:45:00', played: true },
  { id: 6, home: 'Juventus', away: 'PSG', competition: 'Champions', venue: 'Allianz Stadium', date: '2026-04-08T21:00:00', played: false },
  { id: 7, home: 'Napoli', away: 'Juventus', competition: 'Serie A', venue: 'Maradona', date: '2026-04-12T20:45:00', played: false },
]

const COMP_COLORS = {
  'Serie A': 'bg-red-600',
  'Champions League': 'bg-purple-600',
  'UEFA Champions League': 'bg-purple-600',
  'Champions': 'bg-purple-600',
  'Coppa Italia': 'bg-green-600',
  'Supercoppa': 'bg-yellow-600',
  'Supercoppa Italiana': 'bg-yellow-600',
}

function mapApiMatches(apiMatches) {
  return apiMatches.map(m => ({
    id: m.id,
    home: m.homeTeam.shortName || m.homeTeam.name,
    away: m.awayTeam.shortName || m.awayTeam.name,
    homeScore: m.score?.fullTime?.home,
    awayScore: m.score?.fullTime?.away,
    competition: m.competition.name,
    venue: m.venue || '',
    date: m.utcDate,
    played: m.status === 'FINISHED',
  }))
}

export default function MatchCalendar() {
  const [filter, setFilter] = useState('all')

  const { data: apiMatches, isLoading } = useQuery({
    queryKey: ['teamMatches'],
    queryFn: () => getTeamMatches(),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: shouldRetryFootballQuery,
  })

  const allMatches = apiMatches ? mapApiMatches(apiMatches) : DEMO_MATCHES

  const filtered = allMatches.filter(m => {
    if (filter === 'played') return m.played
    if (filter === 'upcoming') return !m.played
    return true
  }).sort((a, b) => new Date(b.date) - new Date(a.date))

  const results = { w: 0, d: 0, l: 0 }
  allMatches.filter(m => m.played).forEach(m => {
    const juveHome = m.home === 'Juventus' || m.home === 'Juventus FC'
    const juveScore = juveHome ? m.homeScore : m.awayScore
    const oppScore = juveHome ? m.awayScore : m.homeScore
    if (juveScore > oppScore) results.w++
    else if (juveScore === oppScore) results.d++
    else results.l++
  })

  const formatMatchDate = (dateStr) => {
    const d = new Date(dateStr)
    return d.toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric', month: 'short' })
  }
  const formatMatchTime = (dateStr) => {
    const d = new Date(dateStr)
    return d.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <>
      <SEO title="Calendario Partite" description="Tutte le partite della Juventus: risultati, prossimi match e statistiche." />
      <div className="max-w-4xl mx-auto px-4 py-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Calendar className="h-6 w-6 text-juve-gold" />
            <h1 className="font-display text-3xl md:text-4xl font-black text-juve-black">Calendario Partite</h1>
          </div>
          <div className="h-1 w-12 bg-juve-gold" />
        </motion.div>

      {/* Stats strip */}
      <div className="grid grid-cols-2 gap-px bg-gray-200 mb-8 sm:grid-cols-4">
        <div className="bg-white p-4 text-center">
          <p className="font-display text-2xl font-black text-juve-black">{allMatches.length}</p>
          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Partite</p>
        </div>
        <div className="bg-white p-4 text-center">
          <p className="font-display text-2xl font-black text-green-600">{results.w}</p>
          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Vittorie</p>
        </div>
        <div className="bg-white p-4 text-center">
          <p className="font-display text-2xl font-black text-juve-gold">{results.d}</p>
          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Pareggi</p>
        </div>
        <div className="bg-white p-4 text-center">
          <p className="font-display text-2xl font-black text-red-600">{results.l}</p>
          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Sconfitte</p>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="mb-6 overflow-x-auto">
        <div className="flex min-w-max border-b-2 border-juve-black">
          {[
            { id: 'all', label: 'Tutte' },
            { id: 'upcoming', label: 'Prossime' },
            { id: 'played', label: 'Risultati' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id)}
              className={`px-4 py-2.5 text-xs font-black uppercase tracking-widest border-b-2 transition-colors ${
                filter === tab.id
                  ? 'bg-juve-gold text-juve-black border-juve-gold'
                  : 'border-transparent text-gray-500 hover:text-juve-black hover:bg-juve-gold/20'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Match list */}
      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-7 w-7 animate-spin text-juve-gold" />
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((match, i) => {
            const juveHome = match.home === 'Juventus' || match.home === 'Juventus FC'
            let resultClass = ''
            if (match.played) {
              const juveScore = juveHome ? match.homeScore : match.awayScore
              const oppScore = juveHome ? match.awayScore : match.homeScore
              if (juveScore > oppScore) resultClass = 'border-l-4 border-l-green-500'
              else if (juveScore === oppScore) resultClass = 'border-l-4 border-l-juve-gold'
              else resultClass = 'border-l-4 border-l-red-500'
            }

            return (
              <motion.div
                key={match.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.03 }}
                className={`bg-white border border-gray-200 p-4 ${resultClass}`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-[10px] font-bold uppercase tracking-widest text-white px-2 py-0.5 ${COMP_COLORS[match.competition] || 'bg-gray-600'}`}>
                    {match.competition}
                  </span>
                  <span className="text-[10px] text-gray-400 capitalize">{formatMatchDate(match.date)}</span>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex min-w-0 items-center gap-3 sm:flex-1">
                    <div className={`w-8 h-8 flex items-center justify-center text-xs font-black ${juveHome ? 'bg-juve-black text-white' : 'bg-gray-100 text-gray-700'}`}>
                      {match.home[0]}
                    </div>
                    <span className={`min-w-0 text-sm ${juveHome ? 'font-bold' : ''}`}>{match.home}</span>
                  </div>

                  <div className="px-0 text-center shrink-0 sm:px-4">
                    {match.played ? (
                      <span className="font-display text-xl font-black">{match.homeScore} - {match.awayScore}</span>
                    ) : (
                      <span className="text-sm font-bold text-gray-400">{formatMatchTime(match.date)}</span>
                    )}
                  </div>

                  <div className="flex min-w-0 items-center justify-end gap-3 sm:flex-1">
                    <span className={`min-w-0 text-right text-sm ${!juveHome ? 'font-bold' : ''}`}>{match.away}</span>
                    <div className={`w-8 h-8 flex items-center justify-center text-xs font-black ${!juveHome ? 'bg-juve-black text-white' : 'bg-gray-100 text-gray-700'}`}>
                      {match.away[0]}
                    </div>
                  </div>
                </div>

                {match.venue && (
                  <div className="flex items-center gap-1.5 mt-2 text-[10px] text-gray-400">
                    <MapPin className="h-3 w-3" />
                    <span>{match.venue}</span>
                  </div>
                )}
              </motion.div>
            )
          })}
        </div>
      )}
    </div>
    </>
  )
}
