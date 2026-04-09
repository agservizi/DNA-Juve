import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import webpush from 'npm:web-push@3.6.7'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

type PushRecord = {
  id: string
  user_id: string | null
  guest_token?: string | null
  endpoint: string
  subscription: Record<string, unknown>
}

type ReaderStateRow = {
  user_id: string
  notifications_enabled?: boolean | null
  preferences?: Record<string, unknown> | null
}

type ReaderDeliveryPreferences = {
  timeZone: string
  quietHoursEnabled: boolean
  quietHoursStart: string
  quietHoursEnd: string
  digestHour: string
}

const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY') || ''
const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY') || ''
const vapidSubject = Deno.env.get('VAPID_SUBJECT') || 'mailto:notifications@bianconerihub.com'
const brevoApiKey = Deno.env.get('BREVO_API_KEY') || ''
const siteUrl = Deno.env.get('SITE_URL') || 'https://bianconerihub.com'
const cronSecret = Deno.env.get('CRON_SECRET') || ''

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

function getReaderDeliveryPreferences(state?: ReaderStateRow | null): ReaderDeliveryPreferences {
  const preferences = (state?.preferences || {}) as Record<string, unknown>
  const notificationSettings = ((preferences.notificationSettings || {}) as Record<string, unknown>)
  const timeZone = typeof preferences.timeZone === 'string' && preferences.timeZone && preferences.timeZone !== 'auto'
    ? preferences.timeZone
    : 'Europe/Rome'

  return {
    timeZone,
    quietHoursEnabled: notificationSettings.quietHoursEnabled !== false,
    quietHoursStart: typeof notificationSettings.quietHoursStart === 'string' ? notificationSettings.quietHoursStart : '23:00',
    quietHoursEnd: typeof notificationSettings.quietHoursEnd === 'string' ? notificationSettings.quietHoursEnd : '08:00',
    digestHour: typeof notificationSettings.digestHour === 'string' ? notificationSettings.digestHour : '08:30',
  }
}

function getTimeZoneParts(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date)

  const mapped = Object.fromEntries(parts.filter((part) => part.type !== 'literal').map((part) => [part.type, part.value]))
  return {
    year: Number(mapped.year || 0),
    month: Number(mapped.month || 1),
    day: Number(mapped.day || 1),
    hour: Number(mapped.hour || 0),
    minute: Number(mapped.minute || 0),
  }
}

function parseTimeToMinutes(timeValue: string) {
  const [hours = '0', minutes = '0'] = String(timeValue || '00:00').split(':')
  return (Number(hours) * 60) + Number(minutes)
}

function isWithinQuietHours(preferences: ReaderDeliveryPreferences, now = new Date()) {
  if (!preferences.quietHoursEnabled) return false

  const current = getTimeZoneParts(now, preferences.timeZone)
  const currentMinute = (current.hour * 60) + current.minute
  const startMinute = parseTimeToMinutes(preferences.quietHoursStart)
  const endMinute = parseTimeToMinutes(preferences.quietHoursEnd)

  if (startMinute === endMinute) return true
  if (startMinute < endMinute) {
    return currentMinute >= startMinute && currentMinute < endMinute
  }

  return currentMinute >= startMinute || currentMinute < endMinute
}

function getNextAllowedDeliveryAt(preferences: ReaderDeliveryPreferences, now = new Date()) {
  const endMinute = parseTimeToMinutes(preferences.quietHoursEnd)
  const current = getTimeZoneParts(now, preferences.timeZone)
  const candidate = new Date(Date.UTC(
    current.year,
    current.month - 1,
    current.day,
    Math.floor(endMinute / 60),
    endMinute % 60,
    0,
  ))
  const currentMinute = (current.hour * 60) + current.minute

  if (currentMinute >= endMinute) {
    candidate.setUTCDate(candidate.getUTCDate() + 1)
  }

  return candidate.toISOString()
}

