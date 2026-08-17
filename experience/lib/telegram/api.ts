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
    disable_notification?: boolean
    reply_to_message_id?: number
  },
) {
  return call<TelegramMessage>('sendMessage', {
    chat_id: chatId,
    text,
    disable_web_page_preview: options?.disable_web_page_preview ?? true,
    parse_mode: options?.parse_mode,
    reply_markup: options?.reply_markup,
    disable_notification: options?.disable_notification,
    reply_to_message_id: options?.reply_to_message_id,
  })
}

export async function sendPhoto(
  chatId: number | string,
  photo: string,
  options?: {
    caption?: string
    parse_mode?: 'HTML'
    disable_notification?: boolean
    reply_to_message_id?: number
  },
) {
  return call<TelegramMessage>('sendPhoto', {
    chat_id: chatId,
    photo,
    caption: options?.caption,
    parse_mode: options?.parse_mode,
    disable_notification: options?.disable_notification,
    reply_to_message_id: options?.reply_to_message_id,
  })
}

export async function sendPoll(
  chatId: number | string,
  question: string,
  pollOptions: string[],
  opts?: { is_anonymous?: boolean; disable_notification?: boolean },
) {
  return call<TelegramMessage>('sendPoll', {
    chat_id: chatId,
    question,
    options: pollOptions.map((text) => ({ text })),
    is_anonymous: opts?.is_anonymous ?? true,
    disable_notification: opts?.disable_notification,
  })
}

export async function pinChatMessage(chatId: number | string, messageId: number, silent = true) {
  return call('pinChatMessage', {
    chat_id: chatId,
    message_id: messageId,
    disable_notification: silent,
  })
}

export async function unpinChatMessage(chatId: number | string, messageId?: number) {
  return call('unpinChatMessage', {
    chat_id: chatId,
    ...(messageId ? { message_id: messageId } : {}),
  })
}

export type MediaGroupItem = {
  type: 'photo' | 'video'
  media: string
  caption?: string
  parse_mode?: 'HTML'
}

export async function sendMediaGroup(
  chatId: number | string,
  media: MediaGroupItem[],
  opts?: { disable_notification?: boolean },
) {
  return call<TelegramMessage[]>('sendMediaGroup', {
    chat_id: chatId,
    media,
    disable_notification: opts?.disable_notification,
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

export type BotCommand = { command: string; description: string }

/** Commands shown in Telegram's "/" menu for this bot. */
export const BOT_COMMANDS: BotCommand[] = [
  { command: 'nuovo', description: 'Crea un nuovo articolo' },
  { command: 'modifica', description: 'Modifica un articolo esistente' },
  { command: 'annulla', description: 'Interrompe la bozza o la modifica' },
  { command: 'promuovi', description: 'Promuovi notizia live a bozza articolo' },
  { command: 'flash', description: 'Breaking news sul canale' },
  { command: 'pubblica_canale', description: 'Pubblica articolo sul canale' },
  { command: 'partita', description: 'Prossime partite + annuncio kickoff' },
  { command: 'gol', description: 'Annuncio gol sul canale' },
  { command: 'risultato', description: 'Forza full-time sul canale' },
  { command: 'digest', description: 'Anteprima e invio digest notizie' },
  { command: 'mattina', description: 'Rassegna mattutina canale' },
  { command: 'rumor', description: 'Rumors mercato → canale' },
  { command: 'video_canale', description: 'Annuncia video sul canale' },
  { command: 'gallery_canale', description: 'Galleria foto → canale' },
  { command: 'sondaggio_canale', description: 'Sondaggio 1X2 sul canale' },
  { command: 'pin', description: 'Pinna ultimo kickoff sul canale' },
  { command: 'quiet', description: 'Modalità silenziosa on/off' },
  { command: 'auto', description: 'Auto-post per tipo on/off' },
  { command: 'stato', description: 'Stato webhook e canale' },
  { command: 'test_canale', description: 'Test messaggio solo in redazione' },
  { command: 'bozze', description: 'Lista bozze articoli' },
  { command: 'cerca', description: 'Cerca articoli per parola' },
  { command: 'thread', description: 'Crea thread matchday (opzionale)' },
  { command: 'pagelle', description: 'Crea pagelle per una partita' },
  { command: 'media', description: 'Prossima foto → gallery canale' },
  { command: 'club', description: 'Conteggio pronostici community' },
  { command: 'help', description: 'Mostra i comandi disponibili' },
]

export async function setMyCommands(commands: BotCommand[] = BOT_COMMANDS) {
  return call('setMyCommands', { commands })
}

export async function getMyCommands() {
  return call<BotCommand[]>('getMyCommands')
}

export function largestPhoto(message: TelegramMessage) {
  const photos = message.photo || []
  if (!photos.length) return null
  return [...photos].sort((a, b) => (b.file_size || 0) - (a.file_size || 0))[0]
}
