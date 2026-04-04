import { createClient } from '@supabase/supabase-js'
import { createMockClient } from './mockClient'
import { slugify } from './utils'
import { buildFanArticlePlaceholder, deriveFanArticleTags } from './fanArticles'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://your-project.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'your-anon-key'
const IS_MOCK = supabaseUrl.includes('your-project.supabase.co')

export const supabase = IS_MOCK ? createMockClient() : createClient(supabaseUrl, supabaseAnonKey)

// ─── AUTH ────────────────────────────────────────────────────────────────────
export const signIn = (email, password) =>
  supabase.auth.signInWithPassword({ email, password })

export const signOut = () => supabase.auth.signOut()

export const getSession = () => supabase.auth.getSession()

export const onAuthStateChange = (callback) =>
  supabase.auth.onAuthStateChange(callback)

// ─── ARTICLES ────────────────────────────────────────────────────────────────
export const getPublishedArticles = async ({ page = 1, limit = 12, category = null } = {}) => {
  let query = supabase
    .from('articles')
    .select(`
      id, title, slug, excerpt, cover_image, published_at, views, featured,
      categories(id, name, slug, color),
      profiles(username, avatar_url)
    `)
    .eq('status', 'published')
    .order('published_at', { ascending: false })
    .range((page - 1) * limit, page * limit - 1)

  if (category) query = query.eq('categories.slug', category)

  return query
}

export const getFeaturedArticles = () =>
  supabase
    .from('articles')
    .select(`
      id, title, slug, excerpt, cover_image, published_at,
      categories(id, name, slug, color),
      profiles(username)
    `)
    .eq('status', 'published')
    .eq('featured', true)
    .order('published_at', { ascending: false })
    .limit(5)

export const getArticleBySlug = (slug) =>
  supabase
    .from('articles')
    .select(`
      *,
      categories(id, name, slug, color),
      profiles(username, avatar_url)
    `)
    .eq('slug', slug)
    .eq('status', 'published')
    .single()

export const getRelatedArticles = (categoryId, excludeId) =>
  supabase
    .from('articles')
    .select('id, title, slug, cover_image, published_at, categories(name, slug, color)')
    .eq('status', 'published')
    .eq('category_id', categoryId)
    .neq('id', excludeId)
    .limit(3)

// ─── SMART RELATED ARTICLES ─────────────────────────────────────────────────
// Scores articles by shared tags (+2 each) and same category (+1), sorted by
// total score then recency. Falls back to category-only if no tags provided.
export const getSmartRelatedArticles = async (articleId, categoryId, tagIds = []) => {
  // No tags → fall back to simple category-based related
  if (!tagIds.length) {
    return getRelatedArticles(categoryId, articleId)
  }

  // 1. Find article IDs that share at least one tag with the current article
  const { data: tagMatches } = await supabase
    .from('article_tags')
    .select('article_id, tag_id')
    .in('tag_id', tagIds)

  const tagMatchIds = new Set(
    (tagMatches || [])
      .map(r => r.article_id)
      .filter(id => id !== articleId)
  )

  // Count shared tags per article
  const tagScores = {}
  for (const row of (tagMatches || [])) {
    if (row.article_id === articleId) continue
    tagScores[row.article_id] = (tagScores[row.article_id] || 0) + 1
  }

  // 2. Build list of candidate IDs: tag matches + same-category articles
  const { data: categoryMatches } = await supabase
    .from('articles')
    .select('id')
    .eq('status', 'published')
    .eq('category_id', categoryId)
    .neq('id', articleId)
    .limit(10)

  const allCandidateIds = new Set([
    ...tagMatchIds,
    ...(categoryMatches || []).map(a => a.id),
  ])

  if (!allCandidateIds.size) return { data: [], error: null }

  // 3. Fetch full article data for all candidates
  const { data: candidates } = await supabase
    .from('articles')
    .select('id, title, slug, cover_image, published_at, categories(name, slug, color)')
    .eq('status', 'published')
    .in('id', [...allCandidateIds])

  if (!candidates?.length) return { data: [], error: null }

  // 4. Score: +2 per shared tag, +1 for same category
  const catIds = new Set((categoryMatches || []).map(c => c.id))
  const scored = candidates.map(article => ({
    ...article,
    _score: (tagScores[article.id] || 0) * 2 + (catIds.has(article.id) ? 1 : 0),
  }))

  // 5. Sort by score desc, then by recency
  scored.sort((a, b) => {
    if (b._score !== a._score) return b._score - a._score
    return new Date(b.published_at) - new Date(a.published_at)
  })

  // 6. Return top 3, strip internal _score
  const top = scored.slice(0, 3).map(({ _score, ...rest }) => rest)
  return { data: top, error: null }
}

export const incrementViews = (id) =>
  supabase.rpc('increment_article_views', { article_id: id })

export const searchArticles = (query) =>
  supabase
    .from('articles')
    .select('id, title, slug, excerpt, cover_image, published_at, categories(name, slug, color)')
    .eq('status', 'published')
    .or(`title.ilike.%${query}%,excerpt.ilike.%${query}%`)
    .order('published_at', { ascending: false })
    .limit(20)

// ─── ADMIN ARTICLES ──────────────────────────────────────────────────────────
export const getAllArticles = () =>
  supabase
    .from('articles')
    .select(`
      id, title, slug, status, published_at, created_at, featured, views,
      categories(name, slug, color)
    `)
    .order('created_at', { ascending: false })

export const getArticleById = (id) =>
  supabase
    .from('articles')
    .select('*, categories(id, name, slug)')
    .eq('id', id)
    .single()

