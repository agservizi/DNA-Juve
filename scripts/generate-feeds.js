import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'
import dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'
import { generateRSS, generateSitemap } from '../src/lib/feeds.js'
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

  const [articlesRes, categoriesRes] = await Promise.all([
    supabase
      .from('articles')
      .select(`
        id, title, slug, excerpt, cover_image, published_at, updated_at, featured,
        categories(name, slug)
      `)
      .eq('status', 'published')
      .order('published_at', { ascending: false })
      .limit(200),
    supabase
      .from('categories')
      .select('slug, name')
      .order('name'),
  ])

  if (articlesRes.error) throw articlesRes.error
  if (categoriesRes.error) throw categoriesRes.error

  const articles = articlesRes.data || []
  const categories = categoriesRes.data || []

  await fs.mkdir(distDir, { recursive: true })
  await fs.writeFile(path.join(distDir, 'feed.xml'), generateRSS(articles), 'utf8')
  await fs.writeFile(path.join(distDir, 'sitemap.xml'), generateSitemap(articles, categories), 'utf8')

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

  console.log(`[generate-feeds] feed.xml, sitemap.xml, and ${categoryFeedCount} category feeds generated (${articles.length} articles, ${categories.length} categories).`)
}

main().catch((error) => {
  console.error('[generate-feeds] Failed to generate XML files:', error?.message || error)
  process.exitCode = 1
})
