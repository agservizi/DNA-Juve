import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { Calendar, Bell, Download, ExternalLink, MapPin, Loader2 } from 'lucide-react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import SEO from '@/components/blog/SEO'
import { getTeamMatches, shouldRetryFootballQuery } from '@/lib/footballApi'
import { Button } from '@/components/ui/Button'
import { deleteReaderMatchReminder, getReaderMatchReminders, upsertReaderMatchReminder } from '@/lib/supabase'
import { useToast } from '@/hooks/useToast'
import {
  MATCH_REMINDER_PRESETS,
  buildMatchCalendarPayload,
  downloadICSFile,
  formatDateLocalized,
  formatTimeLocalized,
  getClientLocaleContext,
  getRelativeMatchKickoff,
} from '@/lib/utils'
import { useReader } from '@/hooks/useReader'

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
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const { preferences, reader, openLogin, isAuthenticated } = useReader()
  const localeContext = useMemo(() => getClientLocaleContext(preferences?.timeZone), [preferences?.timeZone])

  const { data: apiMatches, isLoading } = useQuery({
    queryKey: ['teamMatches'],
    queryFn: () => getTeamMatches(),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: shouldRetryFootballQuery,
  })

  const allMatches = apiMatches ? mapApiMatches(apiMatches) : DEMO_MATCHES

  const { data: reminderRows = [] } = useQuery({
    queryKey: ['reader-match-reminders', reader?.id],
    queryFn: async () => {
      const { data } = await getReaderMatchReminders(reader?.id)
      return data || []
    },
    enabled: Boolean(reader?.id),
    staleTime: 15000,
  })

  const reminderMap = useMemo(() => {
    return reminderRows.reduce((acc, item) => {
      if (!acc[item.match_id]) acc[item.match_id] = new Set()
      acc[item.match_id].add(item.minutes_before)
      return acc
    }, {})
  }, [reminderRows])

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

  const formatMatchDate = (dateStr) => formatDateLocalized(dateStr, {
    locale: localeContext.locale,
    timeZone: localeContext.timeZone,
  })

  const formatMatchTime = (dateStr) => formatTimeLocalized(dateStr, {
    locale: localeContext.locale,
    timeZone: localeContext.timeZone,
  })

  const toggleReminder = async (match, minutesBefore) => {
    if (!isAuthenticated) {
      openLogin('login')
      toast({
        title: 'Accesso richiesto',
        description: 'Per salvare reminder e agenda personale devi entrare in Area Bianconera.',
        variant: 'destructive',
      })
      return
    }

    const isActive = reminderMap[String(match.id)]?.has(minutesBefore)

    try {
      if (isActive) {
        await deleteReaderMatchReminder({ userId: reader.id, matchId: match.id, minutesBefore })
      } else {
        await upsertReaderMatchReminder({ userId: reader.id, match, minutesBefore })
      }

      await queryClient.invalidateQueries({ queryKey: ['reader-match-reminders', reader.id] })
      toast({
        title: isActive ? 'Reminder rimosso' : 'Reminder salvato',
        description: isActive
          ? 'La partita resta in agenda, ma senza avviso automatico.'
          : `Ti avviseremo ${minutesBefore === 0 ? 'al calcio d’inizio' : `${minutesBefore >= 60 ? `${minutesBefore / 60} ore` : `${minutesBefore} minuti`} prima`}.`,
        variant: 'success',
      })
    } catch (error) {
      toast({
        title: 'Reminder non aggiornato',
        description: error.message || 'Non sono riuscito a salvare il reminder della partita.',
        variant: 'destructive',
      })
    }
  }

  const exportMatch = (match, mode) => {
    const payload = buildMatchCalendarPayload(match, {
      title: `${match.home} vs ${match.away}`,
      description: `${match.competition} · ${match.venue || 'Calendario Juventus'} · Orario locale ${formatMatchTime(match.date)}`,
      location: match.venue,
    })

    if (!payload) return

    if (mode === 'google') {
      window.open(payload.googleUrl, '_blank', 'noopener,noreferrer')
      return
    }

    downloadICSFile(payload.icsFileName, payload.ics)
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
          <p className="mt-3 text-sm text-gray-500">
            Orari mostrati nel tuo fuso locale: <span className="font-semibold text-juve-black">{localeContext.timeZoneLabel}</span>
            {localeContext.region ? ` (${localeContext.region})` : ''}
          </p>
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
            const relativeKickoff = getRelativeMatchKickoff(match.date, {
              locale: localeContext.locale,
              timeZone: localeContext.timeZone,
            })
            const activeReminderSet = reminderMap[String(match.id)] || new Set()
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
                  <div className="text-right">
                    <span className="block text-[10px] text-gray-400 capitalize">{formatMatchDate(match.date)}</span>
                    {!match.played && relativeKickoff?.shortLabel && (
                      <span className="block text-[10px] font-bold uppercase tracking-widest text-juve-gold">{relativeKickoff.shortLabel}</span>
                    )}
                  </div>
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

                {!match.played && (
                  <div className="mt-4 border-t border-gray-100 pt-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <Button type="button" variant="outline" size="sm" onClick={() => exportMatch(match, 'google')}>
                        <ExternalLink className="h-3.5 w-3.5" />
                        Google Calendar
                      </Button>
                      <Button type="button" variant="outline" size="sm" onClick={() => exportMatch(match, 'ics')}>
                        <Download className="h-3.5 w-3.5" />
                        File ICS
                      </Button>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {MATCH_REMINDER_PRESETS.map((preset) => {
                        const isActive = activeReminderSet.has(preset.minutes)

                        return (
                          <button
                            key={`${match.id}-${preset.minutes}`}
                            type="button"
                            onClick={() => toggleReminder(match, preset.minutes)}
                            className={`inline-flex items-center gap-1.5 border px-3 py-2 text-[10px] font-black uppercase tracking-widest transition-colors ${
                              isActive
                                ? 'border-juve-gold bg-juve-gold/15 text-juve-black'
                                : 'border-gray-200 text-gray-500 hover:border-juve-gold hover:text-juve-black'
                            }`}
                          >
                            <Bell className="h-3 w-3" />
                            {preset.shortLabel}
                          </button>
                        )
                      })}
                    </div>
                    <p className="mt-2 text-[11px] text-gray-400">
                      {isAuthenticated
                        ? 'Reminder sincronizzati con la tua agenda personale e con le quiet hours salvate.'
                        : 'Per salvare reminder e sincronizzarli con Area Bianconera serve l’accesso.'}
                    </p>
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
