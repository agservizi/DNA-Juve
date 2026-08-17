import 'server-only'
import { createClient } from '@supabase/supabase-js'
import { createServiceClient } from '@/lib/telegram/session'
import type { ForumThread } from '@/lib/community-reader-content'

function anonClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) return null
  return createClient(url, key, { auth: { persistSession: false } })
}

export async function getMatchThread(matchId: string): Promise<ForumThread | null> {
  const client = anonClient()
  if (!client) return null
  const { data, error } = await client
    .from('forum_threads')
    .select('id,category_id,title,content,author_id,author_name,is_pinned,is_locked,views,reply_count,like_count,follower_count,last_reply_at,created_at,match_id')
    .eq('match_id', String(matchId))
    .maybeSingle()
  if (error) throw error
  return data as ForumThread | null
}

export async function ensureMatchThread(input: {
  matchId: string
  home: string
  away: string
  authorId?: string
  authorName?: string
}): Promise<ForumThread> {
  const existing = await getMatchThread(input.matchId)
  if (existing) return existing

  const db = createServiceClient()
  const { data: categories, error: catError } = await db
    .from('forum_categories')
    .select('id')
    .order('display_order')
    .limit(1)
  if (catError) throw catError
  const categoryId = categories?.[0]?.id
  if (!categoryId) throw new Error('Nessuna categoria forum disponibile')

  let authorId = input.authorId
  let authorName = input.authorName || 'BianconeriHub'
  if (!authorId) {
    const { data: admin } = await db.from('profiles').select('id,username').eq('role', 'admin').limit(1).maybeSingle()
    authorId = admin?.id
    authorName = admin?.username || authorName
  }
  if (!authorId) throw new Error('Nessun autore disponibile per il thread matchday')

  const payload = {
    category_id: categoryId,
    title: `Matchday ${input.home} — ${input.away}`,
    content: `Discussione aperta per ${input.home} vs ${input.away}. Commenti, formazioni e reazioni in tempo reale.`,
    author_id: authorId,
    author_name: authorName,
    match_id: String(input.matchId),
    last_reply_at: new Date().toISOString(),
  }

  const { data, error } = await db.from('forum_threads').insert([payload]).select().single()
  if (error) {
    if (error.code === '23505') {
      const again = await getMatchThread(input.matchId)
      if (again) return again
    }
    throw error
  }
  return data as ForumThread
}
