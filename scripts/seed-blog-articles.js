import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'
import { seedArticles } from './data/blogSeedArticles.js'

const supabaseUrl = process.env.VITE_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment.')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const baseCategories = [
  { name: 'Calcio', slug: 'calcio', color: '#1a56db' },
  { name: 'Mercato', slug: 'mercato', color: '#F5A623' },
  { name: 'Formazione', slug: 'formazione', color: '#057a55' },
  { name: 'Champions', slug: 'champions', color: '#7e3af2' },
  { name: 'Serie A', slug: 'serie-a', color: '#e02424' },
  { name: 'Interviste', slug: 'interviste', color: '#ff5a1f' },
]

function unique(values) {
  return [...new Set(values.filter(Boolean))]
}

function slugify(value = '') {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

async function ensureCategories() {
  const { error: upsertError } = await supabase
    .from('categories')
    .upsert(baseCategories, { onConflict: 'slug' })

  if (upsertError) throw upsertError

  const { data, error } = await supabase
    .from('categories')
    .select('id, slug')
    .in('slug', baseCategories.map((item) => item.slug))

  if (error) throw error

  return Object.fromEntries((data || []).map((item) => [item.slug, item.id]))
}

async function ensureTags(allTagNames) {
  const tagRows = unique(allTagNames).map((name) => ({
    name: name
      .split('-')
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' '),
    slug: slugify(name),
  }))

  if (!tagRows.length) return {}

  const { error: upsertError } = await supabase
    .from('tags')
    .upsert(tagRows, { onConflict: 'slug' })

  if (upsertError) throw upsertError

  const { data, error } = await supabase
    .from('tags')
    .select('id, slug')
    .in('slug', tagRows.map((item) => item.slug))

  if (error) throw error

  return Object.fromEntries((data || []).map((item) => [item.slug, item.id]))
}

async function seed() {
  const categoryMap = await ensureCategories()
  const tagMap = await ensureTags(seedArticles.flatMap((article) => article.tags || []))

  const articleRows = seedArticles.map((article) => ({
    title: article.title,
    slug: article.slug,
    excerpt: article.excerpt,
    content: article.content,
    cover_image: article.cover_image,
    category_id: categoryMap[article.categorySlug] || null,
    author_id: null,
    status: article.status,
    featured: Boolean(article.featured),
    views: article.views || 0,
    created_at: article.created_at,
    updated_at: article.updated_at,
    published_at: article.published_at,
    scheduled_at: null,
  }))

  const { data: insertedArticles, error: articleError } = await supabase
    .from('articles')
    .upsert(articleRows, { onConflict: 'slug' })
    .select('id, slug')

  if (articleError) throw articleError

  const articleIdBySlug = Object.fromEntries((insertedArticles || []).map((item) => [item.slug, item.id]))
  const articleIds = Object.values(articleIdBySlug)

  if (articleIds.length) {
    const { error: deleteLinksError } = await supabase
      .from('article_tags')
      .delete()
      .in('article_id', articleIds)

    if (deleteLinksError) throw deleteLinksError
  }

  const articleTagRows = seedArticles.flatMap((article) => {
    const articleId = articleIdBySlug[article.slug]
    if (!articleId) return []

    return unique(article.tags || []).map((tagSlug) => {
      const normalized = slugify(tagSlug)
      return {
        article_id: articleId,
        tag_id: tagMap[normalized],
      }
    }).filter((row) => row.tag_id)
  })

  if (articleTagRows.length) {
    const { error: insertLinksError } = await supabase
      .from('article_tags')
      .upsert(articleTagRows, { onConflict: 'article_id,tag_id' })

    if (insertLinksError) throw insertLinksError
  }

  const { count, error: countError } = await supabase
    .from('articles')
    .select('id', { count: 'exact', head: true })
    .in('slug', seedArticles.map((article) => article.slug))

  if (countError) throw countError

  console.log(`Seed completed: ${count || 0} seeded articles available.`)
}

seed().catch((error) => {
  console.error('Seed failed:')
  console.error(error)
  process.exit(1)
})

