import { createClient } from '@supabase/supabase-js'
import { getSupabaseScriptConfig } from './env.js'

const EMAIL = 'demo@bianconerihub.com'
const PASSWORD = 'BianconeriHub!Demo26'
const USERNAME = 'Tifoso Demo'

const { url, key } = getSupabaseScriptConfig({ requireServiceRole: true })
const supabase = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })

async function findUser() {
  for (let page = 1; page <= 10; page += 1) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 100 })
    if (error) throw error
    const found = data.users.find((user) => user.email?.toLowerCase() === EMAIL)
    if (found) return found
    if (data.users.length < 100) break
  }
  return null
}

async function main() {
  let user = await findUser()
  if (user) {
    const { data, error } = await supabase.auth.admin.updateUserById(user.id, {
      password: PASSWORD,
      email_confirm: true,
      user_metadata: { ...user.user_metadata, display_name: USERNAME, role: 'reader', demo: true },
    })
    if (error) throw error
    user = data.user
  } else {
    const { data, error } = await supabase.auth.admin.createUser({
      email: EMAIL,
      password: PASSWORD,
      email_confirm: true,
      user_metadata: { display_name: USERNAME, role: 'reader', demo: true },
    })
    if (error) throw error
    user = data.user
  }

  const { data: articles, error: articlesError } = await supabase
    .from('articles')
    .select('id,title,slug,cover_image,published_at,categories(name,slug)')
    .eq('status', 'published')
    .order('published_at', { ascending: false })
    .limit(5)
  if (articlesError) throw articlesError

  const now = Date.now()
  const history = (articles || []).map((article, index) => ({
    articleId: article.id,
    slug: article.slug,
    title: article.title,
    categoryName: article.categories?.name || 'BianconeriHub',
    categorySlug: article.categories?.slug || '',
    readAt: new Date(now - index * 86400000).toISOString(),
    readingMinutes: 3 + index,
  }))
  const bookmarks = (articles || []).slice(0, 3).map((article, index) => ({
    articleId: article.id,
    slug: article.slug,
    title: article.title,
    coverImage: article.cover_image,
    categoryName: article.categories?.name || 'BianconeriHub',
    savedAt: new Date(now - index * 43200000).toISOString(),
  }))
  const gamification = {
    xp: 180,
    streak: 4,
    unlockedBadges: ['first-read', 'streak-3'],
    weeklyProgress: { articlesRead: 3, reactions: 1, bookmarks: 2, streakDays: 4 },
    collectedCards: ['p-1', 'p-2', 'p-3'],
    diary: [],
    predictions: [],
    fanArticles: [],
    avatar: 'shield',
  }

  const [{ error: profileError }, { error: stateError }] = await Promise.all([
    supabase.from('profiles').upsert({
      id: user.id,
      username: USERNAME,
      role: 'reader',
      bio: 'Account dimostrativo dell’Area Bianconera.',
    }, { onConflict: 'id' }),
    supabase.from('reader_states').upsert({
      user_id: user.id,
      bookmarks,
      history,
      preferences: {
        favoriteCategories: [],
        timeZone: 'Europe/Rome',
        cityLabel: 'Torino',
        reminderOffsets: [60, 15],
        notificationSettings: { quietHoursEnabled: true, quietHoursStart: '23:00', quietHoursEnd: '08:00', digestHour: '08:30', liveMode: 'smart' },
      },
      gamification,
      notifications_enabled: false,
      last_synced_at: new Date().toISOString(),
    }, { onConflict: 'user_id' }),
  ])
  if (profileError) throw profileError
  if (stateError) throw stateError

  console.log(`Demo reader ready: ${EMAIL}`)
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
})