async function queuePushMessages(
  supabaseAdmin: ReturnType<typeof createClient>,
  items: Array<{ userId: string, type: string, title: string, body?: string, url?: string, tag?: string, metadata?: Record<string, unknown>, deliverNotBefore: string }>,
) {
  if (!items.length) return

  const { error } = await supabaseAdmin
    .from('reader_push_queue')
    .insert(items.map((item) => ({
      user_id: item.userId,
      type: item.type,
      title: item.title,
      body: item.body || null,
      url: item.url || null,
      tag: item.tag || null,
      metadata: item.metadata || {},
      deliver_not_before: item.deliverNotBefore,
    })))

  if (error) throw error
}

async function processPendingDeliveries(supabaseAdmin: ReturnType<typeof createClient>) {
  const nowIso = new Date().toISOString()

  const [{ data: queueItems, error: queueError }, { data: dueReminders, error: remindersError }] = await Promise.all([
    supabaseAdmin
      .from('reader_push_queue')
      .select('id, user_id, type, title, body, url, tag, metadata, deliver_not_before, sent_at')
      .is('sent_at', null)
      .lte('deliver_not_before', nowIso)
      .order('deliver_not_before', { ascending: true })
      .limit(100),
    supabaseAdmin
      .from('reader_match_reminders')
      .select('id, user_id, match_id, minutes_before, reminder_label, scheduled_for, status, sent_at, match_payload')
      .in('status', ['scheduled', 'queued'])
      .is('sent_at', null)
      .lte('scheduled_for', nowIso)
      .order('scheduled_for', { ascending: true })
      .limit(100),
  ])

  if (queueError) throw queueError
  if (remindersError) throw remindersError

  const userIds = [...new Set([
    ...((queueItems || []).map((item) => item.user_id)),
    ...((dueReminders || []).map((item) => item.user_id)),
  ].filter(Boolean))]

  const { data: readerStates, error: statesError } = userIds.length
    ? await supabaseAdmin
        .from('reader_states')
        .select('user_id, notifications_enabled, preferences')
        .in('user_id', userIds)
    : { data: [], error: null }

  if (statesError) throw statesError

  const statesByUserId = new Map((readerStates || []).map((item) => [item.user_id, item as ReaderStateRow]))

  const immediateQueueUserIds = [...new Set((queueItems || []).filter((item) => {
    const state = statesByUserId.get(item.user_id)
    if (!state?.notifications_enabled) return false
    return !isWithinQuietHours(getReaderDeliveryPreferences(state))
  }).map((item) => item.user_id))]

  const { data: queueSubscriptions, error: queueSubscriptionsError } = immediateQueueUserIds.length
    ? await supabaseAdmin
        .from('push_subscriptions')
        .select('id, user_id, guest_token, endpoint, subscription')
        .eq('is_active', true)
        .in('user_id', immediateQueueUserIds)
    : { data: [], error: null }

  if (queueSubscriptionsError) throw queueSubscriptionsError

  const queueSubscriptionsByUser = new Map<string, PushRecord[]>()
  for (const record of (queueSubscriptions || []) as PushRecord[]) {
    if (!record.user_id) continue
    const bucket = queueSubscriptionsByUser.get(record.user_id) || []
    bucket.push(record)
    queueSubscriptionsByUser.set(record.user_id, bucket)
  }

  const queueSummary = { delivered: 0, failed: 0, queued: 0, processed: 0 }

  for (const item of queueItems || []) {
    const state = statesByUserId.get(item.user_id)
    const preferences = getReaderDeliveryPreferences(state)

    if (!state?.notifications_enabled) {
      await supabaseAdmin.from('reader_push_queue').update({ sent_at: nowIso }).eq('id', item.id)
      queueSummary.processed += 1
      continue
    }

    if (isWithinQuietHours(preferences)) {
      await supabaseAdmin
        .from('reader_push_queue')
        .update({ deliver_not_before: getNextAllowedDeliveryAt(preferences) })
        .eq('id', item.id)
      queueSummary.queued += 1
      continue
    }

    const subscriptions = queueSubscriptionsByUser.get(item.user_id) || []
    if (!subscriptions.length) {
      await supabaseAdmin.from('reader_push_queue').update({ sent_at: nowIso }).eq('id', item.id)
      queueSummary.processed += 1
      continue
    }

    const summary = await sendNotificationToRecords(supabaseAdmin, subscriptions, {
      title: item.title,
      body: item.body || '',
      url: item.url || '/area-bianconera',
      tag: item.tag || `queued-${item.id}`,
    })

    await supabaseAdmin.from('reader_push_queue').update({ sent_at: nowIso }).eq('id', item.id)
    queueSummary.delivered += summary.delivered.length
    queueSummary.failed += summary.failed.length
    queueSummary.processed += 1
  }

  const reminderUserIds = [...new Set((dueReminders || []).map((item) => item.user_id).filter(Boolean))]
  const { data: reminderSubscriptions, error: reminderSubscriptionsError } = reminderUserIds.length
    ? await supabaseAdmin
        .from('push_subscriptions')
        .select('id, user_id, guest_token, endpoint, subscription')
        .eq('is_active', true)
        .in('user_id', reminderUserIds)
    : { data: [], error: null }

  if (reminderSubscriptionsError) throw reminderSubscriptionsError

  const reminderSubscriptionsByUser = new Map<string, PushRecord[]>()
  for (const record of (reminderSubscriptions || []) as PushRecord[]) {
    if (!record.user_id) continue
    const bucket = reminderSubscriptionsByUser.get(record.user_id) || []
    bucket.push(record)
    reminderSubscriptionsByUser.set(record.user_id, bucket)
  }

  const reminderSummary = { sent: 0, rescheduled: 0, notifications: 0 }

  for (const reminder of dueReminders || []) {
    const state = statesByUserId.get(reminder.user_id)
    const preferences = getReaderDeliveryPreferences(state)
    const matchPayload = (reminder.match_payload || {}) as Record<string, unknown>
    const home = String(matchPayload.home || 'Juventus')
    const away = String(matchPayload.away || 'Avversaria')
    const title = reminder.minutes_before === 0
      ? `Si parte: ${home} vs ${away}`
      : `${reminder.reminder_label}: ${home} vs ${away}`
    const body = `${(matchPayload.competition as { name?: string } | null)?.name || 'Match Juventus'} · ${matchPayload.venue || 'Calendario Juventus'}`

    if (isWithinQuietHours(preferences)) {
      await supabaseAdmin
        .from('reader_match_reminders')
        .update({
          status: 'queued',
          scheduled_for: getNextAllowedDeliveryAt(preferences),
        })
        .eq('id', reminder.id)
      reminderSummary.rescheduled += 1
      continue
    }

    await createInternalNotifications(supabaseAdmin, [reminder.user_id], {
      type: 'match-reminder',
      title,
      body,
      url: '/calendario',
      metadata: {
        reminderId: reminder.id,
        matchId: reminder.match_id,
        minutesBefore: reminder.minutes_before,
      },
    })

    const subscriptions = reminderSubscriptionsByUser.get(reminder.user_id) || []
    if (state?.notifications_enabled && subscriptions.length) {
      await sendNotificationToRecords(supabaseAdmin, subscriptions, {
        title,
        body,
        url: '/calendario',
        tag: `match-reminder-${reminder.id}`,
      })
    }

    await supabaseAdmin
      .from('reader_match_reminders')
      .update({ status: 'sent', sent_at: nowIso })
      .eq('id', reminder.id)

    reminderSummary.sent += 1
    reminderSummary.notifications += 1
  }

  return {
    queue: queueSummary,
    reminders: reminderSummary,
  }
}

