import { useState, useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'
import { Calendar, MapPin, Trophy, Loader2, Activity, History } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { getNextMatch, getRecentFinishedMatches, getTeamMatches, getVenueLabel, JUVE_ID, shouldRetryFootballQuery } from '@/lib/footballApi'

function getDemoMatch() {
  const now = new Date()
  const matchDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
  matchDate.setHours(20, 45, 0, 0)
  return {
    homeTeam: { id: JUVE_ID, shortName: 'Juve', name: 'Juventus', crest: '' },
    awayTeam: { id: 108, shortName: 'Inter', name: 'Inter', crest: '' },
    competition: { name: 'Serie A' },
    venue: 'Allianz Stadium, Torino',
    utcDate: matchDate.toISOString(),
  }
}

function pad(n) {
  return String(n).padStart(2, '0')
}

function getTeamDisplay(team, fallback = 'Squadra') {
  return {
    id: team?.id,
    name: team?.shortName || team?.name || fallback,
    crest: team?.crest || '',
  }
}

function getResultLetter(match, teamId) {
  const isHome = match.homeTeam?.id === teamId
  const teamGoals = isHome ? match.score?.fullTime?.home : match.score?.fullTime?.away
  const oppGoals = isHome ? match.score?.fullTime?.away : match.score?.fullTime?.home

  if (teamGoals == null || oppGoals == null) return '?'
  if (teamGoals > oppGoals) return 'V'
  if (teamGoals < oppGoals) return 'P'
  return 'N'
}

function getResultStyles(letter) {
  if (letter === 'V') return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
  if (letter === 'P') return 'bg-red-500/20 text-red-300 border-red-500/30'
  return 'bg-gray-500/20 text-gray-200 border-gray-500/30'
}

function getLastFiveForm(matches, teamId) {
  return (matches || [])
    .filter(match => match.status === 'FINISHED')
    .sort((a, b) => new Date(b.utcDate) - new Date(a.utcDate))
    .slice(0, 5)
    .map(match => getResultLetter(match, teamId))
}

function getHeadToHeadLabel(match) {
  if (!match) return 'Nessun precedente recente trovato'
  const home = getTeamDisplay(match.homeTeam, 'Casa').name
  const away = getTeamDisplay(match.awayTeam, 'Ospite').name
  const homeGoals = match.score?.fullTime?.home ?? 0
  const awayGoals = match.score?.fullTime?.away ?? 0
  const when = new Date(match.utcDate)
  const dateLabel = Number.isNaN(when.getTime())
    ? ''
    : when.toLocaleDateString('it-IT', { day: '2-digit', month: 'short' })

  return `${home} ${homeGoals}-${awayGoals} ${away}${dateLabel ? ` • ${dateLabel}` : ''}`
}

function summarizeForm(values = []) {
  if (!values.length) return 'dati recenti non disponibili'

  const wins = values.filter((value) => value === 'V').length
  const draws = values.filter((value) => value === 'N').length
  const losses = values.filter((value) => value === 'P').length

  if (wins >= 4) return 'è in grande fiducia'
  if (wins >= 3 && losses === 0) return 'arriva in buona serie utile'
  if (losses >= 3) return 'vive un momento complicato'
  if (draws >= 3) return 'sta trovando continuità ma con diversi pareggi'
  if (wins > losses) return 'ha rendimento leggermente positivo'
  if (losses > wins) return 'ha alternato troppo nelle ultime uscite'
  return 'arriva con andamento equilibrato'
}

function buildMatchFocus({ match, juveForm, opponentForm, headToHead }) {
  const isJuveHome = match.homeTeam?.id === JUVE_ID
  const opponent = isJuveHome ? getTeamDisplay(match.awayTeam, 'Avversaria') : getTeamDisplay(match.homeTeam, 'Avversaria')
  const venueText = isJuveHome ? 'all’Allianz Stadium' : `in trasferta sul campo del ${opponent.name}`
  const juveSummary = summarizeForm(juveForm)
  const opponentSummary = summarizeForm(opponentForm)

  if (!headToHead) {
    return `La Juve gioca ${venueText} contro ${opponent.name}: i bianconeri ${juveSummary}, mentre ${opponent.name} ${opponentSummary}.`
  }

  const result = getResultLetter(headToHead, JUVE_ID)
  const headToHeadSummary = result === 'V'
    ? 'L’ultimo precedente sorride alla Juve'
    : result === 'P'
      ? `L’ultimo confronto ha premiato ${opponent.name}`
      : 'L’ultimo confronto si era chiuso in parità'

  return `La Juve gioca ${venueText} contro ${opponent.name}: i bianconeri ${juveSummary}, mentre ${opponent.name} ${opponentSummary}. ${headToHeadSummary}.`
}

function TeamBadge({ team }) {
  return (
    <div className="relative flex h-14 w-14 items-center justify-center overflow-hidden rounded-sm border border-black/10 bg-white shadow-sm sm:h-16 sm:w-16">
      <span className="font-display text-xl font-black text-black">{team.name.slice(0, 2).toUpperCase()}</span>
      {team.crest && (
        <img
          src={team.crest}
          alt={team.name}
          className="absolute inset-0 h-full w-full object-contain bg-white p-2"
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

function FormStrip({ label, values }) {
  return (
    <div>
      <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-gray-500">{label}</p>
      <div className="flex gap-1.5">
        {(values || []).length > 0 ? (
          values.map((value, index) => (
            <span
              key={`${label}-${index}-${value}`}
              className={`inline-flex h-7 w-7 items-center justify-center border text-[10px] font-black uppercase ${getResultStyles(value)}`}
            >
              {value}
            </span>
          ))
        ) : (
          <span className="text-xs text-gray-400">Dati non disponibili</span>
        )}
      </div>
    </div>
  )
}

export default function MatchCountdown() {
  const { data: bundle, isLoading } = useQuery({
    queryKey: ['nextMatchWidgetBundle'],
    queryFn: async () => {
      const nextMatch = (await getNextMatch()) || getDemoMatch()
      const opponent = nextMatch.homeTeam?.id === JUVE_ID ? nextMatch.awayTeam : nextMatch.homeTeam

      const [juveMatches, opponentMatches] = await Promise.all([
        getTeamMatches(),
        opponent?.id ? getRecentFinishedMatches(opponent.id, 5) : Promise.resolve([]),
      ])

      const headToHead = (juveMatches || [])
        .filter(match => match.status === 'FINISHED')
        .filter(match => match.homeTeam?.id === opponent?.id || match.awayTeam?.id === opponent?.id)
        .sort((a, b) => new Date(b.utcDate) - new Date(a.utcDate))[0] || null

      return {
        match: nextMatch,
        juveForm: getLastFiveForm(juveMatches, JUVE_ID),
        opponentForm: getLastFiveForm(opponentMatches, opponent?.id),
        headToHead,
      }
    },
    staleTime: 60 * 1000,
    refetchOnWindowFocus: false,
    retry: shouldRetryFootballQuery,
  })

  const match = bundle?.match || getDemoMatch()
  const home = getTeamDisplay(match.homeTeam, 'Casa')
  const away = getTeamDisplay(match.awayTeam, 'Ospite')
  const venueLabel = getVenueLabel(match)
  const focusText = useMemo(() => buildMatchFocus({
    match,
    juveForm: bundle?.juveForm || [],
    opponentForm: bundle?.opponentForm || [],
    headToHead: bundle?.headToHead || null,
  }), [bundle?.headToHead, bundle?.juveForm, bundle?.opponentForm, match])
  const [remaining, setRemaining] = useState(null)

  useEffect(() => {
    const target = new Date(match.utcDate).getTime()

    function calc() {
      const diff = target - Date.now()
      if (diff <= 0 || Number.isNaN(diff)) return setRemaining(null)
      const d = Math.floor(diff / 86400000)
      const h = Math.floor((diff % 86400000) / 3600000)
      const m = Math.floor((diff % 3600000) / 60000)
      const s = Math.floor((diff % 60000) / 1000)
      setRemaining({ d, h, m, s })
    }

    calc()
    const id = setInterval(calc, 1000)
    return () => clearInterval(id)
  }, [match.utcDate])

  const dateStr = useMemo(() => {
    const date = new Date(match.utcDate)
    return date.toLocaleDateString('it-IT', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      hour: '2-digit',
      minute: '2-digit',
    })
  }, [match.utcDate])

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-juve-black text-white p-5"
    >
      <div className="mb-4 flex items-center gap-2">
        <Trophy className="h-4 w-4 text-juve-gold" />
        <h3 className="text-xs font-black uppercase tracking-widest text-juve-gold">Prossima Partita</h3>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-juve-gold" />
        </div>
      ) : (
        <>
          <p className="mb-3 text-[10px] uppercase tracking-wider text-gray-400">{match.competition?.name || 'Competizione'}</p>

          <div className="mb-4 flex items-start justify-center gap-3 sm:gap-4">
            <div className="flex-1 text-center">
              <div className="mb-1.5 flex justify-center">
                <TeamBadge team={home} />
              </div>
              <span className="block text-xs font-bold leading-tight">{home.name}</span>
            </div>
            <span className="pt-3 text-xl font-display font-black text-juve-gold sm:text-2xl">vs</span>
            <div className="flex-1 text-center">
              <div className="mb-1.5 flex justify-center">
                <TeamBadge team={away} />
              </div>
              <span className="block text-xs font-bold leading-tight">{away.name}</span>
            </div>
          </div>

          {remaining && (
            <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {[
                { val: remaining.d, label: 'Giorni' },
                { val: remaining.h, label: 'Ore' },
                { val: remaining.m, label: 'Min' },
                { val: remaining.s, label: 'Sec' },
              ].map(({ val, label }) => (
                <div key={label} className="text-center">
                  <div className="border border-gray-700 bg-gray-900 py-2">
                    <span className="font-display text-xl font-black text-juve-gold">{pad(val)}</span>
                  </div>
                  <span className="mt-1 block text-[9px] uppercase tracking-wider text-gray-500">{label}</span>
                </div>
              ))}
            </div>
          )}

          <div className="space-y-1.5 text-xs text-gray-400">
            <div className="flex items-start gap-2">
              <Calendar className="h-3.5 w-3.5 text-juve-gold" />
              <span className="capitalize leading-relaxed">{dateStr}</span>
            </div>
            <div className="flex items-start gap-2">
              <MapPin className="h-3.5 w-3.5 text-juve-gold" />
              <span className="leading-relaxed">{venueLabel}</span>
            </div>
          </div>

          <div className="mt-5 space-y-4 border-t border-white/10 pt-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormStrip label="Forma Juve" values={bundle?.juveForm || []} />
              <FormStrip label={`Forma ${match.homeTeam?.id === JUVE_ID ? away.name : home.name}`} values={bundle?.opponentForm || []} />
            </div>

            <div>
              <div className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-gray-500">
                <History className="h-3.5 w-3.5 text-juve-gold" />
                <span>Ultimo precedente</span>
              </div>
              <p className="text-sm font-medium text-gray-200">{getHeadToHeadLabel(bundle?.headToHead)}</p>
            </div>

            <div className="rounded-sm border border-white/10 bg-white/5 px-3 py-2">
              <div className="mb-1 flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-gray-500">
                <Activity className="h-3.5 w-3.5 text-juve-gold" />
                <span>Focus match</span>
              </div>
              <p className="text-xs leading-relaxed text-gray-300">
                {focusText}
              </p>
            </div>
          </div>
        </>
      )}
    </motion.div>
  )
}
