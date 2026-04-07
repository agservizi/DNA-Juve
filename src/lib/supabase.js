import { createClient } from '@supabase/supabase-js'
import { createMockClient } from './mockClient'
import { slugify } from './utils'
import { buildFanArticlePlaceholder, deriveFanArticleTags } from './fanArticles'
import { getRecentFinishedMatches, JUVE_ID } from './footballApi'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://your-project.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'your-anon-key'
const configuredSiteUrl = (import.meta.env.VITE_SITE_URL || '').trim().replace(/\/+$/, '')
const defaultSiteUrl = 'https://bianconerihub.com'
export const vapidPublicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY || ''
export const pushNotificationsConfigured = Boolean(vapidPublicKey)
const IS_MOCK = supabaseUrl.includes('your-project.supabase.co')
let readerStateSupported = true
let profileRoleSupported = true
let matchPollSupported = true

const MATCH_POLL_WINDOW_MS = 48 * 60 * 60 * 1000
const LOCAL_MATCH_POLL_PREFIX = 'post-match-poll'
const DEFAULT_MATCH_POLL_OPTIONS = [
  'Molto positivo',
  'Segnali incoraggianti',
  'Prestazione da rivedere',
  'Delusione totale',
]

export const supabase = IS_MOCK ? createMockClient() : createClient(supabaseUrl, supabaseAnonKey)

function isMissingColumnOrRelation(error, token) {
  const message = String(error?.message || '').toLowerCase()
  const details = String(error?.details || '').toLowerCase()
  const hint = String(error?.hint || '').toLowerCase()
  const combined = `${message} ${details} ${hint}`

  return (
    error?.code === 'PGRST205' ||
    error?.code === '42703' ||
    error?.status === 404 ||
    combined.includes('could not find') ||
    combined.includes('schema cache') ||
    combined.includes('does not exist') ||
    combined.includes('relation') ||
    combined.includes('column') ||
    combined.includes(String(token || '').toLowerCase())
  )
}

function getReaderAuthRedirectUrl() {
  if (typeof window === 'undefined') {
    return `${configuredSiteUrl || defaultSiteUrl}/area-bianconera`
  }

  const runtimeOrigin = window.location.origin.replace(/\/+$/, '')
  const isLocalRuntime = ['localhost', '127.0.0.1'].includes(window.location.hostname)
  const baseUrl = isLocalRuntime ? runtimeOrigin : (configuredSiteUrl || runtimeOrigin || defaultSiteUrl)

  return `${baseUrl}/area-bianconera`
}

function getLatestFinishedJuveMatch(matches = []) {
  return matches
    .filter((match) => match?.status === 'FINISHED' && match?.utcDate)
    .slice()
    .sort((a, b) => new Date(b.utcDate) - new Date(a.utcDate))[0] || null
}

function isMatchPollStillActive(match) {
  if (!match?.utcDate) return false
  const kickoff = new Date(match.utcDate).getTime()
  if (Number.isNaN(kickoff)) return false
  return Date.now() - kickoff <= MATCH_POLL_WINDOW_MS
}

function getPostMatchOpponent(match) {
  if (!match) return 'l’avversario'
  const isJuveHome = match.homeTeam?.id === JUVE_ID
  const opponent = isJuveHome ? match.awayTeam : match.homeTeam
  return opponent?.shortName || opponent?.name || 'l’avversario'
}

function getPostMatchQuestion(match) {
  return `Che giudizio dai alla Juve dopo ${getPostMatchOpponent(match)}?`
}

function getPostMatchLabel(match) {
  const home = match?.homeTeam?.shortName || match?.homeTeam?.name || 'Casa'
  const away = match?.awayTeam?.shortName || match?.awayTeam?.name || 'Ospite'
  const homeGoals = match?.score?.fullTime?.home
  const awayGoals = match?.score?.fullTime?.away
  const score = homeGoals != null && awayGoals != null ? ` ${homeGoals}-${awayGoals}` : ''
  return `${home}${score} ${away}`.trim()
}

function getLocalMatchPollStorageKey(matchId, userId = 'guest') {
  return `${LOCAL_MATCH_POLL_PREFIX}:${matchId}:${userId || 'guest'}`
}

function readLocalMatchPollVote(matchId, userId = null) {
  if (typeof window === 'undefined') return null

  try {
    return window.localStorage.getItem(getLocalMatchPollStorageKey(matchId, userId || 'guest'))
  } catch {
    return null
  }
}

function writeLocalMatchPollVote(matchId, userId = null, optionId) {
  if (typeof window === 'undefined') return

  try {
    window.localStorage.setItem(getLocalMatchPollStorageKey(matchId, userId || 'guest'), optionId)
  } catch {
    // Ignore localStorage failures and keep the widget usable.
  }
}

function buildLocalPostMatchPoll(match, userId = null) {
  const matchId = String(match?.id || 'latest')
  const currentVote = readLocalMatchPollVote(matchId, userId)
  const totalVotes = currentVote ? 1 : 0

  return {
    kind: 'post-match',
    source: 'local',
    id: `local-${matchId}`,
    matchId,
    question: getPostMatchQuestion(match),
    is_active: true,
    totalVotes,
    currentVote,
    competitionName: match?.competition?.name || 'Post partita',
    articleCategory: {
      name: 'Post partita',
      color: '#C7A14A',
    },
    articleTitle: getPostMatchLabel(match),
    articleSlug: null,
    url: '/calendario',
    ctaLabel: 'Apri il calendario',
    expiresAt: new Date(new Date(match.utcDate).getTime() + MATCH_POLL_WINDOW_MS).toISOString(),
    options: DEFAULT_MATCH_POLL_OPTIONS.map((label, index) => {
      const optionId = `local-${matchId}-${index}`
      return {
        id: optionId,
        label,
        position: index,
        votes: currentVote === optionId ? 1 : 0,
      }
    }),
  }
}

