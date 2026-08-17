import 'server-only'
import {
  channelChatId,
  getChat,
  sendMessage,
  sendPhoto,
  sendPoll,
  pinChatMessage,
  unpinChatMessage,
  sendMediaGroup,
  type TelegramMessage,
  type MediaGroupItem,
} from '@/lib/telegram/api'
import { createServiceClient } from '@/lib/telegram/session'
import type { Match, TransferRumor } from '@/lib/match-market-content'

export type AnnounceArticleInput = {
  title: string
  excerpt?: string | null
  url: string
  cover_image?: string | null
}

export type ChannelPostKind =
  | 'article'
  | 'kickoff'
  | 'fulltime'
  | 'goal'
  | 'live_digest'
  | 'morning_brief'
  | 'week_ahead'
  | 'market_hot'
  | 'video'
  | 'breaking'
  | 'poll'
  | 'club_pulse'
  | 'pagelle'
  | 'forum'
  | 'weekend'

export type ChannelSettings = {
  quiet_enabled: boolean
  quiet_start: string
  quiet_end: string
  digest_hours: string[]
  auto_kinds: Record<string, boolean>
  updated_at: string
}

function escapeHtml(value: string) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function buildCaption(input: AnnounceArticleInput) {
  const title = escapeHtml(input.title.trim())
  const excerpt = String(input.excerpt || '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 220)
  const lines = [`<b>${title}</b>`]
  if (excerpt) lines.push(escapeHtml(excerpt))
  lines.push(`<a href="${escapeHtml(input.url)}">Leggi su BianconeriHub</a>`)
  return lines.join('\n\n')
}

function isQuietNow(settings: ChannelSettings): boolean {
  if (!settings.quiet_enabled) return false
  const rome = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Rome',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(new Date())
  const now = rome.replace(':', '')
  const start = (settings.quiet_start || '23:00').replace(':', '')
  const end = (settings.quiet_end || '08:00').replace(':', '')
  if (start <= end) return now >= start && now < end
  return now >= start || now < end
}

// ─── Settings ─────────────────────────────────────────────────────────

export async function getChannelSettings(): Promise<ChannelSettings> {
  const db = createServiceClient()
  const { data, error } = await db
    .from('telegram_channel_settings')
    .select('*')
    .eq('id', 1)
    .maybeSingle()
  if (error) throw error
  if (!data) {
    return {
      quiet_enabled: false,
      quiet_start: '23:00',
      quiet_end: '08:00',
      digest_hours: ['08:00', '18:00'],
      auto_kinds: {
        kickoff: true, fulltime: true, live_digest: true, morning_brief: true,
        week_ahead: true, goal: true, article: true, video: true, market_hot: true,
      },
      updated_at: new Date().toISOString(),
    }
  }
  return {
    quiet_enabled: !!data.quiet_enabled,
    quiet_start: data.quiet_start || '23:00',
    quiet_end: data.quiet_end || '08:00',
    digest_hours: data.digest_hours || ['08:00', '18:00'],
    auto_kinds: (data.auto_kinds as Record<string, boolean>) || {},
    updated_at: data.updated_at,
  }
}

export async function updateChannelSettings(
  patch: Partial<Pick<ChannelSettings, 'quiet_enabled' | 'quiet_start' | 'quiet_end' | 'digest_hours' | 'auto_kinds'>>,
) {
  const db = createServiceClient()
  const { error } = await db
    .from('telegram_channel_settings')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', 1)
  if (error) throw error
}

// ─── Channel post dedup ──────────────────────────────────────────────

export async function listRecentChannelPosts(limit = 10) {
  const db = createServiceClient()
  const { data, error } = await db
    .from('telegram_channel_posts')
    .select('id,kind,ref_id,message_id,posted_at,payload')
    .order('posted_at', { ascending: false })
    .limit(limit)
  if (error) throw error
  return data || []
}

// ─── Core: announceChannelPost ───────────────────────────────────────

export async function announceChannelPost(opts: {
  kind: ChannelPostKind
  refId: string
  caption: string
  photoUrl?: string
  url?: string
  disableNotification?: boolean
  replyToMessageId?: number
}): Promise<{ ok: boolean; skipped: boolean; reason?: string; messageId?: number }> {
  const chatId = channelChatId()
  if (!chatId) return { ok: false, skipped: true, reason: 'TELEGRAM_CHANNEL_ID non configurato' }
  if (!process.env.TELEGRAM_BOT_TOKEN) return { ok: false, skipped: true, reason: 'TELEGRAM_BOT_TOKEN mancante' }

  const db = createServiceClient()
  const settings = await getChannelSettings()

  if (isQuietNow(settings) && opts.kind !== 'breaking') {
    return { ok: false, skipped: true, reason: 'Modalità silenziosa attiva' }
  }

  if (settings.auto_kinds[opts.kind] === false && opts.kind !== 'breaking') {
    return { ok: false, skipped: true, reason: `Auto-post ${opts.kind} disabilitato` }
  }

  const { data: existing } = await db
    .from('telegram_channel_posts')
    .select('id')
    .eq('kind', opts.kind)
    .eq('ref_id', opts.refId)
    .maybeSingle()
  if (existing) return { ok: false, skipped: true, reason: 'Già pubblicato' }

  const quiet = opts.disableNotification ?? isQuietNow(settings)

  try {
    let messageId: number | undefined
    if (opts.photoUrl && /^https?:\/\//i.test(opts.photoUrl)) {
      const msg = await sendPhoto(chatId, opts.photoUrl, {
        caption: opts.caption,
        parse_mode: 'HTML',
        disable_notification: quiet,
        reply_to_message_id: opts.replyToMessageId,
      })
      messageId = msg?.message_id
    } else {
      const msg = await sendMessage(chatId, opts.caption, {
        parse_mode: 'HTML',
        disable_web_page_preview: !opts.url,
        disable_notification: quiet,
        reply_to_message_id: opts.replyToMessageId,
      })
      messageId = msg?.message_id
    }

    await db.from('telegram_channel_posts').insert({
      kind: opts.kind,
      ref_id: opts.refId,
      message_id: messageId || null,
      payload: { url: opts.url },
    })

    return { ok: true, skipped: false, messageId }
  } catch (error) {
    console.error('[telegram-channel] announce failed', error instanceof Error ? error.message : error)
    return { ok: false, skipped: false, reason: error instanceof Error ? error.message : 'Invio canale fallito' }
  }
}

// ─── Legacy: announcePublishedArticle (preserved) ────────────────────

export async function announcePublishedArticle(input: AnnounceArticleInput) {
  const caption = buildCaption(input)
  return announceChannelPost({
    kind: 'article',
    refId: input.url,
    caption,
    photoUrl: input.cover_image || undefined,
    url: input.url,
  })
}

// ─── Typed helpers ───────────────────────────────────────────────────

const siteUrl = () => (process.env.NEXT_PUBLIC_SITE_URL || 'https://bianconerihub.com').replace(/\/+$/, '')

function matchLabel(m: Match) {
  return `${m.home} — ${m.away}`
}

function matchDateLabel(m: Match) {
  const d = new Date(m.date)
  return d.toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'Europe/Rome' })
    + ' '
    + d.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Rome' })
}

