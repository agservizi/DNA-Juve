import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import webpush from 'npm:web-push@3.6.7'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

type PushRecord = {
  id: string
  user_id: string
  endpoint: string
  subscription: Record<string, unknown>
}

const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY') || ''
const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY') || ''
const vapidSubject = Deno.env.get('VAPID_SUBJECT') || 'mailto:notifications@bianconerihub.com'

if (vapidPublicKey && vapidPrivateKey) {
  webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey)
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

async function getAuthenticatedUser(supabaseAdmin: ReturnType<typeof createClient>, authHeader: string | null) {
  if (!authHeader) throw new Error('Missing authorization header')

  const token = authHeader.replace('Bearer ', '')
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token)
  if (error || !user) throw new Error('Unauthorized')
  return user
}

async function markSubscriptionStatus(
  supabaseAdmin: ReturnType<typeof createClient>,
  recordId: string,
  data: { is_active?: boolean, last_error?: string | null, last_success_at?: string | null }
) {
  await supabaseAdmin
    .from('push_subscriptions')
    .update({
      ...data,
      updated_at: new Date().toISOString(),
    })
    .eq('id', recordId)
}

async function sendNotificationToRecords(
  supabaseAdmin: ReturnType<typeof createClient>,
  records: PushRecord[],
  payload: Record<string, unknown>
) {
  const delivered: string[] = []
  const invalidated: string[] = []
  const failed: Array<{ endpoint: string, error: string }> = []

  await Promise.all(records.map(async (record) => {
    try {
      await webpush.sendNotification(record.subscription, JSON.stringify(payload))
      delivered.push(record.endpoint)
      await markSubscriptionStatus(supabaseAdmin, record.id, {
        last_error: null,
        last_success_at: new Date().toISOString(),
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Push send failed'
      const statusCode = typeof error === 'object' && error !== null && 'statusCode' in error
        ? Number((error as { statusCode?: unknown }).statusCode)
        : 0

      failed.push({ endpoint: record.endpoint, error: message })

      if (statusCode === 404 || statusCode === 410) {
        invalidated.push(record.endpoint)
        await markSubscriptionStatus(supabaseAdmin, record.id, {
          is_active: false,
          last_error: message,
        })
        return
      }

      await markSubscriptionStatus(supabaseAdmin, record.id, {
        last_error: message,
      })
    }
  }))

  return { delivered, invalidated, failed }
}

async function sendTestNotification(
  supabaseAdmin: ReturnType<typeof createClient>,
  userId: string
) {
  const { data: subscriptions, error } = await supabaseAdmin
    .from('push_subscriptions')
    .select('id, user_id, endpoint, subscription')
    .eq('user_id', userId)
    .eq('is_active', true)

  if (error) throw error
  if (!subscriptions?.length) throw new Error('Nessuna subscription push attiva trovata per questo utente.')

  return sendNotificationToRecords(supabaseAdmin, subscriptions as PushRecord[], {
    title: 'BianconeriHub',
    body: 'Le notifiche push sono attive correttamente.',
    url: '/area-bianconera',
    tag: 'bianconerihub-push-test',
  })
}

async function sendArticleNotification(
  supabaseAdmin: ReturnType<typeof createClient>,
  article: {
    title: string
    slug: string
    excerpt?: string | null
    categoryId?: string | null
    categoryName?: string | null
  }
) {
  if (!article?.title || !article?.slug) {
    throw new Error('Article payload missing title or slug')
  }

  const { data: subscriptions, error: subscriptionsError } = await supabaseAdmin
    .from('push_subscriptions')
    .select('id, user_id, endpoint, subscription')
    .eq('is_active', true)

  if (subscriptionsError) throw subscriptionsError
  if (!subscriptions?.length) {
    return { delivered: [], invalidated: [], failed: [], skipped: 0 }
  }

  const userIds = [...new Set(subscriptions.map((record) => record.user_id))]
  const { data: readerStates, error: statesError } = await supabaseAdmin
    .from('reader_states')
    .select('user_id, preferences, notifications_enabled')
    .in('user_id', userIds)

  if (statesError) throw statesError

  const stateMap = new Map((readerStates || []).map((row) => [row.user_id, row]))
  const eligibleRecords = (subscriptions as PushRecord[]).filter((record) => {
    const state = stateMap.get(record.user_id)
    if (!state?.notifications_enabled) return false

    if (!article.categoryId) return true

    const favoriteCategories = Array.isArray(state.preferences?.favoriteCategories)
      ? state.preferences.favoriteCategories
      : []

    return favoriteCategories.length === 0 || favoriteCategories.includes(article.categoryId)
  })

  if (!eligibleRecords.length) {
    return { delivered: [], invalidated: [], failed: [], skipped: subscriptions.length }
  }

  const summary = await sendNotificationToRecords(supabaseAdmin, eligibleRecords, {
    title: article.categoryName
      ? `Nuovo articolo ${article.categoryName}`
      : 'Nuovo articolo BianconeriHub',
    body: article.excerpt || article.title,
    url: `/articolo/${article.slug}`,
    tag: `article-${article.slug}`,
  })

  return {
    ...summary,
    skipped: subscriptions.length - eligibleRecords.length,
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  if (!supabaseUrl || !serviceRoleKey) {
    return jsonResponse({ error: 'Supabase configuration missing.' }, 500)
  }

  if (!vapidPublicKey || !vapidPrivateKey) {
    return jsonResponse({ error: 'VAPID secrets are not configured.' }, 500)
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  try {
    const user = await getAuthenticatedUser(supabaseAdmin, req.headers.get('Authorization'))
    const body = await req.json().catch(() => ({}))
    const action = body?.action || 'send-test'

    if (action === 'send-test') {
      const summary = await sendTestNotification(supabaseAdmin, user.id)
      return jsonResponse(summary)
    }

    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle()

    if (profileError) throw profileError
    if (!profile?.role || !['admin', 'editor'].includes(profile.role)) {
      return jsonResponse({ error: 'Forbidden' }, 403)
    }

    if (action === 'send-article') {
      const summary = await sendArticleNotification(supabaseAdmin, body.article || {})
      return jsonResponse(summary)
    }

    return jsonResponse({ error: 'Unsupported action.' }, 400)
  } catch (error) {
    return jsonResponse({
      error: error instanceof Error ? error.message : 'Push notification error',
    }, 400)
  }
})
