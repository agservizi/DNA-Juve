import { useState, useMemo, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Bookmark, History, Settings2, BarChart3, Trash2, LogOut, BookOpen, Clock,
  Heart, ArrowRight, Trophy, Star, Medal, Zap, Swords, Grid3X3, PenLine,
  Target, Timer, ChevronDown, ChevronUp, Plus, X, Check, Share2, Sparkles,
} from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { createFanArticleSubmission, getCategories, getPublishedArticles } from '@/lib/supabase'
import { getSquadPlayers } from '@/lib/footballApi'
import { useReader } from '@/hooks/useReader'
import { Button } from '@/components/ui/Button'
import { Card, CardContent } from '@/components/ui/Card'
import { Dialog, DialogHeader, DialogTitle, DialogContent, DialogFooter } from '@/components/ui/Dialog'
import ArticleCard from '@/components/blog/ArticleCard'
import SEO from '@/components/blog/SEO'
import Leaderboard from '@/components/blog/Leaderboard'
import NotificationAlert from '@/components/blog/NotificationAlert'
import { formatDate } from '@/lib/utils'
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
  { id: 'preferences', label: 'Preferenze', icon: Settings2 },
]

// ── Main Page ───────────────────────────────────────────────────────────────

export default function MyDnaJuve() {
  const {
    reader, bookmarks, history, preferences, stats,
    logout, loginDemo, deleteAccount, clearBookmarks, clearHistory,
    setFavoriteCategories, openLogin,
  } = useReader()
  const [activeTab, setActiveTab] = useState('dashboard')
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => { const { data } = await getCategories(); return data || [] },
  })

  const gamification = useMemo(() => getGamificationState(), [activeTab])
  const level = useMemo(() => getLevel(gamification.xp), [gamification.xp])

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

    checkAndUnlockBadges({
      totalArticles: history.length,
      streak,
      categoriesRead: catSet.size,
      bookmarkCount: bookmarks.length,
      hasNightRead: hasNight,
      hasEarlyRead: hasEarly,
      derbyArticles: derbyCount,
      predictions: getPredictions().length,
    })
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
              <Button variant="gold" size="lg" onClick={openLogin}>Registrati</Button>
              <Button variant="outline" size="lg" onClick={openLogin}>Accedi</Button>
            </div>
            <div className="mt-4">
              <Button variant="link" onClick={loginDemo}>Prova con account demo</Button>
            </div>
          </div>
        </div>
      </>
    )
  }

  const avatar = AVATARS.find(a => a.id === gamification.avatar) || AVATARS[0]

  return (
    <>
      <SEO title="Il Mio BianconeriHub" />
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* ── Hero Header ──────────────────────────────────────────────── */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
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
                  <p className="text-[10px] text-gray-400 mt-0.5">{level.next.minXP - gamification.xp} XP per {level.next.name}</p>
                )}
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={logout} className="self-start text-gray-400 hover:text-red-500 sm:self-auto">
              <LogOut className="h-4 w-4" /> Esci
            </Button>
          </div>

          {/* Stats strip */}
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
        </motion.div>

        {/* ── Tab Navigation ───────────────────────────────────────────── */}
        <div className="flex border-b-2 border-juve-black mb-8 overflow-x-auto scrollbar-none">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-3 text-[10px] font-black uppercase tracking-widest border-b-2 transition-colors whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-juve-gold text-juve-black border-juve-gold'
                  : 'border-transparent text-gray-500 hover:text-juve-black hover:bg-juve-gold/20 hover:border-juve-gold'
              }`}
            >
              <tab.icon className="h-3.5 w-3.5" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── Tab Content ──────────────────────────────────────────────── */}
        <AnimatePresence mode="wait">
          <motion.div key={activeTab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
            {activeTab === 'dashboard' && <DashboardTab stats={stats} level={level} gamification={gamification} history={history} bookmarks={bookmarks} />}
            {activeTab === 'bookmarks' && <BookmarksTab bookmarks={bookmarks} clearBookmarks={clearBookmarks} />}
            {activeTab === 'history' && <HistoryTab history={history} clearHistory={clearHistory} />}
            {activeTab === 'badges' && <BadgesTab gamification={gamification} />}
            {activeTab === 'challenges' && <ChallengesTab />}
            {activeTab === 'figurine' && <FigurineTab />}
            {activeTab === 'formation' && <FormationTab />}
            {activeTab === 'diary' && <DiaryTab />}
            {activeTab === 'predictions' && <PredictionsTab />}
            {activeTab === 'fan-articles' && <FanArticlesTab reader={reader} />}
            {activeTab === 'leaderboard' && <Leaderboard />}
            {activeTab === 'preferences' && (
              <PreferencesTab
                categories={categories}
                preferences={preferences}
                setFavoriteCategories={setFavoriteCategories}
                reader={reader}
                gamification={gamification}
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

function DashboardTab({ stats, level, gamification, history, bookmarks }) {
  const { data: recommended } = useQuery({
    queryKey: ['recommended-articles'],
    queryFn: async () => {
      const { data } = await getPublishedArticles({ page: 1, limit: 6 })
      return data || []
    },
  })

  const recentBadges = gamification.unlockedBadges
    .map(id => BADGES.find(b => b.id === id))
    .filter(Boolean)
    .slice(-3)

  const weeklyProgress = getWeeklyProgress()
  const challenges = getWeeklyChallenges()
  const collectedCount = getCollectedCards().length

  return (
    <div className="space-y-8">
      {/* Level card */}
      <div className="bg-juve-black p-6 text-white">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-juve-gold mb-1">Il tuo livello</p>
            <p className="font-display text-3xl font-black">{level.icon} {level.name}</p>
          </div>
          <div className="text-left sm:text-right">
            <p className="font-display text-3xl font-black text-juve-gold">{gamification.xp}</p>
            <p className="text-[10px] uppercase tracking-widest text-gray-400">XP totali</p>
          </div>
        </div>
        <div className="h-2 bg-gray-800">
          <motion.div initial={{ width: 0 }} animate={{ width: `${level.progress * 100}%` }} transition={{ duration: 1 }} className="h-full bg-juve-gold" />
        </div>
        {level.next && <p className="text-xs text-gray-400 mt-2">{level.next.minXP - gamification.xp} XP per raggiungere <strong>{level.next.name}</strong></p>}
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

function DiaryTab() {
  const [entries, setEntries] = useState(() => getDiary())
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ match: '', mood: '', rating: 5, note: '' })

  const MOODS = [
    { id: 'ecstatic', emoji: '🤩', label: 'Euforico' },
    { id: 'happy', emoji: '😊', label: 'Felice' },
    { id: 'neutral', emoji: '😐', label: 'Neutrale' },
    { id: 'sad', emoji: '😞', label: 'Deluso' },
    { id: 'angry', emoji: '😤', label: 'Arrabbiato' },
  ]

  const handleSubmit = () => {
    if (!form.match) return
    addDiaryEntry(form)
    addXP(XP_ACTIONS.diaryEntry, 'diaryEntry')
    setEntries(getDiary())
    setForm({ match: '', mood: '', rating: 5, note: '' })
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
              <input
                type="text"
                placeholder="Partita (es. Juve-Milan 2-1)"
                value={form.match}
                onChange={e => setForm({ ...form, match: e.target.value })}
                className="w-full border-2 border-juve-black px-3 py-2 text-sm focus:outline-none focus:border-juve-gold"
              />
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
                <button onClick={handleSubmit} className="bg-juve-black text-white px-4 py-2 text-xs font-black uppercase tracking-widest hover:bg-juve-gold hover:text-black transition-colors">
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
          <p className="text-sm text-gray-500">Nessuna voce nel diario. Annota le tue emozioni dopo ogni partita!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {entries.map((entry, i) => {
            const mood = [
              { id: 'ecstatic', emoji: '🤩' }, { id: 'happy', emoji: '😊' },
              { id: 'neutral', emoji: '😐' }, { id: 'sad', emoji: '😞' }, { id: 'angry', emoji: '😤' },
            ].find(m => m.id === entry.mood)
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

function PredictionsTab() {
  const [predictions, setPredictions] = useState(() => getPredictions())
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ match: '', homeScore: 0, awayScore: 0, motm: '' })

  const handleSubmit = () => {
    if (!form.match) return
    addPrediction(form)
    addXP(XP_ACTIONS.prediction, 'prediction')
    setPredictions(getPredictions())
    setForm({ match: '', homeScore: 0, awayScore: 0, motm: '' })
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
              <input
                type="text"
                placeholder="Partita (es. Juventus-Napoli)"
                value={form.match}
                onChange={e => setForm({ ...form, match: e.target.value })}
                className="w-full border-2 border-juve-black px-3 py-2 text-sm focus:outline-none focus:border-juve-gold"
              />
              <div className="flex items-center justify-center gap-4">
                <div className="text-center">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-1">Casa</p>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setForm({ ...form, homeScore: Math.max(0, form.homeScore - 1) })} className="w-8 h-8 border border-gray-300 text-lg font-bold">-</button>
                    <span className="font-display text-3xl font-black w-10 text-center">{form.homeScore}</span>
                    <button onClick={() => setForm({ ...form, homeScore: form.homeScore + 1 })} className="w-8 h-8 border border-gray-300 text-lg font-bold">+</button>
                  </div>
                </div>
                <span className="font-display text-2xl font-black text-gray-300 mt-4">—</span>
                <div className="text-center">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-1">Ospite</p>
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
                <button onClick={handleSubmit} className="bg-juve-black text-white px-4 py-2 text-xs font-black uppercase tracking-widest hover:bg-juve-gold hover:text-black transition-colors">
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
          <p className="text-sm text-gray-500">Nessun pronostico. Prevedi il risultato della prossima partita!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {predictions.map((p, i) => (
            <motion.div key={p.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }} className="border border-gray-200 p-4">
              <p className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-2">{p.match}</p>
              <div className="flex items-center justify-center gap-4 mb-2">
                <span className="font-display text-3xl font-black">{p.homeScore}</span>
                <span className="text-gray-300 text-xl">—</span>
                <span className="font-display text-3xl font-black">{p.awayScore}</span>
              </div>
              {p.motm && <p className="text-xs text-center text-gray-500">MVP: <strong>{p.motm}</strong></p>}
              <p className="text-[10px] text-gray-400 text-center mt-2">{formatDate(p.createdAt)}</p>
            </motion.div>
          ))}
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
// TAB: PREFERENZE (updated with avatar picker)
// ═══════════════════════════════════════════════════════════════════════════

function PreferencesTab({ categories, preferences, setFavoriteCategories, reader, gamification, onDelete }) {
  const favs = preferences.favoriteCategories || []

  const toggleCat = (id) => {
    setFavoriteCategories(favs.includes(id) ? favs.filter(c => c !== id) : [...favs, id])
  }

  const handleAvatarChange = (avatarId) => {
    setAvatar(avatarId)
    window.location.reload() // Refresh to reflect avatar change
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
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-lg">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-1">Nome</p>
            <p className="text-sm font-medium">{reader.name}</p>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-1">Email</p>
            <p className="text-sm font-medium">{reader.email}</p>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-1">Iscritto dal</p>
            <p className="text-sm font-medium">{formatDate(reader.createdAt)}</p>
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
