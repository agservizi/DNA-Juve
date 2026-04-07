import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Activity, ArrowRight, Check, Clock3, MessageSquare, Play, Radio, Vote } from 'lucide-react'
import { getCommunityPolls, getForumThreads, getSidebarPoll, voteMatchPoll } from '@/lib/supabase'
import { getLiveMatch, getNextMatch, getRecentFinishedMatches, JUVE_ID, shouldRetryFootballQuery } from '@/lib/footballApi'
import { useReader } from '@/hooks/useReader'

const PREMATCH_WINDOW_MS = 36 * 60 * 60 * 1000
const POSTMATCH_WINDOW_MS = 18 * 60 * 60 * 1000

function getTeamName(team, fallback = 'Squadra') {
  return team?.shortName || team?.name || fallback
}

function formatMatchLabel(match, { includeScore = false } = {}) {
  if (!match) return ''

  const home = getTeamName(match.homeTeam, 'Casa')
  const away = getTeamName(match.awayTeam, 'Ospite')
  const score = includeScore
    ? ` ${match.score?.fullTime?.home ?? 0}-${match.score?.fullTime?.away ?? 0}`
    : ''

  return `${home}${score} ${includeScore ? away : `vs ${away}`}`
}

function getKickoffMeta(match) {
  const kickoff = new Date(match?.utcDate || '')
  if (Number.isNaN(kickoff.getTime())) {
    return {
      dateLabel: '',
      timeLabel: '',
    }
  }

  return {
    dateLabel: kickoff.toLocaleDateString('it-IT', { weekday: 'short', day: '2-digit', month: 'short' }),
    timeLabel: kickoff.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }),
  }
}

function getFinishedAt(match) {
  const updatedAt = new Date(match?.lastUpdated || '').getTime()
  if (Number.isFinite(updatedAt) && updatedAt > 0) return updatedAt

  const kickoff = new Date(match?.utcDate || '').getTime()
  if (Number.isFinite(kickoff) && kickoff > 0) return kickoff + 2 * 60 * 60 * 1000

  return null
}

function getPostMatchStateLabel(match) {
  if (!match) return 'Partita chiusa'

  const homeGoals = match.score?.fullTime?.home
  const awayGoals = match.score?.fullTime?.away
  if (homeGoals == null || awayGoals == null) return 'Partita chiusa'

  const isJuveHome = match.homeTeam?.id === JUVE_ID
  const juveGoals = isJuveHome ? homeGoals : awayGoals
  const oppGoals = isJuveHome ? awayGoals : homeGoals

  if (juveGoals > oppGoals) return 'Vittoria da cavalcare'
  if (juveGoals < oppGoals) return 'Serata da metabolizzare'
  return 'Pareggio da analizzare'
}

function getTimeSinceFinalLabel(match) {
  const finishedAt = getFinishedAt(match)
  if (!finishedAt) return 'Finale recente'

  const diffMinutes = Math.max(0, Math.floor((Date.now() - finishedAt) / 60000))
  if (diffMinutes < 60) return `${diffMinutes || 1} min dal fischio finale`

  const hours = Math.floor(diffMinutes / 60)
  if (hours < 24) return `${hours} ${hours === 1 ? 'ora' : 'ore'} dal fischio finale`

  const days = Math.floor(hours / 24)
  return `${days} ${days === 1 ? 'giorno' : 'giorni'} dal fischio finale`
}

function getLatestFinishedMatch(matches = []) {
  return matches
    .filter((match) => match?.status === 'FINISHED')
    .sort((a, b) => new Date(b.utcDate) - new Date(a.utcDate))[0] || null
}

function getCountdownParts(utcDate, now) {
  const diff = new Date(utcDate).getTime() - now
  if (Number.isNaN(diff) || diff <= 0) return null

  const totalMinutes = Math.floor(diff / 60000)
  const days = Math.floor(totalMinutes / (24 * 60))
  const hours = Math.floor((totalMinutes % (24 * 60)) / 60)
  const minutes = totalMinutes % 60
  return { days, hours, minutes }
}

