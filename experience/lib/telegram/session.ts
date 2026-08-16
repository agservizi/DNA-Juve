import 'server-only'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

export function createServiceClient() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Supabase service non configurato')
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
}

export type TelegramStep =
  | 'idle'
  | 'title'
  | 'excerpt'
  | 'content'
  | 'tags'
  | 'cover'
  | 'category'
  | 'status'

export type TelegramDraft = {
  title?: string
  excerpt?: string
  contentParts?: string[]
  tags?: string
  cover_image?: string
  category_id?: string
  category_name?: string
}

export type TelegramSession = {
  chat_id: number
  step: TelegramStep
  draft: TelegramDraft
  updated_at?: string
}

export async function getSession(db: SupabaseClient, chatId: number): Promise<TelegramSession> {
  const { data, error } = await db.from('telegram_bot_sessions').select('chat_id,step,draft,updated_at').eq('chat_id', chatId).maybeSingle()
  if (error) throw error
  if (!data) return { chat_id: chatId, step: 'idle', draft: {} }
  return {
    chat_id: chatId,
    step: (data.step as TelegramStep) || 'idle',
    draft: (data.draft as TelegramDraft) || {},
    updated_at: data.updated_at,
  }
}

export async function saveSession(db: SupabaseClient, session: TelegramSession) {
  const { error } = await db.from('telegram_bot_sessions').upsert(
    {
      chat_id: session.chat_id,
      step: session.step,
      draft: session.draft,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'chat_id' },
  )
  if (error) throw error
}

export async function clearSession(db: SupabaseClient, chatId: number) {
  await db.from('telegram_bot_sessions').delete().eq('chat_id', chatId)
}
