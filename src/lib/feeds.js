// Generates RSS and Sitemap XML as strings — used both in Vite middleware and React pages
const SITE_URL = import.meta.env?.VITE_SITE_URL || 'https://bianconerihub.com'
const SITE_NAME = 'BianconeriHub'

export function generateRSS(articles = []) {
  const escapeXml = (str = '') =>
    String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

  const items = articles.map(a => `
    <item>
      <title>${escapeXml(a.title)}</title>
      <link>${SITE_URL}/articolo/${a.slug}</link>
      <guid isPermaLink="true">${SITE_URL}/articolo/${a.slug}</guid>
      <description>${escapeXml(a.excerpt || '')}</description>
      <pubDate>${new Date(a.published_at).toUTCString()}</pubDate>
      ${a.categories ? `<category>${escapeXml(a.categories.name)}</category>` : ''}
      ${a.cover_image ? `<enclosure url="${escapeXml(a.cover_image)}" type="image/jpeg" length="0"/>` : ''}
    </item>`).join('')

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:content="http://purl.org/rss/1.0/modules/content/">
  <channel>
    <title>${SITE_NAME} — Il Magazine Bianconero</title>
    <link>${SITE_URL}</link>
    <description>Notizie, analisi e approfondimenti sulla Juventus</description>
    <language>it</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${SITE_URL}/feed.xml" rel="self" type="application/rss+xml"/>
    ${items}
  </channel>
</rss>`
}

export function generateSitemap(articles = [], categories = []) {
  const staticUrls = [
    { url: '/', priority: '1.0', changefreq: 'daily' },
    { url: '/cerca', priority: '0.3', changefreq: 'monthly' },
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
    <loc>${SITE_URL}${url}</loc>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
    ${lastmod ? `<lastmod>${new Date(lastmod).toISOString().split('T')[0]}</lastmod>` : ''}
  </url>`).join('')

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  ${urlset}
</urlset>`
}
