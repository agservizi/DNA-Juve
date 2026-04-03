import { useState, useEffect, useMemo, createContext, useContext, useCallback } from 'react'
import { addXP, XP_ACTIONS, updateWeeklyProgress, checkAndUnlockBadges, collectCard, PLAYER_CARDS, recordDailyVisit, getGamificationState } from '@/lib/gamification'

const ReaderContext = createContext(null)

const LS = {
  reader: 'fb-reader',
  bookmarks: 'fb-bookmarks',
  history: 'fb-history',
  prefs: 'fb-preferences',
}

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

export function ReaderProvider({ children }) {
  const [reader, setReader] = useState(() => load(LS.reader, null))
  const [bookmarks, setBookmarks] = useState(() => load(LS.bookmarks, []))
  const [history, setHistory] = useState(() => load(LS.history, []))
  const [preferences, setPreferences] = useState(() => load(LS.prefs, { favoriteCategories: [] }))
  const [showLoginDialog, setShowLoginDialog] = useState(false)

  useEffect(() => { save(LS.bookmarks, bookmarks) }, [bookmarks])
  useEffect(() => { save(LS.history, history) }, [history])
  useEffect(() => { save(LS.prefs, preferences) }, [preferences])

  // Record daily visit for streak tracking
  useEffect(() => { if (reader) recordDailyVisit() }, [reader])

  const register = useCallback((name, email) => {
    const profile = { name, email, createdAt: new Date().toISOString() }
    save(LS.reader, profile)
    setReader(profile)
    setShowLoginDialog(false)
  }, [])

  const login = useCallback((email) => {
    const existing = load(LS.reader, null)
    if (existing && existing.email === email) {
      setReader(existing)
      setShowLoginDialog(false)
      return true
    }
    // Allow login with any email — creates a profile
    const profile = { name: email.split('@')[0], email, createdAt: new Date().toISOString() }
    save(LS.reader, profile)
    setReader(profile)
    setShowLoginDialog(false)
    return true
  }, [])

  const logout = useCallback(() => { setReader(null) }, [])

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
      { articleId: 'art-20', slug: 'analisi-tattica-difesa-tre-thiago-motta', title: 'Analisi tattica: la difesa a tre di Thiago Motta', categoryName: 'Formazione', categorySlug: 'formazione', readAt: '2026-03-31T15:00:00Z', readingMinutes: 5 },
      { articleId: 'art-17', slug: 'serie-a-var-divide-episodi-contestati', title: 'Serie A: il VAR divide ancora, gli episodi contestati', categoryName: 'Serie A', categorySlug: 'serie-a', readAt: '2026-03-30T09:00:00Z', readingMinutes: 4 },
      { articleId: 'art-25', slug: 'esclusiva-alla-juve-aria-scudetto', title: 'Esclusiva: "Alla Juve si respira aria di scudetto"', categoryName: 'Interviste', categorySlug: 'interviste', readAt: '2026-03-28T11:00:00Z', readingMinutes: 5 },
      { articleId: 'art-14', slug: 'coppa-italia-juve-semifinale-lazio', title: 'Coppa Italia: la Juve vola in semifinale battendo la Lazio', categoryName: 'Calcio', categorySlug: 'calcio', readAt: '2026-03-25T22:00:00Z', readingMinutes: 3 },
      { articleId: 'art-21', slug: 'top-10-gol-piu-belli-stagione', title: 'Top 10: i gol piu belli della stagione bianconera', categoryName: 'Calcio', categorySlug: 'calcio', readAt: '2026-03-20T16:00:00Z', readingMinutes: 4 },
    ]
    const demoPrefs = { favoriteCategories: ['cat-01', 'cat-04', 'cat-02'] }
    save(LS.reader, profile)
    save(LS.bookmarks, demoBookmarks)
    save(LS.history, demoHistory)
    save(LS.prefs, demoPrefs)
    setReader(profile)
    setBookmarks(demoBookmarks)
    setHistory(demoHistory)
    setPreferences(demoPrefs)
    setShowLoginDialog(false)
  }, [])

  const deleteAccount = useCallback(() => {
    remove(LS.reader)
    remove(LS.bookmarks)
    remove(LS.history)
    remove(LS.prefs)
    setReader(null)
    setBookmarks([])
    setHistory([])
    setPreferences({ favoriteCategories: [] })
  }, [])

  const isBookmarked = useCallback((articleId) => bookmarks.some(b => b.articleId === articleId), [bookmarks])

  const toggleBookmark = useCallback((article) => {
    setBookmarks(prev => {
      if (prev.some(b => b.articleId === article.id)) {
        return prev.filter(b => b.articleId !== article.id)
      }
      // Award XP for bookmarking
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
    setHistory(prev => {
      const alreadyRead = prev.some(h => h.articleId === entry.articleId)
      const filtered = prev.filter(h => h.articleId !== entry.articleId)
      const newHistory = [{ ...entry, readAt: new Date().toISOString() }, ...filtered].slice(0, 100)

      if (!alreadyRead) {
        // Award XP for reading a new article
        addXP(XP_ACTIONS.readArticle, 'readArticle')
        updateWeeklyProgress('articlesRead')

        // Check time-based badges
        const hour = new Date().getHours()
        const gState = getGamificationState()
        const readerStats = {
          totalArticles: newHistory.length,
          bookmarkCount: bookmarks.length,
          categoriesRead: new Set(newHistory.map(h => h.categorySlug).filter(Boolean)).size,
          hasNightRead: hour >= 0 && hour < 5,
          hasEarlyRead: hour >= 5 && hour < 7,
          derbyArticles: newHistory.filter(h => /derby|torino/i.test(h.title || '')).length,
          streak: gState.streak || 0,
          predictions: gState.predictions?.length || 0,
        }
        checkAndUnlockBadges(readerStats)

        // Auto-collect figurine based on articles read count
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
    setPreferences(prev => ({ ...prev, favoriteCategories: ids }))
  }, [])

  const openLogin = useCallback(() => setShowLoginDialog(true), [])
  const closeLogin = useCallback(() => setShowLoginDialog(false), [])

  const stats = useMemo(() => {
    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const thisMonth = history.filter(h => new Date(h.readAt) >= monthStart)
    const totalMinutes = history.reduce((s, h) => s + (h.readingMinutes || 0), 0)
    const catCount = {}
    history.forEach(h => { if (h.categoryName) catCount[h.categoryName] = (catCount[h.categoryName] || 0) + 1 })
    const favCat = Object.entries(catCount).sort((a, b) => b[1] - a[1])[0]?.[0] || '-'
    return {
      articlesThisMonth: thisMonth.length,
      totalArticles: history.length,
      totalMinutes,
      favoriteCategory: favCat,
    }
  }, [history])

  return (
    <ReaderContext.Provider value={{
      reader, bookmarks, history, preferences, showLoginDialog, stats,
      register, login, loginDemo, logout, deleteAccount,
      toggleBookmark, isBookmarked, clearBookmarks,
      addToHistory, clearHistory,
      setFavoriteCategories,
      openLogin, closeLogin,
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
