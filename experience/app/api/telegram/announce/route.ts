import { createClient } from '@supabase/supabase-js'
import { announcePublishedArticle, verifyChannelConfig } from '@/lib/telegram/channel'
import { isAdminProfile } from '@/lib/admin-auth'

export const dynamic = 'force-dynamic'

async function requireAdmin(request: Request) {
  const auth = request.headers.get('authorization') || ''
  const token = auth.replace(/^Bearer\s+/i, '').trim()
  if (!token) return { error: Response.json({ ok: false, error: 'Non autenticato' }, { status: 401 }) }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) return { error: Response.json({ ok: false, error: 'Supabase non configurato' }, { status: 503 }) }

  const db = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  })
  const { data: userData, error: userError } = await db.auth.getUser(token)
  if (userError || !userData.user) {
    return { error: Response.json({ ok: false, error: 'Sessione non valida' }, { status: 401 }) }
  }
  const { data: profile } = await db.from('profiles').select('role,username').eq('id', userData.user.id).maybeSingle()
  if (!isAdminProfile(profile)) {
    return { error: Response.json({ ok: false, error: 'Solo admin' }, { status: 403 }) }
  }
  return { db, user: userData.user }
}

/** GET — verify Telegram channel configuration */
export async function GET(request: Request) {
  const gate = await requireAdmin(request)
  if ('error' in gate && gate.error) return gate.error
  const status = await verifyChannelConfig()
  return Response.json(status)
}

/** POST — announce a published article to the public channel */
export async function POST(request: Request) {
  const gate = await requireAdmin(request)
  if ('error' in gate && gate.error) return gate.error

  const body = (await request.json().catch(() => null)) as {
    title?: string
    excerpt?: string
    url?: string
    cover_image?: string
    articleId?: string
  } | null

  let title = String(body?.title || '').trim()
  let excerpt = String(body?.excerpt || '').trim()
  let url = String(body?.url || '').trim()
  let cover = String(body?.cover_image || '').trim()

  if (body?.articleId) {
    const { data, error } = await gate.db!
      .from('articles')
      .select('title,excerpt,slug,cover_image,status')
      .eq('id', body.articleId)
      .maybeSingle()
    if (error) return Response.json({ ok: false, error: error.message }, { status: 400 })
    if (!data || data.status !== 'published') {
      return Response.json({ ok: false, error: 'Articolo non pubblicato' }, { status: 400 })
    }
    const site = (process.env.NEXT_PUBLIC_SITE_URL || 'https://bianconerihub.com').replace(/\/+$/, '')
    title = data.title
    excerpt = data.excerpt || ''
    url = `${site}/articolo/${data.slug}`
    cover = data.cover_image || ''
  }

  if (!title || !url) {
    return Response.json({ ok: false, error: 'title e url obbligatori' }, { status: 400 })
  }

  const result = await announcePublishedArticle({ title, excerpt, url, cover_image: cover || null })
  if (!result.ok) {
    return Response.json(result, { status: result.skipped ? 503 : 502 })
  }
  return Response.json(result)
}
