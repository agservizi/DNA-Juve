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
const brevoApiKey = Deno.env.get('BREVO_API_KEY') || ''
const siteUrl = Deno.env.get('SITE_URL') || 'https://bianconerihub.com'

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

async function createInternalNotifications(
  supabaseAdmin: ReturnType<typeof createClient>,
  userIds: string[],
  payload: {
    type?: string
    title: string
    body?: string
    url?: string
    metadata?: Record<string, unknown>
  },
) {
  const recipients = [...new Set(userIds.filter(Boolean))]
  if (!recipients.length) return

  const rows = recipients.map((userId) => ({
    user_id: userId,
    type: payload.type || 'system',
    title: payload.title,
    body: payload.body || null,
    url: payload.url || null,
    metadata: payload.metadata || {},
  }))

  const { error } = await supabaseAdmin
    .from('reader_notifications')
    .insert(rows)

  if (error) throw error
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
    authorId?: string | null
    authorName?: string | null
  }
) {
  if (!article?.title || !article?.slug) {
    throw new Error('Article payload missing title or slug')
  }

  const { data: readerStates, error: statesError } = await supabaseAdmin
    .from('reader_states')
    .select('user_id, preferences, notifications_enabled')

  if (statesError) throw statesError
  if (!readerStates?.length) {
    return { delivered: [], invalidated: [], failed: [], skipped: 0 }
  }

  const eligibleCategoryUserIds = (readerStates || [])
    .filter((state) => {
      if (!article.categoryId) return true

      const favoriteCategories = Array.isArray(state.preferences?.favoriteCategories)
        ? state.preferences.favoriteCategories
        : []

      return favoriteCategories.length === 0 || favoriteCategories.includes(article.categoryId)
    })
    .map((state) => state.user_id)

  const { data: followerRows, error: followerError } = article.authorId
    ? await supabaseAdmin
        .from('author_follows')
        .select('user_id')
        .eq('author_id', article.authorId)
    : { data: [], error: null }

  if (followerError) throw followerError

  const eligibleUserIds = [...new Set([
    ...eligibleCategoryUserIds,
    ...((followerRows || []).map((row) => row.user_id)),
  ])]

  if (!eligibleUserIds.length) {
    return { delivered: [], invalidated: [], failed: [], skipped: 0 }
  }

  await createInternalNotifications(
    supabaseAdmin,
    eligibleUserIds,
    {
      type: 'article',
      title: article.authorName
        ? `${article.authorName}: ${article.title}`
        : article.categoryName
        ? `${article.categoryName}: ${article.title}`
        : article.title,
      body: article.excerpt || 'E disponibile un nuovo articolo del magazine.',
      url: `/articolo/${article.slug}`,
      metadata: {
        slug: article.slug,
        categoryId: article.categoryId || null,
        categoryName: article.categoryName || null,
        authorId: article.authorId || null,
        authorName: article.authorName || null,
      },
    },
  )

  const stateByUserId = new Map((readerStates || []).map((state) => [state.user_id, state]))
  const pushEnabledUserIds = new Set(
    eligibleUserIds.filter((userId) => Boolean(stateByUserId.get(userId)?.notifications_enabled)),
  )

  const { data: subscriptions, error: subscriptionsError } = await supabaseAdmin
    .from('push_subscriptions')
    .select('id, user_id, endpoint, subscription')
    .eq('is_active', true)
    .in('user_id', eligibleUserIds)

  if (subscriptionsError) throw subscriptionsError

  const eligibleRecords = (subscriptions || []).filter((record) => pushEnabledUserIds.has(record.user_id))
  if (!eligibleRecords.length) {
    return {
      delivered: [],
      invalidated: [],
      failed: [],
      skipped: subscriptions?.length || 0,
    }
  }

  const summary = await sendNotificationToRecords(supabaseAdmin, eligibleRecords as PushRecord[], {
    title: article.authorName
      ? `Nuovo articolo di ${article.authorName}`
      : article.categoryName
      ? `Nuovo articolo ${article.categoryName}`
      : 'Nuovo articolo BianconeriHub',
    body: article.excerpt || article.title,
    url: `/articolo/${article.slug}`,
    tag: `article-${article.slug}`,
  })

  return {
    ...summary,
    skipped: (subscriptions?.length || 0) - eligibleRecords.length,
  }
}

