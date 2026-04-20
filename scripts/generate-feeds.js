import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'
import dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'
import { generateNewsSitemap, generateRSS, generateSitemap } from '../src/lib/feeds.js'
import { getSupabaseScriptConfig } from './env.js'

dotenv.config()

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, '..')
const distDir = path.join(rootDir, 'dist')

async function main() {
  let supabaseUrl = ''
  let supabaseKey = ''

  try {
    const config = getSupabaseScriptConfig()
    supabaseUrl = config.url
    supabaseKey = config.key
  } catch {
    console.warn('[generate-feeds] Missing Supabase env vars, skipping XML generation.')
    return
  }

  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })

  const [articlesRes, categoriesRes, tagsRes] = await Promise.all([
    supabase
      .from('articles')
      .select(`
        id, title, slug, excerpt, cover_image, published_at, updated_at, featured,
        categories(name, slug),
        profiles(username),
        article_tags(tags(name, slug))
      `)
      .eq('status', 'published')
      .order('published_at', { ascending: false })
      .limit(200),
    supabase
      .from('categories')
      .select('slug, name')
      .order('name'),
    supabase
      .from('tags')
      .select('slug, name')
      .order('name'),
  ])

  if (articlesRes.error) throw articlesRes.error
  if (categoriesRes.error) throw categoriesRes.error
  if (tagsRes.error) throw tagsRes.error

  const articles = articlesRes.data || []
  const categoryMap = new Map((categoriesRes.data || []).map((category) => [category.slug, { ...category, lastmod: null }]))
  const tagMap = new Map((tagsRes.data || []).map((tag) => [tag.slug, { ...tag, lastmod: null }]))
  const authorMap = new Map()

  for (const article of articles) {
    const articleLastmod = article.updated_at || article.published_at || null

    if (article.categories?.slug) {
      const existing = categoryMap.get(article.categories.slug) || { slug: article.categories.slug, name: article.categories.name || article.categories.slug, lastmod: null }
      if (!existing.lastmod || new Date(articleLastmod).getTime() > new Date(existing.lastmod).getTime()) {
        existing.lastmod = articleLastmod
      }
      categoryMap.set(article.categories.slug, existing)
    }

    for (const entry of article.article_tags || []) {
      const tag = entry?.tags
      if (!tag?.slug) continue
      const existing = tagMap.get(tag.slug) || { slug: tag.slug, name: tag.name || tag.slug, lastmod: null }
      if (!existing.lastmod || new Date(articleLastmod).getTime() > new Date(existing.lastmod).getTime()) {
        existing.lastmod = articleLastmod
      }
      tagMap.set(tag.slug, existing)
    }

    if (article.profiles?.username) {
      const existing = authorMap.get(article.profiles.username) || { username: article.profiles.username, lastmod: null }
      if (!existing.lastmod || new Date(articleLastmod).getTime() > new Date(existing.lastmod).getTime()) {
        existing.lastmod = articleLastmod
      }
      authorMap.set(article.profiles.username, existing)
    }
  }

  const categories = Array.from(categoryMap.values())
  const tags = Array.from(tagMap.values())
  const authors = Array.from(authorMap.values())

  await fs.mkdir(distDir, { recursive: true })
  await fs.writeFile(path.join(distDir, 'feed.xml'), generateRSS(articles), 'utf8')
  await fs.writeFile(path.join(distDir, 'sitemap.xml'), generateSitemap(articles, categories, tags, authors), 'utf8')
  await fs.writeFile(path.join(distDir, 'news-sitemap.xml'), generateNewsSitemap(articles), 'utf8')

  // Generate per-category RSS feeds
  const feedDir = path.join(distDir, 'feed')
  await fs.mkdir(feedDir, { recursive: true })
  let categoryFeedCount = 0
  for (const cat of categories) {
    if (!cat.slug || !cat.name) continue
    const catArticles = articles.filter(a => a.categories?.slug === cat.slug)
    if (!catArticles.length) continue
    const catRss = generateRSS(catArticles, { name: cat.name, slug: cat.slug })
    await fs.writeFile(path.join(feedDir, `${cat.slug}.xml`), catRss, 'utf8')
    categoryFeedCount++
  }

  console.log(`[generate-feeds] feed.xml, sitemap.xml, news-sitemap.xml, and ${categoryFeedCount} category feeds generated (${articles.length} articles, ${categories.length} categories, ${tags.length} tags, ${authors.length} authors).`)
}

main().catch((error) => {
  console.error('[generate-feeds] Failed to generate XML files:', error?.message || error)
  process.exitCode = 1
})
