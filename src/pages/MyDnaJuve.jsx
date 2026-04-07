import { useState, useMemo, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Bookmark, History, Settings2, BarChart3, Trash2, LogOut, BookOpen, Clock,
  Heart, ArrowRight, Trophy, Star, Medal, Zap, Swords, Grid3X3, PenLine,
  Target, Timer, ChevronDown, ChevronUp, Plus, X, Check, Share2, Sparkles, Bell,
} from 'lucide-react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createReaderNotification,
  createFanArticleSubmission,
  getCategories,
  getCommunityPolls,
  getForumThreads,
  getPublishedArticles,
  getReaderNotifications,
  markAllReaderNotificationsRead,
  markReaderNotificationRead,
  sendReaderEventNotification,
  sendFanSubmissionAdminNotification,
} from '@/lib/supabase'
import { getSquadPlayers, getTeamMatches, getVenueLabel, shouldRetryFootballQuery } from '@/lib/footballApi'
import { useReader } from '@/hooks/useReader'
import { Button } from '@/components/ui/Button'
import { Card, CardContent } from '@/components/ui/Card'
import { Dialog, DialogHeader, DialogTitle, DialogContent, DialogFooter } from '@/components/ui/Dialog'
import ArticleCard from '@/components/blog/ArticleCard'
import SEO from '@/components/blog/SEO'
import Leaderboard from '@/components/blog/Leaderboard'
import NotificationAlert from '@/components/blog/NotificationAlert'
import { useToast } from '@/hooks/useToast'
import { cn, formatDate } from '@/lib/utils'
import {
  LEVELS, getLevel, BADGES, getWeeklyChallenges, PLAYER_CARDS, AVATARS,
  FORMATIONS, SQUAD_PLAYERS,
  getGamificationState, setAvatar, checkAndUnlockBadges,
  getWeeklyProgress, getCollectedCards,
  addDiaryEntry, getDiary, deleteDiaryEntry,
  addPrediction, getPredictions,
  saveFormation, getFormation,
  addXP, XP_ACTIONS,
  getFanArticles, saveFanArticleDraft, submitFanArticle, deleteFanArticle,
} from '@/lib/gamification'
import { stripHtml, truncate, readingTime } from '@/lib/utils'
import RichEditor from '@/components/admin/RichEditor'

const IS_DEV = import.meta.env.DEV

// ── Tabs ────────────────────────────────────────────────────────────────────

const TABS = [
  { id: 'dashboard', label: 'Dashboard', icon: Sparkles },
  { id: 'bookmarks', label: 'Segnalibri', icon: Bookmark },
  { id: 'history', label: 'Cronologia', icon: History },
  { id: 'badges', label: 'Badge', icon: Medal },
  { id: 'challenges', label: 'Sfide', icon: Target },
  { id: 'figurine', label: 'Figurine', icon: Grid3X3 },
  { id: 'formation', label: 'Formazione', icon: Swords },
  { id: 'diary', label: 'Diario', icon: PenLine },
  { id: 'predictions', label: 'Pronostici', icon: Zap },
  { id: 'fan-articles', label: 'La Tua Voce', icon: PenLine },
  { id: 'leaderboard', label: 'Classifica', icon: Trophy },
  { id: 'notifications', label: 'Notifiche', icon: Bell },
  { id: 'preferences', label: 'Preferenze', icon: Settings2 },
]

function formatOfficialMatchLabel(match, { includeScore = false } = {}) {
  const home = match.homeTeam?.shortName || match.homeTeam?.name || 'Casa'
  const away = match.awayTeam?.shortName || match.awayTeam?.name || 'Ospite'
  const competition = match.competition?.name || 'Competizione'
  const kickoff = new Date(match.utcDate)
  const dateLabel = Number.isNaN(kickoff.getTime())
    ? ''
    : kickoff.toLocaleDateString('it-IT', { day: '2-digit', month: 'short' })
  const timeLabel = Number.isNaN(kickoff.getTime())
    ? ''
    : kickoff.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })

  const score =
    includeScore && match.status === 'FINISHED'
      ? ` • ${match.score?.fullTime?.home ?? 0}-${match.score?.fullTime?.away ?? 0}`
      : ''

  return `${home} vs ${away} • ${competition}${dateLabel ? ` • ${dateLabel}` : ''}${timeLabel ? ` • ${timeLabel}` : ''}${score}`
}

function getTeamDisplay(team, fallback = 'Squadra') {
  return {
    name: team?.shortName || team?.name || fallback,
    crest: team?.crest || '',
  }
}

function getMatchMeta(match) {
  const kickoff = new Date(match.utcDate)
  return {
    competition: match.competition?.name || 'Competizione',
    dateLabel: Number.isNaN(kickoff.getTime())
      ? ''
      : kickoff.toLocaleDateString('it-IT', { weekday: 'short', day: '2-digit', month: 'short' }),
    timeLabel: Number.isNaN(kickoff.getTime())
      ? ''
      : kickoff.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }),
    venueLabel: getVenueLabel(match),
  }
}

function getCountdownParts(utcDate, referenceNow = Date.now()) {
  const diff = new Date(utcDate).getTime() - referenceNow
  if (Number.isNaN(diff) || diff <= 0) return null

  const totalMinutes = Math.floor(diff / 60000)
  const days = Math.floor(totalMinutes / (60 * 24))
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60)
  const minutes = totalMinutes % 60
  return { days, hours, minutes }
}

function buildDailyReminderSummary({ hasReadToday, hasPredictionToday, hasBookmarkToday }) {
  const missing = []

  if (!hasReadToday) missing.push('leggere un articolo')
  if (!hasPredictionToday) missing.push('lasciare un pronostico')
  if (!hasBookmarkToday) missing.push('salvare un segnalibro')

  return missing
}

function MatchTeamBadge({ team, align = 'left' }) {
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

function MatchQuickCard({ match, countdown }) {
  if (!match) return null

  const home = getTeamDisplay(match.homeTeam, 'Casa')
  const away = getTeamDisplay(match.awayTeam, 'Ospite')
  const meta = getMatchMeta(match)
  const finalScore = match.status === 'FINISHED'
    ? `${match.score?.fullTime?.home ?? 0} - ${match.score?.fullTime?.away ?? 0}`
    : null

  return (
    <div className="border border-juve-gold/40 bg-juve-black/[0.03] p-4">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] font-bold uppercase tracking-widest text-gray-500">
        <span>{meta.competition}</span>
        {meta.dateLabel && <span>{meta.dateLabel}</span>}
        {meta.timeLabel && <span>{meta.timeLabel}</span>}
        {meta.venueLabel && <span>{meta.venueLabel}</span>}
      </div>
      <div className="mt-3 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <MatchTeamBadge team={home} />
          <span className="truncate text-sm font-black text-juve-black">{home.name}</span>
        </div>
        <div className="text-center">
          <p className="font-display text-xl font-black text-juve-black">{finalScore || 'VS'}</p>
          {countdown && (
            <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-juve-gold">
              {countdown.days}g {countdown.hours}h {countdown.minutes}m
            </p>
          )}
        </div>
        <div className="flex min-w-0 items-center justify-end gap-2">
          <span className="truncate text-right text-sm font-black text-juve-black">{away.name}</span>
          <MatchTeamBadge team={away} align="right" />
        </div>
      </div>
    </div>
  )
}

// ── Main Page ───────────────────────────────────────────────────────────────

