import { useState, useEffect, useMemo, createContext, useContext, useCallback } from 'react'
import {
  addXP,
  XP_ACTIONS,
  updateWeeklyProgress,
  checkAndUnlockBadges,
  collectCard,
  PLAYER_CARDS,
  recordDailyVisit,
  getGamificationState,
} from '@/lib/gamification'
import {
  supabase,
  signInWithMagicLink,
  signOut,
  getProfileByUserId,
  updateProfileData,
  getReaderState,
  upsertReaderState,
  onAuthStateChange,
} from '@/lib/supabase'

const ReaderContext = createContext(null)

const LS = {
  reader: 'fb-reader',
  bookmarks: 'fb-bookmarks',
  history: 'fb-history',
  prefs: 'fb-preferences',
  pendingName: 'fb-reader-pending-name',
}

const GAMIFICATION_KEY = 'fb-gamification'
const NOTIFICATIONS_KEY = 'fb-notifications'
const DEFAULT_PREFS = { favoriteCategories: [] }
const IS_MOCK = import.meta.env.VITE_SUPABASE_URL?.includes('your-project.supabase.co')

function load(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback }
  catch { return fallback }
}

function save(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)) } catch {}
}

function remove(key) {
  try { localStorage.removeItem(key) } catch {}
}

function getLocalSnapshot() {
  return {
    reader: load(LS.reader, null),
    bookmarks: load(LS.bookmarks, []),
    history: load(LS.history, []),
    preferences: load(LS.prefs, DEFAULT_PREFS),
    gamification: load(GAMIFICATION_KEY, null),
    notifications: load(NOTIFICATIONS_KEY, { enabled: false, lastCheck: null }),
  }
}

function buildReaderProfile(sessionUser, profile) {
  if (!sessionUser) return null
  return {
    id: sessionUser.id,
    name: profile?.username || sessionUser.user_metadata?.display_name || sessionUser.email?.split('@')[0] || 'Tifoso',
    email: sessionUser.email || '',
    avatarUrl: profile?.avatar_url || null,
    role: profile?.role || 'reader',
    createdAt: profile?.created_at || sessionUser.created_at || new Date().toISOString(),
  }
}

function persistGamificationSnapshot(snapshot) {
  if (!snapshot) return
  save(GAMIFICATION_KEY, snapshot)
}

