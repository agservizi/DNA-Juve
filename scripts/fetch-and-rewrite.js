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
const DEFAULT_IMAGE = `${SITE_URL}/og-default.png`
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

function extractFaqFromHtml(html) {
  if (!html) return []
  // Parse headings ending with ? followed by <p> paragraphs
  const faqs = []
  const headingRegex = /<h[23][^>]*>(.*?)<\/h[23]>/gi
  let match
  while ((match = headingRegex.exec(html)) !== null) {
    const questionText = stripHtml(match[1]).trim()
    if (!questionText.endsWith('?')) continue
    // Collect <p> content after this heading until next heading
    const afterHeading = html.slice(match.index + match[0].length)
    const nextHeadingMatch = afterHeading.match(/<h[123][^>]*>/i)
    const section = nextHeadingMatch ? afterHeading.slice(0, nextHeadingMatch.index) : afterHeading
    const paragraphs = []
    const pRegex = /<p[^>]*>(.*?)<\/p>/gi
    let pMatch
    while ((pMatch = pRegex.exec(section)) !== null) {
      const text = stripHtml(pMatch[1]).trim()
      if (text) paragraphs.push(text)
    }
    if (paragraphs.length > 0) {
      faqs.push({ question: questionText, answer: paragraphs.join(' ') })
    }
  }
  return faqs
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

function stripExistingPrerenderMeta(html) {
  return html
    .replace(/<!-- article-prerender-meta:start -->[\s\S]*?<!-- article-prerender-meta:end -->\s*/gi, '')
    .replace(/<!-- page-prerender-meta:start -->[\s\S]*?<!-- page-prerender-meta:end -->\s*/gi, '')
    .replace(/<link\s+rel=["']canonical["'][^>]*>\s*/gi, '')
    .replace(/<link\s+rel=["']alternate["'][^>]*hreflang=["'][^"']+["'][^>]*>\s*/gi, '')
    .replace(/<meta\s+(?:property|name)=["'](?:og:[^"']+|twitter:[^"']+|article:[^"']+|robots)["'][^>]*>\s*/gi, '')
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
    '/og-default.png',
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
    inLanguage: 'it-IT',
    contentLocation: {
      '@type': 'Place',
      name: 'Torino, Italia',
      geo: {
        '@type': 'GeoCoordinates',
        latitude: 45.109,
        longitude: 7.641,
      },
    },
  }

  return {
    fullTitle,
    description,
    canonicalUrl,
    metaBlock: `<!-- article-prerender-meta:start -->
<link rel="canonical" href="${escapeHtml(canonicalUrl)}" />
<link rel="alternate" hreflang="it" href="${escapeHtml(canonicalUrl)}" />
<link rel="alternate" hreflang="x-default" href="${escapeHtml(canonicalUrl)}" />
<meta name="robots" content="${escapeHtml(robots)}" />
<meta name="geo.region" content="IT-21" />
<meta name="geo.placename" content="Torino" />
<meta name="geo.position" content="45.109;7.641" />
<meta name="ICBM" content="45.109, 7.641" />
<meta name="language" content="it" />
<meta name="content-language" content="it-IT" />
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
${(() => {
  const faqs = extractFaqFromHtml(article.content)
  if (!faqs.length) return ''
  const faqLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map(f => ({
      '@type': 'Question',
      name: f.question,
      acceptedAnswer: { '@type': 'Answer', text: f.answer },
    })),
  }
  return `<script type="application/ld+json">${JSON.stringify(faqLd).replace(/</g, '\\u003c')}</script>`
})()}
<!-- article-prerender-meta:end -->`,
  }
}

function rewriteArticleHtml(templateHtml, article) {
  const { fullTitle, description, metaBlock } = buildHeadMeta(article)
  let html = stripExistingPrerenderMeta(templateHtml)

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

async function fetchCategories(supabase) {
  const { data, error } = await supabase
    .from('categories')
    .select('id, name, slug')
    .order('name')
  if (error) throw error
  return data || []
}

function buildPageMeta({ title, description, url, type = 'website' }) {
  const fullTitle = `${title} | ${SITE_NAME}`
  const canonicalUrl = `${SITE_URL}${url}`
  const imageUrl = DEFAULT_IMAGE

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: title,
    description,
    url: canonicalUrl,
    inLanguage: 'it-IT',
    isPartOf: { '@type': 'WebSite', name: SITE_NAME, url: SITE_URL },
  }

  return `<!-- page-prerender-meta:start -->
<link rel="canonical" href="${escapeHtml(canonicalUrl)}" />
<link rel="alternate" hreflang="it" href="${escapeHtml(canonicalUrl)}" />
<meta name="robots" content="index,follow,max-image-preview:large" />
<meta name="geo.region" content="IT-21" />
<meta name="geo.placename" content="Torino" />
<meta name="geo.position" content="45.109;7.641" />
<meta name="ICBM" content="45.109, 7.641" />
<meta property="og:site_name" content="${SITE_NAME}" />
<meta property="og:title" content="${escapeHtml(fullTitle)}" />
<meta property="og:description" content="${escapeHtml(description)}" />
<meta property="og:image" content="${escapeHtml(imageUrl)}" />
<meta property="og:url" content="${escapeHtml(canonicalUrl)}" />
<meta property="og:type" content="${type}" />
<meta property="og:locale" content="it_IT" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:site" content="@BianconeriHub" />
<meta name="twitter:title" content="${escapeHtml(fullTitle)}" />
<meta name="twitter:description" content="${escapeHtml(description)}" />
<meta name="twitter:image" content="${escapeHtml(imageUrl)}" />
<script type="application/ld+json">${JSON.stringify(jsonLd).replace(/</g, '\\u003c')}</script>
<!-- page-prerender-meta:end -->`
}

function rewritePageHtml(templateHtml, { title, description, url, type }) {
  const fullTitle = `${title} | ${SITE_NAME}`
  const metaBlock = buildPageMeta({ title, description, url, type })
  let html = stripExistingPrerenderMeta(templateHtml)

  html = replaceTag(html, /<title>[\s\S]*?<\/title>/i, `<title>${escapeHtml(fullTitle)}</title>`)
  html = replaceTag(
    html,
    /<meta\s+name=["']description["']\s+content=["'][^"']*["']\s*\/?>/i,
    `<meta name="description" content="${escapeHtml(description)}" />`,
  )
  html = html.replace('</head>', `  ${metaBlock}\n  </head>`)

  return html
}

async function main() {
  const templatePath = path.join(distDir, 'index.html')
  const templateHtml = await fs.readFile(templatePath, 'utf8')

  if (!supabaseUrl || !supabaseKey) {
    console.warn('[fetch-and-rewrite] Missing Supabase env vars, skipping prerender.')
    return
  }

  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const [articles, categories] = await Promise.all([
    fetchPublishedArticles(),
    fetchCategories(supabase),
  ])

  // ─── Prerender homepage ────────────────────────────────────────
  const homepageHtml = rewritePageHtml(templateHtml, {
    title: 'BianconeriHub - Il Magazine della Juventus',
    description: DEFAULT_DESCRIPTION,
    url: '/',
    type: 'website',
  })
  await fs.writeFile(path.join(distDir, 'index.html'), homepageHtml, 'utf8')
  console.log('[fetch-and-rewrite] prerendered homepage.')

  // ─── Prerender category pages ──────────────────────────────────
  for (const cat of categories) {
    if (!cat.slug) continue
    const catDir = path.join(distDir, 'categoria', cat.slug)
    const catHtml = rewritePageHtml(templateHtml, {
      title: `${cat.name} — Juventus`,
      description: `Tutti gli articoli su ${cat.name}: notizie, analisi e approfondimenti dalla redazione BianconeriHub.`,
      url: `/categoria/${cat.slug}`,
      type: 'website',
    })
    await fs.mkdir(catDir, { recursive: true })
    await fs.writeFile(path.join(catDir, 'index.html'), catHtml, 'utf8')
  }
  if (categories.length) {
    console.log(`[fetch-and-rewrite] prerendered ${categories.length} category pages.`)
  }

  // ─── Prerender 404 page ────────────────────────────────────────
  const notFoundHtml = rewritePageHtml(templateHtml, {
    title: 'Pagina non trovata',
    description: 'La pagina che cerchi non esiste. Torna alla homepage di BianconeriHub per le ultime notizie sulla Juventus.',
    url: '/404',
    type: 'website',
  })
  await fs.writeFile(path.join(distDir, '404.html'), notFoundHtml, 'utf8')
  console.log('[fetch-and-rewrite] prerendered 404 page.')

  // ─── Prerender article pages ───────────────────────────────────
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
