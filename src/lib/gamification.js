// ── Reader Gamification System ──────────────────────────────────────────────
// XP levels, badges, achievements, weekly challenges, figurine collection
// All data stored in localStorage

const LS_KEY = 'fb-gamification'

function load() {
  try { return JSON.parse(localStorage.getItem(LS_KEY)) ?? getDefaults() }
  catch { return getDefaults() }
}

function save(data) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(data)) } catch {}
}

function getDefaults() {
  return {
    xp: 0,
    unlockedBadges: [],
    weeklyProgress: {},
    weekStart: getWeekStart(),
    collectedCards: [],
    diary: [],
    predictions: [],
    avatar: 'shield',
    streak: 0,
    lastVisitDate: null,
  }
}

function getWeekStart() {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() - d.getDay() + 1) // Monday
  return d.toISOString()
}

// ── XP & Levels ─────────────────────────────────────────────────────────────

export const LEVELS = [
  { name: 'Tifoso', minXP: 0, icon: '🦓' },
  { name: 'Ultras', minXP: 100, icon: '🔥' },
  { name: 'Vecchia Signora', minXP: 300, icon: '🖤' },
  { name: 'Mister 36', minXP: 600, icon: '⭐' },
  { name: 'Leggenda Bianconera', minXP: 1000, icon: '🏆' },
]

export function getLevel(xp) {
  let level = LEVELS[0]
  for (const l of LEVELS) {
    if (xp >= l.minXP) level = l
  }
  const idx = LEVELS.indexOf(level)
  const next = LEVELS[idx + 1]
  const progress = next
    ? (xp - level.minXP) / (next.minXP - level.minXP)
    : 1
  return { ...level, index: idx, next, progress: Math.min(progress, 1), xp }
}

export const XP_ACTIONS = {
  readArticle: 10,
  bookmark: 5,
  reaction: 3,
  annotation: 5,
  streak3: 30,
  streak7: 100,
  prediction: 15,
  diaryEntry: 10,
  challengeComplete: 50,
}

// ── Badges / Achievements ───────────────────────────────────────────────────

export const BADGES = [
  { id: 'first-read', name: 'Prima Lettura', desc: 'Leggi il tuo primo articolo', icon: '📖', condition: (s) => s.totalArticles >= 1 },
  { id: 'reader-10', name: 'Lettore Assiduo', desc: 'Leggi 10 articoli', icon: '📚', condition: (s) => s.totalArticles >= 10 },
  { id: 'reader-50', name: 'Divoratore', desc: 'Leggi 50 articoli', icon: '🔥', condition: (s) => s.totalArticles >= 50 },
  { id: 'streak-3', name: 'Costante', desc: 'Streak di 3 giorni consecutivi', icon: '⚡', condition: (s) => s.streak >= 3 },
  { id: 'streak-7', name: 'Maratoneta', desc: 'Streak di 7 giorni consecutivi', icon: '🏃', condition: (s) => s.streak >= 7 },
  { id: 'streak-30', name: 'Inarrestabile', desc: 'Streak di 30 giorni consecutivi', icon: '💎', condition: (s) => s.streak >= 30 },
  { id: 'all-cats', name: 'Enciclopedico', desc: 'Leggi almeno un articolo per ogni categoria', icon: '🧠', condition: (s) => s.categoriesRead >= 6 },
  { id: 'bookworm', name: 'Collezionista', desc: 'Salva 10 segnalibri', icon: '🔖', condition: (s) => s.bookmarkCount >= 10 },
  { id: 'night-owl', name: 'Nottambulo', desc: 'Leggi un articolo dopo mezzanotte', icon: '🦉', condition: (s) => s.hasNightRead },
  { id: 'early-bird', name: 'Mattiniero', desc: 'Leggi un articolo prima delle 7', icon: '🌅', condition: (s) => s.hasEarlyRead },
  { id: 'derby-king', name: 'Derby King', desc: 'Leggi 3 articoli sul derby', icon: '👑', condition: (s) => s.derbyArticles >= 3 },
  { id: 'predictor', name: 'Indovino', desc: 'Fai 5 pronostici', icon: '🔮', condition: (s) => s.predictions >= 5 },
]