export function ReaderProvider({ children }) {
  const localSnapshot = useMemo(() => getLocalSnapshot(), [])
  const [reader, setReader] = useState(() => localSnapshot.reader)
  const [bookmarks, setBookmarks] = useState(() => localSnapshot.bookmarks)
  const [history, setHistory] = useState(() => localSnapshot.history)
  const [preferences, setPreferences] = useState(() => localSnapshot.preferences)
  const [showLoginDialog, setShowLoginDialog] = useState(false)
  const [authUser, setAuthUser] = useState(null)
  const [authReady, setAuthReady] = useState(IS_MOCK)

  useEffect(() => { save(LS.bookmarks, bookmarks) }, [bookmarks])
  useEffect(() => { save(LS.history, history) }, [history])
  useEffect(() => { save(LS.prefs, preferences) }, [preferences])
  useEffect(() => {
    if (reader) save(LS.reader, reader)
    else remove(LS.reader)
  }, [reader])

  const applySnapshot = useCallback((snapshot, nextReader) => {
    setReader(nextReader || snapshot.reader || null)
    setBookmarks(snapshot.bookmarks || [])
    setHistory(snapshot.history || [])
    setPreferences(snapshot.preferences || DEFAULT_PREFS)
    persistGamificationSnapshot(snapshot.gamification || getGamificationState())
  }, [])

  const syncRemoteState = useCallback(async (sessionUser, overrides = {}) => {
    if (!sessionUser?.id || IS_MOCK) return

    const payload = {
      bookmarks: overrides.bookmarks ?? bookmarks,
      history: overrides.history ?? history,
      preferences: overrides.preferences ?? preferences,
      gamification: overrides.gamification ?? getGamificationState(),
      notifications_enabled: overrides.notificationsEnabled ?? load(NOTIFICATIONS_KEY, { enabled: false }).enabled,
      last_synced_at: new Date().toISOString(),
    }

    try {
      await upsertReaderState(sessionUser.id, payload)
    } catch {
      // Reader sync should never block the experience.
    }
  }, [bookmarks, history, preferences])

  useEffect(() => {
    if (IS_MOCK) return undefined

    let active = true

    const hydrateFromSession = async (sessionUser) => {
      if (!active) return
      setAuthUser(sessionUser ?? null)

      if (!sessionUser?.id) {
        setAuthReady(true)
        return
      }

      const pendingName = localStorage.getItem(LS.pendingName)
      const [{ data: profile }, { data: remoteState }] = await Promise.all([
        getProfileByUserId(sessionUser.id),
        getReaderState(sessionUser.id),
      ])

      if (!active) return

      if (pendingName && (!profile?.username || profile.username === sessionUser.email?.split('@')[0])) {
        await updateProfileData(sessionUser.id, { username: pendingName.trim() })
      }

      const refreshedProfile = pendingName
        ? { ...(profile || {}), username: pendingName.trim() }
        : profile

      const local = getLocalSnapshot()
      const snapshot = {
        bookmarks: remoteState?.bookmarks?.length ? remoteState.bookmarks : local.bookmarks,
        history: remoteState?.history?.length ? remoteState.history : local.history,
        preferences: remoteState?.preferences || local.preferences,
        gamification: remoteState?.gamification || local.gamification || getGamificationState(),
        notifications: {
          enabled: remoteState?.notifications_enabled ?? local.notifications.enabled,
          lastCheck: local.notifications.lastCheck ?? null,
        },
      }

      applySnapshot(snapshot, buildReaderProfile(sessionUser, refreshedProfile))
      setShowLoginDialog(false)
      setAuthReady(true)

      if (pendingName) remove(LS.pendingName)

      if (!remoteState) {
        await syncRemoteState(sessionUser, {
          bookmarks: snapshot.bookmarks,
          history: snapshot.history,
          preferences: snapshot.preferences,
          gamification: snapshot.gamification,
          notificationsEnabled: snapshot.notifications.enabled,
        })
      }
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      hydrateFromSession(session?.user ?? null)
    })

    const { data: { subscription } } = onAuthStateChange((_event, session) => {
      hydrateFromSession(session?.user ?? null)
    })

    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [applySnapshot, syncRemoteState])

  useEffect(() => {
    if (!reader) return
    recordDailyVisit()
  }, [reader?.id, reader?.email])

  useEffect(() => {
    if (!authUser?.id || IS_MOCK || !authReady) return undefined

    const timer = setTimeout(() => {
      syncRemoteState(authUser)
    }, 600)

    return () => clearTimeout(timer)
  }, [authUser, authReady, bookmarks, history, preferences, reader?.id, syncRemoteState])

  const register = useCallback(async (name, email) => {
    if (IS_MOCK) {
      const profile = { name, email, createdAt: new Date().toISOString() }
      save(LS.reader, profile)
      setReader(profile)
      setShowLoginDialog(false)
      return { mode: 'demo' }
    }

    save(LS.pendingName, name)
    const { error } = await signInWithMagicLink(email, {
      data: { display_name: name, role: 'reader' },
    })
    if (error) throw error
    return { mode: 'magic-link' }
  }, [])

  const login = useCallback(async (email) => {
    if (IS_MOCK) {
      const existing = load(LS.reader, null)
      if (existing && existing.email === email) {
        setReader(existing)
        setShowLoginDialog(false)
        return { mode: 'demo' }
      }

      const profile = { name: email.split('@')[0], email, createdAt: new Date().toISOString() }
      save(LS.reader, profile)
      setReader(profile)
      setShowLoginDialog(false)
      return { mode: 'demo' }
    }

    const { error } = await signInWithMagicLink(email, {
      data: { role: 'reader' },
    })
    if (error) throw error
    return { mode: 'magic-link' }
  }, [])

  const logout = useCallback(async () => {
    if (!IS_MOCK && authUser?.id) {
      await signOut()
    }

    setReader(null)
    setBookmarks([])
    setHistory([])
    setPreferences(DEFAULT_PREFS)

    remove(LS.reader)
    remove(LS.bookmarks)
    remove(LS.history)
    remove(LS.prefs)
  }, [authUser])

  const loginDemo = useCallback(() => {
    const profile = { name: 'Tifoso Bianconero', email: 'tifoso@bianconerihub.com', createdAt: '2026-02-15T10:00:00Z' }
    const demoBookmarks = [
      { articleId: 'art-12', slug: 'yildiz-tripletta-storica-genoa', title: 'Yildiz incanta l\'Europa: tripletta storica al Genoa', coverImage: 'https://placehold.co/800x450/1a56db/FFFFFF?text=YILDIZ+HAT+TRICK', categoryName: 'Calcio', savedAt: '2026-04-02T20:00:00Z' },
      { articleId: 'art-16', slug: 'champions-sorteggio-quarti-sorride-juve', title: 'Champions: il sorteggio dei quarti sorride alla Juve', coverImage: 'https://placehold.co/800x450/7e3af2/FFFFFF?text=UCL+QUARTI', categoryName: 'Champions', savedAt: '2026-03-22T14:00:00Z' },
      { articleId: 'art-07', slug: 'vlahovic-doppietta-record-stagionale', title: 'Vlahovic incontenibile: doppietta e record stagionale', coverImage: 'https://placehold.co/800x450/000000/F5A623?text=VLAHOVIC+25', categoryName: 'Calcio', savedAt: '2026-03-31T10:00:00Z' },
    ]
    const demoHistory = [
      { articleId: 'art-12', slug: 'yildiz-tripletta-storica-genoa', title: 'Yildiz incanta l\'Europa: tripletta storica al Genoa', categoryName: 'Calcio', categorySlug: 'calcio', readAt: '2026-04-03T08:00:00Z', readingMinutes: 4 },
      { articleId: 'art-01', slug: 'derby-della-mole-juve-domina', title: 'Derby della Mole: la Juve domina e vola in classifica', categoryName: 'Calcio', categorySlug: 'calcio', readAt: '2026-04-02T19:00:00Z', readingMinutes: 5 },
      { articleId: 'art-16', slug: 'champions-sorteggio-quarti-sorride-juve', title: 'Champions: il sorteggio dei quarti sorride alla Juve', categoryName: 'Champions', categorySlug: 'champions', readAt: '2026-04-02T14:00:00Z', readingMinutes: 4 },
      { articleId: 'art-07', slug: 'vlahovic-doppietta-record-stagionale', title: 'Vlahovic incontenibile: doppietta e record stagionale', categoryName: 'Calcio', categorySlug: 'calcio', readAt: '2026-04-01T20:00:00Z', readingMinutes: 3 },
      { articleId: 'art-13', slug: 'mercato-giuntoli-talento-brasiliano-santos', title: 'Mercato: Giuntoli punta il talento brasiliano del Santos', categoryName: 'Mercato', categorySlug: 'mercato', readAt: '2026-04-01T10:00:00Z', readingMinutes: 4 },
    ]
    const demoPrefs = { favoriteCategories: ['cat-01', 'cat-04', 'cat-02'] }
    setReader(profile)
    setBookmarks(demoBookmarks)
    setHistory(demoHistory)
    setPreferences(demoPrefs)
    setShowLoginDialog(false)
  }, [])

  const deleteAccount = useCallback(() => {
    setReader(null)
    setBookmarks([])
    setHistory([])
    setPreferences(DEFAULT_PREFS)
    remove(LS.reader)
    remove(LS.bookmarks)
    remove(LS.history)
    remove(LS.prefs)
    remove(GAMIFICATION_KEY)
  }, [])

  const isBookmarked = useCallback((articleId) => bookmarks.some((b) => b.articleId === articleId), [bookmarks])

  const toggleBookmark = useCallback((article) => {
    setBookmarks((prev) => {
      if (prev.some((b) => b.articleId === article.id)) {
        return prev.filter((b) => b.articleId !== article.id)
      }

      addXP(XP_ACTIONS.bookmark, 'bookmark')
      updateWeeklyProgress('bookmarks')

      return [{
        articleId: article.id,
        slug: article.slug,
        title: article.title,
        coverImage: article.cover_image,
        categoryName: article.categories?.name || '',
        savedAt: new Date().toISOString(),
      }, ...prev]
    })
  }, [])

  const clearBookmarks = useCallback(() => setBookmarks([]), [])

  const addToHistory = useCallback((entry) => {
    setHistory((prev) => {
      const alreadyRead = prev.some((h) => h.articleId === entry.articleId)
      const filtered = prev.filter((h) => h.articleId !== entry.articleId)
      const newHistory = [{ ...entry, readAt: new Date().toISOString() }, ...filtered].slice(0, 100)

      if (!alreadyRead) {
        addXP(XP_ACTIONS.readArticle, 'readArticle')
        updateWeeklyProgress('articlesRead')

        const hour = new Date().getHours()
        const gState = getGamificationState()
        const readerStats = {
          totalArticles: newHistory.length,
          bookmarkCount: bookmarks.length,
          categoriesRead: new Set(newHistory.map((h) => h.categorySlug).filter(Boolean)).size,
          hasNightRead: hour >= 0 && hour < 5,
          hasEarlyRead: hour >= 5 && hour < 7,
          derbyArticles: newHistory.filter((h) => /derby|torino/i.test(h.title || '')).length,
          streak: gState.streak || 0,
          predictions: gState.predictions?.length || 0,
        }
        checkAndUnlockBadges(readerStats)

        const count = newHistory.length
        for (const card of PLAYER_CARDS) {
          if (count >= card.unlockAt) collectCard(card.id)
        }
      }

      return newHistory
    })
  }, [bookmarks.length])

  const clearHistory = useCallback(() => setHistory([]), [])

  const setFavoriteCategories = useCallback((ids) => {
    setPreferences((prev) => ({ ...prev, favoriteCategories: ids }))
  }, [])

  const openLogin = useCallback(() => setShowLoginDialog(true), [])
  const closeLogin = useCallback(() => setShowLoginDialog(false), [])

  const stats = useMemo(() => {
    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const thisMonth = history.filter((h) => new Date(h.readAt) >= monthStart)
    const totalMinutes = history.reduce((sum, item) => sum + (item.readingMinutes || 0), 0)
    const catCount = {}

    history.forEach((item) => {
      if (item.categoryName) catCount[item.categoryName] = (catCount[item.categoryName] || 0) + 1
    })

    const favoriteCategory = Object.entries(catCount).sort((a, b) => b[1] - a[1])[0]?.[0] || '-'

    return {
      articlesThisMonth: thisMonth.length,
      totalArticles: history.length,
      totalMinutes,
      favoriteCategory,
    }
  }, [history])

  return (
    <ReaderContext.Provider value={{
      reader,
      bookmarks,
      history,
      preferences,
      showLoginDialog,
      stats,
      authReady,
      register,
      login,
      loginDemo,
      logout,
      deleteAccount,
      toggleBookmark,
      isBookmarked,
      clearBookmarks,
      addToHistory,
      clearHistory,
      setFavoriteCategories,
      openLogin,
      closeLogin,
      syncRemoteState: () => syncRemoteState(authUser),
    }}>
      {children}
    </ReaderContext.Provider>
  )
}

export function useReader() {
  const ctx = useContext(ReaderContext)
  if (!ctx) throw new Error('useReader must be used within ReaderProvider')
  return ctx
}
