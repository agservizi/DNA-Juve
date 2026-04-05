import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

type ReaderStateRow = {
  user_id: string
  history: unknown
  gamification: {
    xp?: number
    streak?: number
  } | null
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  if (!supabaseUrl || !serviceRoleKey) {
    return jsonResponse({ error: 'Supabase configuration missing.' }, 500)
  }

  const url = new URL(req.url)
  const limit = Math.min(Math.max(Number(url.searchParams.get('limit') || 10), 1), 50)

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  try {
    const [{ data: states, error: statesError }, { data: profiles, error: profilesError }] = await Promise.all([
      supabaseAdmin
        .from('reader_states')
        .select('user_id, history, gamification')
        .limit(500),
      supabaseAdmin
        .from('profiles')
        .select('id, username, avatar_url, role')
        .in('role', ['reader', 'author']),
    ])

    if (statesError) throw statesError
    if (profilesError) throw profilesError

    const profileMap = new Map((profiles || []).map((profile) => [profile.id, profile]))

    const entries = ((states || []) as ReaderStateRow[])
      .map((row) => {
        const profile = profileMap.get(row.user_id)
        const history = Array.isArray(row.history) ? row.history : []
        const gamification = row.gamification || {}
        const points = Number(gamification.xp || 0)
        const streak = Number(gamification.streak || 0)
        const articles = history.length

        return {
          id: row.user_id,
          name: profile?.username || 'Tifoso',
          avatarUrl: profile?.avatar_url || null,
          articles,
          streak,
          points,
        }
      })
      .filter((entry) => entry.points > 0 || entry.articles > 0 || entry.streak > 0)
      .sort((a, b) => {
        if (b.points !== a.points) return b.points - a.points
        if (b.articles !== a.articles) return b.articles - a.articles
        return b.streak - a.streak
      })
      .slice(0, limit)

    return jsonResponse({ entries })
  } catch (error) {
    return jsonResponse({
      error: error instanceof Error ? error.message : 'Leaderboard error',
    }, 400)
  }
})
