const SITE_NAME = 'BianconeriHub'
const SITE_URL = 'https://bianconerihub.com'
const DEFAULT_IMAGE = `${SITE_URL}/og-default.png`
const DEFAULT_DESCRIPTION =
  'Il magazine digitale dedicato alla Juventus. Analisi, notizie, mercato e tanto altro dalla redazione bianconera.'

const SUPABASE_URL = 'https://ncolenbfdiukkyfixovo.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5jb2xlbmJmZGl1a2t5Zml4b3ZvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUyNDEyNTQsImV4cCI6MjA5MDgxNzI1NH0.G9SJ1BjMdwiUUy0UPn-1DPa-lWaSbquvGoTW37JA0X0'

function escapeHtml(s: string) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function normalizeImageUrl(value: string | null | undefined): string {
  if (!value) return DEFAULT_IMAGE
  if (/^https?:\/\//i.test(value)) return value
  if (value.startsWith('/')) return `${SITE_URL}${value}`
  return `${SITE_URL}/${value}`
}

function stripHtml(html: string) {
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
}

Deno.serve(async (req) => {
  const url = new URL(req.url)

  // Extract slug from path: /og-meta/[slug] or /functions/v1/og-meta/[slug] or ?slug=
  const pathParts = url.pathname
    .replace(/^\/functions\/v1\/og-meta\/?/, '')
    .replace(/^\/og-meta\/?/, '')
    .split('/').filter(Boolean)
  const slug = pathParts[0] || url.searchParams.get('slug') || ''

  if (!slug) {
    return new Response('Missing slug', { status: 400 })
  }

  const apiKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || SUPABASE_ANON_KEY
  const apiUrl = `${SUPABASE_URL}/rest/v1/articles?slug=eq.${encodeURIComponent(slug)}&status=eq.published&select=title,slug,excerpt,content,cover_image,published_at,updated_at,meta_title,meta_description,og_image,noindex,categories(name),profiles(username)&limit=1`

  const res = await fetch(apiUrl, {
    headers: {
      apikey: apiKey,
      Authorization: `Bearer ${apiKey}`,
    },
  })

  if (!res.ok) {
    console.error('REST API error:', res.status, await res.text())
    return new Response('DB error', { status: 500 })
  }

  const rows = await res.json()
  if (!rows.length) {
    return new Response('Not found', { status: 404 })
  }

  const article = rows[0]
  const title = escapeHtml(article.meta_title || article.title || '')
  const fullTitle = escapeHtml(`${article.meta_title || article.title} | ${SITE_NAME}`)
  const description = escapeHtml(
    article.meta_description ||
    article.excerpt ||
    stripHtml(article.content || '').slice(0, 160) ||
    DEFAULT_DESCRIPTION
  )
  const imageUrl = escapeHtml(normalizeImageUrl(article.og_image || article.cover_image))
  const canonicalUrl = escapeHtml(`${SITE_URL}/articolo/${article.slug}`)
  const authorName = escapeHtml(article.profiles?.username || 'Redazione BianconeriHub')
  const categoryName = escapeHtml(article.categories?.name || '')

  const html = `<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="UTF-8" />
  <title>${fullTitle}</title>
  <meta name="description" content="${description}" />
  <link rel="canonical" href="${canonicalUrl}" />
  <meta property="og:site_name" content="${SITE_NAME}" />
  <meta property="og:type" content="article" />
  <meta property="og:title" content="${fullTitle}" />
  <meta property="og:description" content="${description}" />
  <meta property="og:image" content="${imageUrl}" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta property="og:url" content="${canonicalUrl}" />
  <meta property="og:locale" content="it_IT" />
  ${article.published_at ? `<meta property="article:published_time" content="${article.published_at}" />` : ''}
  ${article.updated_at ? `<meta property="article:modified_time" content="${article.updated_at}" />` : ''}
  <meta property="article:author" content="${authorName}" />
  ${categoryName ? `<meta property="article:section" content="${categoryName}" />` : ''}
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:site" content="@BianconeriHub" />
  <meta name="twitter:title" content="${fullTitle}" />
  <meta name="twitter:description" content="${description}" />
  <meta name="twitter:image" content="${imageUrl}" />
  <meta http-equiv="refresh" content="0;url=${canonicalUrl}" />
</head>
<body>
  <a href="${canonicalUrl}">${title}</a>
</body>
</html>`

  return new Response(html, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, max-age=300',
    },
  })
})
