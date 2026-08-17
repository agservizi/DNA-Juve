import { createClient } from '@supabase/supabase-js'
import { getLiveNews } from '@/lib/live-news'

export const dynamic = 'force-dynamic'

const ROME = 'Europe/Rome'

type ReaderStateRow = {
  user_id: string
  notifications_enabled: boolean | null
  preferences: {
    notificationSettings?: {
      quietHoursEnabled?: boolean
      quietHoursStart?: string
      quietHoursEnd?: string
      digestHour?: string
    }
  } | null
}

type ReaderNotificationRow = {
  user_id: string
  type: string
  title: string
  body: string | null
  url: string | null
  metadata: Record<string, unknown>
}

type ReaderReminderRow = {
  id: string
  user_id: string
  match_id: string
  minutes_before: number
  reminder_label: string
  scheduled_for: string
  match_payload: Record<string, unknown> | null
}

type PushQueueRow = {
  user_id: string
  type: string
  title: string
  body: string | null
  url: string | null
  tag: string
  metadata: Record<string, unknown>
  deliver_not_before: string
}

type NotificationSettings = {
  quietHoursEnabled: boolean
  quietHoursStart: string
  quietHoursEnd: string
  digestHour: string
}

function getRomeParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: ROME,
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

function parseTimeToMinutes(value: string | undefined) {
  const [hours = '0', minutes = '0'] = String(value || '00:00').split(':')
  return (Number(hours) * 60) + Number(minutes)
}

function getNotificationSettings(state: ReaderStateRow | null | undefined): NotificationSettings {
  const settings = state?.preferences?.notificationSettings || {}
  return {
    quietHoursEnabled: settings.quietHoursEnabled !== false,
    quietHoursStart: typeof settings.quietHoursStart === 'string' ? settings.quietHoursStart : '23:00',
    quietHoursEnd: typeof settings.quietHoursEnd === 'string' ? settings.quietHoursEnd : '08:00',
    digestHour: typeof settings.digestHour === 'string' ? settings.digestHour : '08:30',
  }
}

function isWithinQuietHours(settings: NotificationSettings, now = new Date()) {
  if (!settings.quietHoursEnabled) return false
  const current = getRomeParts(now)
  const currentMinute = (current.hour * 60) + current.minute
  const startMinute = parseTimeToMinutes(settings.quietHoursStart)
  const endMinute = parseTimeToMinutes(settings.quietHoursEnd)

  if (startMinute === endMinute) return true
  if (startMinute < endMinute) return currentMinute >= startMinute && currentMinute < endMinute
  return currentMinute >= startMinute || currentMinute < endMinute
}

function isDigestDueThisHour(settings: NotificationSettings, now = new Date()) {
  const current = getRomeParts(now)
  const digestMinute = parseTimeToMinutes(settings.digestHour)
  const digestHour = Math.floor(digestMinute / 60)
  const digestMinutes = digestMinute % 60
  return current.hour === digestHour && current.minute >= digestMinutes
}

function formatReminderLabel(reminder: ReaderReminderRow) {
  if (String(reminder.reminder_label || '').trim()) return reminder.reminder_label
  if (reminder.minutes_before === 0) return 'Calcio d’inizio'
  if (reminder.minutes_before === 15) return '15m prima'
  if (reminder.minutes_before === 60) return '1h prima'
  if (reminder.minutes_before === 180) return '3h prima'
  if (reminder.minutes_before === 1440) return '24h prima'
  return `${reminder.minutes_before}m prima`
}

function reminderTitle(reminder: ReaderReminderRow) {
  const matchPayload = (reminder.match_payload || {}) as Record<string, unknown>
  const home = String(matchPayload.home || 'Juventus')
  const away = String(matchPayload.away || 'Avversaria')
  if (reminder.minutes_before === 0) return `Si parte: ${home} vs ${away}`
  return `${formatReminderLabel(reminder)}: ${home} vs ${away}`
}