async function sendTestNotification(
  supabaseAdmin: ReturnType<typeof createClient>,
  options: { userId?: string | null, guestToken?: string | null }
) {
  const { userId, guestToken } = options

  if (!userId && !guestToken) {
    throw new Error('Destinatario test push mancante.')
  }

  let query = supabaseAdmin
    .from('push_subscriptions')
    .select('id, user_id, guest_token, endpoint, subscription')
    .eq('is_active', true)

  query = userId ? query.eq('user_id', userId) : query.eq('guest_token', guestToken as string)

  const { data: subscriptions, error } = await query

  if (error) throw error
  if (!subscriptions?.length) throw new Error('Nessuna subscription push attiva trovata per questo dispositivo.')

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
  const pushEnabledUserIds = eligibleUserIds.filter((userId) => Boolean(stateByUserId.get(userId)?.notifications_enabled))
  const immediateUserIds = pushEnabledUserIds.filter((userId) => !isWithinQuietHours(getReaderDeliveryPreferences(stateByUserId.get(userId))))
  const queuedItems = pushEnabledUserIds
    .filter((userId) => !immediateUserIds.includes(userId))
    .map((userId) => ({
      userId,
      type: 'article',
      title: article.authorName
        ? `Nuovo articolo di ${article.authorName}`
        : article.categoryName
        ? `Nuovo articolo ${article.categoryName}`
        : 'Nuovo articolo BianconeriHub',
      body: article.excerpt || article.title,
      url: `/articolo/${article.slug}`,
      tag: `article-${article.slug}`,
      metadata: {
        slug: article.slug,
        categoryId: article.categoryId || null,
      },
      deliverNotBefore: getNextAllowedDeliveryAt(getReaderDeliveryPreferences(stateByUserId.get(userId))),
    }))

  await queuePushMessages(supabaseAdmin, queuedItems)

  const { data: subscriptions, error: subscriptionsError } = await supabaseAdmin
    .from('push_subscriptions')
    .select('id, user_id, guest_token, endpoint, subscription')
    .eq('is_active', true)
    .in('user_id', immediateUserIds)

  if (subscriptionsError) throw subscriptionsError

  const eligibleRecords = (subscriptions || []).filter((record) => record.user_id && immediateUserIds.includes(record.user_id))

  const { data: guestSubscriptions, error: guestSubscriptionsError } = await supabaseAdmin
    .from('push_subscriptions')
    .select('id, user_id, guest_token, endpoint, subscription')
    .eq('is_active', true)
    .not('guest_token', 'is', null)

  if (guestSubscriptionsError) throw guestSubscriptionsError

  const recordsByEndpoint = new Map<string, PushRecord>()
  for (const record of eligibleRecords as PushRecord[]) {
    recordsByEndpoint.set(record.endpoint, record)
  }
  for (const record of (guestSubscriptions || []) as PushRecord[]) {
    recordsByEndpoint.set(record.endpoint, record)
  }

  const allRecords = [...recordsByEndpoint.values()]

  if (!allRecords.length) {
    return {
      delivered: [],
      invalidated: [],
      failed: [],
      skipped: subscriptions?.length || 0,
    }
  }

  const summary = await sendNotificationToRecords(supabaseAdmin, allRecords, {
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
    queued: queuedItems.length,
    skipped: ((subscriptions?.length || 0) - eligibleRecords.length) + queuedItems.length,
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
    .select('notifications_enabled, preferences')
    .eq('user_id', userId)
    .maybeSingle()

  if (!state?.notifications_enabled) {
    return { delivered: [], invalidated: [], failed: [], skipped: 0 }
  }

  const preferences = getReaderDeliveryPreferences(state as ReaderStateRow)
  if (isWithinQuietHours(preferences)) {
    await queuePushMessages(supabaseAdmin, [{
      userId,
      type: payload.type || 'system',
      title: payload.title,
      body: payload.body || '',
      url: payload.url || '/area-bianconera',
      tag: `reader-event-${payload.type || 'system'}-${userId}`,
      metadata: payload.metadata || {},
      deliverNotBefore: getNextAllowedDeliveryAt(preferences),
    }])
    return { delivered: [], invalidated: [], failed: [], skipped: 0, queued: 1 }
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

async function upsertSubscriptionRecord(
  supabaseAdmin: ReturnType<typeof createClient>,
  payload: {
    userId?: string | null
    guestToken?: string | null
    subscription?: Record<string, unknown>
    userAgent?: string | null
  },
) {
  const subscription = payload.subscription || {}
  const endpoint = typeof subscription.endpoint === 'string' ? subscription.endpoint : ''
  const keys = typeof subscription.keys === 'object' && subscription.keys !== null ? subscription.keys as Record<string, unknown> : {}

  if (!endpoint) throw new Error('Subscription push non valida.')
  if (!payload.userId && !payload.guestToken) throw new Error('Destinatario subscription mancante.')

  const { data, error } = await supabaseAdmin
    .from('push_subscriptions')
    .upsert([{
      user_id: payload.userId || null,
      guest_token: payload.userId ? null : payload.guestToken || null,
      endpoint,
      subscription,
      p256dh: typeof keys.p256dh === 'string' ? keys.p256dh : '',
      auth: typeof keys.auth === 'string' ? keys.auth : '',
      user_agent: payload.userAgent || null,
      is_active: true,
      last_seen_at: new Date().toISOString(),
      last_error: null,
    }], { onConflict: 'endpoint' })
    .select('id, user_id, guest_token, endpoint')
    .single()

  if (error) throw error
  return data
}

async function deleteSubscriptionRecord(
  supabaseAdmin: ReturnType<typeof createClient>,
  payload: {
    userId?: string | null
    guestToken?: string | null
    endpoint?: string | null
  },
) {
  if (!payload.endpoint) throw new Error('Endpoint subscription mancante.')
  if (!payload.userId && !payload.guestToken) throw new Error('Destinatario subscription mancante.')

  let query = supabaseAdmin
    .from('push_subscriptions')
    .delete()
    .eq('endpoint', payload.endpoint)

  query = payload.userId
    ? query.eq('user_id', payload.userId)
    : query.eq('guest_token', payload.guestToken as string)

  const { error } = await query
  if (error) throw error

  return { deleted: true }
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
    const body = await req.json().catch(() => ({}))
    const action = body?.action || 'send-test'

    if (action === 'process-pending' && cronSecret && body?.cronSecret === cronSecret) {
      const summary = await processPendingDeliveries(supabaseAdmin)
      return jsonResponse(summary)
    }

    if (action === 'upsert-subscription') {
      const data = await upsertSubscriptionRecord(supabaseAdmin, {
        userId: body.userId || null,
        guestToken: body.guestToken || null,
        subscription: body.subscription || {},
        userAgent: body.userAgent || null,
      })
      return jsonResponse(data)
    }

    if (action === 'delete-subscription') {
      const data = await deleteSubscriptionRecord(supabaseAdmin, {
        userId: body.userId || null,
        guestToken: body.guestToken || null,
        endpoint: body.endpoint || null,
      })
      return jsonResponse(data)
    }

    const authHeader = req.headers.get('Authorization')
    const hasAuth = Boolean(authHeader)
    const user = hasAuth ? await getAuthenticatedUser(supabaseAdmin, authHeader) : null

    if (action === 'send-test') {
      const summary = await sendTestNotification(supabaseAdmin, {
        userId: user?.id || null,
        guestToken: user ? null : (body.guestToken || null),
      })
      return jsonResponse(summary)
    }

    if (action === 'send-reader-event') {
      if (!user) throw new Error('Unauthorized')
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
      .eq('id', user?.id)
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

    if (action === 'process-pending') {
      return jsonResponse({ error: 'Forbidden' }, 403)
    }

    return jsonResponse({ error: 'Unsupported action.' }, 400)
  } catch (error) {
    return jsonResponse({
      error: error instanceof Error ? error.message : 'Push notification error',
    }, 400)
  }
})
