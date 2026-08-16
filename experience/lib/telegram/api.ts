import 'server-only'

const API = 'https://api.telegram.org'

export type TelegramUser = { id: number; username?: string; first_name?: string }
export type TelegramChat = { id: number; type: string }
export type TelegramPhotoSize = { file_id: string; file_unique_id: string; width: number; height: number; file_size?: number }
export type TelegramMessage = {
  message_id: number
  chat: TelegramChat
  from?: TelegramUser
  text?: string
  caption?: string
  photo?: TelegramPhotoSize[]
  document?: { file_id: string; mime_type?: string; file_name?: string }
}
export type TelegramCallbackQuery = {
  id: string
  from: TelegramUser
  data?: string
  message?: TelegramMessage
}
export type TelegramUpdate = {
  update_id: number
  message?: TelegramMessage
  callback_query?: TelegramCallbackQuery
}

export type InlineButton = { text: string; callback_data: string }

function token() {
  const value = process.env.TELEGRAM_BOT_TOKEN
  if (!value) throw new Error('TELEGRAM_BOT_TOKEN mancante')
  return value
}

async function call<T>(method: string, body?: Record<string, unknown>): Promise<T> {
  const response = await fetch(`${API}/bot${token()}/${method}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  })
  const payload = (await response.json()) as { ok: boolean; result?: T; description?: string }
  if (!payload.ok) throw new Error(payload.description || `Telegram ${method} failed`)
  return payload.result as T
}

export function allowedChatIds() {
  return String(process.env.TELEGRAM_ALLOWED_CHAT_IDS || '')
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean)
    .map((x) => Number(x))
    .filter((x) => Number.isFinite(x))
}

export function isChatAllowed(chatId: number) {
  const allowed = allowedChatIds()
  if (!allowed.length) return false
  return allowed.includes(chatId)
}

export async function sendMessage(
  chatId: number | string,
  text: string,
  options?: {
    reply_markup?: { inline_keyboard: InlineButton[][] }
    parse_mode?: 'HTML'
    disable_web_page_preview?: boolean
  },
) {
  return call('sendMessage', {
    chat_id: chatId,
    text,
    disable_web_page_preview: options?.disable_web_page_preview ?? true,
    parse_mode: options?.parse_mode,
    reply_markup: options?.reply_markup,
  })
}

export async function sendPhoto(
  chatId: number | string,
  photo: string,
  options?: { caption?: string; parse_mode?: 'HTML' },
) {
  return call('sendPhoto', {
    chat_id: chatId,
    photo,
    caption: options?.caption,
    parse_mode: options?.parse_mode,
  })
}

export async function getChat(chatId: number | string) {
  return call<{ id: number; type: string; title?: string; username?: string }>('getChat', { chat_id: chatId })
}

export function channelChatId() {
  const raw = String(process.env.TELEGRAM_CHANNEL_ID || '').trim()
  if (!raw) return null
  if (/^-?\d+$/.test(raw)) return Number(raw)
  return raw.startsWith('@') ? raw : `@${raw}`
}

export async function answerCallback(callbackQueryId: string, text?: string) {
  return call('answerCallbackQuery', { callback_query_id: callbackQueryId, text, show_alert: false })
}

export async function getFile(fileId: string) {
  return call<{ file_id: string; file_path?: string }>('getFile', { file_id: fileId })
}

export async function downloadFile(filePath: string) {
  const response = await fetch(`${API}/file/bot${token()}/${filePath}`)
  if (!response.ok) throw new Error(`Download file Telegram fallito (${response.status})`)
  const contentType = response.headers.get('content-type') || 'application/octet-stream'
  const bytes = new Uint8Array(await response.arrayBuffer())
  return { bytes, contentType }
}

export async function setWebhook(url: string, secretToken?: string) {
  return call('setWebhook', {
    url,
    secret_token: secretToken || undefined,
    allowed_updates: ['message', 'callback_query'],
    drop_pending_updates: true,
  })
}

export async function getWebhookInfo() {
  return call('getWebhookInfo')
}

export function largestPhoto(message: TelegramMessage) {
  const photos = message.photo || []
  if (!photos.length) return null
  return [...photos].sort((a, b) => (b.file_size || 0) - (a.file_size || 0))[0]
}