export default function MyDnaJuve() {
  const {
    reader, bookmarks, history, preferences, stats, notifications,
    logout, loginDemo, deleteAccount, clearBookmarks, clearHistory,
    setFavoriteCategories, openLogin, updateProfile, enableNotifications,
  } = useReader()
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const [activeTab, setActiveTab] = useState('dashboard')
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => { const { data } = await getCategories(); return data || [] },
  })
  const { data: teamMatches = [], isLoading: matchesLoading } = useQuery({
    queryKey: ['my-dna-team-matches'],
    queryFn: () => getTeamMatches(),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: shouldRetryFootballQuery,
  })
  const { data: readerNotifications = [] } = useQuery({
    queryKey: ['reader-notifications', reader?.id],
    queryFn: async () => {
      const { data } = await getReaderNotifications(reader?.id, { limit: 40 })
      return data || []
    },
    enabled: Boolean(reader?.id),
    staleTime: 15000,
  })

  const gamification = useMemo(() => getGamificationState(), [activeTab])
  const level = useMemo(() => getLevel(gamification.xp), [gamification.xp])
  const officialMatches = useMemo(() => teamMatches || [], [teamMatches])
  const unreadNotifications = useMemo(
    () => (readerNotifications || []).filter((item) => !item.is_read).length,
    [readerNotifications],
  )

  useEffect(() => {
    if (!reader?.id) return
    if (!readerNotifications) return

    const today = new Date().toISOString().slice(0, 10)
    const hasReadToday = history.some((entry) => String(entry?.readAt || '').slice(0, 10) === today)
    const hasPredictionToday = getPredictions().some((entry) => String(entry?.createdAt || '').slice(0, 10) === today)
    const hasBookmarkToday = bookmarks.some((entry) => String(entry?.savedAt || '').slice(0, 10) === today)
    const missingActions = buildDailyReminderSummary({ hasReadToday, hasPredictionToday, hasBookmarkToday })

    if (missingActions.length === 0) return

    const alreadySentToday = readerNotifications.some((notification) => (
      notification.type === 'daily-focus' && notification.metadata?.date === today
    ))

    if (alreadySentToday) return

    const body = missingActions.length === 1
      ? `Oggi ti manca ancora ${missingActions[0]}. Rientra in Area Bianconera e chiudi la missione.`
      : `Oggi ti mancano ancora ${missingActions.slice(0, -1).join(', ')} e ${missingActions.at(-1)}. Rientra in Area Bianconera e chiudi le missioni.`

    sendReaderEventNotification({
      userId: reader.id,
      type: 'daily-focus',
      title: 'Le tue missioni di oggi ti aspettano',
      body,
      url: '/area-bianconera',
      metadata: {
        date: today,
        missingActions,
      },
    }).then(async ({ error }) => {
      if (error) {
        await createReaderNotification(reader.id, {
          type: 'daily-focus',
          title: 'Le tue missioni di oggi ti aspettano',
          body,
          url: '/area-bianconera',
          metadata: {
            date: today,
            missingActions,
          },
        }).catch(() => {})
      }

      queryClient.invalidateQueries({ queryKey: ['reader-notifications', reader.id] })
    }).catch(() => {})
  }, [bookmarks, history, queryClient, reader?.id, readerNotifications])

  // Check badges on change
  useEffect(() => {
    if (!reader) return
    const uniqueDays = new Set(history.map(h => new Date(h.readAt).toDateString()))
    let streak = 0
    const d = new Date()
    while (uniqueDays.has(d.toDateString())) { streak++; d.setDate(d.getDate() - 1) }

    const catSet = new Set(history.map(h => h.categorySlug).filter(Boolean))
    const hasNight = history.some(h => { const hr = new Date(h.readAt).getHours(); return hr >= 0 && hr < 5 })
    const hasEarly = history.some(h => { const hr = new Date(h.readAt).getHours(); return hr >= 5 && hr < 7 })
    const derbyCount = history.filter(h => h.title?.toLowerCase().includes('derby')).length

    const newBadges = checkAndUnlockBadges({
      totalArticles: history.length,
      streak,
      categoriesRead: catSet.size,
      bookmarkCount: bookmarks.length,
      hasNightRead: hasNight,
      hasEarlyRead: hasEarly,
      derbyArticles: derbyCount,
      predictions: getPredictions().length,
    })

    if (reader.id && newBadges.length) {
      newBadges.forEach((badge) => {
        createReaderNotification(reader.id, {
          type: 'badge',
          title: `Nuovo badge sbloccato: ${badge.name}`,
          body: badge.desc,
          url: '/area-bianconera',
          metadata: {
            badgeId: badge.id,
            badgeName: badge.name,
          },
        }).catch(() => {})
      })
    }
  }, [reader, history, bookmarks])

  if (!reader) {
    return (
      <>
        <SEO title="Area Bianconera" />
        <div className="max-w-7xl mx-auto px-4 py-24 text-center">
          <div className="max-w-md mx-auto">
            <div className="flex items-baseline gap-1 justify-center mb-4">
              <span className="font-display text-4xl font-black text-juve-black">AREA</span>
              <span className="font-display text-4xl font-black text-juve-gold">BIANCONERA</span>
            </div>
            <p className="text-gray-600 mb-8">
              Accedi per sbloccare la tua area personale: badge, sfide, figurine, formazione ideale e tanto altro.
            </p>
            <div className="flex gap-3 justify-center">
              <Button variant="gold" size="lg" onClick={() => openLogin('register')}>Registrati</Button>
              <Button variant="outline" size="lg" onClick={() => openLogin('login')}>Accedi</Button>
            </div>
            {IS_DEV && (
              <div className="mt-4">
                <Button variant="link" onClick={loginDemo}>Prova con account demo</Button>
              </div>
            )}
          </div>
        </div>
      </>
    )
  }

  const avatar = AVATARS.find(a => a.id === gamification.avatar) || AVATARS[0]

  return (
    <>
      <SEO title="Il Mio BianconeriHub" />
      <div className="w-full px-4 py-8 sm:px-6 lg:px-8 xl:px-10 2xl:px-12">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          {/* ── Hero Header ──────────────────────────────────────────────── */}
          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between">
            <div className="flex items-start gap-4">
              {/* Avatar */}
              <div className="flex h-16 w-16 shrink-0 items-center justify-center bg-juve-black text-3xl">
                {avatar.emoji}
              </div>
              <div className="min-w-0 flex-1">
                <h1 className="font-display text-3xl md:text-4xl font-black text-juve-black break-words">
                  Ciao, <span className="text-juve-gold">{reader.name}</span>
                </h1>
                <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                  <span className="text-sm font-bold">{level.icon} {level.name}</span>
                  <span className="text-xs text-gray-400">Lv {level.index + 1}</span>
                  <span className="text-xs text-juve-gold font-bold">{gamification.xp} XP</span>
                </div>
                {/* XP bar */}
                <div className="mt-1.5 h-1.5 w-full max-w-xs bg-gray-200">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${level.progress * 100}%` }}
                    className="h-full bg-juve-gold"
                  />
                </div>
                {level.next && (
                  <p className="mt-0.5 text-[10px] text-gray-400">{level.next.minXP - gamification.xp} XP per {level.next.name}</p>
                )}
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={logout} className="self-start text-gray-400 hover:text-red-500 sm:self-auto">
              <LogOut className="h-4 w-4" /> Esci
            </Button>
          </div>

          {/* Stats strip */}
          <div className="mx-auto max-w-7xl">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-px bg-gray-200">
              {[
                { label: 'Questo mese', value: stats.articlesThisMonth, icon: BookOpen },
                { label: 'Totali', value: stats.totalArticles, icon: History },
                { label: 'Minuti', value: stats.totalMinutes, icon: Clock },
                { label: 'Segnalibri', value: bookmarks.length, icon: Bookmark },
                { label: 'Badge', value: gamification.unlockedBadges.length, icon: Medal },
              ].map(s => (
                <div key={s.label} className="bg-white p-3 flex items-center gap-2">
                  <s.icon className="h-4 w-4 text-juve-gold shrink-0" />
                  <div>
                    <p className="font-display text-xl font-black text-juve-black">{s.value}</p>
                    <p className="text-[9px] font-bold uppercase tracking-widest text-gray-500">{s.label}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* ── Tab Navigation ───────────────────────────────────────────── */}
        <div className="sticky top-[74px] z-30 -mx-4 mb-8 border-b border-gray-200 bg-white/95 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-white/90 sm:-mx-6 md:top-[123px] lg:-mx-8 xl:-mx-10 2xl:-mx-12">
          <div className="px-4 pt-2 sm:px-6 lg:px-8 xl:px-10 2xl:px-12">
            <div className="overflow-x-auto scrollbar-none">
              <div className="flex justify-center">
                <div className="inline-flex min-w-max flex-nowrap border-b-2 border-juve-black pr-6">
                  {TABS.map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`flex shrink-0 items-center gap-1.5 whitespace-nowrap border-b-2 px-3 py-3 text-[10px] font-black uppercase tracking-widest transition-colors ${
                        activeTab === tab.id
                          ? 'bg-juve-gold text-juve-black border-juve-gold'
                          : 'border-transparent text-gray-500 hover:text-juve-black hover:bg-juve-gold/20 hover:border-juve-gold'
                      }`}
                    >
                      <tab.icon className="h-3.5 w-3.5" />
                      {tab.label}
                      {tab.id === 'notifications' && unreadNotifications > 0 && (
                        <span className="ml-1 inline-flex min-w-[18px] items-center justify-center rounded-full bg-juve-black px-1.5 py-0.5 text-[9px] font-black text-white">
                          {unreadNotifications}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Tab Content ──────────────────────────────────────────────── */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="mx-auto w-full max-w-7xl px-1 sm:px-2 lg:px-4"
          >
            {activeTab === 'dashboard' && (
              <DashboardTab
                stats={stats}
                level={level}
                gamification={gamification}
                history={history}
                bookmarks={bookmarks}
                onSelectTab={setActiveTab}
                notificationsEnabled={notifications?.enabled}
                onEnableNotifications={async () => {
                  try {
                    const result = await enableNotifications({ prompt: true })
                    if (result?.enabled) {
                      toast({ title: 'Notifiche attivate', description: 'Ti avviseremo quando c’e qualcosa che merita il tuo ritorno.', variant: 'success' })
                    }
                  } catch (error) {
                    toast({ title: 'Attivazione non riuscita', description: error?.message || 'Non sono riuscito ad attivare le notifiche push.', variant: 'destructive' })
                  }
                }}
              />
            )}
            {activeTab === 'bookmarks' && <BookmarksTab bookmarks={bookmarks} clearBookmarks={clearBookmarks} />}
            {activeTab === 'history' && <HistoryTab history={history} clearHistory={clearHistory} />}
            {activeTab === 'badges' && <BadgesTab gamification={gamification} />}
            {activeTab === 'challenges' && <ChallengesTab />}
            {activeTab === 'figurine' && <FigurineTab />}
            {activeTab === 'formation' && <FormationTab />}
            {activeTab === 'diary' && <DiaryTab officialMatches={officialMatches} matchesLoading={matchesLoading} />}
            {activeTab === 'predictions' && <PredictionsTab officialMatches={officialMatches} matchesLoading={matchesLoading} />}
            {activeTab === 'fan-articles' && <FanArticlesTab reader={reader} />}
            {activeTab === 'leaderboard' && <Leaderboard />}
            {activeTab === 'notifications' && (
              <NotificationsTab
                notifications={readerNotifications}
                readerId={reader.id}
                toast={toast}
              />
            )}
            {activeTab === 'preferences' && (
              <PreferencesTab
                categories={categories}
                preferences={preferences}
                setFavoriteCategories={setFavoriteCategories}
                reader={reader}
                gamification={gamification}
                onUpdateProfile={updateProfile}
                toast={toast}
                onDelete={() => setShowDeleteDialog(true)}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Delete dialog */}
      <Dialog open={showDeleteDialog} onClose={() => setShowDeleteDialog(false)}>
        <DialogHeader onClose={() => setShowDeleteDialog(false)}>
          <DialogTitle>Elimina account</DialogTitle>
        </DialogHeader>
        <DialogContent>
          <p className="text-sm text-gray-600">Tutti i tuoi dati verranno eliminati permanentemente. Questa azione non e reversibile.</p>
        </DialogContent>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setShowDeleteDialog(false)}>Annulla</Button>
          <Button variant="destructive" onClick={() => { deleteAccount(); setShowDeleteDialog(false) }}>Elimina tutto</Button>
        </DialogFooter>
      </Dialog>
    </>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// TAB: DASHBOARD
// ═══════════════════════════════════════════════════════════════════════════

function DashboardTab({ stats, level, gamification, history, bookmarks, onSelectTab, notificationsEnabled, onEnableNotifications }) {
  const { data: recommended } = useQuery({
    queryKey: ['recommended-articles'],
    queryFn: async () => {
      const { data } = await getPublishedArticles({ page: 1, limit: 6 })
      return data || []
    },
  })
  const { data: activePolls = [] } = useQuery({
    queryKey: ['dashboard-community-polls'],
    queryFn: async () => {
      const { data } = await getCommunityPolls({ active: true, limit: 1 })
      return data || []
    },
    staleTime: 60 * 1000,
  })
  const { data: hotForumThreads = [] } = useQuery({
    queryKey: ['dashboard-forum-hot-thread'],
    queryFn: async () => {
      const { data } = await getForumThreads({ limit: 1, sortBy: 'popular' })
      return data || []
    },
    staleTime: 60 * 1000,
  })

  const recentBadges = gamification.unlockedBadges
    .map(id => BADGES.find(b => b.id === id))
    .filter(Boolean)
    .slice(-3)

  const weeklyProgress = getWeeklyProgress()
  const challenges = getWeeklyChallenges()
  const collectedCount = getCollectedCards().length
  const today = new Date().toISOString().slice(0, 10)
  const hasReadToday = history.some((entry) => String(entry?.readAt || '').slice(0, 10) === today)
  const hasPredictionToday = getPredictions().some((entry) => String(entry?.createdAt || '').slice(0, 10) === today)
  const hasBookmarkToday = bookmarks.some((entry) => String(entry?.savedAt || '').slice(0, 10) === today)
  const nextChallenge = challenges.find((challenge) => (weeklyProgress[challenge.key] || 0) < challenge.target) || null
  const topPoll = activePolls[0] || null
  const hotThread = hotForumThreads[0] || null
  const dailyActions = [
    { id: 'read', label: 'Leggi un articolo', reward: XP_ACTIONS.readArticle, done: hasReadToday },
    { id: 'prediction', label: 'Lascia un pronostico', reward: XP_ACTIONS.prediction, done: hasPredictionToday },
    { id: 'bookmark', label: 'Salva un segnalibro', reward: XP_ACTIONS.bookmark, done: hasBookmarkToday },
    { id: 'forum', label: 'Partecipa al forum', reward: XP_ACTIONS.reaction, done: false },
  ]
  const availableDailyXP = dailyActions.reduce((total, action) => total + (action.done ? 0 : action.reward), 0)
  const latestRead = history[0] || null
  const latestDiaryEntry = getDiary()[0] || null
  const latestPrediction = getPredictions()[0] || null
  const diaryWidgetMatch = latestDiaryEntry?.homeTeamName && latestDiaryEntry?.awayTeamName
    ? {
      homeTeam: { shortName: latestDiaryEntry.homeTeamName, crest: latestDiaryEntry.homeTeamCrest },
      awayTeam: { shortName: latestDiaryEntry.awayTeamName, crest: latestDiaryEntry.awayTeamCrest },
      competition: { name: latestDiaryEntry.competition },
      utcDate: latestDiaryEntry.utcDate,
      status: 'FINISHED',
      score: {
        fullTime: {
          home: latestDiaryEntry.finalHomeScore,
          away: latestDiaryEntry.finalAwayScore,
        },
      },
    }
    : null
  const predictionWidgetMatch = latestPrediction?.homeTeamName && latestPrediction?.awayTeamName
    ? {
      homeTeam: { shortName: latestPrediction.homeTeamName, crest: latestPrediction.homeTeamCrest },
      awayTeam: { shortName: latestPrediction.awayTeamName, crest: latestPrediction.awayTeamCrest },
      competition: { name: latestPrediction.competition },
      utcDate: latestPrediction.utcDate,
      status: 'TIMED',
    }
    : null

  return (
    <div className="space-y-8">
      <div>
        <SectionHeader icon={Sparkles} title="Da fare oggi" />
        <div className="mb-4 border border-juve-gold/30 bg-juve-black p-4 text-white">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-juve-gold">Missioni giornaliere</p>
              <h3 className="mt-1 font-display text-2xl font-black">{availableDailyXP} XP ancora disponibili oggi</h3>
            </div>
            <div className="flex flex-wrap gap-2">
              {dailyActions.map((action) => (
                <div
                  key={action.id}
                  className={`min-w-[140px] border px-3 py-2 ${action.done ? 'border-green-500/40 bg-green-500/10 text-white' : 'border-white/10 bg-white/5 text-white'}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-300">{action.done ? 'Completata' : 'Da fare'}</p>
                    <span className="text-[10px] font-black uppercase tracking-widest text-juve-gold">+{action.reward} XP</span>
                  </div>
                  <p className="mt-1 text-sm font-semibold">{action.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <div className="border border-juve-gold/30 bg-juve-gold/10 p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-juve-gold">Abitudine</p>
                <h3 className="mt-2 font-display text-2xl font-black text-juve-black">Streak attivo: {gamification.streak || 0} giorni</h3>
                <p className="mt-2 text-sm leading-relaxed text-gray-600">
                  {hasReadToday
                    ? 'Hai gia acceso la tua giornata bianconera. Fai un altro passo e spingi la settimana.'
                    : 'Ti manca ancora la lettura di oggi. Un articolo letto ora tiene viva l’abitudine.'}
                </p>
              </div>
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white text-juve-gold shadow-sm">
                <Timer className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-3">
              <Link to="/">
                <Button variant={hasReadToday ? 'outline' : 'gold'} size="sm">
                  <BookOpen className="h-4 w-4" />
                  {hasReadToday ? 'Leggi ancora' : 'Leggi ora'}
                </Button>
              </Link>
              {nextChallenge && (
                <Button variant="ghost" size="sm" onClick={() => onSelectTab('challenges')}>
                  <Target className="h-4 w-4" />
                  Sfida: {nextChallenge.label}
                </Button>
              )}
            </div>
          </div>

          <div className="border border-gray-200 bg-white p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-gray-500">Coinvolgimento</p>
                <h3 className="mt-2 font-display text-2xl font-black text-juve-black">Cose da sbloccare oggi</h3>
                <p className="mt-2 text-sm leading-relaxed text-gray-600">
                  {hasPredictionToday
                    ? 'Hai gia lasciato il tuo pronostico oggi. Forum e sondaggi possono tenerti dentro piu a lungo.'
                    : 'Pronostico, forum e sondaggi sono le tre azioni che ti fanno tornare con piu continuita.'}
                </p>
              </div>
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-juve-black text-white shadow-sm">
                <Zap className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <button
                type="button"
                onClick={() => onSelectTab('predictions')}
                className={`border px-3 py-3 text-left transition-colors ${hasPredictionToday ? 'border-green-200 bg-green-50' : 'border-gray-200 hover:border-juve-gold hover:bg-juve-gold/5'}`}
              >
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">Pronostico</p>
                <p className="mt-1 text-sm font-bold text-juve-black">{hasPredictionToday ? 'Fatto oggi' : 'Da fare'}</p>
              </button>
              <Link to="/community/forum" className="border border-gray-200 px-3 py-3 transition-colors hover:border-juve-gold hover:bg-juve-gold/5">
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">Forum</p>
                <p className="mt-1 text-sm font-bold text-juve-black">Partecipa</p>
              </Link>
              <Link to="/community/sondaggi" className="border border-gray-200 px-3 py-3 transition-colors hover:border-juve-gold hover:bg-juve-gold/5">
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">Sondaggio</p>
                <p className="mt-1 text-sm font-bold text-juve-black">Vota live</p>
              </Link>
            </div>
          </div>

          <div className="border border-gray-200 bg-white p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-gray-500">Forum caldo</p>
                <h3 className="mt-2 font-display text-xl font-black text-juve-black">
                  {hotThread?.title || 'Entra nel forum oggi'}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-gray-600">
                  {hotThread
                    ? `${hotThread.reply_count || 0} risposte, ${hotThread.views || 0} view. Questo e il thread con piu trazione adesso.`
                    : 'Quando il forum si muove, qui troverai subito la discussione piu attiva del momento.'}
                </p>
              </div>
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gray-100 text-juve-black">
                <Share2 className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-4">
              <Link to={hotThread ? `/community/forum/${hotThread.id}` : '/community/forum'}>
                <Button variant="outline" size="sm">
                  Vai al thread
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>

          <div className="border border-gray-200 bg-white p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-gray-500">Sondaggio live</p>
                <h3 className="mt-2 font-display text-xl font-black text-juve-black">
                  {topPoll?.question || 'Apri i sondaggi della community'}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-gray-600">
                  {topPoll
                    ? 'Un voto rapido crea un motivo in piu per tornare e rivedere come si muove la community.'
                    : 'Se non c e un sondaggio attivo, questa card torna utile appena ne pubblichi uno nuovo.'}
                </p>
              </div>
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gray-100 text-juve-black">
                <BarChart3 className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-4">
              <Link to="/community/sondaggi">
                <Button variant="outline" size="sm">
                  Apri sondaggi
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>

          <div className={`border p-5 ${notificationsEnabled ? 'border-green-200 bg-green-50' : 'border-gray-200 bg-white'}`}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-gray-500">Ritorno automatico</p>
                <h3 className="mt-2 font-display text-xl font-black text-juve-black">
                  {notificationsEnabled ? 'Notifiche gia attive' : 'Attiva le notifiche push'}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-gray-600">
                  {notificationsEnabled
                    ? 'Perfetto: possiamo richiamarti quando hai missioni aperte, risposte nel forum o contenuti che contano davvero.'
                    : 'Se vuoi riportare davvero gli utenti dentro, qui devi togliere attrito: un clic e il browser puo richiamarti nel momento giusto.'}
                </p>
              </div>
              <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${notificationsEnabled ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-juve-black'}`}>
                <Bell className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-4">
              {notificationsEnabled ? (
                <Button variant="outline" size="sm" onClick={() => onSelectTab('notifications')}>
                  Apri notifiche
                  <ArrowRight className="h-4 w-4" />
                </Button>
              ) : (
                <Button variant="gold" size="sm" onClick={onEnableNotifications}>
                  <Bell className="h-4 w-4" />
                  Attiva push
                </Button>
              )}
            </div>
          </div>

          <div className="border border-gray-200 bg-white p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-gray-500">Riprendi</p>
                <h3 className="mt-2 font-display text-xl font-black text-juve-black">
                  {latestRead?.title || latestPrediction?.match || latestDiaryEntry?.match || 'Riparti da Area Bianconera'}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-gray-600">
                  {latestRead
                    ? `Il tuo ultimo contenuto letto e in ${latestRead.categoryName || 'magazine'}. Ti basta un clic per ripartire da li.`
                    : latestPrediction
                    ? 'Hai gia lasciato un pronostico: rientra e controlla la tua giocata o aggiorna il prossimo match.'
                    : latestDiaryEntry
                    ? 'Hai una voce diario recente: rientra e continua a costruire il tuo percorso da tifoso attivo.'
                    : 'Apri il magazine, entra nel forum o lascia il tuo primo pronostico per creare la tua abitudine.'}
                </p>
              </div>
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gray-100 text-juve-black">
                <History className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-3">
              {latestRead?.slug ? (
                <Link to={`/articolo/${latestRead.slug}`}>
                  <Button variant="outline" size="sm">
                    <BookOpen className="h-4 w-4" />
                    Riprendi lettura
                  </Button>
                </Link>
              ) : (
                <Link to="/">
                  <Button variant="outline" size="sm">
                    <BookOpen className="h-4 w-4" />
                    Apri magazine
                  </Button>
                </Link>
              )}

              {latestPrediction ? (
                <Button variant="ghost" size="sm" onClick={() => onSelectTab('predictions')}>
                  <Zap className="h-4 w-4" />
                  I tuoi pronostici
                </Button>
              ) : latestDiaryEntry ? (
                <Button variant="ghost" size="sm" onClick={() => onSelectTab('diary')}>
                  <PenLine className="h-4 w-4" />
                  Apri diario
                </Button>
              ) : (
                <Link to="/community/forum">
                  <Button variant="ghost" size="sm">
                    <Share2 className="h-4 w-4" />
                    Entra nel forum
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Quick stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Sfide completate', value: challenges.filter(c => (weeklyProgress[c.key] || 0) >= c.target).length + '/' + challenges.length, icon: Target },
          { label: 'Figurine', value: collectedCount + '/' + PLAYER_CARDS.length, icon: Grid3X3 },
          { label: 'Badge', value: gamification.unlockedBadges.length + '/' + BADGES.length, icon: Medal },
          { label: 'Pronostici', value: getPredictions().length, icon: Zap },
        ].map(s => (
          <div key={s.label} className="border border-gray-200 p-4 text-center">
            <s.icon className="h-5 w-5 text-juve-gold mx-auto mb-2" />
            <p className="font-display text-xl font-black">{s.value}</p>
            <p className="text-[9px] font-bold uppercase tracking-widest text-gray-500">{s.label}</p>
          </div>
        ))}
      </div>

      {(latestDiaryEntry || latestPrediction) && (
        <div>
          <SectionHeader icon={Sparkles} title="I tuoi widget match" />
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="border border-gray-200 p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Ultima voce diario</p>
                  <p className="font-display text-lg font-black text-juve-black">Diario</p>
                </div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-juve-gold">Widget live</span>
              </div>
              {diaryWidgetMatch ? (
                <MatchQuickCard match={diaryWidgetMatch} />
              ) : (
                <p className="text-sm text-gray-500">{latestDiaryEntry?.match || 'Nessuna partita disponibile'}</p>
              )}
              {latestDiaryEntry?.note && (
                <p className="mt-3 text-sm text-gray-600">{truncate(latestDiaryEntry.note, 140)}</p>
              )}
            </div>

            <div className="border border-gray-200 p-4">
              <div className="mb-3">
                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Ultimo pronostico</p>
                <p className="font-display text-lg font-black text-juve-black">Pronostici</p>
              </div>
              {predictionWidgetMatch ? (
                <MatchQuickCard match={predictionWidgetMatch} />
              ) : (
                <p className="text-sm text-gray-500">{latestPrediction?.match || 'Nessun pronostico disponibile'}</p>
              )}
              {latestPrediction && (
                <div className="mt-3 flex items-center justify-center gap-4">
                  <span className="font-display text-2xl font-black text-juve-black">{latestPrediction.homeScore}</span>
                  <span className="text-gray-300 text-xl">—</span>
                  <span className="font-display text-2xl font-black text-juve-black">{latestPrediction.awayScore}</span>
                </div>
              )}
              {latestPrediction?.motm && (
                <p className="mt-2 text-xs text-center text-gray-500">MVP scelto: <strong>{latestPrediction.motm}</strong></p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Recent badges */}
      {recentBadges.length > 0 && (
        <div>
          <SectionHeader icon={Medal} title="Ultimi badge sbloccati" />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {recentBadges.map(b => (
              <div key={b.id} className="flex items-center gap-2 bg-juve-gold/10 border border-juve-gold/30 px-3 py-2">
                <span className="text-xl">{b.icon}</span>
                <div>
                  <p className="text-xs font-bold">{b.name}</p>
                  <p className="text-[10px] text-gray-500">{b.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recommended articles */}
      {recommended?.length > 0 && (
        <div>
          <SectionHeader icon={Sparkles} title="Per te" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-px bg-gray-200">
            {recommended.slice(0, 3).map((a, i) => (
              <div key={a.id} className="bg-white">
                <ArticleCard article={a} index={i} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// TAB: BADGES
// ═══════════════════════════════════════════════════════════════════════════

function BadgesTab({ gamification }) {
  const unlocked = gamification.unlockedBadges || []

  return (
    <div>
      <p className="text-sm text-gray-500 mb-6">{unlocked.length} di {BADGES.length} badge sbloccati</p>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {BADGES.map(badge => {
          const isUnlocked = unlocked.includes(badge.id)
          return (
            <motion.div
              key={badge.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className={`border p-4 text-center transition-colors ${
                isUnlocked ? 'border-juve-gold bg-juve-gold/5' : 'border-gray-200 opacity-50 grayscale'
              }`}
            >
              <span className="text-3xl block mb-2">{badge.icon}</span>
              <p className="text-xs font-black uppercase tracking-wider">{badge.name}</p>
              <p className="text-[10px] text-gray-500 mt-1">{badge.desc}</p>
              {isUnlocked && <p className="text-[10px] text-juve-gold font-bold mt-2">Sbloccato</p>}
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// TAB: CHALLENGES
// ═══════════════════════════════════════════════════════════════════════════

function ChallengesTab() {
  const progress = getWeeklyProgress()
  const challenges = getWeeklyChallenges()

  return (
    <div>
      <SectionHeader icon={Target} title="Sfide settimanali" />
      <p className="text-sm text-gray-500 mb-6">Completa le sfide per guadagnare XP bonus</p>
      <div className="space-y-4">
        {challenges.map(c => {
          const current = Math.min(progress[c.key] || 0, c.target)
          const pct = (current / c.target) * 100
          const done = current >= c.target
          return (
            <div key={c.id} className={`border p-4 ${done ? 'border-green-500 bg-green-50' : 'border-gray-200'}`}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  {done ? <Check className="h-4 w-4 text-green-500" /> : <Target className="h-4 w-4 text-gray-400" />}
                  <span className="text-sm font-bold">{c.label}</span>
                </div>
                <span className="text-xs font-bold text-juve-gold">+{c.xp} XP</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex-1 h-2 bg-gray-200">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 0.6 }}
                    className={`h-full ${done ? 'bg-green-500' : 'bg-juve-gold'}`}
                  />
                </div>
                <span className="text-xs font-black">{current}/{c.target}</span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// TAB: FIGURINE — stile Panini con foto giocatore
// ═══════════════════════════════════════════════════════════════════════════

const RARITY_STYLES = {
  bronze: {
    border: 'border-amber-700',
    bg: 'bg-gradient-to-b from-amber-800 to-amber-950',
    badge: 'bg-amber-700',
    glow: '',
  },
  silver: {
    border: 'border-gray-400',
    bg: 'bg-gradient-to-b from-gray-400 to-gray-600',
    badge: 'bg-gray-500',
    glow: '',
  },
  gold: {
    border: 'border-juve-gold',
    bg: 'bg-gradient-to-b from-juve-gold to-amber-700',
    badge: 'bg-juve-gold',
    glow: 'shadow-lg shadow-juve-gold/30',
  },
  legendary: {
    border: 'border-purple-500',
    bg: 'bg-gradient-to-b from-purple-600 via-purple-800 to-purple-950',
    badge: 'bg-purple-600',
    glow: 'shadow-xl shadow-purple-500/40',
  },
}

const ROLE_LABELS = { POR: 'Portiere', DIF: 'Difensore', CEN: 'Centrocampista', ATT: 'Attaccante' }

function FigurineTab() {
  const squadPlayers = getSquadPlayers()

  const cards = useMemo(() => {
    return squadPlayers.map((p) => ({
      id: `tm-${p.id}`,
      name: p.name,
      number: p.number,
      role: p.role,
      nat: p.nat,
      img: p.img,
      rarity: p.rarity,
    }))
  }, [squadPlayers])

  return (
    <div>
      <p className="text-sm text-gray-500 mb-2">{cards.length} figurine</p>
      <p className="text-xs text-gray-400 mb-6">
        La tua collezione bianconera
        <span className="ml-2 text-green-500 font-bold">— Rosa 2025/26</span>
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {cards.map(card => {
          const style = RARITY_STYLES[card.rarity]
          return (
            <motion.div
              key={card.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              whileHover={{ scale: 1.05, y: -4 }}
              className={`relative overflow-hidden border-2 cursor-pointer ${style.border} ${style.glow} transition-shadow`}
            >
              {/* Card top — gradient bg + player image */}
              <div className={`relative h-40 ${style.bg} flex items-end justify-center`}>
                {/* Rarity badge */}
                <div className={`absolute top-1.5 left-1.5 px-1.5 py-0.5 text-[7px] font-black uppercase tracking-wider text-white ${style.badge}`}>
                  {card.rarity}
                </div>
                {/* Number top right */}
                <div className="absolute top-1 right-1.5 font-display text-3xl font-black text-white/30">
                  {card.number}
                </div>
                {/* Player image or silhouette */}
                {card.img ? (
                  <img
                    src={card.img}
                    alt={card.name}
                    className="h-36 w-auto object-contain object-bottom drop-shadow-lg"
                    loading="lazy"
                    onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex' }}
                  />
                ) : null}
                <div className={`${card.img ? 'hidden' : 'flex'} items-center justify-center h-36 w-full`}>
                  <span className="text-6xl text-white/40">⚽</span>
                </div>
              </div>

              {/* Card bottom — player info */}
              <div className="bg-white p-2.5 text-center">
                {/* Shirt number badge */}
                <div className="flex items-center justify-center gap-1.5 mb-1">
                  <span className="bg-juve-black text-white font-display text-sm font-black w-7 h-7 flex items-center justify-center">
                    {card.number}
                  </span>
                  <span className="text-lg">{card.nat}</span>
                </div>
                {/* Name */}
                <p className="font-display text-xs font-black uppercase tracking-wider text-juve-black leading-tight">
                  {card.name}
                </p>
                {/* Role */}
                <p className="text-[9px] font-bold uppercase tracking-widest text-gray-400 mt-0.5">
                  {ROLE_LABELS[card.role] || card.role}
                </p>
              </div>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// TAB: FORMATION — dati Transfermarkt 2025/26
// ═══════════════════════════════════════════════════════════════════════════

function FormationTab() {
  const saved = getFormation()
  const [formation, setFormation] = useState(saved?.formation || '4-3-3')
  const [selected, setSelected] = useState(saved?.players || [])

  const players = getSquadPlayers()

  const togglePlayer = (player) => {
    if (selected.find(s => s.id === player.id)) {
      setSelected(selected.filter(s => s.id !== player.id))
    } else if (selected.length < 11) {
      setSelected([...selected, player])
    }
  }

  const handleSave = () => {
    saveFormation(formation, selected)
  }

  return (
    <div>
      <SectionHeader icon={Swords} title="La tua formazione ideale" />

      <p className="text-xs text-green-500 font-bold mb-2">Rosa 2025/26</p>

      {/* Formation selector */}
      <div className="flex gap-2 mb-6">
        {FORMATIONS.map(f => (
          <button
            key={f}
            onClick={() => { setFormation(f); setSelected([]) }}
            className={`px-3 py-1.5 text-xs font-black uppercase tracking-widest border-b-2 transition-colors ${
              formation === f ? 'bg-juve-gold text-juve-black border-juve-gold' : 'border-transparent text-gray-600 hover:bg-juve-gold/20 hover:border-juve-gold'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      <p className="text-xs text-gray-400 mb-4">Seleziona {11 - selected.length} giocator{11 - selected.length === 1 ? 'e' : 'i'}</p>

      {/* Player grid — grouped by role */}
      {['POR', 'DIF', 'CEN', 'ATT'].map(role => {
        const rolePlayers = players.filter(p => p.role === role)
        if (rolePlayers.length === 0) return null
        const roleLabels = { POR: 'Portieri', DIF: 'Difensori', CEN: 'Centrocampisti', ATT: 'Attaccanti' }
        return (
          <div key={role} className="mb-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">{roleLabels[role]}</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
              {rolePlayers.map(player => {
                const isSelected = selected.find(s => s.id === player.id)
                return (
                  <button
                    key={player.id}
                    onClick={() => togglePlayer(player)}
                    className={`border p-2 text-center transition-colors ${
                      isSelected ? 'border-juve-gold bg-juve-gold/10' : 'border-gray-200 hover:border-gray-400'
                    }`}
                  >
                    <p className="font-display text-xl font-black">{player.number}</p>
                    <p className="text-[10px] font-bold uppercase tracking-wider">{player.name}</p>
                    <p className="text-[9px] text-gray-400 uppercase">{player.role}</p>
                  </button>
                )
              })}
            </div>
          </div>
        )
      })}

      {/* Selected XI */}
      {selected.length > 0 && (
        <div className="bg-green-900 text-white p-6 relative mt-4">
          <p className="text-xs font-bold uppercase tracking-widest text-green-300 mb-4 text-center">{formation}</p>
          <div className="flex flex-wrap justify-center gap-3">
            {selected.map(p => (
              <div key={p.id} className="bg-white text-juve-black px-3 py-2 text-center min-w-[70px]">
                <p className="font-display text-lg font-black">{p.number}</p>
                <p className="text-[9px] font-bold uppercase tracking-wider">{p.name}</p>
              </div>
            ))}
          </div>
          {selected.length === 11 && (
            <div className="text-center mt-4">
              <button onClick={handleSave} className="bg-juve-gold text-black px-4 py-2 text-xs font-black uppercase tracking-widest hover:bg-juve-gold-dark transition-colors">
                Salva formazione
              </button>
            </div>
          )}
            </div>
          )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// TAB: DIARY
// ═══════════════════════════════════════════════════════════════════════════

function DiaryTab({ officialMatches = [], matchesLoading = false }) {
  const [entries, setEntries] = useState(() => getDiary())
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ matchId: '', match: '', mood: '', rating: 5, note: '' })

  const diaryMatches = useMemo(() => (
    officialMatches
      .filter(match => match.status === 'FINISHED')
      .sort((a, b) => new Date(b.utcDate) - new Date(a.utcDate))
      .slice(0, 12)
  ), [officialMatches])
  const selectedMatch = useMemo(
    () => diaryMatches.find(match => String(match.id) === form.matchId) || null,
    [diaryMatches, form.matchId]
  )

  const MOODS = [
    { id: 'ecstatic', emoji: '🤩', label: 'Euforico' },
    { id: 'happy', emoji: '😊', label: 'Felice' },
    { id: 'neutral', emoji: '😐', label: 'Neutrale' },
    { id: 'sad', emoji: '😞', label: 'Deluso' },
    { id: 'angry', emoji: '😤', label: 'Arrabbiato' },
  ]

  const handleSubmit = () => {
    if (!form.matchId || !form.match) return
    addDiaryEntry({
      ...form,
      competition: selectedMatch?.competition?.name || '',
      utcDate: selectedMatch?.utcDate || '',
      homeTeamName: selectedMatch?.homeTeam?.shortName || selectedMatch?.homeTeam?.name || '',
      awayTeamName: selectedMatch?.awayTeam?.shortName || selectedMatch?.awayTeam?.name || '',
      homeTeamCrest: selectedMatch?.homeTeam?.crest || '',
      awayTeamCrest: selectedMatch?.awayTeam?.crest || '',
      finalHomeScore: selectedMatch?.score?.fullTime?.home ?? null,
      finalAwayScore: selectedMatch?.score?.fullTime?.away ?? null,
    })
    addXP(XP_ACTIONS.diaryEntry, 'diaryEntry')
    setEntries(getDiary())
    setForm({ matchId: '', match: '', mood: '', rating: 5, note: '' })
    setShowForm(false)
  }

  const handleDelete = (id) => {
    deleteDiaryEntry(id)
    setEntries(getDiary())
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <SectionHeader icon={PenLine} title="Diario del tifoso" />
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-1 bg-juve-gold text-black px-3 py-1.5 text-xs font-black uppercase tracking-widest hover:bg-juve-gold-dark transition-colors"
        >
          <Plus className="h-3 w-3" /> Nuova voce
        </button>
      </div>

      {/* New entry form */}
      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden mb-6">
            <div className="border border-juve-gold p-4 space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-gray-500 mb-2">
                  Partita ufficiale
                </label>
                <select
                  value={form.matchId}
                  onChange={e => {
                    const match = diaryMatches.find(item => String(item.id) === e.target.value)
                    setForm({
                      ...form,
                      matchId: e.target.value,
                      match: match ? formatOfficialMatchLabel(match, { includeScore: true }) : '',
                    })
                  }}
                  className="w-full border-2 border-juve-black px-3 py-2 text-sm focus:outline-none focus:border-juve-gold bg-white"
                  disabled={matchesLoading || diaryMatches.length === 0}
                >
                  <option value="">
                    {matchesLoading
                      ? 'Caricamento partite...'
                      : diaryMatches.length
                        ? 'Seleziona una partita conclusa'
                        : 'Nessuna partita conclusa disponibile'}
                  </option>
                  {diaryMatches.map(match => (
                    <option key={match.id} value={match.id}>
                      {formatOfficialMatchLabel(match, { includeScore: true })}
                    </option>
                  ))}
                </select>
              </div>
              {selectedMatch && <MatchQuickCard match={selectedMatch} />}
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-2">Come ti senti?</p>
                <div className="flex gap-2">
                  {MOODS.map(m => (
                    <button
                      key={m.id}
                      onClick={() => setForm({ ...form, mood: m.id })}
                      className={`p-2 text-xl border-2 transition-colors ${form.mood === m.id ? 'border-juve-gold bg-juve-gold/10' : 'border-gray-200'}`}
                      title={m.label}
                    >
                      {m.emoji}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-2">Voto partita: {form.rating}/10</p>
                <input type="range" min="1" max="10" value={form.rating} onChange={e => setForm({ ...form, rating: parseInt(e.target.value) })} className="w-full" />
              </div>
              <textarea
                placeholder="Le tue emozioni..."
                value={form.note}
                onChange={e => setForm({ ...form, note: e.target.value })}
                rows={3}
                className="w-full border-2 border-juve-black px-3 py-2 text-sm focus:outline-none focus:border-juve-gold resize-none"
              />
              <div className="flex gap-2">
                <button
                  onClick={handleSubmit}
                  disabled={!form.matchId}
                  className="bg-juve-black text-white px-4 py-2 text-xs font-black uppercase tracking-widest hover:bg-juve-gold hover:text-black transition-colors disabled:opacity-50"
                >
                  Salva
                </button>
                <button onClick={() => setShowForm(false)} className="px-4 py-2 text-xs font-bold text-gray-500 hover:text-gray-800">Annulla</button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Entries list */}
      {entries.length === 0 ? (
        <div className="text-center py-12">
          <PenLine className="h-10 w-10 text-gray-300 mx-auto mb-3" />
          <p className="text-sm text-gray-500">Nessuna voce nel diario. Annota le tue emozioni dopo una partita ufficiale della Juve.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {entries.map((entry, i) => {
            const mood = [
              { id: 'ecstatic', emoji: '🤩' }, { id: 'happy', emoji: '😊' },
              { id: 'neutral', emoji: '😐' }, { id: 'sad', emoji: '😞' }, { id: 'angry', emoji: '😤' },
            ].find(m => m.id === entry.mood)
            const storedMatch = entry.homeTeamName && entry.awayTeamName
              ? {
                homeTeam: { shortName: entry.homeTeamName, crest: entry.homeTeamCrest },
                awayTeam: { shortName: entry.awayTeamName, crest: entry.awayTeamCrest },
                competition: { name: entry.competition },
                utcDate: entry.utcDate,
                status: 'FINISHED',
                score: {
                  fullTime: {
                    home: entry.finalHomeScore,
                    away: entry.finalAwayScore,
                  },
                },
              }
              : null
            return (
              <motion.div key={entry.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }} className="border border-gray-200 p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {mood && <span className="text-xl">{mood.emoji}</span>}
                    <h4 className="font-display text-base font-black">{entry.match}</h4>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-display text-lg font-black text-juve-gold">{entry.rating}/10</span>
                    <button onClick={() => handleDelete(entry.id)} className="text-gray-300 hover:text-red-500"><X className="h-3.5 w-3.5" /></button>
                  </div>
                </div>
                {storedMatch && <div className="mb-3"><MatchQuickCard match={storedMatch} /></div>}
                {entry.note && <p className="text-sm text-gray-600">{entry.note}</p>}
                <p className="text-[10px] text-gray-400 mt-2">{formatDate(entry.createdAt)}</p>
              </motion.div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// TAB: PREDICTIONS
// ═══════════════════════════════════════════════════════════════════════════

function PredictionsTab({ officialMatches = [], matchesLoading = false }) {
  const [predictions, setPredictions] = useState(() => getPredictions())
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ matchId: '', match: '', homeScore: 0, awayScore: 0, motm: '' })
  const [now, setNow] = useState(() => Date.now())

  const upcomingMatches = useMemo(() => (
    officialMatches
      .filter(match => match.status === 'SCHEDULED' || match.status === 'TIMED')
      .sort((a, b) => new Date(a.utcDate) - new Date(b.utcDate))
      .slice(0, 10)
  ), [officialMatches])
  const selectedMatch = useMemo(
    () => upcomingMatches.find(match => String(match.id) === form.matchId) || null,
    [upcomingMatches, form.matchId]
  )
  const selectedCountdown = useMemo(
    () => (selectedMatch ? getCountdownParts(selectedMatch.utcDate, now) : null),
    [selectedMatch, now]
  )

  useEffect(() => {
    if (!selectedMatch) return undefined
    const timer = window.setInterval(() => setNow(Date.now()), 60000)
    return () => window.clearInterval(timer)
  }, [selectedMatch])

  const handleSubmit = () => {
    if (!form.matchId || !form.match) return
    addPrediction({
      ...form,
      competition: selectedMatch?.competition?.name || '',
      utcDate: selectedMatch?.utcDate || '',
      homeTeamName: selectedMatch?.homeTeam?.shortName || selectedMatch?.homeTeam?.name || '',
      awayTeamName: selectedMatch?.awayTeam?.shortName || selectedMatch?.awayTeam?.name || '',
      homeTeamCrest: selectedMatch?.homeTeam?.crest || '',
      awayTeamCrest: selectedMatch?.awayTeam?.crest || '',
    })
    addXP(XP_ACTIONS.prediction, 'prediction')
    setPredictions(getPredictions())
    setForm({ matchId: '', match: '', homeScore: 0, awayScore: 0, motm: '' })
    setShowForm(false)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <SectionHeader icon={Zap} title="Pronostici" />
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-1 bg-juve-gold text-black px-3 py-1.5 text-xs font-black uppercase tracking-widest hover:bg-juve-gold-dark transition-colors"
        >
          <Plus className="h-3 w-3" /> Nuovo pronostico
        </button>
      </div>

      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden mb-6">
            <div className="border border-juve-gold p-4 space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-gray-500 mb-2">
                  Partita ufficiale
                </label>
                <select
                  value={form.matchId}
                  onChange={e => {
                    const match = upcomingMatches.find(item => String(item.id) === e.target.value)
                    setForm({
                      ...form,
                      matchId: e.target.value,
                      match: match ? formatOfficialMatchLabel(match) : '',
                    })
                  }}
                  className="w-full border-2 border-juve-black px-3 py-2 text-sm focus:outline-none focus:border-juve-gold bg-white"
                  disabled={matchesLoading || upcomingMatches.length === 0}
                >
                  <option value="">
                    {matchesLoading
                      ? 'Caricamento partite...'
                      : upcomingMatches.length
                        ? 'Seleziona una prossima partita'
                        : 'Nessuna partita ufficiale disponibile'}
                  </option>
                  {upcomingMatches.map(match => (
                    <option key={match.id} value={match.id}>
                      {formatOfficialMatchLabel(match)}
                    </option>
                  ))}
                </select>
              </div>
              {selectedMatch && <MatchQuickCard match={selectedMatch} countdown={selectedCountdown} />}
              <div className="flex items-center justify-center gap-4">
                <div className="text-center">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-1">
                    {selectedMatch ? (selectedMatch.homeTeam?.shortName || selectedMatch.homeTeam?.name) : 'Casa'}
                  </p>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setForm({ ...form, homeScore: Math.max(0, form.homeScore - 1) })} className="w-8 h-8 border border-gray-300 text-lg font-bold">-</button>
                    <span className="font-display text-3xl font-black w-10 text-center">{form.homeScore}</span>
                    <button onClick={() => setForm({ ...form, homeScore: form.homeScore + 1 })} className="w-8 h-8 border border-gray-300 text-lg font-bold">+</button>
                  </div>
                </div>
                <span className="font-display text-2xl font-black text-gray-300 mt-4">—</span>
                <div className="text-center">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-1">
                    {selectedMatch ? (selectedMatch.awayTeam?.shortName || selectedMatch.awayTeam?.name) : 'Ospite'}
                  </p>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setForm({ ...form, awayScore: Math.max(0, form.awayScore - 1) })} className="w-8 h-8 border border-gray-300 text-lg font-bold">-</button>
                    <span className="font-display text-3xl font-black w-10 text-center">{form.awayScore}</span>
                    <button onClick={() => setForm({ ...form, awayScore: form.awayScore + 1 })} className="w-8 h-8 border border-gray-300 text-lg font-bold">+</button>
                  </div>
                </div>
              </div>
              <input
                type="text"
                placeholder="Miglior giocatore in campo"
                value={form.motm}
                onChange={e => setForm({ ...form, motm: e.target.value })}
                className="w-full border-2 border-juve-black px-3 py-2 text-sm focus:outline-none focus:border-juve-gold"
              />
              <div className="flex gap-2">
                <button
                  onClick={handleSubmit}
                  disabled={!form.matchId}
                  className="bg-juve-black text-white px-4 py-2 text-xs font-black uppercase tracking-widest hover:bg-juve-gold hover:text-black transition-colors disabled:opacity-50"
                >
                  Conferma pronostico
                </button>
                <button onClick={() => setShowForm(false)} className="px-4 py-2 text-xs font-bold text-gray-500">Annulla</button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {predictions.length === 0 ? (
        <div className="text-center py-12">
          <Zap className="h-10 w-10 text-gray-300 mx-auto mb-3" />
          <p className="text-sm text-gray-500">Nessun pronostico. Prevedi il risultato di una prossima partita ufficiale!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {predictions.map((p, i) => {
            const storedMatch = p.homeTeamName && p.awayTeamName
              ? {
                homeTeam: { shortName: p.homeTeamName, crest: p.homeTeamCrest },
                awayTeam: { shortName: p.awayTeamName, crest: p.awayTeamCrest },
                competition: { name: p.competition },
                utcDate: p.utcDate,
                status: 'TIMED',
              }
              : null

            return (
              <motion.div key={p.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }} className="border border-gray-200 p-4">
                <p className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-2">{p.match}</p>
                {storedMatch && <div className="mb-3"><MatchQuickCard match={storedMatch} /></div>}
                <div className="flex items-center justify-center gap-4 mb-2">
                  <span className="font-display text-3xl font-black">{p.homeScore}</span>
                  <span className="text-gray-300 text-xl">—</span>
                  <span className="font-display text-3xl font-black">{p.awayScore}</span>
                </div>
                {p.motm && <p className="text-xs text-center text-gray-500">MVP: <strong>{p.motm}</strong></p>}
                <p className="text-[10px] text-gray-400 text-center mt-2">{formatDate(p.createdAt)}</p>
              </motion.div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// TAB: FAN ARTICLES
// ═══════════════════════════════════════════════════════════════════════════

const FAN_ARTICLE_INITIAL_FORM = {
  id: null,
  title: '',
  category: 'calcio',
  excerpt: '',
  content: '',
  pitch: '',
}

function FanArticlesTab({ reader }) {
  const [articles, setArticles] = useState(() => getFanArticles())
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(FAN_ARTICLE_INITIAL_FORM)
  const [submitState, setSubmitState] = useState({ busy: false, error: '', success: '' })

  const submitArticleProposal = useCallback((articleData) => {
    if (!articleData.title.trim() || !articleData.excerpt.trim() || stripHtml(articleData.content).trim().length < 250) return false

    return createFanArticleSubmission({
      title: articleData.title.trim(),
      excerpt: articleData.excerpt.trim(),
      content: articleData.content,
      pitch: articleData.pitch?.trim() || '',
      category_slug: articleData.category,
      author_name: reader.name,
      author_email: reader.email,
    }).then(({ data, error }) => {
      if (error) throw error

      submitFanArticle({
        ...articleData,
        authorName: reader.name,
        authorEmail: reader.email,
        status: 'submitted',
        submissionId: data?.id || null,
      })
      addXP(XP_ACTIONS.fanArticleSubmit, 'fanArticleSubmit')
      setArticles(getFanArticles())
      setForm(FAN_ARTICLE_INITIAL_FORM)
      setShowForm(false)
      setSubmitState({
        busy: false,
        error: '',
        success: 'Proposta inviata alla redazione. La troverai nel pannello admin per la moderazione.',
      })

      if (reader.id) {
        createReaderNotification(reader.id, {
          type: 'fan-article',
          title: 'Proposta inviata alla redazione',
          body: `La tua bozza "${articleData.title.trim()}" è stata inviata. La redazione la valuterà nell'area moderazione.`,
          url: '/area-bianconera',
          metadata: {
            submissionId: data?.id || null,
            category: articleData.category,
          },
        }).catch(() => {})
      }

      if (data?.id) {
        sendFanSubmissionAdminNotification({ submissionId: data.id }).catch((notificationError) => {
          console.warn('Admin fan submission notification failed:', notificationError)
        })
      }

      return true
    }).catch((error) => {
      setSubmitState({
        busy: false,
        error: error.message || 'Invio non riuscito. Controlla la connessione a Supabase e riprova.',
        success: '',
      })
      return false
    })
  }, [reader.email, reader.name])

  const handleDraftSave = () => {
    if (!form.title.trim() || stripHtml(form.content).trim().length < 120) return

    const saved = saveFanArticleDraft({
      ...form,
      authorName: reader.name,
      authorEmail: reader.email,
    })
    addXP(XP_ACTIONS.fanArticleDraft, 'fanArticleDraft')
    setArticles(getFanArticles())
    setForm(saved)
    setShowForm(true)
    setSubmitState({ busy: false, error: '', success: 'Bozza salvata nella tua area personale.' })
  }

  const handleSubmit = async () => {
    setSubmitState({ busy: true, error: '', success: '' })
    await submitArticleProposal(form)
  }

  const handleEdit = (article) => {
    setForm({
      id: article.id,
      title: article.title || '',
      category: article.category || 'calcio',
      excerpt: article.excerpt || '',
      content: article.content || '',
      pitch: article.pitch || '',
    })
    setShowForm(true)
  }

  const handleDelete = (id) => {
    deleteFanArticle(id)
    setArticles(getFanArticles())
    if (form.id === id) {
      setForm(FAN_ARTICLE_INITIAL_FORM)
      setShowForm(false)
    }
  }

  const resetComposer = () => {
    setForm(FAN_ARTICLE_INITIAL_FORM)
    setShowForm(false)
    setSubmitState({ busy: false, error: '', success: '' })
  }

  const draftCount = articles.filter((item) => item.status === 'draft').length
  const submittedCount = articles.filter((item) => item.status === 'submitted').length

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 lg:grid-cols-[1.15fr_0.85fr] gap-6">
        <Card className="border-juve-black bg-juve-black text-white shadow-none">
          <CardContent className="pt-6">
            <p className="text-xs font-black uppercase tracking-[0.24em] text-juve-gold">La tua firma bianconera</p>
            <h3 className="mt-3 font-display text-2xl sm:text-3xl font-black leading-tight">
              Scrivi il tuo articolo da tifoso e trasformalo in proposta per la redazione
            </h3>
            <p className="mt-3 max-w-2xl text-sm text-gray-300 leading-relaxed">
              Dentro Area Bianconera puoi preparare bozze, rifinirle con calma e inviarle come proposta.
              Il pezzo resta nella tua area personale finche non decidi di mandarlo.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <div className="min-w-[120px] border border-white/10 bg-white/5 px-4 py-3">
                <p className="font-display text-2xl font-black text-juve-gold">{draftCount}</p>
                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Bozze attive</p>
              </div>
              <div className="min-w-[120px] border border-white/10 bg-white/5 px-4 py-3">
                <p className="font-display text-2xl font-black text-juve-gold">{submittedCount}</p>
                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Proposte inviate</p>
              </div>
              <div className="min-w-[120px] border border-white/10 bg-white/5 px-4 py-3">
                <p className="font-display text-2xl font-black text-juve-gold">{articles.length}</p>
                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Totale articoli</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-none">
          <CardContent className="pt-6">
            <SectionHeader icon={Sparkles} title="Linee guida rapide" />
            <div className="space-y-3 text-sm text-gray-600 leading-relaxed">
              <p>Apri un taglio chiaro: cronaca, opinione, analisi o racconto da stadio.</p>
              <p>Usa un titolo netto, un occhiello breve e un corpo ben diviso con sottotitoli.</p>
              <p>Prima salva in bozza, poi invia la proposta quando il pezzo e davvero pronto.</p>
            </div>
            <div className="mt-5">
              <Button variant="gold" onClick={() => setShowForm(true)} className="w-full sm:w-auto">
                <Plus className="h-4 w-4" />
                Scrivi un articolo
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <SectionHeader icon={PenLine} title="Il tuo laboratorio editoriale" />
        {showForm ? (
          <Button variant="ghost" size="sm" onClick={resetComposer} className="w-full sm:w-auto">
            <X className="h-4 w-4" />
            Chiudi editor
          </Button>
        ) : (
          <Button variant="gold" size="sm" onClick={() => setShowForm(true)} className="w-full sm:w-auto">
            <Plus className="h-4 w-4" />
            Nuova bozza
          </Button>
        )}
      </div>

      {(submitState.error || submitState.success) && (
        <div className={`border px-4 py-3 text-sm ${
          submitState.error
            ? 'border-red-200 bg-red-50 text-red-700'
            : 'border-green-200 bg-green-50 text-green-700'
        }`}>
          {submitState.error || submitState.success}
        </div>
      )}

      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
          >
            <Card className="shadow-none">
              <CardContent className="pt-6 space-y-5">
                <div className="grid grid-cols-1 lg:grid-cols-[1fr_220px] gap-4">
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2">Titolo</label>
                    <input
                      value={form.title}
                      onChange={(e) => setForm({ ...form, title: e.target.value })}
                      placeholder="Es. Perche questa Juve va giudicata con piu pazienza"
                      className="w-full border-2 border-gray-300 px-4 py-3 text-sm focus:outline-none focus:border-juve-gold transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2">Categoria</label>
                    <select
                      value={form.category}
                      onChange={(e) => setForm({ ...form, category: e.target.value })}
                      className="w-full border-2 border-gray-300 px-4 py-3 text-sm focus:outline-none focus:border-juve-gold"
                    >
                      <option value="calcio">Calcio</option>
                      <option value="mercato">Mercato</option>
                      <option value="formazione">Formazione</option>
                      <option value="champions">Champions</option>
                      <option value="serie-a">Serie A</option>
                      <option value="interviste">Interviste</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2">Occhiello</label>
                  <textarea
                    rows={2}
                    value={form.excerpt}
                    onChange={(e) => setForm({ ...form, excerpt: e.target.value })}
                    placeholder="Scrivi un riassunto breve e incisivo del tuo pezzo."
                    className="w-full border-2 border-gray-300 px-4 py-3 text-sm focus:outline-none focus:border-juve-gold resize-none transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2">Taglio editoriale</label>
                  <textarea
                    rows={2}
                    value={form.pitch}
                    onChange={(e) => setForm({ ...form, pitch: e.target.value })}
                    placeholder="Spiega in una riga l’idea del pezzo: analisi, opinione, racconto personale..."
                    className="w-full border-2 border-gray-300 px-4 py-3 text-sm focus:outline-none focus:border-juve-gold resize-none transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2">Corpo dell'articolo</label>
                  <RichEditor content={form.content} onChange={(content) => setForm((prev) => ({ ...prev, content }))} />
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="border border-gray-200 p-3">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Caratteri</p>
                    <p className="mt-1 font-display text-2xl font-black">{stripHtml(form.content).trim().length}</p>
                  </div>
                  <div className="border border-gray-200 p-3">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Lettura stimata</p>
                    <p className="mt-1 font-display text-2xl font-black">{readingTime(form.content)} min</p>
                  </div>
                  <div className="border border-gray-200 p-3">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Autore</p>
                    <p className="mt-1 text-sm font-bold text-juve-black">{reader.name}</p>
                  </div>
                  <div className="border border-gray-200 p-3">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Stato attuale</p>
                    <p className="mt-1 text-sm font-bold text-juve-gold">{form.id ? 'Bozza in modifica' : 'Nuovo articolo'}</p>
                  </div>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
                  <Button variant="outline" onClick={handleDraftSave} className="w-full sm:w-auto">
                    <Check className="h-4 w-4" />
                    Salva bozza
                  </Button>
                  <Button variant="gold" onClick={handleSubmit} className="w-full sm:w-auto">
                    <Share2 className="h-4 w-4" />
                    {submitState.busy ? 'Invio in corso…' : 'Invia proposta'}
                  </Button>
                  <Button variant="ghost" onClick={resetComposer} className="w-full sm:w-auto">
                    Annulla
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      <div>
        <SectionHeader icon={BookOpen} title="Le tue bozze e proposte" />
        {articles.length === 0 ? (
          <div className="text-center py-14 border border-dashed border-gray-300">
            <PenLine className="h-10 w-10 text-gray-300 mx-auto mb-3" />
            <p className="font-display text-xl font-bold text-gray-400 mb-2">Ancora nessun articolo</p>
            <p className="text-sm text-gray-500 mb-6">Apri l’editor e scrivi il tuo primo pezzo bianconero.</p>
            <Button variant="gold" onClick={() => setShowForm(true)}>
              Inizia a scrivere
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            {articles.map((article, index) => {
              const plainContent = stripHtml(article.content || '')
              const submitted = article.status === 'submitted'
              return (
                <motion.div
                  key={article.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.03 }}
                >
                  <Card className="h-full shadow-none">
                    <CardContent className="pt-6">
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`px-2.5 py-1 text-[10px] font-black uppercase tracking-widest ${
                              submitted ? 'bg-green-100 text-green-700' : 'bg-juve-gold/15 text-juve-black'
                            }`}>
                              {submitted ? 'Proposta inviata' : 'Bozza'}
                            </span>
                            <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
                              {article.category}
                            </span>
                          </div>
                          <h4 className="mt-3 font-display text-2xl font-black leading-tight text-juve-black break-words">
                            {article.title || 'Senza titolo'}
                          </h4>
                        </div>
                        <button
                          onClick={() => handleDelete(article.id)}
                          className="self-end text-gray-300 transition-colors hover:text-red-500 sm:self-start"
                          aria-label="Elimina articolo"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>

                      {article.excerpt && (
                        <p className="mt-3 text-sm text-gray-600 leading-relaxed">
                          {article.excerpt}
                        </p>
                      )}

                      {article.pitch && (
                        <div className="mt-4 border-l-2 border-juve-gold pl-3">
                          <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">Taglio editoriale</p>
                          <p className="mt-1 text-sm text-gray-600">{article.pitch}</p>
                        </div>
                      )}

                      <p className="mt-4 text-sm text-gray-500 leading-relaxed">
                        {truncate(plainContent, 220) || 'Nessun contenuto ancora scritto.'}
                      </p>

                      <div className="mt-5 flex flex-wrap items-center gap-4 text-[11px] font-bold uppercase tracking-widest text-gray-400">
                        <span>{readingTime(article.content)} min</span>
                        <span>{plainContent.trim().length} caratteri</span>
                        <span>Aggiornato {formatDate(article.updatedAt)}</span>
                      </div>

                      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
                        <Button variant="outline" size="sm" onClick={() => handleEdit(article)} className="w-full sm:w-auto">
                          Modifica
                        </Button>
                        {!submitted && (
                          <Button
                            variant="gold"
                            size="sm"
                            className="w-full sm:w-auto"
                            onClick={async () => {
                              setSubmitState({ busy: true, error: '', success: '' })
                              await submitArticleProposal(article)
                            }}
                          >
                            Invia ora
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// TAB: SEGNALIBRI (unchanged)
// ═══════════════════════════════════════════════════════════════════════════

function BookmarksTab({ bookmarks, clearBookmarks }) {
  if (bookmarks.length === 0) {
    return (
      <div className="text-center py-16">
        <Bookmark className="h-12 w-12 text-gray-300 mx-auto mb-4" />
        <p className="font-display text-xl font-bold text-gray-400 mb-2">Nessun segnalibro</p>
        <p className="text-sm text-gray-400 mb-6">Salva gli articoli che vuoi leggere dopo</p>
        <Link to="/"><Button variant="gold">Esplora gli articoli <ArrowRight className="h-4 w-4" /></Button></Link>
      </div>
    )
  }

  const articles = bookmarks.map(b => ({
    id: b.articleId, slug: b.slug, title: b.title, cover_image: b.coverImage,
    categories: { name: b.categoryName }, excerpt: '', content: '', published_at: b.savedAt, views: 0,
  }))

  return (
    <div>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-gray-500">{bookmarks.length} articol{bookmarks.length === 1 ? 'o' : 'i'} salvat{bookmarks.length === 1 ? 'o' : 'i'}</p>
        <Button variant="ghost" size="sm" onClick={clearBookmarks} className="w-full text-gray-400 hover:text-red-500 sm:w-auto">
          <Trash2 className="h-3.5 w-3.5" /> Rimuovi tutti
        </Button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-px bg-gray-200">
        {articles.map((a, i) => <div key={a.id} className="bg-white"><ArticleCard article={a} index={i} /></div>)}
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// TAB: CRONOLOGIA (unchanged)
// ═══════════════════════════════════════════════════════════════════════════

function HistoryTab({ history, clearHistory }) {
  if (history.length === 0) {
    return (
      <div className="text-center py-16">
        <History className="h-12 w-12 text-gray-300 mx-auto mb-4" />
        <p className="font-display text-xl font-bold text-gray-400 mb-2">Cronologia vuota</p>
        <p className="text-sm text-gray-400 mb-6">Gli articoli letti appariranno qui</p>
        <Link to="/"><Button variant="gold">Inizia a leggere <ArrowRight className="h-4 w-4" /></Button></Link>
      </div>
    )
  }

  const today = new Date().toDateString()
  const yesterday = new Date(Date.now() - 86400000).toDateString()
  const groups = []
  const groupMap = {}

  history.forEach(h => {
    const d = new Date(h.readAt).toDateString()
    let label = formatDate(h.readAt)
    if (d === today) label = 'Oggi'
    else if (d === yesterday) label = 'Ieri'
    if (!groupMap[label]) { groupMap[label] = []; groups.push({ label, items: groupMap[label] }) }
    groupMap[label].push(h)
  })

  return (
    <div>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-gray-500">{history.length} articol{history.length === 1 ? 'o' : 'i'}</p>
        <Button variant="ghost" size="sm" onClick={clearHistory} className="w-full text-gray-400 hover:text-red-500 sm:w-auto">
          <Trash2 className="h-3.5 w-3.5" /> Cancella cronologia
        </Button>
      </div>
      <div className="space-y-8">
        {groups.map(group => (
          <div key={group.label}>
            <div className="flex items-center gap-2 mb-4 pb-3 border-b-2 border-juve-black">
              <History className="h-4 w-4 text-juve-gold" />
              <h3 className="text-xs font-black uppercase tracking-widest">{group.label}</h3>
            </div>
            <div className="space-y-4">
              {group.items.map((h, i) => (
                <ArticleCard key={`${h.articleId}-${h.readAt}`} variant="horizontal" index={i}
                  article={{ id: h.articleId, slug: h.slug, title: h.title, cover_image: null, categories: { name: h.categoryName, slug: h.categorySlug }, content: '', excerpt: '', published_at: h.readAt, views: 0 }} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// TAB: NOTIFICHE
// ═══════════════════════════════════════════════════════════════════════════

function NotificationsTab({ notifications, readerId, toast }) {
  const qc = useQueryClient()
  const markOneMutation = useMutation({
    mutationFn: async (notificationId) => {
      const { error } = await markReaderNotificationRead(readerId, notificationId)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['reader-notifications', readerId] })
    },
  })
  const markAllMutation = useMutation({
    mutationFn: async () => {
      const { error } = await markAllReaderNotificationsRead(readerId)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['reader-notifications', readerId] })
    },
    onError: (error) => {
      toast?.({
        title: 'Notifiche non aggiornate',
        description: error.message || 'Non sono riuscito a segnare le notifiche come lette.',
        variant: 'destructive',
      })
    },
  })

  if (!notifications?.length) {
    return (
      <div className="text-center py-16">
        <Bell className="h-12 w-12 text-gray-300 mx-auto mb-4" />
        <p className="font-display text-xl font-bold text-gray-400 mb-2">Nessuna notifica</p>
        <p className="text-sm text-gray-400">Qui troverai novita del magazine, pubblicazioni e movimenti utili per la tua Area Bianconera.</p>
      </div>
    )
  }

  const unreadCount = notifications.filter((item) => !item.is_read).length

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm text-gray-500">
            {unreadCount > 0
              ? `${unreadCount} notific${unreadCount === 1 ? 'a nuova' : 'he nuove'}`
              : 'Tutte le notifiche sono state lette'}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => markAllMutation.mutate()}
          disabled={markAllMutation.isPending || unreadCount === 0}
          className="w-full sm:w-auto"
        >
          {markAllMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
          Segna tutto come letto
        </Button>
      </div>

      <div className="space-y-3">
        {notifications.map((item) => (
          <div
            key={item.id}
            className={cn(
              'border p-4 transition-colors',
              item.is_read ? 'border-gray-200 bg-white' : 'border-juve-gold/40 bg-juve-gold/5',
            )}
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  {!item.is_read && (
                    <span className="inline-flex items-center rounded-full bg-juve-black px-2 py-0.5 text-[10px] font-black uppercase tracking-widest text-white">
                      Nuova
                    </span>
                  )}
                  <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500">
                    {formatDate(item.created_at)}
                  </span>
                </div>
                <p className="mt-2 font-display text-xl font-bold text-juve-black">{item.title}</p>
                {item.body && (
                  <p className="mt-2 text-sm leading-relaxed text-gray-600">{item.body}</p>
                )}
                {item.url && (
                  <Link
                    to={item.url}
                    className="mt-3 inline-flex items-center gap-1 text-xs font-bold uppercase tracking-widest text-juve-gold hover:underline"
                  >
                    Apri
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                )}
              </div>
              {!item.is_read && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => markOneMutation.mutate(item.id)}
                  disabled={markOneMutation.isPending}
                  className="self-start"
                >
                  Segna letta
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// TAB: PREFERENZE (updated with avatar picker)
// ═══════════════════════════════════════════════════════════════════════════

function PreferencesTab({ categories, preferences, setFavoriteCategories, reader, gamification, onUpdateProfile, toast, onDelete }) {
  const favs = preferences.favoriteCategories || []
  const [profileName, setProfileName] = useState(reader.name || '')
  const [profileBio, setProfileBio] = useState(reader.bio || '')
  const [savingProfile, setSavingProfile] = useState(false)
  const [isEditingProfile, setIsEditingProfile] = useState(false)

  useEffect(() => {
    setProfileName(reader.name || '')
    setProfileBio(reader.bio || '')
    setIsEditingProfile(false)
  }, [reader.name, reader.bio])

  const toggleCat = (id) => {
    setFavoriteCategories(favs.includes(id) ? favs.filter(c => c !== id) : [...favs, id])
  }

  const handleAvatarChange = (avatarId) => {
    setAvatar(avatarId)
    window.location.reload() // Refresh to reflect avatar change
  }

  const handleProfileSave = async () => {
    setSavingProfile(true)
    try {
      await onUpdateProfile({
        name: profileName,
        bio: profileBio,
      })
      toast?.({
        title: 'Profilo aggiornato',
        description: 'Le tue informazioni sono state salvate.',
        variant: 'success',
      })
      setIsEditingProfile(false)
    } catch (error) {
      toast?.({
        title: 'Salvataggio non riuscito',
        description: error.message || 'Non sono riuscito ad aggiornare il profilo.',
        variant: 'destructive',
      })
    } finally {
      setSavingProfile(false)
    }
  }

  return (
    <div className="space-y-10">
      {/* Avatar picker */}
      <div>
        <SectionHeader icon={Star} title="Il tuo avatar" />
        <div className="flex flex-wrap gap-3">
          {AVATARS.map(a => (
            <button
              key={a.id}
              onClick={() => handleAvatarChange(a.id)}
              className={`w-14 h-14 text-2xl flex items-center justify-center border-2 transition-colors ${
                gamification.avatar === a.id ? 'border-juve-gold bg-juve-gold/10' : 'border-gray-200 hover:border-gray-400'
              }`}
              title={a.label}
            >
              {a.emoji}
            </button>
          ))}
        </div>
      </div>

      {/* Categorie preferite */}
      <div>
        <SectionHeader icon={Heart} title="Categorie preferite" />
        <p className="text-sm text-gray-500 mb-4">Seleziona le categorie che ti interessano di piu</p>
        <div className="flex flex-wrap gap-2">
          {categories.map(cat => (
            <button key={cat.id} onClick={() => toggleCat(cat.id)}
              className={`px-4 py-2 text-xs font-bold uppercase tracking-wider border-2 transition-all ${
                favs.includes(cat.id) ? 'bg-juve-gold text-black border-juve-gold' : 'border-juve-black hover:bg-juve-black hover:text-white'
              }`}>
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      {/* Info profilo */}
      <div>
        <SectionHeader icon={Settings2} title="Il tuo profilo" />
        <div className="grid max-w-2xl grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-1">Nome</p>
            <input
              type="text"
              value={profileName}
              onChange={(event) => setProfileName(event.target.value)}
              disabled={!isEditingProfile}
              className="w-full border-2 border-gray-200 px-3 py-2 text-sm font-medium outline-none transition-colors focus:border-juve-gold"
              placeholder="Il tuo nome da tifoso"
            />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-1">Email</p>
            <p className="text-sm font-medium">{reader.email}</p>
          </div>
          <div className="sm:col-span-2">
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-1">Bio</p>
            <textarea
              value={profileBio}
              onChange={(event) => setProfileBio(event.target.value)}
              disabled={!isEditingProfile}
              rows={4}
              maxLength={240}
              className="w-full resize-none border-2 border-gray-200 px-3 py-2 text-sm outline-none transition-colors focus:border-juve-gold"
              placeholder="Racconta in due righe il tuo DNA bianconero"
            />
            <p className="mt-1 text-[10px] font-medium uppercase tracking-widest text-gray-400">
              {profileBio.length}/240
            </p>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-1">Iscritto dal</p>
            <p className="text-sm font-medium">{formatDate(reader.createdAt)}</p>
          </div>
          <div className="flex items-end">
            {isEditingProfile ? (
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setProfileName(reader.name || '')
                    setProfileBio(reader.bio || '')
                    setIsEditingProfile(false)
                  }}
                  disabled={savingProfile}
                >
                  Annulla
                </Button>
                <Button
                  variant="gold"
                  size="sm"
                  onClick={handleProfileSave}
                  disabled={savingProfile || !profileName.trim()}
                >
                  {savingProfile ? 'Salvataggio...' : 'Salva profilo'}
                </Button>
              </div>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditingProfile(true)}
              >
                Modifica profilo
              </Button>
            )}
          </div>
        </div>
      </div>

      <NotificationAlert />

      {/* Danger zone */}
      <div className="pt-6 border-t border-gray-200">
        <Button variant="ghost" size="sm" onClick={onDelete} className="text-red-500 hover:text-red-700 hover:bg-red-50">
          <Trash2 className="h-4 w-4" /> Elimina account e tutti i dati
        </Button>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// SHARED: Section Header
// ═══════════════════════════════════════════════════════════════════════════

function SectionHeader({ icon: Icon, title }) {
  return (
    <div className="flex items-center gap-2 mb-4 pb-3 border-b-2 border-juve-black">
      <Icon className="h-4 w-4 text-juve-gold" />
      <h3 className="text-xs font-black uppercase tracking-widest">{title}</h3>
    </div>
  )
}
