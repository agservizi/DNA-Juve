import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const allowedRoles = new Set(['admin'])

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

async function getAuthorizedUser(supabaseAdmin: ReturnType<typeof createClient>, authHeader: string | null) {
  if (!authHeader) throw new Error('Missing authorization header')

  const token = authHeader.replace('Bearer ', '')
  const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
  if (authError || !user) throw new Error('Unauthorized')

  const { data: profile, error: profileError } = await supabaseAdmin
    .from('profiles')
    .select('id, role')
    .eq('id', user.id)
    .single()

  if (profileError || !profile || !allowedRoles.has(profile.role)) {
    throw new Error('Forbidden')
  }

  return { user, profile }
}

async function listAllUsers(supabaseAdmin: ReturnType<typeof createClient>) {
  const users: any[] = []
  let page = 1
  const perPage = 200

  while (true) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage })
    if (error) throw error

    const batch = data?.users || []
    users.push(...batch)

    if (batch.length < perPage) break
    page += 1
  }

  return users
}

function normalizeStatus(user: any) {
  if (user?.banned_until) return 'suspended'
  if (user?.last_sign_in_at) return 'active'
  if (user?.invited_at || !user?.email_confirmed_at) return 'invited'
  return 'active'
}

function normalizeRole(role: string | null | undefined) {
  return role === 'admin' ? 'admin' : 'author'
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { autoRefreshToken: false, persistSession: false } },
    )

    await getAuthorizedUser(supabaseAdmin, req.headers.get('Authorization'))

    const body = req.method === 'GET' ? {} : await req.json().catch(() => ({}))
    const action = body.action || 'list'

    if (action === 'list') {
      const authUsers = await listAllUsers(supabaseAdmin)
      const { data: allArticles, error: allArticlesError } = await supabaseAdmin
        .from('articles')
        .select('id, author_id, title, slug, status, created_at, updated_at, published_at')
        .not('author_id', 'is', null)

      if (allArticlesError) throw allArticlesError

      const articleAuthorIds = [...new Set((allArticles || []).map((article) => article.author_id).filter(Boolean))]
      const authEditorialIds = authUsers
        .filter((user) => ['admin', 'editor', 'author'].includes(user?.user_metadata?.role || ''))
        .map((user) => user.id)
      const { data: editorialProfiles, error: editorialProfilesError } = await supabaseAdmin
        .from('profiles')
        .select('id')
        .in('role', ['admin', 'editor', 'author'])

      if (editorialProfilesError) throw editorialProfilesError

      const candidateIds = [...new Set([
        ...articleAuthorIds,
        ...authEditorialIds,
        ...(editorialProfiles || []).map((profile) => profile.id),
      ])]

      const { data: profiles, error: profilesError } = candidateIds.length
        ? await supabaseAdmin
            .from('profiles')
            .select('id, username, avatar_url, bio, role, created_at, updated_at')
            .in('id', candidateIds)
            .order('updated_at', { ascending: false })
        : { data: [], error: null }

      if (profilesError) throw profilesError

      const usersById = new Map(authUsers.map((user) => [user.id, user]))
      const entries = (profiles || []).map((profile) => {
        const authUser = usersById.get(profile.id)
        const authored = (allArticles || []).filter((article) => article.author_id === profile.id)
        const published = authored.filter((article) => article.status === 'published')
        const drafts = authored.filter((article) => article.status === 'draft')
        const recentWindow = Date.now() - (30 * 24 * 60 * 60 * 1000)
        const publishedThisMonth = published.filter((article) => {
          const stamp = article.published_at || article.updated_at || article.created_at
          return stamp ? new Date(stamp).getTime() >= recentWindow : false
        }).length
        const latestArticle = [...authored].sort((a, b) => {
          const aDate = new Date(a.updated_at || a.published_at || a.created_at || 0).getTime()
          const bDate = new Date(b.updated_at || b.published_at || b.created_at || 0).getTime()
          return bDate - aDate
        })[0] || null

        return {
          id: profile.id,
          email: authUser?.email || null,
          username: profile.username || (authUser?.email ? authUser.email.split('@')[0] : 'Redattore'),
          avatar_url: profile.avatar_url || null,
          bio: profile.bio || '',
          role: normalizeRole(profile.role || authUser?.user_metadata?.role),
          status: normalizeStatus(authUser),
          invited_at: authUser?.invited_at || null,
          created_at: profile.created_at || authUser?.created_at || null,
          updated_at: profile.updated_at || null,
          last_sign_in_at: authUser?.last_sign_in_at || null,
          email_confirmed_at: authUser?.email_confirmed_at || null,
          articles_total: authored.length,
          published_total: published.length,
          drafts_total: drafts.length,
          published_last_30_days: publishedThisMonth,
          latest_article: latestArticle
            ? {
                id: latestArticle.id,
                title: latestArticle.title,
                slug: latestArticle.slug,
                status: latestArticle.status,
                at: latestArticle.published_at || latestArticle.updated_at || latestArticle.created_at,
              }
            : null,
        }
      }).sort((a, b) => {
        if (a.role === 'admin' && b.role !== 'admin') return -1
        if (a.role !== 'admin' && b.role === 'admin') return 1
        const aDate = new Date(a.last_sign_in_at || a.created_at || 0).getTime()
        const bDate = new Date(b.last_sign_in_at || b.created_at || 0).getTime()
        return bDate - aDate
      })

      const summary = {
        total: entries.length,
        admins: entries.filter((entry) => entry.role === 'admin').length,
        authors: entries.filter((entry) => entry.role === 'author').length,
        invited: entries.filter((entry) => entry.status === 'invited').length,
        active: entries.filter((entry) => entry.status === 'active').length,
        publishedLast30Days: entries.reduce((sum, entry) => sum + entry.published_last_30_days, 0),
      }

      return json({ entries, summary })
    }

    if (action === 'update-role') {
      const userId = String(body.userId || '')
      const role = normalizeRole(body.role)
      if (!userId) throw new Error('userId is required')

      const { error } = await supabaseAdmin
        .from('profiles')
        .update({ role })
        .eq('id', userId)

      if (error) throw error
      return json({ success: true })
    }

    if (action === 'resend-invite') {
      const email = String(body.email || '').trim()
      const role = normalizeRole(body.role)
      if (!email) throw new Error('email is required')

      const { data, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
        data: { role },
      })
      if (error) throw error

      return json({ success: true, data })
    }

    if (action === 'send-reset') {
      const email = String(body.email || '').trim()
      if (!email) throw new Error('email is required')

      const redirectTo = `${Deno.env.get('SITE_URL') || 'https://bianconerihub.com'}/admin/login`
      const { data, error } = await supabaseAdmin.auth.resetPasswordForEmail(email, { redirectTo })
      if (error) throw error

      return json({ success: true, data })
    }

    return json({ error: 'Unsupported action' }, 400)
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : 'Unknown error' }, 400)
  }
})