function buildPulseState({ liveMatch, nextMatch, latestFinishedMatch, postMatchPoll, activePoll, hotThread, now }) {
  if (liveMatch) {
    return {
      mode: 'live',
      badge: 'Matchday live',
      title: `${formatMatchLabel(liveMatch, { includeScore: true })}`,
      body: 'La partita e in corso: apri il thread piu caldo o passa al flusso live per seguire l\'onda della community in tempo reale.',
      accent: 'from-red-600 via-red-500 to-orange-400',
      primaryAction: {
        label: hotThread ? 'Segui il thread live' : 'Apri notizie live',
        to: hotThread ? `/community/forum/${hotThread.id}` : '/notizie-live',
        icon: MessageSquare,
      },
      secondaryAction: {
        label: 'Vai al live',
        to: '/notizie-live',
        icon: Radio,
      },
      meta: [liveMatch.competition?.name || 'Partita in corso', 'Adesso'],
    }
  }

  if (nextMatch) {
    const kickoffAt = new Date(nextMatch.utcDate).getTime()
    const diff = kickoffAt - now
    if (Number.isFinite(diff) && diff > 0 && diff <= PREMATCH_WINDOW_MS) {
      const kickoff = getKickoffMeta(nextMatch)
      const countdown = getCountdownParts(nextMatch.utcDate, now)
      return {
        mode: 'prematch',
        badge: 'Verso la partita',
        title: formatMatchLabel(nextMatch),
        body: 'Siamo nella finestra decisiva: porta traffico e ritorno su countdown, forum pre-partita e voto rapido prima del fischio d\'inizio.',
        accent: 'from-juve-black via-neutral-900 to-juve-gold',
        primaryAction: {
          label: activePoll ? 'Vota il sondaggio' : 'Entra nel forum',
          to: activePoll ? '/community/sondaggi' : '/community/forum',
          icon: activePoll ? Vote : MessageSquare,
        },
        secondaryAction: {
          label: 'Apri calendario',
          to: '/calendario-partite',
          icon: Clock3,
        },
        meta: [nextMatch.competition?.name || 'Prossima partita', kickoff.dateLabel, kickoff.timeLabel].filter(Boolean),
        countdown,
      }
    }
  }

  if (latestFinishedMatch) {
    const finishedAt = getFinishedAt(latestFinishedMatch)
    if (finishedAt && now - finishedAt <= POSTMATCH_WINDOW_MS) {
      return {
        mode: 'postmatch',
        badge: 'Dopo il fischio finale',
        title: formatMatchLabel(latestFinishedMatch, { includeScore: true }),
        body: 'La partita non finisce al 90\': questo e il momento giusto per dire la tua, votare a caldo e rientrare subito nella discussione.',
        accentClass: 'bg-juve-gold',
        primaryAction: {
          label: postMatchPoll?.is_active ? 'Vota il post-partita' : 'Entra nel forum',
          action: postMatchPoll?.is_active ? 'vote-post-match' : null,
          to: postMatchPoll?.is_active ? null : hotThread ? `/community/forum/${hotThread.id}` : '/community/forum',
          icon: postMatchPoll?.is_active ? Vote : MessageSquare,
        },
        secondaryAction: {
          label: 'Apri i video',
          to: '/video',
          icon: Play,
        },
        meta: [latestFinishedMatch.competition?.name || 'Finale', 'Post-partita'],
        postMatchQuestion: postMatchPoll?.question || null,
      }
    }
  }

  return null
}