async function resolveActivePostMatch(match, userId = null) {
  if (!matchPollSupported) {
    return { data: buildLocalPostMatchPoll(match, userId), error: null }
  }

  const baseSelect = `
    id,
    match_id,
    question,
    is_active,
    competition_name,
    home_team,
    away_team,
    kickoff_at,
    expires_at,
    match_poll_options(id, label, position)
  `

  const fetchPoll = async () =>
    supabase
      .from('match_polls')
      .select(baseSelect)
      .eq('match_id', String(match.id))
      .maybeSingle()

  let { data: poll, error: pollError } = await fetchPoll()

  if (pollError && isMissingColumnOrRelation(pollError, 'match_polls')) {
    matchPollSupported = false
    return { data: buildLocalPostMatchPoll(match, userId), error: null }
  }

  if (pollError) return { data: null, error: pollError }

  if (!poll && userId) {
    const expiresAt = new Date(new Date(match.utcDate).getTime() + MATCH_POLL_WINDOW_MS).toISOString()
    const createPayload = {
      match_id: String(match.id),
      question: getPostMatchQuestion(match),
      competition_name: match?.competition?.name || null,
      home_team: match?.homeTeam?.shortName || match?.homeTeam?.name || 'Juventus',
      away_team: match?.awayTeam?.shortName || match?.awayTeam?.name || getPostMatchOpponent(match),
      kickoff_at: match.utcDate,
      expires_at: expiresAt,
      is_active: true,
    }

    const { data: createdPoll, error: createPollError } = await supabase
      .from('match_polls')
      .upsert([createPayload], { onConflict: 'match_id' })
      .select('id')
      .maybeSingle()

    if (createPollError && isMissingColumnOrRelation(createPollError, 'match_polls')) {
      matchPollSupported = false
      return { data: buildLocalPostMatchPoll(match, userId), error: null }
    }

    if (createPollError) {
      return { data: buildLocalPostMatchPoll(match, userId), error: null }
    }

    if (createdPoll?.id) {
      const { data: existingOptions, error: optionsError } = await supabase
        .from('match_poll_options')
        .select('id')
        .eq('poll_id', createdPoll.id)

      if (optionsError && isMissingColumnOrRelation(optionsError, 'match_poll_options')) {
        matchPollSupported = false
        return { data: buildLocalPostMatchPoll(match, userId), error: null }
      }

      if (!optionsError && (!existingOptions || existingOptions.length === 0)) {
        await supabase.from('match_poll_options').insert(
          DEFAULT_MATCH_POLL_OPTIONS.map((label, index) => ({
            poll_id: createdPoll.id,
            label,
            position: index,
          }))
        )
      }
    }

    const refetched = await fetchPoll()
    poll = refetched.data
    pollError = refetched.error
  }

  if (pollError) return { data: null, error: pollError }
  if (!poll) return { data: buildLocalPostMatchPoll(match, userId), error: null }

  const { data: votes, error: votesError } = await supabase
    .from('match_poll_votes')
    .select('option_id, user_id')
    .eq('poll_id', poll.id)

  if (votesError && isMissingColumnOrRelation(votesError, 'match_poll_votes')) {
    matchPollSupported = false
    return { data: buildLocalPostMatchPoll(match, userId), error: null }
  }

  if (votesError) return { data: null, error: votesError }

  const voteCounts = (votes || []).reduce((acc, vote) => {
    acc[vote.option_id] = (acc[vote.option_id] || 0) + 1
    return acc
  }, {})

  const totalVotes = Object.values(voteCounts).reduce((sum, count) => sum + count, 0)
  const currentVote = userId
    ? (votes || []).find((vote) => vote.user_id === userId)?.option_id || null
    : null

  return {
    data: {
      kind: 'post-match',
      source: 'remote',
      id: poll.id,
      matchId: String(match.id),
      question: poll.question,
      is_active: poll.is_active,
      totalVotes,
      currentVote,
      competitionName: poll.competition_name || match?.competition?.name || 'Post partita',
      articleCategory: {
        name: 'Post partita',
        color: '#C7A14A',
      },
      articleTitle: getPostMatchLabel(match),
      articleSlug: null,
      url: '/calendario',
      ctaLabel: 'Apri il calendario',
      expiresAt: poll.expires_at,
      options: (poll.match_poll_options || [])
        .slice()
        .sort((a, b) => a.position - b.position)
        .map((option) => ({
          id: option.id,
          label: option.label,
          position: option.position,
          votes: voteCounts[option.id] || 0,
        })),
    },
    error: null,
  }
}

// ─── AUTH ────────────────────────────────────────────────────────────────────
export const signIn = (email, password) =>
  supabase.auth.signInWithPassword({ email, password })

export const signUpReader = (email, password, options = {}) =>
  supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: getReaderAuthRedirectUrl(),
      data: options.data || {},
    },
  })

export const resendReaderConfirmation = (email, options = {}) =>
  supabase.auth.resend({
    type: 'signup',
    email,
    options: {
      emailRedirectTo: getReaderAuthRedirectUrl(),
      ...options,
    },
  })

export const resetReaderPassword = (email) =>
  supabase.auth.resetPasswordForEmail(email, {
    redirectTo: getReaderAuthRedirectUrl(),
  })

export const updateReaderPassword = (password) =>
  supabase.auth.updateUser({ password })

export const signInWithMagicLink = (email, options = {}) =>
  supabase.auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: options.shouldCreateUser ?? true,
      emailRedirectTo: getReaderAuthRedirectUrl(),
      data: options.data || {},
    },
  })

export const signOut = async () => {
  const result = await supabase.auth.signOut({ scope: 'local' })

  // Some environments can still refuse the logout request; the app only needs
  // the local session cleared, so avoid surfacing a noisy console/runtime error.
  if (result?.error?.status === 403) {
    return { error: null }
  }

  return result
}

