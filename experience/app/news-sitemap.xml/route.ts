import { getSeoArticles, xml } from '@/lib/public-seo'

export const dynamic = 'force-dynamic'

/** Google News sitemap: articles published in the last 48 hours. */
export async function GET() {
  const site = (process.env.NEXT_PUBLIC_SITE_URL || 'https://bianconerihub.com').replace(/\/$/, '')
  const cutoff = Date.now() - 48 * 60 * 60 * 1000
  const articles = (await getSeoArticles()).filter((a) => {
    const published = +new Date(a.published_at)
    return Number.isFinite(published) && published >= cutoff
  })

  const urls = articles
    .map((a) => {
      const loc = `${site}/articolo/${xml(a.slug)}`
      const publicationDate = new Date(a.published_at).toISOString()
      return `<url><loc>${loc}</loc><news:news><news:publication><news:name>BianconeriHub</news:name><news:language>it</news:language></news:publication><news:publication_date>${publicationDate}</news:publication_date><news:title>${xml(a.title)}</news:title></news:news></url>`
    })
    .join('')

  const body = `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">${urls}</urlset>`
  return new Response(body, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=300, s-maxage=600',
    },
  })
}