// ── Weekly Challenges ───────────────────────────────────────────────────────

export function getWeeklyChallenges() {
  return [
    { id: 'read-5', label: 'Leggi 5 articoli', target: 5, key: 'articlesRead', xp: 50 },
    { id: 'react-3', label: 'Reagisci a 3 articoli', target: 3, key: 'reactions', xp: 30 },
    { id: 'bookmark-2', label: 'Salva 2 segnalibri', target: 2, key: 'bookmarks', xp: 20 },
    { id: 'streak-3', label: 'Streak di 3 giorni', target: 3, key: 'streakDays', xp: 40 },
  ]
}

// ── Figurine (Player Cards) — rosa Juventus 2025/26 da transfermarkt.it ──────

export const PLAYER_CARDS = [
  { id: 'p-01', name: 'Dušan Vlahović', number: 9, role: 'ATT', rarity: 'gold', unlockAt: 5 },
  { id: 'p-02', name: 'Kenan Yıldız', number: 10, role: 'ATT', rarity: 'gold', unlockAt: 10 },
  { id: 'p-03', name: 'Andrea Cambiaso', number: 27, role: 'DIF', rarity: 'silver', unlockAt: 3 },
  { id: 'p-04', name: 'Teun Koopmeiners', number: 8, role: 'CEN', rarity: 'gold', unlockAt: 15 },
  { id: 'p-05', name: 'Bremer', number: 3, role: 'DIF', rarity: 'silver', unlockAt: 7 },
  { id: 'p-06', name: 'Federico Gatti', number: 4, role: 'DIF', rarity: 'bronze', unlockAt: 2 },
  { id: 'p-07', name: 'Manuel Locatelli', number: 5, role: 'CEN', rarity: 'silver', unlockAt: 8 },
  { id: 'p-08', name: 'Francisco Conceição', number: 7, role: 'ATT', rarity: 'gold', unlockAt: 12 },
  { id: 'p-09', name: 'Weston McKennie', number: 22, role: 'CEN', rarity: 'bronze', unlockAt: 1 },
  { id: 'p-10', name: 'Michele Di Gregorio', number: 16, role: 'POR', rarity: 'silver', unlockAt: 6 },
  { id: 'p-11', name: 'Edon Zhegrova', number: 11, role: 'ATT', rarity: 'gold', unlockAt: 9 },
  { id: 'p-12', name: 'Jonathan David', number: 30, role: 'ATT', rarity: 'gold', unlockAt: 14 },
  { id: 'p-13', name: 'Khéphren Thuram', number: 19, role: 'CEN', rarity: 'silver', unlockAt: 11 },
  { id: 'p-14', name: 'Mattia Perin', number: 1, role: 'POR', rarity: 'bronze', unlockAt: 3 },
  { id: 'p-15', name: 'Pierre Kalulu', number: 15, role: 'DIF', rarity: 'bronze', unlockAt: 5 },
  { id: 'p-16', name: 'Lloyd Kelly', number: 6, role: 'DIF', rarity: 'bronze', unlockAt: 4 },
  { id: 'p-17', name: 'Loïs Openda', number: 20, role: 'ATT', rarity: 'gold', unlockAt: 13 },
  { id: 'p-18', name: 'Vasilije Adžić', number: 17, role: 'CEN', rarity: 'bronze', unlockAt: 1 },
  { id: 'p-19', name: 'Juan Cabal', number: 32, role: 'DIF', rarity: 'bronze', unlockAt: 2 },
  { id: 'p-20', name: 'Emil Holm', number: 2, role: 'DIF', rarity: 'bronze', unlockAt: 3 },
  { id: 'p-21', name: 'Filip Kostić', number: 18, role: 'CEN', rarity: 'bronze', unlockAt: 4 },
  { id: 'p-22', name: 'Fabio Miretti', number: 21, role: 'CEN', rarity: 'bronze', unlockAt: 2 },
  { id: 'p-23', name: 'Arkadiusz Milik', number: 14, role: 'ATT', rarity: 'silver', unlockAt: 6 },
  { id: 'p-24', name: 'Jérémie Boga', number: 13, role: 'ATT', rarity: 'silver', unlockAt: 5 },
  { id: 'p-25', name: 'Thiago Motta', number: 0, role: 'ALL', rarity: 'legendary', unlockAt: 30 },
  { id: 'p-26', name: 'Alessandro Del Piero', number: 10, role: 'LEG', rarity: 'legendary', unlockAt: 50 },
]