export const getSession = () => supabase.auth.getSession()

export const onAuthStateChange = (callback) =>
  supabase.auth.onAuthStateChange(callback)

export const getProfileByUserId = async (userId) => {
  if (!userId) return { data: null, error: null }

  if (profileRoleSupported) {
    const roleProbe = await supabase
      .from('profiles')
      .select('id, username, avatar_url, bio, role, created_at, updated_at')
      .eq('id', userId)
      .single()

    if (!roleProbe.error) return roleProbe

    if (!isMissingColumnOrRelation(roleProbe.error, 'role')) {
      return roleProbe
    }

    profileRoleSupported = false
  }

  const fallback = await supabase
    .from('profiles')
    .select('id, username, avatar_url, bio, created_at, updated_at')
    .eq('id', userId)
    .single()

  if (fallback.error) return fallback
  return { data: { ...fallback.data, role: null }, error: null }
}

export const updateProfileData = async (userId, data) =>
  supabase
    .from('profiles')
    .update(data)
    .eq('id', userId)
    .select()
    .single()

export const ensureProfileData = async (userId, data = {}) => {
  if (!userId) return { data: null, error: null }

  return supabase
    .from('profiles')
    .upsert([{ id: userId, ...data }], { onConflict: 'id' })
    .select()
    .single()
}

export const getReaderState = async (userId) => {
  if (!userId) return { data: null, error: null }
  if (!readerStateSupported) return { data: null, error: null }

  const { data, error } = await supabase
    .from('reader_states')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle()

  if (error && isMissingColumnOrRelation(error, 'reader_states')) {
    readerStateSupported = false
    return { data: null, error: null }
  }

  const message = String(error?.message || '').toLowerCase()
  if (error && (error.code === 'PGRST116' || error.status === 406 || message.includes('no rows'))) {
    return { data: null, error: null }
  }

  return { data, error }
}

export const upsertReaderState = async (userId, payload) => {
  if (!readerStateSupported) return { data: null, error: null }

  const result = await supabase
    .from('reader_states')
    .upsert([{ user_id: userId, ...payload }], { onConflict: 'user_id' })
    .select()
    .single()

  if (result.error && isMissingColumnOrRelation(result.error, 'reader_states')) {
    readerStateSupported = false
    return { data: null, error: null }
  }

  return result
}

// ─── PUSH NOTIFICATIONS ─────────────────────────────────────────────────────
export const getPushSubscriptionsByUserId = (userId) => {
  if (!userId) return Promise.resolve({ data: [], error: null })

  return supabase
    .from('push_subscriptions')
    .select('id, endpoint, is_active, created_at, updated_at, last_success_at, last_error')
    .eq('user_id', userId)
    .eq('is_active', true)
    .order('created_at', { ascending: false })
}

export const upsertPushSubscription = async (userId, subscription, metadata = {}) => {
  if (!userId || !subscription?.endpoint) {
    return { data: null, error: new Error('Subscription push non valida.') }
  }

  const json = typeof subscription.toJSON === 'function' ? subscription.toJSON() : subscription
  const keys = json?.keys || {}

  return supabase
    .from('push_subscriptions')
    .upsert([{
      user_id: userId,
      endpoint: json.endpoint,
      subscription: json,
      p256dh: keys.p256dh || '',
      auth: keys.auth || '',
      user_agent: metadata.userAgent || (typeof navigator !== 'undefined' ? navigator.userAgent : null),
      is_active: true,
      last_seen_at: new Date().toISOString(),
      last_error: null,
    }], { onConflict: 'endpoint' })
    .select()
    .single()
}

export const deletePushSubscription = (userId, endpoint) =>
  supabase
    .from('push_subscriptions')
    .delete()
    .eq('user_id', userId)
    .eq('endpoint', endpoint)

export const getReaderNotifications = (userId, { limit = 20, unreadOnly = false } = {}) => {
  if (!userId) return Promise.resolve({ data: [], error: null })

  let query = supabase
    .from('reader_notifications')
    .select('id, type, title, body, url, metadata, is_read, read_at, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (unreadOnly) {
    query = query.eq('is_read', false)
  }

  return query
}

export const createReaderNotification = (userId, notification) =>
  supabase
    .from('reader_notifications')
    .insert([{
      user_id: userId,
      type: notification.type || 'system',
      title: notification.title,
      body: notification.body || null,
      url: notification.url || null,
      metadata: notification.metadata || {},
    }])
    .select()
    .single()

export const markReaderNotificationRead = (userId, notificationId) =>
  supabase
    .from('reader_notifications')
    .update({
      is_read: true,
      read_at: new Date().toISOString(),
    })
    .eq('user_id', userId)
    .eq('id', notificationId)
    .select()
    .single()

export const markAllReaderNotificationsRead = (userId) =>
  supabase
    .from('reader_notifications')
    .update({
      is_read: true,
      read_at: new Date().toISOString(),
    })
    .eq('user_id', userId)
    .eq('is_read', false)

export const getAuthorFollowMeta = async (authorId, userId = null) => {
  if (!authorId) {
    return { data: { isFollowing: false, followersCount: 0 }, error: null }
  }

  const countPromise = supabase
    .from('author_follows')
    .select('user_id', { count: 'exact', head: true })
    .eq('author_id', authorId)

  const followPromise = userId
    ? supabase
        .from('author_follows')
        .select('author_id')
        .eq('author_id', authorId)
        .eq('user_id', userId)
        .maybeSingle()
    : Promise.resolve({ data: null, error: null })

  const [countResult, followResult] = await Promise.all([countPromise, followPromise])
  const error = countResult.error || followResult.error

  if (error) {
    return { data: null, error }
  }

  return {
    data: {
      isFollowing: Boolean(followResult.data),
      followersCount: countResult.count || 0,
    },
    error: null,
  }
}

