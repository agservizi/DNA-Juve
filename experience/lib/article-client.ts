import { createClient } from '@/lib/supabase/client'

export type Reader = { id: string; email: string; name: string }
export type Comment = { id: string; author_name: string; content: string; created_at: string }
export type Poll = { id: string; question: string; is_active: boolean; options: Array<{ id: string; label: string; votes: number }>; totalVotes: number; currentVote: string | null }

export async function getReader(): Promise<Reader | null> {
  const client = createClient()
  const { data: { user } } = await client.auth.getUser()
  if (!user) return null
  const { data } = await client.from('profiles').select('username').eq('id', user.id).maybeSingle()
  return { id: user.id, email: user.email || '', name: data?.username || user.user_metadata?.display_name || user.email?.split('@')[0] || 'Tifoso' }
}

export async function countView(articleId: string) {
  const { error } = await createClient().rpc('increment_article_views', { target_article_id: articleId })
  if (error) throw error
}

export async function getComments(articleId: string) {
  const { data, error } = await createClient().from('comments').select('id,author_name,content,created_at').eq('article_id', articleId).eq('approved', true).order('created_at')
  if (error) throw error
  return (data || []) as Comment[]
}

export async function postComment(articleId: string, name: string, email: string, content: string) {
  const { error } = await createClient().from('comments').insert([{ article_id: articleId, author_name: name, author_email: email || null, content, approved: false }])
  if (error) throw error
}

export async function getReactions(articleId: string, userId?: string) {
  const { data, error } = await createClient().from('article_reactions').select('emoji,user_id').eq('article_id', articleId)
  if (error) throw error
  const counts: Record<string, number> = {}
  let current: string | null = null
  for (const row of data || []) { counts[row.emoji] = (counts[row.emoji] || 0) + 1; if (userId === row.user_id) current = row.emoji }
  return { counts, current }
}

export async function setReaction(articleId: string, userId: string, emoji: string | null) {
  const client = createClient()
  const query = emoji
    ? client.from('article_reactions').upsert([{ article_id: articleId, user_id: userId, emoji }], { onConflict: 'article_id,user_id' })
    : client.from('article_reactions').delete().eq('article_id', articleId).eq('user_id', userId)
  const { error } = await query
  if (error) throw error
}

export async function getPoll(articleId: string, userId?: string): Promise<Poll | null> {
  const client = createClient()
  const { data: poll, error } = await client.from('article_polls').select('id,question,is_active,article_poll_options(id,label,position)').eq('article_id', articleId).maybeSingle()
  if (error || !poll) return null
  const { data: votes } = await client.from('article_poll_votes').select('option_id,user_id').eq('poll_id', poll.id)
  const counts: Record<string, number> = {}
  for (const vote of votes || []) counts[vote.option_id] = (counts[vote.option_id] || 0) + 1
  const options = ((poll.article_poll_options || []) as Array<{id:string;label:string;position:number}>).sort((a,b) => a.position-b.position).map((option) => ({ ...option, votes: counts[option.id] || 0 }))
  return { id: poll.id, question: poll.question, is_active: poll.is_active, options, totalVotes: (votes || []).length, currentVote: userId ? (votes || []).find((vote) => vote.user_id === userId)?.option_id || null : null }
}

export async function votePoll(pollId: string, optionId: string, userId: string) {
  const { error } = await createClient().from('article_poll_votes').upsert([{ poll_id: pollId, option_id: optionId, user_id: userId }], { onConflict: 'poll_id,user_id' })
  if (error) throw error
}

export async function getReaderState(userId: string) {
  const { data, error } = await createClient().from('reader_states').select('bookmarks,history').eq('user_id', userId).maybeSingle()
  if (error) throw error
  return { bookmarks: Array.isArray(data?.bookmarks) ? data.bookmarks : [], history: Array.isArray(data?.history) ? data.history : [] }
}

export async function saveReaderState(userId: string, bookmarks: unknown[], history: unknown[]) {
  const { error } = await createClient().from('reader_states').upsert([{ user_id: userId, bookmarks, history, last_synced_at: new Date().toISOString() }], { onConflict: 'user_id' })
  if (error) throw error
}