function reminderBody(reminder: ReaderReminderRow) {
  const matchPayload = (reminder.match_payload || {}) as Record<string, unknown>
  const competition = matchPayload.competition
  const competitionName = typeof competition === 'string'
    ? competition
    : competition && typeof competition === 'object' && 'name' in competition
    ? String((competition as { name?: unknown }).name || '')
    : ''
  return [competitionName || 'Match Juventus', String(matchPayload.venue || 'Calendario Juventus')].filter(Boolean).join(' | ')
}

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET
  if (!secret) return Response.json({ ok: false, error: 'Cron non configurato' }, { status: 503 })
  if (request.headers.get('authorization') !== `Bearer ${secret}`) {
    return Response.json({ ok: false, error: 'Non autorizzato' }, { status: 401 })
  }

  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    return Response.json({ ok: false, error: 'Supabase service role non configurato' }, { status: 503 })
  }

  try {
    const db = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    })

    const now = new Date()
    const nowIso = now.toISOString()
    const oneHourAgoIso = new Date(now.getTime() - (60 * 60 * 1000)).toISOString()
    const romeNow = getRomeParts(now)

    const [
      { data: readerStates, error: statesError },
      { data: reminders, error: remindersError },
      { data: recentDigestRows, error: recentDigestError },
    ] = await Promise.all([
      db.from('reader_states').select('user_id, notifications_enabled, preferences'),
      db
        .from('reader_match_reminders')
        .select('id, user_id, match_id, minutes_before, reminder_label, scheduled_for, match_payload')
        .in('status', ['scheduled', 'queued'])
        .lte('scheduled_for', nowIso),
      db
        .from('reader_notifications')
        .select('user_id')
        .eq('type', 'reader-digest')
        .gte('created_at', oneHourAgoIso),
    ])

    if (statesError) throw statesError
    if (remindersError) throw remindersError
    if (recentDigestError) throw recentDigestError

    const states = (readerStates || []) as ReaderStateRow[]
    const stateByUserId = new Map(states.map((state) => [state.user_id, state]))
    const recentlyDigested = new Set((recentDigestRows || []).map((row) => String(row.user_id || '')))

    const digestCandidates = states.filter((state) => {
      if (!state.notifications_enabled) return false
      if (recentlyDigested.has(state.user_id)) return false
      return isDigestDueThisHour(getNotificationSettings(state), now)
    })

    const dueReminderRows = (reminders || []) as ReaderReminderRow[]
    const pushTargetUserIds = [...new Set([
      ...digestCandidates.map((state) => state.user_id),
      ...dueReminderRows.map((reminder) => reminder.user_id),
    ])]

    const { data: subscriptions, error: subscriptionsError } = pushTargetUserIds.length
      ? await db
          .from('push_subscriptions')
          .select('user_id')
          .eq('is_active', true)
          .in('user_id', pushTargetUserIds)
      : { data: [], error: null }

    if (subscriptionsError) throw subscriptionsError

    const pushEnabledUsers = new Set((subscriptions || []).map((row) => String(row.user_id || '')))
    const notifications: ReaderNotificationRow[] = []
    const pushQueue: PushQueueRow[] = []

    const liveNews = digestCandidates.length ? await getLiveNews().catch(() => []) : []
    const topTitles = liveNews.slice(0, 5).map((item) => item.title).filter(Boolean)
    const digestSlot = `${romeNow.year}-${String(romeNow.month).padStart(2, '0')}-${String(romeNow.day).padStart(2, '0')}T${String(romeNow.hour).padStart(2, '0')}:00`

    if (digestCandidates.length && topTitles.length) {
      for (const state of digestCandidates) {
        const settings = getNotificationSettings(state)
        const body = topTitles.join(' | ')
        notifications.push({
          user_id: state.user_id,
          type: 'reader-digest',
          title: 'Digest Juve: 5 notizie da leggere',
          body,
          url: '/notizie-live',
          metadata: { titles: topTitles, digestSlot },
        })

        if (!isWithinQuietHours(settings, now) && pushEnabledUsers.has(state.user_id)) {
          pushQueue.push({
            user_id: state.user_id,
            type: 'reader-digest',
            title: 'Digest Juve: 5 notizie da leggere',
            body,
            url: '/notizie-live',
            tag: `reader-digest-${state.user_id}-${digestSlot}`,
            metadata: { titles: topTitles, digestSlot },
            deliver_not_before: nowIso,
          })
        }
      }
    }

    for (const reminder of dueReminderRows) {
      const state = stateByUserId.get(reminder.user_id)
      const settings = getNotificationSettings(state)
      const title = reminderTitle(reminder)
      const body = reminderBody(reminder)

      notifications.push({
        user_id: reminder.user_id,
        type: 'match-reminder',
        title,
        body,
        url: `/partita/${reminder.match_id}`,
        metadata: {
          reminderId: reminder.id,
          matchId: reminder.match_id,
          minutesBefore: reminder.minutes_before,
        },
      })

      if (state?.notifications_enabled && !isWithinQuietHours(settings, now) && pushEnabledUsers.has(reminder.user_id)) {
        pushQueue.push({
          user_id: reminder.user_id,
          type: 'match-reminder',
          title,
          body,
          url: `/partita/${reminder.match_id}`,
          tag: `match-reminder-${reminder.id}`,
          metadata: {
            reminderId: reminder.id,
            matchId: reminder.match_id,
            minutesBefore: reminder.minutes_before,
          },
          deliver_not_before: nowIso,
        })
      }
    }

    if (notifications.length) {
      const { error } = await db.from('reader_notifications').insert(notifications)
      if (error) throw error
    }

    if (pushQueue.length) {
      const { error } = await db.from('reader_push_queue').insert(pushQueue)
      if (error) throw error
    }

    if (dueReminderRows.length) {
      const { error } = await db
        .from('reader_match_reminders')
        .update({ status: 'sent', sent_at: nowIso })
        .in('id', dueReminderRows.map((reminder) => reminder.id))
      if (error) throw error
    }

    const { data: pushData, error: pushError } = await db.functions.invoke('push-notifications', {
      body: { action: 'process-pending', cronSecret: secret },
    })
    const pushInvoke = pushError
      ? { ok: false, error: pushError.message }
      : { ok: true, data: pushData }

    return Response.json({
      ok: true,
      digestsCreated: notifications.filter((row) => row.type === 'reader-digest').length,
      remindersProcessed: dueReminderRows.length,
      notificationsInserted: notifications.length,
      pushQueued: pushQueue.length,
      pushInvoke,
      at: nowIso,
    })
  } catch (error) {
    return Response.json(
      { ok: false, error: error instanceof Error ? error.message : 'Digest lettori non riuscito' },
      { status: 500 },
    )
  }
}
