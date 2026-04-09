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
  setGamificationScope,
} from '@/lib/gamification'
import {
  supabase,
  signIn,
  signUpReader,
  signOut,
  resendReaderConfirmation,
  resetReaderPassword,
  updateReaderPassword,
  getProfileByUserId,
  ensureProfileData,
  updateProfileData,
  getReaderState,
  upsertReaderState,
  onAuthStateChange,
  createReaderNotification,
  getReaderNotifications,
  upsertPushSubscription,
  deletePushSubscription,
  pushNotificationsConfigured,
  vapidPublicKey,
} from '@/lib/supabase'
import {
  getPushSupportStatus,
  getCurrentPushSubscription,
  isPushSupported,
  subscribeToPush,
  unsubscribeFromPush,
} from '@/lib/pushNotifications'

const ReaderContext = createContext(null)

const LS = {
  reader: 'fb-reader',
  bookmarks: 'fb-bookmarks',
  history: 'fb-history',
  prefs: 'fb-preferences',
  pendingName: 'fb-reader-pending-name',
  guestPushToken: 'fb-guest-push-token',
}

const GAMIFICATION_KEY = 'fb-gamification'
const NOTIFICATIONS_KEY = 'fb-notifications'
const CONFIRMATION_REMINDER_KEY = 'fb-confirmation-reminders'
const DEFAULT_PREFS = { favoriteCategories: [], timeZone: 'auto' }
const IS_MOCK = import.meta.env.VITE_SUPABASE_URL?.includes('your-project.supabase.co')
const GUEST_SCOPE = 'guest'

function getPushUnsupportedMessage(reason) {
  if (reason === 'ios-standalone-required') {
    return 'Su iPhone e iPad le notifiche push richiedono il sito aggiunto alla Home e aperto come app.'
  }

  if (reason === 'insecure-context') {
    return 'Le notifiche push richiedono una connessione HTTPS sicura.'
  }

  return 'Il browser non supporta le notifiche push.'
}