export const createArticle = (data) =>
  supabase.from('articles').insert([data]).select().single()

export const updateArticle = (id, data) =>
  supabase.from('articles').update(data).eq('id', id).select().single()

export const deleteArticle = (id) =>
  supabase.from('articles').delete().eq('id', id)

// ─── CATEGORIES ──────────────────────────────────────────────────────────────
export const getCategories = () =>
  supabase.from('categories').select('*').order('name')

export const createCategory = (data) =>
  supabase.from('categories').insert([data]).select().single()

export const updateCategory = (id, data) =>
  supabase.from('categories').update(data).eq('id', id).select().single()

export const deleteCategory = (id) =>
  supabase.from('categories').delete().eq('id', id)

// ─── STORAGE ─────────────────────────────────────────────────────────────────
export const uploadImage = async (file, path) => {
  const { data, error } = await supabase.storage
    .from('article-images')
    .upload(path, file, { upsert: true })
  if (error) throw error
  const { data: urlData } = supabase.storage
    .from('article-images')
    .getPublicUrl(data.path)
  return urlData.publicUrl
}

// ─── TAGS ────────────────────────────────────────────────────────────────────
export const getArticleTags = async (articleId) => {
  const { data } = await supabase
    .from('article_tags')
    .select('tags(id, name, slug)')
    .eq('article_id', articleId)
  return (data || []).map(r => r.tags).filter(Boolean)
}

export const upsertArticleTags = async (articleId, tags = []) => {
  // 1. Remove existing tags for this article
  await supabase.from('article_tags').delete().eq('article_id', articleId)
  if (!tags.length) return

  // 2. Upsert tags
  const tagRows = tags.map(t => ({ name: t.name, slug: t.slug }))
  const { data: upsertedTags } = await supabase
    .from('tags')
    .upsert(tagRows, { onConflict: 'slug' })
    .select()

  // 3. Get tag IDs (upsert may not return all — fetch by slug)
  const slugs = tags.map(t => t.slug)
  const { data: finalTags } = await supabase
    .from('tags')
    .select('id, slug')
    .in('slug', slugs)

  if (!finalTags?.length) return

  // 4. Insert article_tags
  const junctionRows = finalTags.map(t => ({ article_id: articleId, tag_id: t.id }))
  await supabase.from('article_tags').insert(junctionRows)
}

// ─── STATS ───────────────────────────────────────────────────────────────────
export const getDashboardStats = async () => {
  const [published, drafts, categories, totalViews] = await Promise.all([
    supabase.from('articles').select('id', { count: 'exact' }).eq('status', 'published'),
    supabase.from('articles').select('id', { count: 'exact' }).eq('status', 'draft'),
    supabase.from('categories').select('id', { count: 'exact' }),
    supabase.from('articles').select('views').eq('status', 'published'),
  ])
  const views = totalViews.data?.reduce((sum, a) => sum + (a.views || 0), 0) || 0
  return {
    published: published.count || 0,
    drafts: drafts.count || 0,
    categories: categories.count || 0,
    views,
  }
}

// ─── FAN ARTICLE SUBMISSIONS ───────────────────────────────────────────────
export const createFanArticleSubmission = (data) =>
  supabase
    .from('fan_article_submissions')
    .insert([{
      ...data,
      status: 'submitted',
      submitted_at: new Date().toISOString(),
    }])
    .select()
    .single()

export const getFanArticleSubmissions = ({ status = null } = {}) => {
  let query = supabase
    .from('fan_article_submissions')
    .select('*')
    .order('submitted_at', { ascending: false })

  if (status) query = query.eq('status', status)
  return query
}

export const updateFanArticleSubmission = (id, data) =>
  supabase
    .from('fan_article_submissions')
    .update({
      ...data,
      reviewed_at: data.status && data.status !== 'submitted' ? new Date().toISOString() : data.reviewed_at,
    })
    .eq('id', id)
    .select()
    .single()

async function ensureUniqueArticleSlug(baseSlug) {
  const normalized = slugify(baseSlug || 'articolo-tifoso')
  const { data } = await supabase
    .from('articles')
    .select('id')
    .eq('slug', normalized)
    .limit(1)

  if (!data?.length) return normalized
  return `${normalized}-${Date.now().toString().slice(-6)}`
}

export const approveFanArticleSubmission = async (submission, { authorId } = {}) => {
  const slug = await ensureUniqueArticleSlug(submission.title)

  let categoryId = null
  if (submission.category_slug) {
    const { data: category } = await supabase
      .from('categories')
      .select('id')
      .eq('slug', submission.category_slug)
      .maybeSingle()
    categoryId = category?.id || null
  }

  const articlePayload = {
    title: submission.title,
    slug,
    excerpt: submission.excerpt || '',
    content: submission.content,
    cover_image: buildFanArticlePlaceholder(submission.category_slug, submission.title),
    category_id: categoryId,
    author_id: authorId || null,
    status: 'draft',
    featured: false,
    published_at: null,
  }

  const { data: article, error: articleError } = await supabase
    .from('articles')
    .insert([articlePayload])
    .select()
    .single()

  if (articleError) throw articleError

  const generatedTags = deriveFanArticleTags({
    title: submission.title,
    excerpt: submission.excerpt,
    pitch: submission.pitch,
    categorySlug: submission.category_slug,
  })
  if (generatedTags.length) {
    await upsertArticleTags(article.id, generatedTags)
  }

  const { data: updatedSubmission, error: submissionError } = await updateFanArticleSubmission(submission.id, {
    status: 'approved',
    linked_article_id: article.id,
  })

  if (submissionError) throw submissionError

  return { article, submission: updatedSubmission }
}