async function listAdminRecipients(supabaseAdmin: ReturnType<typeof createClient>) {
  const { data: profiles, error: profilesError } = await supabaseAdmin
    .from('profiles')
    .select('id, username, role')
    .eq('role', 'admin')

  if (profilesError) throw profilesError
  if (!profiles?.length) {
    return { profiles: [], emailsById: new Map<string, string>() }
  }

  const emailsById = new Map<string, string>()
  let page = 1
  const perPage = 200

  while (true) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage })
    if (error) throw error

    for (const authUser of data.users || []) {
      if (authUser.email) emailsById.set(authUser.id, authUser.email)
    }

    if (!data.users?.length || data.users.length < perPage) break
    page += 1
  }

  return { profiles, emailsById }
}

async function sendEmailNotification(
  recipients: Array<{ email: string, name?: string | null }>,
  payload: { subject: string, htmlContent: string, tag: string },
) {
  if (!brevoApiKey || !recipients.length) {
    return { delivered: [], skipped: recipients.map((recipient) => recipient.email) }
  }

  const response = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'api-key': brevoApiKey,
    },
    body: JSON.stringify({
      sender: { name: 'BianconeriHub', email: 'newsletter@bianconerihub.com' },
      to: recipients.map((recipient) => ({
        email: recipient.email,
        name: recipient.name || undefined,
      })),
      subject: payload.subject,
      htmlContent: payload.htmlContent,
      headers: { 'X-Mailin-Tag': payload.tag },
    }),
  })

  if (!response.ok) {
    const text = await response.text().catch(() => '')
    throw new Error(text || `Brevo email failed (${response.status})`)
  }

  return { delivered: recipients.map((recipient) => recipient.email), skipped: [] }
}

async function sendFanSubmissionNotification(
  supabaseAdmin: ReturnType<typeof createClient>,
  user: { id: string, email?: string | null },
  submissionId: string,
) {
  if (!submissionId) throw new Error('submissionId mancante.')

  const { data: submission, error: submissionError } = await supabaseAdmin
    .from('fan_article_submissions')
    .select('id, title, excerpt, pitch, category_slug, author_name, author_email, submitted_at')
    .eq('id', submissionId)
    .maybeSingle()

  if (submissionError) throw submissionError
  if (!submission) throw new Error('Proposta non trovata.')
  if (submission.author_email !== user.email) {
    return { error: 'Forbidden' }
  }

  const { profiles, emailsById } = await listAdminRecipients(supabaseAdmin)

  const pushTargets = profiles
    .map((profile) => profile.id)
    .filter(Boolean)

  let pushSummary = { delivered: [], invalidated: [], failed: [], skipped: 0 }
  if (pushTargets.length) {
    const { data: subscriptions, error: subscriptionsError } = await supabaseAdmin
      .from('push_subscriptions')
      .select('id, user_id, endpoint, subscription')
      .in('user_id', pushTargets)
      .eq('is_active', true)

    if (subscriptionsError) throw subscriptionsError

    if (subscriptions?.length) {
      pushSummary = await sendNotificationToRecords(supabaseAdmin, subscriptions as PushRecord[], {
        title: 'Nuova proposta tifoso',
        body: `${submission.author_name} ha inviato "${submission.title}"`,
        url: '/admin/proposte-tifosi',
        tag: `fan-submission-${submission.id}`,
      })
    }
  }

  const emailRecipients = profiles
    .map((profile) => ({
      email: emailsById.get(profile.id) || '',
      name: profile.username || undefined,
    }))
    .filter((recipient) => recipient.email)

  const notes = [
    submission.excerpt ? `<p style="margin:0 0 12px;"><strong>Estratto:</strong> ${submission.excerpt}</p>` : '',
    submission.pitch ? `<p style="margin:0 0 12px;"><strong>Pitch:</strong> ${submission.pitch}</p>` : '',
    submission.category_slug ? `<p style="margin:0;"><strong>Categoria:</strong> ${submission.category_slug}</p>` : '',
  ].filter(Boolean).join('')

  const emailSummary = await sendEmailNotification(emailRecipients, {
    subject: `Nuova proposta tifoso: ${submission.title}`,
    tag: 'fan-article-admin-alert',
    htmlContent: `
      <div style="background:#f7f7f7;padding:32px 16px;">
        <div style="max-width:640px;margin:0 auto;background:#ffffff;border-top:4px solid #F5A623;padding:32px;">
          <p style="font-family:Arial,sans-serif;font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#B08A18;margin:0 0 12px;">BianconeriHub</p>
          <h1 style="font-family:Georgia,serif;font-size:28px;line-height:1.2;color:#111;margin:0 0 16px;">Nuova proposta in attesa</h1>
          <p style="font-family:Arial,sans-serif;font-size:15px;line-height:1.7;color:#444;margin:0 0 12px;">
            ${submission.author_name} (${submission.author_email}) ha inviato una nuova proposta per Area Bianconera.
          </p>
          <p style="font-family:Arial,sans-serif;font-size:15px;line-height:1.7;color:#111;margin:0 0 16px;"><strong>${submission.title}</strong></p>
          <div style="font-family:Arial,sans-serif;font-size:14px;line-height:1.7;color:#444;margin:0 0 16px;">
            ${notes}
          </div>
          <p style="margin:24px 0 0;">
            <a href="${siteUrl.replace(/\/+$/, '')}/admin/proposte-tifosi" style="display:inline-block;background:#F5A623;color:#111;padding:12px 18px;font-family:Arial,sans-serif;font-size:13px;font-weight:700;text-decoration:none;">
              Apri Proposte Tifosi
            </a>
          </p>
        </div>
      </div>
    `.trim(),
  })

  return {
    push: pushSummary,
    email: emailSummary,
  }
}