export async function announceKickoff(match: Match) {
  const label = matchLabel(match)
  const dateStr = matchDateLabel(match)
  const caption =
    `⚽ <b>Prossimo fischio d'inizio</b>\n\n` +
    `<b>${escapeHtml(label)}</b>\n` +
    `📅 ${escapeHtml(dateStr)}\n` +
    `🏟️ ${escapeHtml(match.venue || 'Da confermare')}\n` +
    `🏆 ${escapeHtml(match.competition)}\n\n` +
    `Forza Juve! 🤍🖤`
  return announceChannelPost({
    kind: 'kickoff',
    refId: `${match.id}`,
    caption,
    url: `${siteUrl()}/calendario`,
  })
}

export async function announceFulltime(match: Match) {
  const label = `${match.home} ${match.homeScore}–${match.awayScore} ${match.away}`
  const caption =
    `🏁 <b>Risultato finale</b>\n\n` +
    `<b>${escapeHtml(label)}</b>\n` +
    `🏆 ${escapeHtml(match.competition)}\n\n` +
    `<a href="${siteUrl()}/calendario">Calendario completo</a>`
  return announceChannelPost({
    kind: 'fulltime',
    refId: `${match.id}`,
    caption,
    url: `${siteUrl()}/calendario`,
  })
}

