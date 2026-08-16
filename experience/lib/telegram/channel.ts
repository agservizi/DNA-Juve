import 'server-only'
import { channelChatId, getChat, sendMessage, sendPhoto } from '@/lib/telegram/api'

export type AnnounceArticleInput = {
  title: string
  excerpt?: string | null
  url: string
  cover_image?: string | null
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

/** Posts a published article to the public Telegram channel. No-op if channel env is missing. */
export async function announcePublishedArticle(input: AnnounceArticleInput) {
  const chatId = channelChatId()
  if (!chatId) return { ok: false as const, skipped: true as const, reason: 'TELEGRAM_CHANNEL_ID non configurato' }
  if (!process.env.TELEGRAM_BOT_TOKEN) {
    return { ok: false as const, skipped: true as const, reason: 'TELEGRAM_BOT_TOKEN mancante' }
  }

  const title = input.title.trim()
  const url = String(input.url || '').trim()
  if (!title || !url) return { ok: false as const, skipped: true as const, reason: 'Titolo o URL mancanti' }

  const caption = buildCaption(input)
  const cover = String(input.cover_image || '').trim()

  try {
    if (cover && /^https?:\/\//i.test(cover)) {
      await sendPhoto(chatId, cover, { caption, parse_mode: 'HTML' })
    } else {
      await sendMessage(chatId, caption, { parse_mode: 'HTML', disable_web_page_preview: false })
    }
    return { ok: true as const, skipped: false as const }
  } catch (error) {
    console.error('[telegram-channel] announce failed', error instanceof Error ? error.message : error)
    return {
      ok: false as const,
      skipped: false as const,
      reason: error instanceof Error ? error.message : 'Invio canale fallito',
    }
  }
}

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
