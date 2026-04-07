// Generates RSS and Sitemap XML as strings — shared by React routes and build scripts.
const SITE_URL =
  import.meta.env?.VITE_SITE_URL ||
  (typeof process !== 'undefined' ? process.env.VITE_SITE_URL : undefined) ||
  'https://bianconerihub.com'
const NORMALIZED_SITE_URL = SITE_URL.replace(/\/+$/, '')
const SITE_NAME = 'BianconeriHub'

export function generateRSS(articles = [], category = null) {
  const escapeXml = (str = '') =>
    String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

  const channelTitle = category
    ? `${SITE_NAME} — ${category.name}`
    : `${SITE_NAME} — Il Magazine Bianconero`
  const channelDesc = category
    ? `Articoli su ${category.name}: notizie, analisi e approfondimenti dalla redazione BianconeriHub.`
    : 'Notizie, analisi e approfondimenti sulla Juventus'
  const feedUrl = category
    ? `${NORMALIZED_SITE_URL}/feed/${category.slug}.xml`
    : `${NORMALIZED_SITE_URL}/feed.xml`

  const items = articles.map(a => `
    <item>
      <title>${escapeXml(a.title)}</title>
      <link>${NORMALIZED_SITE_URL}/articolo/${a.slug}</link>
      <guid isPermaLink="true">${NORMALIZED_SITE_URL}/articolo/${a.slug}</guid>
      <description>${escapeXml(a.excerpt || '')}</description>
      <pubDate>${new Date(a.published_at).toUTCString()}</pubDate>
      ${a.categories ? `<category>${escapeXml(a.categories.name)}</category>` : ''}
      ${a.cover_image ? `<enclosure url="${escapeXml(a.cover_image)}" type="image/jpeg" length="0"/>` : ''}
    </item>`).join('')

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:content="http://purl.org/rss/1.0/modules/content/">
  <channel>
    <title>${channelTitle}</title>
    <link>${NORMALIZED_SITE_URL}</link>
    <description>${channelDesc}</description>
    <language>it</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${feedUrl}" rel="self" type="application/rss+xml"/>
    ${items}
  </channel>
</rss>`
}

export function generateSitemap(articles = [], categories = []) {
  const staticUrls = [
    { url: '/', priority: '1.0', changefreq: 'daily' },
    { url: '/notizie-live', priority: '0.9', changefreq: 'hourly' },
    { url: '/calciomercato', priority: '0.9', changefreq: 'daily' },
    { url: '/calendario-partite', priority: '0.8', changefreq: 'daily' },
    { url: '/video', priority: '0.8', changefreq: 'daily' },
    { url: '/rosa', priority: '0.7', changefreq: 'weekly' },
    { url: '/area-bianconera', priority: '0.7', changefreq: 'daily' },
    { url: '/community/forum', priority: '0.8', changefreq: 'hourly' },
    { url: '/community/sondaggi', priority: '0.7', changefreq: 'daily' },
    { url: '/community/pagelle', priority: '0.7', changefreq: 'daily' },
    { url: '/calciomercato/tracker', priority: '0.7', changefreq: 'daily' },
    { url: '/cerca', priority: '0.3', changefreq: 'monthly' },
    { url: '/redazione', priority: '0.5', changefreq: 'monthly' },
    { url: '/chi-siamo', priority: '0.4', changefreq: 'monthly' },
    { url: '/contatti', priority: '0.3', changefreq: 'yearly' },
    { url: '/faq', priority: '0.3', changefreq: 'monthly' },
    { url: '/privacy', priority: '0.2', changefreq: 'yearly' },
    { url: '/cookie-policy', priority: '0.2', changefreq: 'yearly' },
    { url: '/termini', priority: '0.2', changefreq: 'yearly' },
    ...categories.map(c => ({ url: `/categoria/${c.slug}`, priority: '0.8', changefreq: 'daily' })),
  ]

  const articleUrls = articles.map(a => ({
    url: `/articolo/${a.slug}`,
    priority: a.featured ? '0.9' : '0.7',
    changefreq: 'weekly',
    lastmod: a.updated_at || a.published_at,
  }))

  const all = [...staticUrls, ...articleUrls]

  const urlset = all.map(({ url, priority, changefreq, lastmod }) => `
  <url>
    <loc>${NORMALIZED_SITE_URL}${url}</loc>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
    ${lastmod ? `<lastmod>${new Date(lastmod).toISOString().split('T')[0]}</lastmod>` : ''}
  </url>`).join('')

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  ${urlset}
</urlset>`
}
