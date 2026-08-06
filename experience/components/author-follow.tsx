'use client'

import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export function AuthorFollow({ authorId }: { authorId: string }) {
  const [userId, setUserId] = useState<string | null>(null)
  const [following, setFollowing] = useState(false)
  const [count, setCount] = useState(0)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')

  const load = useCallback(async () => {
    const client = createClient()
    const [{ data: auth }, followers] = await Promise.all([
      client.auth.getUser(),
      client.from('author_follows').select('user_id', { count: 'exact', head: true }).eq('author_id', authorId),
    ])
    if (followers.error) throw followers.error
    const id = auth.user?.id || null
    setUserId(id)
    setCount(followers.count || 0)
    if (id) {
      const { data, error } = await client.from('author_follows').select('author_id').eq('author_id', authorId).eq('user_id', id).maybeSingle()
      if (error) throw error
      setFollowing(Boolean(data))
    }
  }, [authorId])

  useEffect(() => {
    const timer = window.setTimeout(() => { void load().catch(() => setMessage('Stato follow non disponibile.')) }, 0)
    return () => window.clearTimeout(timer)
  }, [load])

  async function toggle() {
    if (!userId) { setMessage('Accedi ad Area Bianconera per seguire questa firma.'); return }
    setBusy(true); setMessage('')
    const client = createClient()
    const result = following
      ? await client.from('author_follows').delete().eq('author_id', authorId).eq('user_id', userId)
      : await client.from('author_follows').upsert([{ author_id: authorId, user_id: userId }], { onConflict: 'user_id,author_id' })
    if (result.error) setMessage('Operazione non riuscita. Riprova.')
    else await load().catch(() => setMessage('Aggiornamento non verificabile.'))
    setBusy(false)
  }

  return <div className="author-follow"><button type="button" disabled={busy} aria-pressed={following} onClick={toggle}>{busy ? 'Aggiornamento…' : following ? 'Segui già ✓' : 'Segui autore'}</button><span>{count} follower</span>{message && <small role="status">{message}</small>}</div>
}
