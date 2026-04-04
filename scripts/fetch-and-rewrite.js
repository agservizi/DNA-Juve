import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'
import dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'

dotenv.config()

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, '..')
const distDir = path.join(rootDir, 'dist')
const articleBaseDir = path.join(distDir, 'articolo')

const SITE_NAME = 'BianconeriHub'
const SITE_URL = (process.env.VITE_SITE_URL || 'https://bianconerihub.com').replace(/\/+$/, '')
const DEFAULT_IMAGE = `${SITE_URL}/og-default.svg`
const DEFAULT_DESCRIPTION =
  'Il magazine digitale dedicato alla Juventus. Analisi, notizie, mercato e tanto altro dalla redazione bianconera.'

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY

function normalizeAbsoluteUrl(value, fallbackPath = '') {
  if (!value) return fallbackPath ? `${SITE_URL}${fallbackPath}` : SITE_URL
  if (/^https?:\/\//i.test(value)) return value
  if (value.startsWith('/')) return `${SITE_URL}${value}`
  return `${SITE_URL}/${value}`
}

function stripHtml(value = '') {
  return String(value)
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function escapeHtml(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function replaceTag(html, pattern, replacement) {
  return pattern.test(html) ? html.replace(pattern, replacement) : html
}

function buildHeadMeta(article) {
  const title = article.meta_title || article.title
  const description =
    article.meta_description ||
    article.excerpt ||
    stripHtml(article.content).slice(0, 160) ||
    DEFAULT_DESCRIPTION
  const canonicalUrl = normalizeAbsoluteUrl(
    article.canonical_url || `/articolo/${article.slug}`,
    `/articolo/${article.slug}`,
  )
  const imageUrl = normalizeAbsoluteUrl(
    article.og_image || article.cover_image || DEFAULT_IMAGE,
    '/og-default.svg',
  )
  const fullTitle = `${title} | ${SITE_NAME}`
  const categoryName = article.categories?.name || ''
  const authorName = article.profiles?.username || 'Redazione BianconeriHub'
  const robots = article.noindex ? 'noindex,nofollow' : 'index,follow,max-image-preview:large'

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'NewsArticle',
    headline: title,
    description,
    image: imageUrl,
    datePublished: article.published_at,
    dateModified: article.updated_at || article.published_at,
    author: {
      '@type': 'Person',
      name: authorName,
    },
    publisher: {
      '@type': 'Organization',
      name: SITE_NAME,
      logo: {
        '@type': 'ImageObject',
        url: `${SITE_URL}/favicon.svg`,
      },
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': canonicalUrl,
    },
    articleSection: categoryName || undefined,
    url: canonicalUrl,
  }

  return {
    fullTitle,
    description,
    canonicalUrl,
    metaBlock: `<!-- article-prerender-meta:start -->
<link rel="canonical" href="${escapeHtml(canonicalUrl)}" />
<meta name="robots" content="${escapeHtml(robots)}" />
<meta property="og:site_name" content="${SITE_NAME}" />
<meta property="og:title" content="${escapeHtml(fullTitle)}" />
<meta property="og:description" content="${escapeHtml(description)}" />
<meta property="og:image" content="${escapeHtml(imageUrl)}" />
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="630" />
<meta property="og:url" content="${escapeHtml(canonicalUrl)}" />
<meta property="og:type" content="article" />
<meta property="og:locale" content="it_IT" />
<meta property="article:published_time" content="${escapeHtml(article.published_at || '')}" />
<meta property="article:modified_time" content="${escapeHtml(article.updated_at || article.published_at || '')}" />
<meta property="article:author" content="${escapeHtml(authorName)}" />
${categoryName ? `<meta property="article:section" content="${escapeHtml(categoryName)}" />` : ''}
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:site" content="@BianconeriHub" />
<meta name="twitter:title" content="${escapeHtml(fullTitle)}" />
<meta name="twitter:description" content="${escapeHtml(description)}" />
<meta name="twitter:image" content="${escapeHtml(imageUrl)}" />
<script type="application/ld+json">${JSON.stringify(jsonLd).replace(/</g, '\\u003c')}</script>
<!-- article-prerender-meta:end -->`,
  }
}

function rewriteArticleHtml(templateHtml, article) {
  const { fullTitle, description, metaBlock } = buildHeadMeta(article)
  let html = templateHtml

  html = replaceTag(
    html,
    /<title>[\s\S]*?<\/title>/i,
    `<title>${escapeHtml(fullTitle)}</title>`,
  )
  html = replaceTag(
    html,
    /<meta\s+name=["']description["']\s+content=["'][^"']*["']\s*\/?>/i,
    `<meta name="description" content="${escapeHtml(description)}" />`,
  )
  html = html.replace(/<!-- article-prerender-meta:start -->[\s\S]*?<!-- article-prerender-meta:end -->\s*/i, '')
  html = html.replace('</head>', `  ${metaBlock}\n  </head>`)

  return html
}

async function fetchPublishedArticles() {
  if (!supabaseUrl || !supabaseKey) {
    console.warn('[fetch-and-rewrite] Missing Supabase env vars, skipping article prerender.')
    return []
  }

  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })

  const { data, error } = await supabase
    .from('articles')
    .select(`
      id, title, slug, excerpt, content, cover_image, published_at, updated_at,
      meta_title, meta_description, canonical_url, og_image, noindex,
      categories(name, slug),
      profiles(username)
    `)
    .eq('status', 'published')
    .order('published_at', { ascending: false })
    .limit(200)

  if (error) throw error
  return data || []
}

async function main() {
  const templatePath = path.join(distDir, 'index.html')
  const templateHtml = await fs.readFile(templatePath, 'utf8')
  const articles = await fetchPublishedArticles()

  if (!articles.length) {
    console.warn('[fetch-and-rewrite] No published articles found, skipping article prerender.')
    return
  }

  await fs.mkdir(articleBaseDir, { recursive: true })

  await Promise.all(
    articles
      .filter((article) => article.slug)
      .map(async (article) => {
        const articleDir = path.join(articleBaseDir, article.slug)
        const articleHtml = rewriteArticleHtml(templateHtml, article)
        await fs.mkdir(articleDir, { recursive: true })
        await fs.writeFile(path.join(articleDir, 'index.html'), articleHtml, 'utf8')
      }),
  )

  console.log(`[fetch-and-rewrite] prerendered ${articles.length} article pages for social crawlers.`)
}

main().catch((error) => {
  console.error('[fetch-and-rewrite] Failed to prerender article HTML:', error?.message || error)
  process.exitCode = 1
})