// ── Avatars ─────────────────────────────────────────────────────────────────

export const AVATARS = [
  { id: 'shield', label: 'Scudetto', emoji: '🛡️' },
  { id: 'zebra', label: 'Zebra', emoji: '🦓' },
  { id: 'star', label: 'Stella', emoji: '⭐' },
  { id: 'trophy', label: 'Coppa', emoji: '🏆' },
  { id: 'fire', label: 'Fuoco', emoji: '🔥' },
  { id: 'crown', label: 'Corona', emoji: '👑' },
  { id: 'stadium', label: 'Stadio', emoji: '🏟️' },
  { id: 'ball', label: 'Pallone', emoji: '⚽' },
  { id: 'flag', label: 'Bandiera', emoji: '🏴' },
  { id: 'heart', label: 'Cuore', emoji: '🖤' },
  { id: 'eagle', label: 'Aquila', emoji: '🦅' },
  { id: 'diamond', label: 'Diamante', emoji: '💎' },
]

// ── Formations ──────────────────────────────────────────────────────────────

export const FORMATIONS = ['4-3-3', '4-4-2', '3-5-2', '4-2-3-1', '3-4-3']

export const SQUAD_PLAYERS = [
  { id: 's-01', name: 'Di Gregorio', number: 16, role: 'POR' },
  { id: 's-02', name: 'Perin', number: 1, role: 'POR' },
  { id: 's-03', name: 'Pinsoglio', number: 23, role: 'POR' },
  { id: 's-04', name: 'Bremer', number: 3, role: 'DIF' },
  { id: 's-05', name: 'Gatti', number: 4, role: 'DIF' },
  { id: 's-06', name: 'Kelly', number: 6, role: 'DIF' },
  { id: 's-07', name: 'Kalulu', number: 15, role: 'DIF' },
  { id: 's-08', name: 'Holm', number: 2, role: 'DIF' },
  { id: 's-09', name: 'Cambiaso', number: 27, role: 'DIF' },
  { id: 's-10', name: 'Cabal', number: 32, role: 'DIF' },
  { id: 's-11', name: 'Locatelli', number: 5, role: 'CEN' },
  { id: 's-12', name: 'Koopmeiners', number: 8, role: 'CEN' },
  { id: 's-13', name: 'Adžić', number: 17, role: 'CEN' },
  { id: 's-14', name: 'Kostić', number: 18, role: 'CEN' },
  { id: 's-15', name: 'Thuram', number: 19, role: 'CEN' },
  { id: 's-16', name: 'Miretti', number: 21, role: 'CEN' },
  { id: 's-17', name: 'McKennie', number: 22, role: 'CEN' },
  { id: 's-18', name: 'Conceição', number: 7, role: 'ATT' },
  { id: 's-19', name: 'Vlahović', number: 9, role: 'ATT' },
  { id: 's-20', name: 'Yıldız', number: 10, role: 'ATT' },
  { id: 's-21', name: 'Zhegrova', number: 11, role: 'ATT' },
  { id: 's-22', name: 'Boga', number: 13, role: 'ATT' },
  { id: 's-23', name: 'Milik', number: 14, role: 'ATT' },
  { id: 's-24', name: 'Openda', number: 20, role: 'ATT' },
  { id: 's-25', name: 'David', number: 30, role: 'ATT' },
]

// ── Gamification State Manager ──────────────────────────────────────────────