export const followAuthor = (userId, authorId) =>
  supabase
    .from('author_follows')
    .upsert([{ user_id: userId, author_id: authorId }], { onConflict: 'user_id,author_id' })
    .select()
    .single()

export const unfollowAuthor = (userId, authorId) =>
  supabase
    .from('author_follows')
    .delete()
    .eq('user_id', userId)
    .eq('author_id', authorId)

export const getFollowedAuthors = (userId) => {
  if (!userId) return Promise.resolve({ data: [], error: null })

  return supabase
    .from('author_follows')
    .select(`
      author_id,
      created_at,
      profiles:author_id (
        id,
        username,
        avatar_url,
        author_signature,
        specialties
      )
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
}

export const invokePushNotifications = async (payload) => {
  const { data: { session } } = await supabase.auth.getSession()
  const response = await fetch(`${supabaseUrl}/functions/v1/push-notifications`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: supabaseAnonKey,
      Authorization: `Bearer ${session?.access_token || ''}`,
    },
    body: JSON.stringify(payload),
  })

  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    return { data: null, error: new Error(data?.error || 'Invio notifiche non riuscito.') }
  }

  return { data, error: null }
}

export const sendTestPushNotification = () =>
  invokePushNotifications({ action: 'send-test' })

export const sendArticlePushNotification = ({ article }) =>
  invokePushNotifications({ action: 'send-article', article })

export const sendFanSubmissionAdminNotification = ({ submissionId }) =>
  invokePushNotifications({ action: 'send-fan-submission', submissionId })

export const sendReaderEventNotification = ({
  userId,
  userEmail,
  type = 'system',
  title,
  body = '',
  url = '/area-bianconera',
  metadata = {},
}) =>
  invokePushNotifications({
    action: 'send-reader-event',
    userId,
    userEmail,
    type,
    title,
    body,
    url,
    metadata,
  })

export const invokeAdminAuthors = async (payload = {}) => {
  const call = async (accessToken) => {
    const response = await fetch(`${supabaseUrl}/functions/v1/admin-authors`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
        apikey: supabaseAnonKey,
      },
      body: JSON.stringify(payload),
    })

    const data = await response.json().catch(() => ({}))
    return { response, data }
  }

  let { data: { session } } = await supabase.auth.getSession()

  if (!session?.access_token) {
    return { data: null, error: new Error('Sessione admin non pronta.') }
  }

  let { response, data } = await call(session.access_token)

  if (response.status === 401) {
    const { data: refreshed, error: refreshError } = await supabase.auth.refreshSession()
    const nextToken = refreshed?.session?.access_token

    if (!refreshError && nextToken) {
      const retry = await call(nextToken)
      response = retry.response
      data = retry.data
    }
  }

  if (!response.ok) {
    return { data: null, error: new Error(data?.error || 'Gestione redattori non disponibile.') }
  }

  return { data, error: null }
}

export const getAdminAuthors = async () =>
  invokeAdminAuthors({ action: 'list' })

export const getLegacyAdminAuthors = async () => {
  const { data, error } = await supabase
    .from('profiles')
    .select(`
      id,
      username,
      avatar_url,
      bio,
      role,
      created_at,
      updated_at,
      articles (
        id,
        title,
        slug,
        status,
        created_at,
        updated_at,
        published_at
      )
    `)
    .order('updated_at', { ascending: false })

  if (error) return { data: null, error }
  return { data: (data || []).map((entry) => ({ ...entry, email: null })), error: null }
}

export const inviteAdminAuthor = async ({ email, role = 'author' }) => {
  const { data, error } = await supabase.functions.invoke('admin-invite', {
    body: { email, role },
  })

  if (error) return { data: null, error }
  return { data, error: null }
}

export const updateAdminAuthorRole = async ({ userId, role }) =>
  invokeAdminAuthors({ action: 'update-role', userId, role })

export const resendAdminAuthorInvite = async ({ email, role }) =>
  invokeAdminAuthors({ action: 'resend-invite', email, role })

export const sendAdminAuthorReset = async ({ email }) =>
  invokeAdminAuthors({ action: 'send-reset', email })

export const deleteAdminAuthor = async ({ userId }) => {
  const { data, error } = await supabase.functions.invoke('admin-delete-user', {
    body: { userId },
  })

  if (error) return { data: null, error }
  return { data, error: null }
}

export const getReaderLeaderboard = async ({ limit = 10 } = {}) => {
  const { data: { session } } = await supabase.auth.getSession()
  const response = await fetch(`${supabaseUrl}/functions/v1/reader-leaderboard?limit=${limit}`, {
    headers: {
      apikey: supabaseAnonKey,
      ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
    },
  })

  const data = await response.json().catch(() => ({}))
  if (response.status === 401) {
    return { data: [], error: null }
  }
  if (!response.ok) {
    return { data: null, error: new Error(data?.error || 'Classifica lettori non disponibile.') }
  }

  return { data: data?.entries || [], error: null }
}

// ─── ARTICLES ────────────────────────────────────────────────────────────────
export const getPublishedArticles = async ({ page = 1, limit = 12, category = null } = {}) => {
  let query = supabase
    .from('articles')
    .select(`
      id, title, slug, excerpt, content, cover_image, published_at, views, featured,
      categories(id, name, slug, color),
      profiles(username, avatar_url)
    `)
    .eq('status', 'published')
    .order('published_at', { ascending: false })
    .range((page - 1) * limit, page * limit - 1)

  if (category) query = query.eq('categories.slug', category)

  return query
}

export const getFeaturedArticles = () =>
  supabase
    .from('articles')
    .select(`
      id, title, slug, excerpt, content, cover_image, published_at,
      categories(id, name, slug, color),
      profiles(username)
    `)
    .eq('status', 'published')
    .eq('featured', true)
    .order('published_at', { ascending: false })
    .limit(5)

export const getArticleBySlug = (slug) =>
  supabase
    .from('articles')
    .select(`
      *,
      categories(id, name, slug, color),
      profiles(username, avatar_url)
    `)
    .eq('slug', slug)
    .eq('status', 'published')
    .single()

export const getRelatedArticles = (categoryId, excludeId) =>
  supabase
    .from('articles')
    .select('id, title, slug, excerpt, content, cover_image, published_at, categories(name, slug, color)')
    .eq('status', 'published')
    .eq('category_id', categoryId)
    .neq('id', excludeId)
    .limit(3)

// ─── SMART RELATED ARTICLES ─────────────────────────────────────────────────
// Scores articles by shared tags (+2 each) and same category (+1), sorted by
// total score then recency. Falls back to category-only if no tags provided.
export const getSmartRelatedArticles = async (articleId, categoryId, tagIds = []) => {
  // No tags → fall back to simple category-based related
  if (!tagIds.length) {
    return getRelatedArticles(categoryId, articleId)
  }

  // 1. Find article IDs that share at least one tag with the current article
  const { data: tagMatches } = await supabase
    .from('article_tags')
    .select('article_id, tag_id')
    .in('tag_id', tagIds)

  const tagMatchIds = new Set(
    (tagMatches || [])
      .map(r => r.article_id)
      .filter(id => id !== articleId)
  )

  // Count shared tags per article
  const tagScores = {}
  for (const row of (tagMatches || [])) {
    if (row.article_id === articleId) continue
    tagScores[row.article_id] = (tagScores[row.article_id] || 0) + 1
  }

  // 2. Build list of candidate IDs: tag matches + same-category articles
  const { data: categoryMatches } = await supabase
    .from('articles')
    .select('id')
    .eq('status', 'published')
    .eq('category_id', categoryId)
    .neq('id', articleId)
    .limit(10)

  const allCandidateIds = new Set([
    ...tagMatchIds,
    ...(categoryMatches || []).map(a => a.id),
  ])

  if (!allCandidateIds.size) return { data: [], error: null }

  // 3. Fetch full article data for all candidates
  const { data: candidates } = await supabase
    .from('articles')
    .select('id, title, slug, excerpt, content, cover_image, published_at, categories(name, slug, color)')
    .eq('status', 'published')
    .in('id', [...allCandidateIds])

  if (!candidates?.length) return { data: [], error: null }

  // 4. Score: +2 per shared tag, +1 for same category
  const catIds = new Set((categoryMatches || []).map(c => c.id))
  const scored = candidates.map(article => ({
    ...article,
    _score: (tagScores[article.id] || 0) * 2 + (catIds.has(article.id) ? 1 : 0),
  }))

  // 5. Sort by score desc, then by recency
  scored.sort((a, b) => {
    if (b._score !== a._score) return b._score - a._score
    return new Date(b.published_at) - new Date(a.published_at)
  })

  // 6. Return top 3, strip internal _score
  const top = scored.slice(0, 3).map(({ _score, ...rest }) => rest)
  return { data: top, error: null }
}

export const incrementViews = (id) =>
  supabase.rpc('increment_article_views', { article_id: id })

export const searchArticles = (query) =>
  supabase
    .from('articles')
    .select('id, title, slug, excerpt, content, cover_image, published_at, categories(name, slug, color)')
    .eq('status', 'published')
    .or(`title.ilike.%${query}%,excerpt.ilike.%${query}%`)
    .order('published_at', { ascending: false })
    .limit(20)

// ─── ADMIN ARTICLES ──────────────────────────────────────────────────────────
export const getAllArticles = () =>
  supabase
    .from('articles')
    .select(`
      id, title, slug, status, published_at, created_at, featured, views,
      categories(name, slug, color)
    `)
    .order('created_at', { ascending: false })

export const getArticleById = (id) =>
  supabase
    .from('articles')
    .select('*, categories(id, name, slug)')
    .eq('id', id)
    .single()

export const createArticle = (data) =>
  supabase.from('articles').insert([data]).select().single()

export const updateArticle = (id, data) =>
  supabase.from('articles').update(data).eq('id', id).select().single()

export const deleteArticle = (id) =>
  supabase.from('articles').delete().eq('id', id)

let articleSeoSupportPromise
let articleExtraSupportPromise

export const checkArticleSeoSupport = async () => {
  if (!articleSeoSupportPromise) {
    articleSeoSupportPromise = supabase
      .from('articles')
      .select('meta_title')
      .limit(1)
      .then(({ error }) => {
        if (!error) return true
        const message = String(error.message || '').toLowerCase()
        if (error.code === '42703' || message.includes('meta_title') || message.includes('column')) {
          return false
        }
        return false
      })
      .catch(() => false)
  }

  return articleSeoSupportPromise
}

export const checkArticleExtraColumnsSupport = async () => {
  if (!articleExtraSupportPromise) {
    articleExtraSupportPromise = supabase
      .from('articles')
      .select('source_url')
      .limit(1)
      .then(({ error }) => {
        if (!error) return true
        const message = String(error.message || '').toLowerCase()
        if (error.code === '42703' || message.includes('source_url') || message.includes('column')) {
          return false
        }
        return false
      })
      .catch(() => false)
  }
  return articleExtraSupportPromise
}

// ─── ARTICLE REVISIONS ──────────────────────────────────────────────────────
export const getArticleRevisions = async (articleId) => {
  const { data, error } = await supabase
    .from('article_revisions')
    .select('id, title, excerpt, created_at, saved_by, profiles:saved_by(username)')
    .eq('article_id', articleId)
    .order('created_at', { ascending: false })
    .limit(20)

  if (error && isMissingColumnOrRelation(error, 'article_revisions')) {
    return { data: [], error: null }
  }

  return { data: data || [], error }
}

export const getArticleRevisionById = async (revisionId) => {
  const { data, error } = await supabase
    .from('article_revisions')
    .select('*')
    .eq('id', revisionId)
    .single()

  if (error && isMissingColumnOrRelation(error, 'article_revisions')) {
    return { data: null, error: null }
  }

  return { data, error }
}

export const createArticleRevision = async (articleId, { title, content, excerpt, savedBy }) => {
  const { data, error } = await supabase
    .from('article_revisions')
    .insert([{
      article_id: articleId,
      title: title || null,
      content: content || null,
      excerpt: excerpt || null,
      saved_by: savedBy || null,
    }])
    .select()
    .single()

  if (error && isMissingColumnOrRelation(error, 'article_revisions')) {
    return { data: null, error: null }
  }

  return { data, error }
}

// ─── DUPLICATE ARTICLE ──────────────────────────────────────────────────────
export const duplicateArticle = async (articleId) => {
  const { data: original, error: fetchError } = await getArticleById(articleId)
  if (fetchError) return { data: null, error: fetchError }
  if (!original) return { data: null, error: new Error('Articolo non trovato') }

  const baseSlug = `${original.slug}-copia`
  const uniqueSlug = await ensureUniqueArticleSlug(baseSlug)

  const payload = {
    title: `${original.title} (copia)`,
    slug: uniqueSlug,
    excerpt: original.excerpt || '',
    content: original.content || '',
    cover_image: original.cover_image || '',
    category_id: original.category_id || null,
    author_id: original.author_id || null,
    status: 'draft',
    featured: false,
    meta_title: original.meta_title || '',
    meta_description: original.meta_description || '',
    canonical_url: '',
    og_image: original.og_image || '',
    noindex: false,
  }

  return createArticle(payload)
}

// ─── SEARCH ARTICLES FOR RELATED PICKER ─────────────────────────────────────
export const searchArticlesForRelated = async (query, excludeId = null) => {
  let q = supabase
    .from('articles')
    .select('id, title, slug, cover_image, published_at, status, categories(name, slug, color)')
    .or(`title.ilike.%${query}%,excerpt.ilike.%${query}%`)
    .order('published_at', { ascending: false })
    .limit(10)

  if (excludeId) q = q.neq('id', excludeId)

  return q
}

// ─── PROFILES LIST (co-authors picker) ──────────────────────────────────────
export const getProfiles = async () => {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, username, avatar_url')
    .order('username')

  return { data: data || [], error }
}

// ─── CATEGORIES ──────────────────────────────────────────────────────────────
export const getCategories = () =>
  supabase.from('categories').select('*').order('name')

export const createCategory = (data) =>
  supabase.from('categories').insert([data]).select().single()

export const updateCategory = (id, data) =>
  supabase.from('categories').update(data).eq('id', id).select().single()

export const deleteCategory = (id) =>
  supabase.from('categories').delete().eq('id', id)

// ─── STORAGE ─────────────────────────────────────────────────────────────────

// Convert image to WebP format using browser Canvas API
async function convertToWebP(file, quality = 0.85) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = img.naturalWidth
      canvas.height = img.naturalHeight
      const ctx = canvas.getContext('2d')
      ctx.drawImage(img, 0, 0)
      canvas.toBlob(
        (blob) => {
          URL.revokeObjectURL(url)
          if (!blob) return reject(new Error('WebP conversion failed'))
          const webpFile = new File(
            [blob],
            file.name.replace(/\.[^.]+$/, '.webp'),
            { type: 'image/webp' }
          )
          resolve(webpFile)
        },
        'image/webp',
        quality
      )
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Image load failed'))
    }
    img.src = url
  })
}

export const uploadImage = async (file, path, options = {}) => {
  const bucket = options.bucket || 'article-images'

  // Convert to WebP for smaller size + better Core Web Vitals
  let uploadFile = file
  let uploadPath = path
  if (file && file.type && file.type.startsWith('image/') && file.type !== 'image/webp' && file.type !== 'image/svg+xml' && file.type !== 'image/gif') {
    try {
      uploadFile = await convertToWebP(file)
      // Replace extension in path
      uploadPath = path.replace(/\.[a-z0-9]+$/i, '') + '.webp'
    } catch {
      // Fallback to original if conversion fails
      uploadFile = file
      uploadPath = path
    }
  }

  const extensionFromName = uploadFile?.name?.split('.').pop()?.toLowerCase()
  const extensionFromType = uploadFile?.type?.split('/').pop()?.toLowerCase()
  const extension = extensionFromName || extensionFromType || 'jpg'
  const normalizedPath = /\.[a-z0-9]+$/i.test(uploadPath) ? uploadPath : `${uploadPath}.${extension}`

  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(normalizedPath, uploadFile, {
      upsert: true,
      contentType: uploadFile?.type || undefined,
      cacheControl: '31536000',
    })
  if (error) throw error
  const { data: urlData } = supabase.storage
    .from(bucket)
    .getPublicUrl(data.path)
  return urlData.publicUrl
}

// ─── TAGS ────────────────────────────────────────────────────────────────────
export const getArticleTags = async (articleId) => {
  const { data } = await supabase
    .from('article_tags')
    .select('tags(id, name, slug)')
    .eq('article_id', articleId)
  return (data || []).map(r => r.tags).filter(Boolean)
}

export const upsertArticleTags = async (articleId, tags = []) => {
  // 1. Remove existing tags for this article
  await supabase.from('article_tags').delete().eq('article_id', articleId)
  if (!tags.length) return

  // 2. Upsert tags
  const tagRows = tags.map(t => ({ name: t.name, slug: t.slug }))
  const { data: upsertedTags } = await supabase
    .from('tags')
    .upsert(tagRows, { onConflict: 'slug' })
    .select()

  // 3. Get tag IDs (upsert may not return all — fetch by slug)
  const slugs = tags.map(t => t.slug)
  const { data: finalTags } = await supabase
    .from('tags')
    .select('id, slug')
    .in('slug', slugs)

  if (!finalTags?.length) return

  // 4. Insert article_tags
  const junctionRows = finalTags.map(t => ({ article_id: articleId, tag_id: t.id }))
  await supabase.from('article_tags').insert(junctionRows)
}

// ─── ARTICLE POLLS ──────────────────────────────────────────────────────────
export const getArticlePoll = async (articleId, userId = null) => {
  const { data: poll, error: pollError } = await supabase
    .from('article_polls')
    .select(`
      id,
      article_id,
      question,
      is_active,
      article_poll_options(id, label, position)
    `)
    .eq('article_id', articleId)
    .maybeSingle()

  if (pollError) return { data: null, error: pollError }
  if (!poll) return { data: null, error: null }

  const { data: votes, error: votesError } = await supabase
    .from('article_poll_votes')
    .select('option_id, user_id')
    .eq('poll_id', poll.id)

  if (votesError) return { data: null, error: votesError }

  const voteCounts = (votes || []).reduce((acc, vote) => {
    acc[vote.option_id] = (acc[vote.option_id] || 0) + 1
    return acc
  }, {})

  const totalVotes = Object.values(voteCounts).reduce((sum, count) => sum + count, 0)
  const currentVote = userId
    ? (votes || []).find((vote) => vote.user_id === userId)?.option_id || null
    : null

  return {
    data: {
      ...poll,
      totalVotes,
      currentVote,
      options: (poll.article_poll_options || [])
        .slice()
        .sort((a, b) => a.position - b.position)
        .map((option) => ({
          id: option.id,
          label: option.label,
          position: option.position,
          votes: voteCounts[option.id] || 0,
        })),
    },
    error: null,
  }
}

export const getLatestArticlePoll = async (userId = null) => {
  const { data: activePolls, error: pollsError } = await supabase
    .from('article_polls')
    .select(`
      id,
      article_id,
      question,
      is_active,
      article_poll_options(id, label, position)
    `)
    .eq('is_active', true)

  if (pollsError) return { data: null, error: pollsError }
  if (!activePolls?.length) return { data: null, error: null }

  const articleIds = activePolls.map((poll) => poll.article_id).filter(Boolean)
  if (!articleIds.length) return { data: null, error: null }

  const { data: articles, error: articlesError } = await supabase
    .from('articles')
    .select(`
      id,
      title,
      slug,
      published_at,
      categories(name, slug, color)
    `)
    .eq('status', 'published')
    .in('id', articleIds)

  if (articlesError) return { data: null, error: articlesError }
  if (!articles?.length) return { data: null, error: null }

  const latestArticle = articles
    .slice()
    .sort((a, b) => new Date(b.published_at || 0) - new Date(a.published_at || 0))[0]

  if (!latestArticle?.id) return { data: null, error: null }

  const matchedPoll = activePolls.find((poll) => poll.article_id === latestArticle.id)
  if (!matchedPoll) return { data: null, error: null }

  const { data: votes, error: votesError } = await supabase
    .from('article_poll_votes')
    .select('option_id, user_id')
    .eq('poll_id', matchedPoll.id)

  if (votesError) return { data: null, error: votesError }

  const voteCounts = (votes || []).reduce((acc, vote) => {
    acc[vote.option_id] = (acc[vote.option_id] || 0) + 1
    return acc
  }, {})

  const totalVotes = Object.values(voteCounts).reduce((sum, count) => sum + count, 0)
  const currentVote = userId
    ? (votes || []).find((vote) => vote.user_id === userId)?.option_id || null
    : null

  return {
    data: {
      kind: 'article',
      source: 'remote',
      id: matchedPoll.id,
      articleId: latestArticle.id,
      articleTitle: latestArticle.title,
      articleSlug: latestArticle.slug,
      articleCategory: latestArticle.categories || null,
      url: `/articolo/${latestArticle.slug}`,
      ctaLabel: "Apri l'articolo",
      question: matchedPoll.question,
      is_active: matchedPoll.is_active,
      totalVotes,
      currentVote,
      options: (matchedPoll.article_poll_options || [])
        .slice()
        .sort((a, b) => a.position - b.position)
        .map((option) => ({
          id: option.id,
          label: option.label,
          position: option.position,
          votes: voteCounts[option.id] || 0,
        })),
    },
    error: null,
  }
}

export const getSidebarPoll = async (userId = null) => {
  const recentMatches = await getRecentFinishedMatches(JUVE_ID, 3).catch(() => [])
  const latestFinishedMatch = getLatestFinishedJuveMatch(recentMatches)

  if (latestFinishedMatch && isMatchPollStillActive(latestFinishedMatch)) {
    const postMatchResult = await resolveActivePostMatch(latestFinishedMatch, userId)
    if (postMatchResult.error) return postMatchResult
    if (postMatchResult.data?.is_active) return postMatchResult
  }

  return getLatestArticlePoll(userId)
}

export const upsertArticlePoll = async (articleId, poll = null) => {
  const question = String(poll?.question || '').trim()
  const options = Array.isArray(poll?.options)
    ? poll.options.map((option) => String(option || '').trim()).filter(Boolean)
    : []

  if (!question || options.length < 2) {
    await supabase.from('article_polls').delete().eq('article_id', articleId)
    return { data: null, error: null }
  }

  const { data: savedPoll, error: pollError } = await supabase
    .from('article_polls')
    .upsert([{
      article_id: articleId,
      question,
      is_active: poll?.is_active ?? true,
    }], { onConflict: 'article_id' })
    .select()
    .single()

  if (pollError) return { data: null, error: pollError }

  await supabase
    .from('article_poll_options')
    .delete()
    .eq('poll_id', savedPoll.id)

  const { error: optionsError } = await supabase
    .from('article_poll_options')
    .insert(options.map((label, index) => ({
      poll_id: savedPoll.id,
      label,
      position: index,
    })))

  if (optionsError) return { data: null, error: optionsError }

  return getArticlePoll(articleId)
}

export const voteArticlePoll = async ({ pollId, optionId, userId }) => {
  const { error } = await supabase
    .from('article_poll_votes')
    .upsert([{
      poll_id: pollId,
      option_id: optionId,
      user_id: userId,
    }], { onConflict: 'poll_id,user_id' })

  if (error) return { data: null, error }

  return { data: true, error: null }
}

export const voteMatchPoll = async ({ poll, optionId, userId }) => {
  if (poll?.source === 'local') {
    writeLocalMatchPollVote(poll.matchId, userId, optionId)
    return { data: true, error: null }
  }

  const { error } = await supabase
    .from('match_poll_votes')
    .upsert([{
      poll_id: poll.id,
      option_id: optionId,
      user_id: userId,
    }], { onConflict: 'poll_id,user_id' })

  if (error) return { data: null, error }

  return { data: true, error: null }
}

// ─── STATS ───────────────────────────────────────────────────────────────────
export const getDashboardStats = async () => {
  const [published, drafts, categories, totalViews] = await Promise.all([
    supabase.from('articles').select('id', { count: 'exact' }).eq('status', 'published'),
    supabase.from('articles').select('id', { count: 'exact' }).eq('status', 'draft'),
    supabase.from('categories').select('id', { count: 'exact' }),
    supabase.from('articles').select('views').eq('status', 'published'),
  ])
  const views = totalViews.data?.reduce((sum, a) => sum + (a.views || 0), 0) || 0
  return {
    published: published.count || 0,
    drafts: drafts.count || 0,
    categories: categories.count || 0,
    views,
  }
}

// ─── COMMENTS MODERATION ───────────────────────────────────────────────────
export const getAllComments = async ({ status = 'pending' } = {}) => {
  let query = supabase
    .from('comments')
    .select(`
      *,
      articles(id, title, slug)
    `)
    .order('created_at', { ascending: false })

  if (status === 'pending') query = query.eq('approved', false)
  if (status === 'approved') query = query.eq('approved', true)

  return query
}

export const getArticleComments = async (articleId) => {
  const query = supabase
    .from('comments')
    .select('*')
    .eq('article_id', articleId)
    .eq('approved', true)
    .order('created_at', { ascending: true })

  return query
}

export const createArticleComment = ({ articleId, authorName, authorEmail, content }) =>
  supabase
    .from('comments')
    .insert([{
      article_id: articleId,
      author_name: authorName,
      author_email: authorEmail,
      content,
      approved: false,
    }])
    .select()
    .single()

export const updateComment = (id, data) =>
  supabase
    .from('comments')
    .update(data)
    .eq('id', id)
    .select()
    .single()

export const deleteComment = (id) =>
  supabase
    .from('comments')
    .delete()
    .eq('id', id)

// ─── FAN ARTICLE SUBMISSIONS ───────────────────────────────────────────────
export const createFanArticleSubmission = (data) =>
  supabase
    .from('fan_article_submissions')
    .insert([{
      ...data,
      status: 'submitted',
      submitted_at: new Date().toISOString(),
    }])
    .select()
    .single()

export const getFanArticleSubmissions = ({ status = null } = {}) => {
  let query = supabase
    .from('fan_article_submissions')
    .select('*')
    .order('submitted_at', { ascending: false })

  if (status) query = query.eq('status', status)
  return query
}

export const getFanArticleSubmissionCount = async ({ status = null } = {}) => {
  let query = supabase
    .from('fan_article_submissions')
    .select('id', { count: 'exact', head: true })

  if (status) query = query.eq('status', status)

  return query
}

export const updateFanArticleSubmission = (id, data) =>
  supabase
    .from('fan_article_submissions')
    .update({
      ...data,
      reviewed_at: data.status && data.status !== 'submitted' ? new Date().toISOString() : data.reviewed_at,
    })
    .eq('id', id)
    .select()
    .single()

async function ensureUniqueArticleSlug(baseSlug) {
  const normalized = slugify(baseSlug || 'articolo-tifoso')
  const { data } = await supabase
    .from('articles')
    .select('id')
    .eq('slug', normalized)
    .limit(1)

  if (!data?.length) return normalized
  return `${normalized}-${Date.now().toString().slice(-6)}`
}

export const approveFanArticleSubmission = async (submission, { authorId } = {}) => {
  const slug = await ensureUniqueArticleSlug(submission.title)

  let categoryId = null
  if (submission.category_slug) {
    const { data: category } = await supabase
      .from('categories')
      .select('id')
      .eq('slug', submission.category_slug)
      .maybeSingle()
    categoryId = category?.id || null
  }

  const articlePayload = {
    title: submission.title,
    slug,
    excerpt: submission.excerpt || '',
    content: submission.content,
    cover_image: buildFanArticlePlaceholder(submission.category_slug, submission.title),
    category_id: categoryId,
    author_id: authorId || null,
    status: 'draft',
    featured: false,
    published_at: null,
  }

  const { data: article, error: articleError } = await supabase
    .from('articles')
    .insert([articlePayload])
    .select()
    .single()

  if (articleError) throw articleError

  const generatedTags = deriveFanArticleTags({
    title: submission.title,
    excerpt: submission.excerpt,
    pitch: submission.pitch,
    categorySlug: submission.category_slug,
  })
  if (generatedTags.length) {
    await upsertArticleTags(article.id, generatedTags)
  }

  const { data: updatedSubmission, error: submissionError } = await updateFanArticleSubmission(submission.id, {
    status: 'approved',
    linked_article_id: article.id,
  })

  if (submissionError) throw submissionError

  return { article, submission: updatedSubmission }
}