export async function announceLiveDigest(items: Array<{ title: string; url: string }>) {
  if (!items.length) return { ok: false, skipped: true, reason: 'Nessuna notizia' }
  const lines = items.slice(0, 8).map(
    (item, i) => `${i + 1}. <a href="${escapeHtml(item.url)}">${escapeHtml(item.title)}</a>`,
  )
  const now = new Date().toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Rome' })
  const caption = `📰 <b>Digest ${now}</b>\n\n${lines.join('\n')}`
  const refId = `digest:${new Date().toISOString().slice(0, 13)}`
  return announceChannelPost({ kind: 'live_digest', refId, caption })
}

export async function announceMarketHot(rumor: TransferRumor) {
  const direction = rumor.direction === 'in' ? '🟢 IN' : '🔴 OUT'
  const caption =
    `🔥 <b>Mercato · ${direction}</b>\n\n` +
    `<b>${escapeHtml(rumor.player_name)}</b>\n` +
    (rumor.from_team ? `Da: ${escapeHtml(rumor.from_team)}\n` : '') +
    (rumor.to_team ? `A: ${escapeHtml(rumor.to_team)}\n` : '') +
    (rumor.fee ? `💰 ${escapeHtml(rumor.fee)}\n` : '') +
    `Stato: ${escapeHtml(rumor.status)}\n` +
    (rumor.source ? `Fonte: ${escapeHtml(rumor.source)}` : '')
  return announceChannelPost({
    kind: 'market_hot',
    refId: `rumor:${rumor.id}`,
    caption,
    photoUrl: rumor.player_image || undefined,
    url: `${siteUrl()}/calciomercato`,
  })
}

export async function announceVideo(video: { id: string; title: string; thumbnail?: string | null; video_url?: string | null }) {
  const caption =
    `🎬 <b>Nuovo video</b>\n\n` +
    `<b>${escapeHtml(video.title)}</b>\n\n` +
    (video.video_url ? `<a href="${escapeHtml(video.video_url)}">Guarda</a>` : `<a href="${siteUrl()}">BianconeriHub</a>`)
  return announceChannelPost({
    kind: 'video',
    refId: `video:${video.id}`,
    caption,
    photoUrl: video.thumbnail || undefined,
    url: video.video_url || undefined,
  })
}

export async function announceBreaking(text: string, url?: string) {
  const caption = `🚨 <b>BREAKING</b>\n\n${escapeHtml(text)}`
    + (url ? `\n\n<a href="${escapeHtml(url)}">Dettagli</a>` : '')
  const refId = `breaking:${Date.now()}`
  return announceChannelPost({ kind: 'breaking', refId, caption, url })
}

export async function announceMorningBrief(items: Array<{ title: string; url: string }>) {
  if (!items.length) return { ok: false, skipped: true, reason: 'Nessuna notizia per la rassegna' }
  const lines = items.slice(0, 6).map(
    (item, i) => `${i + 1}. <a href="${escapeHtml(item.url)}">${escapeHtml(item.title)}</a>`,
  )
  const caption = `☀️ <b>Rassegna mattutina</b>\n\n${lines.join('\n')}\n\nBuona giornata bianconera! 🤍🖤`
  const refId = `morning:${new Date().toISOString().slice(0, 10)}`
  return announceChannelPost({ kind: 'morning_brief', refId, caption })
}

export async function announceWeekAhead(matches: Match[]) {
  if (!matches.length) return { ok: false, skipped: true, reason: 'Nessuna partita in settimana' }
  const lines = matches.slice(0, 5).map((m) => {
    const dateStr = matchDateLabel(m)
    return `• <b>${escapeHtml(matchLabel(m))}</b> — ${escapeHtml(dateStr)} (${escapeHtml(m.competition)})`
  })
  const caption = `📅 <b>Settimana bianconera</b>\n\n${lines.join('\n')}\n\n<a href="${siteUrl()}/calendario">Calendario</a>`
  const mon = new Date()
  mon.setDate(mon.getDate() - mon.getDay() + 1)
  const refId = `week:${mon.toISOString().slice(0, 10)}`
  return announceChannelPost({ kind: 'week_ahead', refId, caption, url: `${siteUrl()}/calendario` })
}

export async function announceWeekendWrap(input: {
  weekendKey: string
  label: string
  results: Match[]
  galleryCount: number
}) {
  const resultLines = input.results.slice(0, 4).map((m) => {
    const score = m.played ? `${m.homeScore}–${m.awayScore}` : '—'
    return `• <b>${escapeHtml(matchLabel(m))}</b> ${escapeHtml(score)}`
  })
  const caption =
    `🎬 <b>Weekend wrap · ${escapeHtml(input.label)}</b>\n\n` +
    (resultLines.length ? `${resultLines.join('\n')}\n\n` : '') +
    (input.galleryCount
      ? `${input.galleryCount} scatti in gallery · `
      : '') +
    `<a href="${siteUrl()}/">Apri la home</a>`
  return announceChannelPost({
    kind: 'weekend',
    refId: `weekend:${input.weekendKey}`,
    caption,
    url: siteUrl(),
    disableNotification: true,
  })
}