export function getGamificationState() {
  return load()
}

export function recordDailyVisit() {
  const state = load()
  const today = new Date().toISOString().slice(0, 10) // YYYY-MM-DD
  if (state.lastVisitDate === today) return state // Already recorded today

  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10)
  if (state.lastVisitDate === yesterday) {
    state.streak = (state.streak || 0) + 1
    // Streak bonus XP
    if (state.streak === 3) state.xp += XP_ACTIONS.streak3
    if (state.streak === 7) state.xp += XP_ACTIONS.streak7
  } else if (state.lastVisitDate !== today) {
    state.streak = 1
  }

  state.lastVisitDate = today
  updateWeeklyProgress('streakDays')
  save(state)
  return state
}

export function addXP(amount, action = '') {
  const state = load()
  state.xp += amount
  save(state)
  return state
}

export function setAvatar(avatarId) {
  const state = load()
  state.avatar = avatarId
  save(state)
  return state
}

export function unlockBadge(badgeId) {
  const state = load()
  if (!state.unlockedBadges.includes(badgeId)) {
    state.unlockedBadges.push(badgeId)
    save(state)
  }
  return state
}

export function checkAndUnlockBadges(readerStats) {
  const state = load()
  const newBadges = []
  for (const badge of BADGES) {
    if (!state.unlockedBadges.includes(badge.id) && badge.condition(readerStats)) {
      state.unlockedBadges.push(badge.id)
      newBadges.push(badge)
    }
  }
  if (newBadges.length > 0) save(state)
  return newBadges
}

export function updateWeeklyProgress(key, amount = 1) {
  const state = load()
  const currentWeek = getWeekStart()
  if (state.weekStart !== currentWeek) {
    state.weeklyProgress = {}
    state.completedChallenges = state.completedChallenges || []
    state.weekStart = currentWeek
  }
  state.weeklyProgress[key] = (state.weeklyProgress[key] || 0) + amount

  // Check if any challenge just got completed
  const challenges = getWeeklyChallenges()
  state.completedChallenges = state.completedChallenges || []
  for (const ch of challenges) {
    if ((state.weeklyProgress[ch.key] || 0) >= ch.target && !state.completedChallenges.includes(ch.id)) {
      state.completedChallenges.push(ch.id)
      state.xp += XP_ACTIONS.challengeComplete
    }
  }

  save(state)
  return state
}

export function getWeeklyProgress() {
  const state = load()
  const currentWeek = getWeekStart()
  if (state.weekStart !== currentWeek) return {}
  return state.weeklyProgress
}

export function collectCard(cardId) {
  const state = load()
  if (!state.collectedCards.includes(cardId)) {
    state.collectedCards.push(cardId)
    save(state)
  }
  return state
}

export function getCollectedCards() {
  return load().collectedCards || []
}

// ── Diary ───────────────────────────────────────────────────────────────────

export function addDiaryEntry(entry) {
  const state = load()
  state.diary = [{ ...entry, id: Date.now().toString(), createdAt: new Date().toISOString() }, ...(state.diary || [])]
  save(state)
  return state
}

export function getDiary() {
  return load().diary || []
}

export function deleteDiaryEntry(id) {
  const state = load()
  state.diary = (state.diary || []).filter(d => d.id !== id)
  save(state)
  return state
}

// ── Predictions ─────────────────────────────────────────────────────────────

export function addPrediction(prediction) {
  const state = load()
  state.predictions = [{ ...prediction, id: Date.now().toString(), createdAt: new Date().toISOString() }, ...(state.predictions || [])]
  save(state)
  return state
}

export function getPredictions() {
  return load().predictions || []
}

// ── Formation ───────────────────────────────────────────────────────────────

const LS_FORMATION = 'fb-formation'

export function saveFormation(formation, players) {
  try { localStorage.setItem(LS_FORMATION, JSON.stringify({ formation, players })) } catch {}
}

export function getFormation() {
  try { return JSON.parse(localStorage.getItem(LS_FORMATION)) ?? null }
  catch { return null }
}