export default function MatchdayPulse({ readerId = null }) {
  const queryClient = useQueryClient()
  const { reader, openLogin } = useReader()
  const [now, setNow] = useState(() => Date.now())
  const [showPostMatchVote, setShowPostMatchVote] = useState(false)

  useEffect(() => {
    const timerId = window.setInterval(() => setNow(Date.now()), 60 * 1000)
    return () => window.clearInterval(timerId)
  }, [])

  const { data, isLoading } = useQuery({
    queryKey: ['home-matchday-pulse', readerId],
    queryFn: async () => {
      const [liveMatch, nextMatch, recentFinishedMatches, pollResult, activeCommunityPolls, hotThreads] = await Promise.all([
        getLiveMatch(),
        getNextMatch(),
        getRecentFinishedMatches(JUVE_ID, 2),
        getSidebarPoll(readerId),
        getCommunityPolls({ active: true, limit: 1 }),
        getForumThreads({ limit: 1, sortBy: 'popular' }),
      ])

      return {
        liveMatch: liveMatch || null,
        nextMatch: nextMatch || null,
        latestFinishedMatch: getLatestFinishedMatch(recentFinishedMatches || []),
        postMatchPoll: pollResult?.data?.kind === 'post-match' ? pollResult.data : null,
        activePoll: activeCommunityPolls?.data?.[0] || null,
        hotThread: hotThreads?.data?.[0] || null,
      }
    },
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
    retry: shouldRetryFootballQuery,
  })

  const pulse = useMemo(() => buildPulseState({
    liveMatch: data?.liveMatch || null,
    nextMatch: data?.nextMatch || null,
    latestFinishedMatch: data?.latestFinishedMatch || null,
    postMatchPoll: data?.postMatchPoll || null,
    activePoll: data?.activePoll || null,
    hotThread: data?.hotThread || null,
    now,
  }), [data, now])

  const postMatchPoll = data?.postMatchPoll || null

  const voteMutation = useMutation({
    mutationFn: async (optionId) => {
      if (!reader?.id || !postMatchPoll) throw new Error('login-required')

      const { error } = await voteMatchPoll({
        poll: postMatchPoll,
        optionId,
        userId: reader.id,
      })

      if (error) throw error
      return true
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['home-matchday-pulse'] })
      queryClient.invalidateQueries({ queryKey: ['sidebar-poll'] })
    },
  })

  const postMatchOptions = useMemo(() => {
    if (!postMatchPoll?.options) return []

    return postMatchPoll.options.map((option) => ({
      ...option,
      percentage: postMatchPoll.totalVotes > 0
        ? Math.round((option.votes / postMatchPoll.totalVotes) * 100)
        : 0,
    }))
  }, [postMatchPoll])

  const handlePrimaryAction = async () => {
    if (pulse?.primaryAction?.action !== 'vote-post-match') return

    setShowPostMatchVote((current) => !current)
  }

  const handlePostMatchVote = async (optionId) => {
    if (!reader?.id) {
      openLogin('login')
      return
    }

    if (!postMatchPoll || voteMutation.isPending || postMatchPoll.currentVote) return
    await voteMutation.mutateAsync(optionId).catch(() => {})
  }

  if (!isLoading && !pulse) return null

  return (
    <section className="max-w-7xl mx-auto px-4 pt-8">
      <div className="relative overflow-hidden border border-gray-200 bg-white">
        <div className={`absolute inset-x-0 top-0 h-1 ${pulse?.accentClass || `bg-gradient-to-r ${pulse?.accent || 'from-juve-black via-juve-gold to-juve-black'}`}`} />
        <div className="grid gap-5 p-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(280px,0.65fr)] lg:p-6">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-2 bg-juve-black px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.24em] text-white">
                <Activity className="h-3.5 w-3.5 text-juve-gold" />
                {pulse?.badge || 'Matchday mode'}
              </span>
              {!isLoading && pulse?.meta?.map((item) => (
                <span key={item} className="text-[10px] font-bold uppercase tracking-[0.22em] text-gray-500">
                  {item}
                </span>
              ))}
            </div>

            <h2 className="mt-4 font-display text-3xl font-black leading-none text-juve-black sm:text-4xl">
              {isLoading ? 'Preparazione matchday in corso' : pulse?.title}
            </h2>

            <p className="mt-3 max-w-3xl text-sm leading-relaxed text-gray-600 sm:text-[15px]">
              {isLoading
                ? 'Stiamo allineando partita, forum e segnali della community per spingere il rientro nel momento che conta.'
                : pulse?.body}
            </p>

            <div className="mt-5 flex flex-wrap gap-3">
              {pulse?.primaryAction && (
                pulse.primaryAction.action ? (
                  <button
                    type="button"
                    onClick={handlePrimaryAction}
                    className="inline-flex items-center gap-2 bg-juve-black px-4 py-3 text-xs font-black uppercase tracking-[0.2em] text-white transition-colors hover:bg-juve-gold hover:text-juve-black"
                  >
                    <pulse.primaryAction.icon className="h-4 w-4" />
                    {postMatchPoll?.currentVote ? 'Hai gia votato' : pulse.primaryAction.label}
                  </button>
                ) : (
                  <Link
                    to={pulse.primaryAction.to}
                    className="inline-flex items-center gap-2 bg-juve-black px-4 py-3 text-xs font-black uppercase tracking-[0.2em] text-white transition-colors hover:bg-juve-gold hover:text-juve-black"
                  >
                    <pulse.primaryAction.icon className="h-4 w-4" />
                    {pulse.primaryAction.label}
                  </Link>
                )
              )}
              {pulse?.secondaryAction && (
                <Link
                  to={pulse.secondaryAction.to}
                  className="inline-flex items-center gap-2 border border-gray-200 px-4 py-3 text-xs font-black uppercase tracking-[0.2em] text-gray-600 transition-colors hover:border-juve-gold hover:text-juve-black"
                >
                  <pulse.secondaryAction.icon className="h-4 w-4" />
                  {pulse.secondaryAction.label}
                </Link>
              )}
            </div>

            {pulse?.mode === 'postmatch' && showPostMatchVote && postMatchPoll?.is_active && postMatchOptions.length > 0 && (
              <div className="mt-5 border border-gray-200 bg-gray-50 p-4">
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-gray-500">Voto a caldo</p>
                <p className="mt-2 font-display text-lg font-black text-juve-black">{postMatchPoll.question}</p>
                <div className="mt-4 space-y-2">
                  {postMatchOptions.map((option) => {
                    const isSelected = postMatchPoll.currentVote === option.id
                    const hasVoted = Boolean(postMatchPoll.currentVote)

                    return (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => handlePostMatchVote(option.id)}
                        disabled={voteMutation.isPending || hasVoted}
                        className={`relative w-full overflow-hidden border text-left transition-all ${isSelected ? 'border-juve-gold' : 'border-gray-200'} ${hasVoted ? 'cursor-default' : 'cursor-pointer hover:border-juve-gold'}`}
                      >
                        {hasVoted && (
                          <div
                            className="absolute inset-y-0 left-0"
                            style={{
                              width: `${option.percentage}%`,
                              backgroundColor: isSelected ? 'rgba(199,161,74,0.16)' : 'rgba(17,17,17,0.04)',
                            }}
                          />
                        )}
                        <div className="relative flex items-center justify-between gap-3 px-4 py-3">
                          <div className="flex items-center gap-2">
                            {isSelected && <Check className="h-4 w-4 text-juve-gold" />}
                            <span className={`text-sm ${isSelected ? 'font-bold text-juve-black' : 'font-medium text-gray-700'}`}>
                              {option.label}
                            </span>
                          </div>
                          {hasVoted && (
                            <span className={`text-xs font-bold ${isSelected ? 'text-juve-gold' : 'text-gray-500'}`}>
                              {option.percentage}%
                            </span>
                          )}
                        </div>
                      </button>
                    )
                  })}
                </div>
                <p className="mt-3 text-[11px] text-gray-500">
                  {postMatchPoll.currentVote
                    ? `${postMatchPoll.totalVotes} voti raccolti finora.`
                    : 'Accedi ad Area Bianconera per lasciare subito il tuo voto a caldo.'}
                </p>
              </div>
            )}
          </div>

          <div className="border border-gray-200 bg-gray-50 p-4">
            {pulse?.mode === 'postmatch' ? (
              <div>
                <div className="border border-gray-200 bg-white p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.22em] text-gray-500">Prossimo appuntamento</p>
                      <p className="mt-2 font-display text-lg font-black leading-tight text-juve-black">
                        {data?.nextMatch
                          ? formatMatchLabel(data.nextMatch)
                          : 'Controlla subito quando torna in campo la Juve.'}
                      </p>
                    </div>
                    <ArrowRight className="h-4 w-4 shrink-0 text-juve-gold" />
                  </div>

                  <p className="mt-3 text-xs text-gray-600">
                    {data?.nextMatch
                      ? `${getKickoffMeta(data.nextMatch).dateLabel} alle ${getKickoffMeta(data.nextMatch).timeLabel}. Il post-partita migliore ti prepara gia alla prossima storia da seguire.`
                      : 'Dopo il finale, il modo migliore per restare nel flusso e agganciarsi subito alla prossima partita.'}
                  </p>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <Link
                      to="/calendario-partite"
                      className="inline-flex items-center gap-2 border border-gray-200 px-3 py-2 text-[11px] font-black uppercase tracking-[0.2em] text-gray-700 transition-colors hover:border-juve-gold hover:text-juve-black"
                    >
                      <Clock3 className="h-3.5 w-3.5" />
                      Apri calendario
                    </Link>
                  </div>
                </div>
              </div>
            ) : pulse?.mode === 'prematch' && pulse.countdown ? (
              <>
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-gray-500">Countdown</p>
                <div className="mt-3 grid grid-cols-3 gap-2">
                {[
                  { label: 'Giorni', value: pulse.countdown.days },
                  { label: 'Ore', value: pulse.countdown.hours },
                  { label: 'Min', value: pulse.countdown.minutes },
                ].map((item) => (
                  <div key={item.label} className="border border-gray-200 bg-white px-3 py-4 text-center">
                    <p className="font-display text-2xl font-black text-juve-black">{item.value}</p>
                    <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-gray-500">{item.label}</p>
                  </div>
                ))}
                </div>
              </>
            ) : (
              <>
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-gray-500">Segnale forte</p>
                <div className="mt-3 border border-gray-200 bg-white p-4">
                  <p className="font-display text-lg font-black leading-tight text-juve-black">
                    {pulse?.mode === 'postmatch'
                      ? (pulse?.postMatchQuestion || 'Raccogli il voto a caldo e riporta subito dentro la community.')
                      : 'Tra live, forum e magazine il rientro va spinto nel momento di massima attenzione.'}
                  </p>
                </div>
              </>
            )}

            {pulse?.mode !== 'postmatch' && (
              <div className="mt-4 space-y-2 text-xs text-gray-600">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-3.5 w-3.5 text-juve-gold" />
                <span>{data?.hotThread ? 'C\'e una discussione calda che ti aspetta in homepage.' : 'Il forum e pronto per riportarti dentro il matchday.'}</span>
              </div>
              <div className="flex items-center gap-2">
                <Vote className="h-3.5 w-3.5 text-juve-gold" />
                <span>{data?.postMatchPoll?.is_active || data?.activePoll ? 'Hai gia un voto rapido da lasciare per entrare subito nel flusso.' : 'Anche senza sondaggio attivo, qui trovi il modo piu rapido per rientrare.'}</span>
              </div>
              <div className="flex items-center gap-2">
                <ArrowRight className="h-3.5 w-3.5 text-juve-gold" />
                <span>Qui trovi un ritorno guidato nel momento che conta, senza rumore inutile.</span>
              </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}