async function sendReaderEventNotification(
  supabaseAdmin: ReturnType<typeof createClient>,
  payload: {
    userId?: string
    userEmail?: string
    type?: string
    title: string
    body?: string
    url?: string
    metadata?: Record<string, unknown>
  },
) {
  if ((!payload.userId && !payload.userEmail) || !payload.title) {
    throw new Error('Reader notification payload incompleto.')
  }

  let userId = payload.userId || ''

  if (!userId && payload.userEmail) {
    let page = 1
    const perPage = 200

    while (true) {
      const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage })
      if (error) throw error

      const matched = (data.users || []).find((authUser) => authUser.email === payload.userEmail)
      if (matched?.id) {
        userId = matched.id
        break
      }

      if (!data.users?.length || data.users.length < perPage) break
      page += 1
    }
  }

  if (!userId) {
    throw new Error('Utente destinatario non trovato.')
  }

  await createInternalNotifications(supabaseAdmin, [userId], {
    type: payload.type || 'system',
    title: payload.title,
    body: payload.body || '',
    url: payload.url || '/area-bianconera',
    metadata: payload.metadata || {},
  })

  const { data: state } = await supabaseAdmin
    .from('reader_states')
    .select('notifications_enabled')
    .eq('user_id', userId)
    .maybeSingle()

  if (!state?.notifications_enabled) {
    return { delivered: [], invalidated: [], failed: [], skipped: 0 }
  }

  const { data: subscriptions, error } = await supabaseAdmin
    .from('push_subscriptions')
    .select('id, user_id, endpoint, subscription')
    .eq('user_id', userId)
    .eq('is_active', true)

  if (error) throw error
  if (!subscriptions?.length) {
    return { delivered: [], invalidated: [], failed: [], skipped: 0 }
  }

  return sendNotificationToRecords(supabaseAdmin, subscriptions as PushRecord[], {
    title: payload.title,
    body: payload.body || '',
    url: payload.url || '/area-bianconera',
    tag: `reader-event-${payload.type || 'system'}-${userId}`,
  })
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

    if (action === 'send-reader-event') {
      const targetUserId = body.userId || ''
      const targetUserEmail = body.userEmail || ''
      const isSelfTarget = (targetUserId && targetUserId === user.id) || (targetUserEmail && targetUserEmail === user.email)

      if (!isSelfTarget) {
        const { data: profile, error: profileError } = await supabaseAdmin
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .maybeSingle()

        if (profileError) throw profileError
        if (profile?.role !== 'admin') {
          return jsonResponse({ error: 'Forbidden' }, 403)
        }
      }

      const summary = await sendReaderEventNotification(supabaseAdmin, {
        userId: targetUserId,
        userEmail: targetUserEmail,
        type: body.type || 'system',
        title: body.title || '',
        body: body.body || '',
        url: body.url || '/area-bianconera',
        metadata: body.metadata || {},
      })
      return jsonResponse(summary)
    }

    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle()

    if (profileError) throw profileError
    if (profile?.role !== 'admin') {
      return jsonResponse({ error: 'Forbidden' }, 403)
    }

    if (action === 'send-article') {
      const summary = await sendArticleNotification(supabaseAdmin, body.article || {})
      return jsonResponse(summary)
    }

    if (action === 'send-fan-submission') {
      const summary = await sendFanSubmissionNotification(supabaseAdmin, user, body.submissionId || '')
      if ('error' in summary) return jsonResponse({ error: summary.error }, 403)
      return jsonResponse(summary)
    }

    return jsonResponse({ error: 'Unsupported action.' }, 400)
  } catch (error) {
    return jsonResponse({
      error: error instanceof Error ? error.message : 'Push notification error',
    }, 400)
  }
})