function getStorageKeys(scope = GUEST_SCOPE) {
  return {
    reader: `${LS.reader}:${scope}`,
    bookmarks: `${LS.bookmarks}:${scope}`,
    history: `${LS.history}:${scope}`,
    prefs: `${LS.prefs}:${scope}`,
    gamification: `${GAMIFICATION_KEY}:${scope}`,
    notifications: `${NOTIFICATIONS_KEY}:${scope}`,
  }
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

function shouldSendConfirmationReminder(email) {
  const normalized = String(email || '').trim().toLowerCase()
  if (!normalized) return false

  const reminders = load(CONFIRMATION_REMINDER_KEY, {})
  const lastSentAt = reminders[normalized]
  if (!lastSentAt) return true

  const diff = Date.now() - new Date(lastSentAt).getTime()
  return diff >= 6 * 60 * 60 * 1000
}

function markConfirmationReminderSent(email) {
  const normalized = String(email || '').trim().toLowerCase()
  if (!normalized) return

  const reminders = load(CONFIRMATION_REMINDER_KEY, {})
  reminders[normalized] = new Date().toISOString()
  save(CONFIRMATION_REMINDER_KEY, reminders)
}

function getGuestPushToken() {
  if (typeof window === 'undefined') return ''

  const existing = window.localStorage.getItem(LS.guestPushToken)
  if (existing) return existing

  const nextToken = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `guest-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`

  window.localStorage.setItem(LS.guestPushToken, nextToken)
  return nextToken
}

function getLocalSnapshot(scope = GUEST_SCOPE) {
  const keys = getStorageKeys(scope)
  return {
    reader: load(keys.reader, null),
    bookmarks: load(keys.bookmarks, []),
    history: load(keys.history, []),
    preferences: load(keys.prefs, DEFAULT_PREFS),
    gamification: load(keys.gamification, null),
    notifications: load(keys.notifications, { enabled: false, lastCheck: null }),
  }
}

function buildReaderProfile(sessionUser, profile) {
  if (!sessionUser) return null
  return {
    id: sessionUser.id,
    name: profile?.username || sessionUser.user_metadata?.display_name || sessionUser.email?.split('@')[0] || 'Tifoso',
    email: sessionUser.email || '',
    avatarUrl: profile?.avatar_url || null,
    bio: profile?.bio || '',
    role: profile?.role || sessionUser.user_metadata?.role || 'author',
    createdAt: profile?.created_at || sessionUser.created_at || new Date().toISOString(),
  }
}

function persistGamificationSnapshot(snapshot, scope = GUEST_SCOPE) {
  if (!snapshot) return
  save(getStorageKeys(scope).gamification, snapshot)
}

export function ReaderProvider({ children }) {
  const localSnapshot = useMemo(() => getLocalSnapshot(), [])
  const guestPushToken = useMemo(() => getGuestPushToken(), [])
  const [reader, setReader] = useState(() => localSnapshot.reader)
  const [bookmarks, setBookmarks] = useState(() => localSnapshot.bookmarks)
  const [history, setHistory] = useState(() => localSnapshot.history)
  const [preferences, setPreferences] = useState(() => localSnapshot.preferences)
  const [notifications, setNotifications] = useState(() => localSnapshot.notifications)
  const [showLoginDialog, setShowLoginDialog] = useState(false)
  const [loginDialogMode, setLoginDialogMode] = useState('register')
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(false)
  const [authUser, setAuthUser] = useState(null)
  const [authReady, setAuthReady] = useState(IS_MOCK)
  const storageScope = authUser?.id || GUEST_SCOPE
  const storageKeys = useMemo(() => getStorageKeys(storageScope), [storageScope])

  useEffect(() => {
    setGamificationScope(storageScope)
  }, [storageScope])

  useEffect(() => { save(storageKeys.bookmarks, bookmarks) }, [bookmarks, storageKeys.bookmarks])
  useEffect(() => { save(storageKeys.history, history) }, [history, storageKeys.history])
  useEffect(() => { save(storageKeys.prefs, preferences) }, [preferences, storageKeys.prefs])
  useEffect(() => { save(storageKeys.notifications, notifications) }, [notifications, storageKeys.notifications])
  useEffect(() => {
    if (reader) save(storageKeys.reader, reader)
    else remove(storageKeys.reader)
  }, [reader, storageKeys.reader])

  const applySnapshot = useCallback((snapshot, nextReader) => {
    setReader(nextReader || snapshot.reader || null)
    setBookmarks(snapshot.bookmarks || [])
    setHistory(snapshot.history || [])
    setPreferences(snapshot.preferences || DEFAULT_PREFS)
    setNotifications(snapshot.notifications || { enabled: false, lastCheck: null })
    persistGamificationSnapshot(snapshot.gamification || getGamificationState(), storageScope)
  }, [storageScope])

  const syncRemoteState = useCallback(async (sessionUser, overrides = {}) => {
    if (!sessionUser?.id || IS_MOCK) return

    const payload = {
      bookmarks: overrides.bookmarks ?? bookmarks,
      history: overrides.history ?? history,
      preferences: overrides.preferences ?? preferences,
      gamification: overrides.gamification ?? getGamificationState(),
      notifications_enabled: overrides.notificationsEnabled ?? notifications.enabled,
      last_synced_at: new Date().toISOString(),
    }

    try {
      await upsertReaderState(sessionUser.id, payload)
    } catch {
      // Reader sync should never block the experience.
    }
  }, [bookmarks, history, notifications.enabled, preferences])

  useEffect(() => {
    if (IS_MOCK) return undefined

    let active = true

    const hydrateFromSession = async (sessionUser, authEvent = null) => {
      if (!active) return
      setAuthUser(sessionUser ?? null)
      setIsPasswordRecovery(authEvent === 'PASSWORD_RECOVERY')

      if (authEvent === 'PASSWORD_RECOVERY') {
        setLoginDialogMode('recovery')
        setShowLoginDialog(true)
      }

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

      let refreshedProfile = pendingName
        ? { ...(profile || {}), username: pendingName.trim() }
        : profile

      if (!refreshedProfile) {
        const fallbackUsername = pendingName?.trim()
          || sessionUser.user_metadata?.display_name
          || sessionUser.email?.split('@')[0]
          || 'Tifoso'

        const { data: ensuredProfile } = await ensureProfileData(sessionUser.id, {
          username: fallbackUsername,
          bio: '',
          role: 'author',
        })

        refreshedProfile = ensuredProfile || {
          id: sessionUser.id,
          username: fallbackUsername,
          bio: '',
          role: 'author',
        }
      }

      const local = getLocalSnapshot(sessionUser.id)
      const snapshot = {
        bookmarks: remoteState?.bookmarks ?? local.bookmarks,
        history: remoteState?.history ?? local.history,
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

    const { data: { subscription } } = onAuthStateChange((event, session) => {
      hydrateFromSession(session?.user ?? null, event)
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
  }, [authUser, authReady, bookmarks, history, notifications.enabled, preferences, reader?.id, syncRemoteState])

  const ensureWelcomeNotification = useCallback(async (userId, name) => {
    if (!userId || IS_MOCK) return

    try {
      const { data } = await getReaderNotifications(userId, { limit: 10 })
      const hasWelcome = (data || []).some((item) => item.type === 'welcome')
      if (hasWelcome) return

      await createReaderNotification(userId, {
        type: 'welcome',
        title: `Benvenuto in Area Bianconera${name ? `, ${name}` : ''}`,
        body: 'Hai il tuo spazio personale nel magazine: segnalibri, pronostici, badge e adesso anche notifiche dedicate.',
        url: '/area-bianconera',
        metadata: { source: 'reader-onboarding' },
      })
    } catch {
      // Welcome notification should not block login/signup.
    }
  }, [])

  const enableNotifications = useCallback(async ({ userId = authUser?.id, prompt = true, silent = false } = {}) => {
    const targetUserId = userId || null
    const targetGuestToken = targetUserId ? null : guestPushToken

    const support = getPushSupportStatus()

    if (!support.supported) {
      if (silent) return { enabled: false, reason: 'unsupported' }
      throw new Error(getPushUnsupportedMessage(support.reason))
    }

    if (!pushNotificationsConfigured) {
      if (silent) return { enabled: false, reason: 'not-configured' }
      throw new Error('Configurazione notifiche incompleta: chiave VAPID pubblica mancante.')
    }

    let permission = typeof Notification !== 'undefined' ? Notification.permission : 'default'

    if (prompt && permission === 'default') {
      permission = await Notification.requestPermission()
    }

    if (permission !== 'granted') {
      return { enabled: false, reason: permission }
    }

    const subscription = await subscribeToPush(vapidPublicKey)
    const result = await upsertPushSubscription({
      userId: targetUserId,
      guestToken: targetGuestToken,
      subscription,
    })
    if (result.error) throw result.error

    const nextNotifications = { enabled: true, lastCheck: new Date().toISOString() }
    setNotifications(nextNotifications)
    if (targetUserId) {
      await syncRemoteState({ id: targetUserId }, { notificationsEnabled: true })
    }

    return { enabled: true, reason: 'granted' }
  }, [authUser?.id, guestPushToken, syncRemoteState, vapidPublicKey])

  const primeNotificationPermission = useCallback(async () => {
    const support = getPushSupportStatus()

    if (!support.supported || !pushNotificationsConfigured || typeof Notification === 'undefined') {
      return { permission: 'unsupported', reason: support.reason || 'unsupported' }
    }

    let permission = Notification.permission

    if (permission === 'default') {
      permission = await Notification.requestPermission()
    }

    return { permission, reason: permission }
  }, [])

  useEffect(() => {
    if (!authReady || !authUser?.id || IS_MOCK || notifications.enabled) return
    if (!pushNotificationsConfigured || !isPushSupported()) return
    if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return

    enableNotifications({ userId: authUser.id, prompt: false, silent: true }).catch(() => {})
  }, [authReady, authUser?.id, enableNotifications, notifications.enabled])

  const disableNotifications = useCallback(async ({ userId = authUser?.id } = {}) => {
    const targetUserId = userId || null
    const targetGuestToken = targetUserId ? null : guestPushToken

    const subscription = await getCurrentPushSubscription()
    if (subscription?.endpoint) {
      await deletePushSubscription({
        userId: targetUserId,
        guestToken: targetGuestToken,
        endpoint: subscription.endpoint,
      })
    }

    await unsubscribeFromPush()
    const nextNotifications = { enabled: false, lastCheck: null }
    setNotifications(nextNotifications)
    if (targetUserId) {
      await syncRemoteState({ id: targetUserId }, { notificationsEnabled: false })
    }

    return { enabled: false }
  }, [authUser?.id, guestPushToken, syncRemoteState])

  const register = useCallback(async (name, email, password) => {
    if (IS_MOCK) {
      const profile = { name, email, createdAt: new Date().toISOString() }
      save(getStorageKeys().reader, profile)
      setReader(profile)
      setShowLoginDialog(false)
      return { mode: 'demo' }
    }

    save(LS.pendingName, name)
    const { data, error } = await signUpReader(email, password, {
      data: { display_name: name, role: 'author' },
    })
    if (error) throw error
    if (data?.user?.id) {
      ensureWelcomeNotification(data.user.id, name)
    }
    if (data?.session?.user?.id) {
      await enableNotifications({ userId: data.session.user.id, prompt: true, silent: true })
    }
    return { mode: data?.session ? 'success' : 'confirm-email' }
  }, [enableNotifications, ensureWelcomeNotification])

  const login = useCallback(async ({ email, password }) => {
    if (IS_MOCK) {
      const existing = load(getStorageKeys().reader, null)
      if (existing && existing.email === email) {
        setReader(existing)
        setShowLoginDialog(false)
        return { mode: 'demo' }
      }

      const profile = { name: email.split('@')[0], email, createdAt: new Date().toISOString() }
      save(getStorageKeys().reader, profile)
      setReader(profile)
      setShowLoginDialog(false)
      return { mode: 'demo' }
    }

    const { data, error } = await signIn(email, password)
    if (error) {
      const normalized = String(error?.message || '').toLowerCase()
      if (normalized.includes('email not confirmed') && shouldSendConfirmationReminder(email)) {
        const { error: resendError } = await resendReaderConfirmation(email.trim())
        if (!resendError) {
          markConfirmationReminderSent(email)
          const reminderError = new Error('email-not-confirmed-reminder-sent')
          reminderError.original = error
          throw reminderError
        }
      }
      throw error
    }
    if (data?.user?.id || data?.session?.user?.id) {
      const userId = data?.user?.id || data?.session?.user?.id
      await ensureWelcomeNotification(userId, email.split('@')[0])
      await enableNotifications({ userId, prompt: true, silent: true })
    }
    return { mode: 'success' }
  }, [enableNotifications, ensureWelcomeNotification])

  const resendConfirmationEmail = useCallback(async (email) => {
    const normalizedEmail = String(email || '').trim()
    if (!normalizedEmail) {
      throw new Error('Inserisci prima la tua email.')
    }

    const { error } = await resendReaderConfirmation(normalizedEmail)
    if (error) throw error
    markConfirmationReminderSent(normalizedEmail)
    return { mode: 'confirmation-resent' }
  }, [])

  const sendPasswordReset = useCallback(async (email) => {
    const normalizedEmail = String(email || '').trim()
    if (!normalizedEmail) {
      throw new Error('Inserisci prima la tua email.')
    }

    const { error } = await resetReaderPassword(normalizedEmail)
    if (error) throw error
    return { mode: 'reset-email' }
  }, [])

  const completePasswordReset = useCallback(async (password) => {
    const nextPassword = String(password || '').trim()
    if (nextPassword.length < 6) {
      throw new Error('La password deve contenere almeno 6 caratteri.')
    }

    const { error } = await updateReaderPassword(nextPassword)
    if (error) throw error

    setIsPasswordRecovery(false)
    return { mode: 'password-updated' }
  }, [])

  const logout = useCallback(async () => {
    if (!IS_MOCK && authUser?.id) {
      await signOut()
    }

    setReader(null)
    setBookmarks([])
    setHistory([])
    setPreferences(DEFAULT_PREFS)
    setNotifications({ enabled: false, lastCheck: null })

    remove(storageKeys.reader)
    remove(storageKeys.bookmarks)
    remove(storageKeys.history)
    remove(storageKeys.prefs)
    remove(storageKeys.gamification)
    remove(storageKeys.notifications)
  }, [authUser, storageKeys])

  const updateProfile = useCallback(async ({ name, bio }) => {
    const nextName = String(name || '').trim()
    const nextBio = String(bio || '').trim()

    if (!nextName) {
      throw new Error('Il nome profilo non puo essere vuoto.')
    }

    if (IS_MOCK) {
      setReader((prev) => {
        const nextReader = { ...(prev || {}), name: nextName, bio: nextBio }
        save(storageKeys.reader, nextReader)
        return nextReader
      })
      return { data: { username: nextName, bio: nextBio }, error: null }
    }

    if (!authUser?.id) {
      throw new Error('Devi essere autenticato per aggiornare il profilo.')
    }

    const result = await updateProfileData(authUser.id, {
      username: nextName,
      bio: nextBio,
    })

    if (result.error) throw result.error

    setReader((prev) => {
      const nextReader = { ...(prev || {}), name: nextName, bio: nextBio }
      save(storageKeys.reader, nextReader)
      return nextReader
    })

    return result
  }, [authUser, storageKeys.reader])

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
    setNotifications({ enabled: false, lastCheck: null })
    remove(storageKeys.reader)
    remove(storageKeys.bookmarks)
    remove(storageKeys.history)
    remove(storageKeys.prefs)
    remove(storageKeys.gamification)
    remove(storageKeys.notifications)
  }, [storageKeys])

  const isBookmarked = useCallback((articleId) => bookmarks.some((b) => b.articleId === articleId), [bookmarks])

  const toggleBookmark = useCallback((article) => {
    const alreadySaved = bookmarks.some((bookmark) => bookmark.articleId === article.id)

    const nextBookmarks = alreadySaved
      ? bookmarks.filter((bookmark) => bookmark.articleId !== article.id)
      : [{
          articleId: article.id,
          slug: article.slug,
          title: article.title,
          coverImage: article.cover_image,
          categoryName: article.categories?.name || '',
          savedAt: new Date().toISOString(),
        }, ...bookmarks]

    if (!alreadySaved) {
      addXP(XP_ACTIONS.bookmark, 'bookmark')
      updateWeeklyProgress('bookmarks')
    }

    setBookmarks(nextBookmarks)
    save(storageKeys.bookmarks, nextBookmarks)

    if (authUser?.id && !IS_MOCK) {
      syncRemoteState(authUser, { bookmarks: nextBookmarks }).catch(() => {})
    }
  }, [authUser, bookmarks, storageKeys.bookmarks, syncRemoteState])

  const clearBookmarks = useCallback(() => {
    setBookmarks([])
    save(storageKeys.bookmarks, [])
    if (authUser?.id && !IS_MOCK) {
      syncRemoteState(authUser, { bookmarks: [] }).catch(() => {})
    }
  }, [authUser, storageKeys.bookmarks, syncRemoteState])

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

  const setTimeZonePreference = useCallback((timeZone) => {
    setPreferences((prev) => ({ ...prev, timeZone: timeZone || 'auto' }))
  }, [])

  const openLogin = useCallback((mode = 'register') => {
    if (mode === 'recovery') {
      setLoginDialogMode('recovery')
    } else {
      setLoginDialogMode(mode === 'login' ? 'login' : 'register')
    }
    setShowLoginDialog(true)
  }, [])
  const closeLogin = useCallback(() => {
    setShowLoginDialog(false)
    if (!isPasswordRecovery) {
      setLoginDialogMode('register')
    }
  }, [isPasswordRecovery])

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
      notifications,
      guestPushToken,
      showLoginDialog,
      loginDialogMode,
      stats,
      authUser,
      isAuthenticated: Boolean(authUser?.id),
      authReady,
      isPasswordRecovery,
      register,
      login,
      resendConfirmationEmail,
      sendPasswordReset,
      completePasswordReset,
      loginDemo,
      logout,
      updateProfile,
      deleteAccount,
      toggleBookmark,
      isBookmarked,
      clearBookmarks,
      addToHistory,
      clearHistory,
      setFavoriteCategories,
      setTimeZonePreference,
      enableNotifications,
      primeNotificationPermission,
      disableNotifications,
      openLogin,
      closeLogin,
      syncRemoteState: (overrides) => syncRemoteState(authUser, overrides),
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
