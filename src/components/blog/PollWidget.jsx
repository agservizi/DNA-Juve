import { useState, useEffect, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { Vote, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { getTeamMatches, getVenueLabel, shouldRetryFootballQuery } from '@/lib/footballApi'

const STORAGE_KEY = 'fb-poll'

function getTeamDisplay(team, fallback = 'Squadra') {
  return {
    name: team?.shortName || team?.name || fallback,
    crest: team?.crest || '',
  }
}

function TeamBadge({ team, align = 'left' }) {
  return (
    <div className={cn(
      'relative flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-sm border border-black/10 bg-white text-[10px] font-black text-juve-black shadow-sm',
      align === 'right' ? 'order-last' : ''
    )}>
      <span>{team.name.slice(0, 2).toUpperCase()}</span>
      {team.crest && (
        <img
          src={team.crest}
          alt={team.name}
          className="absolute inset-0 h-full w-full object-contain bg-white p-1.5"
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={(event) => {
            event.currentTarget.style.display = 'none'
          }}
        />
      )}
    </div>
  )
}

function getPollConfig(match) {
  const homeGoals = match?.score?.fullTime?.home ?? 0
  const awayGoals = match?.score?.fullTime?.away ?? 0
  const juveIsHome = match?.homeTeam?.id === 109
  const juveGoals = juveIsHome ? homeGoals : awayGoals
  const opponentGoals = juveIsHome ? awayGoals : homeGoals

  if (juveGoals > opponentGoals) {
    return {
      question: 'Qual e il verdetto sul successo bianconero?',
      options: [
        { id: 'prestazione', label: 'Prestazione da grande Juve', votes: 184 },
        { id: 'gestione', label: 'Bene il risultato, meglio la gestione', votes: 121 },
        { id: 'mvp', label: 'Decisivi i singoli nei momenti chiave', votes: 96 },
        { id: 'slancio', label: 'Vittoria che puo dare slancio', votes: 144 },
      ],
    }
  }

  if (juveGoals === opponentGoals) {
    return {
      question: 'Che lettura dai al pari appena maturato?',
      options: [
        { id: 'bicchiere-mezzo-pieno', label: 'Punto utile e reazione positiva', votes: 113 },
        { id: 'rimpianto', label: 'Due punti lasciati per strada', votes: 169 },
        { id: 'equilibrio', label: 'Pareggio giusto per quanto visto', votes: 82 },
        { id: 'cresce', label: 'Segnali incoraggianti da cui ripartire', votes: 104 },
      ],
    }
  }

  return {
    question: 'Qual e la tua reazione al ko bianconero?',
    options: [
      { id: 'episodi', label: 'Partita girata su episodi pesanti', votes: 118 },
      { id: 'approccio', label: 'Approccio e intensita da rivedere', votes: 173 },
      { id: 'reazione', label: 'Conta la risposta gia dal prossimo match', votes: 132 },
      { id: 'mercato', label: 'Servono piu soluzioni dalla rosa', votes: 89 },
    ],
  }
}

export default function PollWidget() {
  const { data: teamMatches = [], isLoading } = useQuery({
    queryKey: ['sidebar-poll-last-finished-match'],
    queryFn: () => getTeamMatches(),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: shouldRetryFootballQuery,
  })

  const latestFinishedMatch = useMemo(() => (
    (teamMatches || [])
      .filter(match => match.status === 'FINISHED')
      .sort((a, b) => new Date(b.utcDate) - new Date(a.utcDate))[0] || null
  ), [teamMatches])

  const poll = useMemo(() => {
    if (!latestFinishedMatch) return null
    const home = getTeamDisplay(latestFinishedMatch.homeTeam, 'Casa')
    const away = getTeamDisplay(latestFinishedMatch.awayTeam, 'Ospite')
    const kickoff = new Date(latestFinishedMatch.utcDate)
    const base = getPollConfig(latestFinishedMatch)

    return {
      id: `post-match-${latestFinishedMatch.id}`,
      match: latestFinishedMatch,
      home,
      away,
      competition: latestFinishedMatch.competition?.name || 'Competizione',
      dateLabel: Number.isNaN(kickoff.getTime())
        ? ''
        : kickoff.toLocaleDateString('it-IT', { day: '2-digit', month: 'short' }),
      venueLabel: getVenueLabel(latestFinishedMatch),
      score: `${latestFinishedMatch.score?.fullTime?.home ?? 0} - ${latestFinishedMatch.score?.fullTime?.away ?? 0}`,
      ...base,
    }
  }, [latestFinishedMatch])

  const [voted, setVoted] = useState(null)
  const [options, setOptions] = useState([])

  useEffect(() => {
    if (!poll) return

    setVoted(null)
    setOptions(poll.options)

    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (!stored) return
      const parsed = JSON.parse(stored)
      if (parsed.pollId === poll.id) {
        setVoted(parsed.optionId)
        setOptions(parsed.options)
      }
    } catch {
      setVoted(null)
      setOptions(poll.options)
    }
  }, [poll])

  if (isLoading) {
    return (
      <div className="border border-gray-200">
        <div className="flex items-center gap-2 px-4 py-3 border-b-2 border-juve-black">
          <Vote className="h-4 w-4 text-juve-gold" />
          <h3 className="text-xs font-black uppercase tracking-widest">Sondaggio</h3>
        </div>
        <div className="p-4">
          <p className="text-sm text-gray-500">Caricamento ultimo match ufficiale...</p>
        </div>
      </div>
    )
  }

  if (!poll) return null

  const totalVotes = options.reduce((sum, option) => sum + option.votes, 0)

  const handleVote = (optionId) => {
    if (voted) return

    const updated = options.map((option) => (
      option.id === optionId ? { ...option, votes: option.votes + 1 } : option
    ))

    setOptions(updated)
    setVoted(optionId)

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        pollId: poll.id,
        optionId,
        options: updated,
      }))
    } catch {}
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="border border-gray-200"
    >
      <div className="flex items-center gap-2 px-4 py-3 border-b-2 border-juve-black">
        <Vote className="h-4 w-4 text-juve-gold" />
        <h3 className="text-xs font-black uppercase tracking-widest">Sondaggio</h3>
      </div>

      <div className="p-4">
        <div className="mb-4 border border-juve-gold/30 bg-juve-black/[0.03] p-3">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] font-bold uppercase tracking-widest text-gray-500">
            <span>{poll.competition}</span>
            {poll.dateLabel && <span>{poll.dateLabel}</span>}
            {poll.venueLabel && <span>{poll.venueLabel}</span>}
          </div>
          <div className="mt-3 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
            <div className="flex min-w-0 items-center gap-2">
              <TeamBadge team={poll.home} />
              <span className="truncate text-sm font-black text-juve-black">{poll.home.name}</span>
            </div>
            <p className="font-display text-xl font-black text-juve-black">{poll.score}</p>
            <div className="flex min-w-0 items-center justify-end gap-2">
              <span className="truncate text-right text-sm font-black text-juve-black">{poll.away.name}</span>
              <TeamBadge team={poll.away} align="right" />
            </div>
          </div>
        </div>

        <p className="font-display text-sm font-bold mb-4">{poll.question}</p>

        <div className="space-y-2">
          {options.map((option) => {
            const pct = totalVotes > 0 ? Math.round((option.votes / totalVotes) * 100) : 0
            const isSelected = voted === option.id

            return (
              <button
                key={option.id}
                onClick={() => handleVote(option.id)}
                disabled={!!voted}
                className={cn(
                  'w-full text-left relative overflow-hidden border transition-all',
                  voted ? 'cursor-default' : 'hover:border-juve-gold cursor-pointer',
                  isSelected ? 'border-juve-gold' : 'border-gray-200'
                )}
              >
                <AnimatePresence>
                  {voted && (
                    <motion.div
                      initial={{ scaleX: 0 }}
                      animate={{ scaleX: 1 }}
                      className="absolute inset-0 origin-left"
                      style={{
                        width: `${pct}%`,
                        backgroundColor: isSelected ? 'rgba(245,166,35,0.15)' : 'rgba(0,0,0,0.03)',
                      }}
                    />
                  )}
                </AnimatePresence>

                <div className="relative flex items-center justify-between px-3 py-2">
                  <div className="flex items-center gap-2">
                    {isSelected && <Check className="h-3.5 w-3.5 text-juve-gold" />}
                    <span className={cn('text-sm', isSelected ? 'font-bold' : 'font-medium')}>
                      {option.label}
                    </span>
                  </div>
                  {voted && (
                    <span className={cn('text-xs font-bold', isSelected ? 'text-juve-gold' : 'text-gray-400')}>
                      {pct}%
                    </span>
                  )}
                </div>
              </button>
            )
          })}
        </div>

        <p className="text-[10px] text-gray-400 mt-3 text-right">{totalVotes} voti totali</p>
      </div>
    </motion.div>
  )
}