export async function announceClubPulse(stats: { predictions: number; xpTotal: number }) {
  const caption =
    `📊 <b>Club Pulse</b>\n\n` +
    `Pronostici questa settimana: <b>${stats.predictions}</b>\n` +
    `XP totali comunità: <b>${stats.xpTotal}</b>\n\n` +
    `<a href="${siteUrl()}">Partecipa</a>`
  const refId = `club:${new Date().toISOString().slice(0, 10)}`
  return announceChannelPost({ kind: 'club_pulse', refId, caption, url: siteUrl() })
}

export async function announcePagelleOpen(match: Match) {
  const caption =
    `📝 <b>Pagelle aperte!</b>\n\n` +
    `Vota i giocatori di <b>${escapeHtml(matchLabel(match))}</b>\n\n` +
    `<a href="${siteUrl()}/partita/${match.id}">Vai alle pagelle</a>`
  return announceChannelPost({
    kind: 'pagelle',
    refId: `pagelle:${match.id}`,
    caption,
    url: `${siteUrl()}/partita/${match.id}`,
  })
}

export async function announceForumHighlight(text: string, url?: string) {
  const caption = `💬 <b>Dalla community</b>\n\n${escapeHtml(text)}`
    + (url ? `\n\n<a href="${escapeHtml(url)}">Leggi</a>` : '')
  const refId = `forum:${Date.now()}`
  return announceChannelPost({ kind: 'forum', refId, caption, url })
}

// ─── Verify ──────────────────────────────────────────────────────────

export async function verifyChannelConfig() {
  const chatId = channelChatId()
  const publicUrl = String(process.env.NEXT_PUBLIC_TELEGRAM_CHANNEL_URL || '').trim()
  if (!chatId) {
    return {
      configured: false,
      ok: false,
      detail: 'Imposta TELEGRAM_CHANNEL_ID su Vercel',
      publicUrl: publicUrl || null,
    }
  }
  try {
    const chat = await getChat(chatId)
    return {
      configured: true,
      ok: true,
      detail: `${chat.title || chat.username || chat.id} (${chat.type})`,
      publicUrl: publicUrl || (chat.username ? `https://t.me/${chat.username}` : null),
      chat,
    }
  } catch (error) {
    return {
      configured: true,
      ok: false,
      detail: error instanceof Error ? error.message : 'getChat fallito',
      publicUrl: publicUrl || null,
    }
  }
}

// ─── sendChannelPoll (for sondaggio) ─────────────────────────────────

export async function sendChannelPoll(
  question: string,
  options: string[],
  opts?: { refId?: string; disableNotification?: boolean },
) {
  const chatId = channelChatId()
  if (!chatId) return { ok: false, skipped: true, reason: 'TELEGRAM_CHANNEL_ID non configurato' }

  try {
    const msg = await sendPoll(chatId, question, options, {
      is_anonymous: true,
      disable_notification: opts?.disableNotification,
    })
    const db = createServiceClient()
    const refId = opts?.refId || `poll:${Date.now()}`
    await db.from('telegram_channel_posts').insert({
      kind: 'poll',
      ref_id: refId,
      message_id: msg?.message_id || null,
      payload: { question },
    })
    return { ok: true, skipped: false, messageId: msg?.message_id }
  } catch (error) {
    return { ok: false, skipped: false, reason: error instanceof Error ? error.message : 'Sondaggio fallito' }
  }
}

// ─── Pin / Unpin helpers ─────────────────────────────────────────────

export async function pinLastKickoff() {
  const chatId = channelChatId()
  if (!chatId) return { ok: false, reason: 'Canale non configurato' }
  const db = createServiceClient()
  const { data } = await db
    .from('telegram_channel_posts')
    .select('message_id')
    .eq('kind', 'kickoff')
    .order('posted_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (!data?.message_id) return { ok: false, reason: 'Nessun kickoff trovato' }
  await pinChatMessage(chatId, data.message_id)
  return { ok: true, messageId: data.message_id }
}
