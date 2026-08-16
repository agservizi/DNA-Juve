import { slugify } from '@/lib/slugify'

export type LiveNews = {
  id: string
  slug: string
  title: string
  description: string
  body: string
  source: string
  url: string
  image: string | null
  date: string
  author: string | null
}

const RSS_FEEDS = [
  { route: 'rss/gazzetta', source: 'La Gazzetta dello Sport' },
  { route: 'rss/tuttosport', source: 'Tuttosport' },
  { route: 'rss/tuttojuve', source: 'TuttoJuve' },
  { route: 'rss/juventusnews24', source: 'JuventusNews24' },
  { route: 'rss/juvenews', source: 'JuveNews' },
] as const

const JUVE_RE = /\b(?:juventus|juve|bianconer[ioa]?)\b/i
const EX_JUVE_RE = /\bex[-\s]+(?:la\s+)?(?:juventus|bianconer\w*)\b/gi

/** Keep only items actually about Juventus — not gossip that only says "ex Juventus". */
function isAboutJuventus(title: string, description = '') {
  if (!title) return false
  const scrub = (value: string) => value.replace(EX_JUVE_RE, ' ')
  if (!JUVE_RE.test(scrub(title))) return false
  return JUVE_RE.test(scrub(`${title} ${description}`))
}

function proxyBase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) return null
  return { url, key }
}

function cleanHtml(value: string) {
  return String(value || '')
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/gi, '$1')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCharCode(parseInt(n, 16)))
    .replace(/&nbsp;/gi, ' ')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim()
}

function tagContent(block: string, name: string) {
  const cdata = block.match(new RegExp(`<${name}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${name}>`, 'i'))
  if (cdata?.[1] != null) return cdata[1].trim()
  const plain = block.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)<\\/${name}>`, 'i'))
  return (plain?.[1] || '').trim()
}

function extractImage(itemXml: string, rawDescription: string) {
  const media = itemXml.match(/<media:content[^>]+url=["']([^"']+)["']/i)
  if (media?.[1]) return media[1]
  const enclosure = itemXml.match(/<enclosure[^>]+url=["']([^"']+)["'][^>]*(?:type=["']image[^"']*["'])?/i)
  if (enclosure?.[1]) return enclosure[1]
  const img = rawDescription.match(/<img[^>]+src=["']([^"']+)["']/i)
  return img?.[1] || null
}

function shortId(value: string) {
  let hash = 0
  for (let i = 0; i < value.length; i++) hash = (Math.imul(31, hash) + value.charCodeAt(i)) | 0
  return Math.abs(hash).toString(36).slice(0, 7)
}

export function liveNewsSlug(title: string, url: string) {
  const base = slugify(title).slice(0, 72) || 'notizia'
  return `${base}-${shortId(url)}`
}

export function liveNewsHref(item: Pick<LiveNews, 'slug'>) {
  return `/notizie-live/${item.slug}`
}

function toParagraphs(text: string) {
  const cleaned = text.replace(/\s+/g, ' ').trim()
  if (!cleaned) return []
  // Prefer sentence groups when the feed dumps one long blob
  const chunks = cleaned.split(/(?<=[.!?…])\s+(?=[A-ZÀÈÉÌÒÙ])/).filter((p) => p.trim().length > 40)
  if (chunks.length > 1) return chunks.map((p) => p.trim())
  return [cleaned]
}

function parseRssXml(xml: string, source: string): LiveNews[] {
  const items = xml.match(/<item[\s\S]*?<\/item>/gi) || []
  const out: LiveNews[] = []

  for (const item of items) {
    const rawTitle = tagContent(item, 'title')
    const rawDescription = tagContent(item, 'description')
    const rawContent = tagContent(item, 'content:encoded') || rawDescription
    const link = cleanHtml(tagContent(item, 'link') || tagContent(item, 'guid'))
    const pubDate = tagContent(item, 'pubDate')
    const title = cleanHtml(rawTitle)
    const body = cleanHtml(rawContent).slice(0, 4000)
    const description = cleanHtml(rawDescription || rawContent).slice(0, 320)
    if (!title || !link) continue
    if (!isAboutJuventus(title, description || body)) continue

    let date = new Date().toISOString()
    if (pubDate) {
      const parsed = new Date(pubDate)
      if (!Number.isNaN(parsed.getTime())) date = parsed.toISOString()
    }

    out.push({
      id: link,
      slug: liveNewsSlug(title, link),
      title,
      description,
      body: body || description,
      source,
      url: link,
      image: extractImage(item, rawContent || rawDescription),
      date,
      author: null,
    })
  }
  return out
}

function dedupe(articles: LiveNews[]) {
  const seen = new Set<string>()
  return articles.filter((article) => {
    const key = article.title.toLowerCase().replace(/[^a-z0-9àèéìòù]/gi, '').slice(0, 48)
    if (!key || seen.has(key)) return false
    seen.add(key)
    return true
  })
}

async function fetchFromNewsApi(base: { url: string; key: string }): Promise<LiveNews[]> {
  const q = new URLSearchParams({
    q: 'Juventus OR Juventus calciomercato OR Juventus mercato',
    language: 'it',
    sortBy: 'publishedAt',
    pageSize: '30',
  })
  const res = await fetch(`${base.url}/functions/v1/proxy-api/news/everything?${q}`, {
    headers: { apikey: base.key, Authorization: `Bearer ${base.key}` },
    next: { revalidate: 900 },
  })
  if (!res.ok) return []
  const json = await res.json()
  if (json.status && json.status !== 'ok') return []
  return ((json.articles || []) as any[])
    .map((a) => {
      const title = cleanHtml(a.title || '')
      const description = cleanHtml(a.description || '')
      const url = a.url || ''
      return {
        id: url,
        slug: liveNewsSlug(title, url),
        title,
        description,
        body: description,
        source: a.source?.name || 'Sconosciuta',
        url,
        image: a.urlToImage || null,
        date: a.publishedAt,
        author: a.author || null,
      } satisfies LiveNews
    })
    .filter((a: LiveNews) => a.title && a.url && isAboutJuventus(a.title, a.description))
}

async function fetchFromRss(base: { url: string; key: string }): Promise<LiveNews[]> {
  const results = await Promise.allSettled(
    RSS_FEEDS.map(async (feed) => {
      const res = await fetch(`${base.url}/functions/v1/proxy-api/${feed.route}`, {
        headers: { apikey: base.key, Authorization: `Bearer ${base.key}` },
        next: { revalidate: 900 },
      })
      if (!res.ok) return [] as LiveNews[]
      const xml = await res.text()
      return parseRssXml(xml, feed.source)
    }),
  )

  const articles = results
    .filter((r): r is PromiseFulfilledResult<LiveNews[]> => r.status === 'fulfilled')
    .flatMap((r) => r.value)
    .sort((a, b) => +new Date(b.date) - +new Date(a.date))

  return dedupe(articles).slice(0, 40)
}

/** NewsAPI first (if key valid), otherwise RSS via proxy-api. */
export async function getLiveNews(): Promise<LiveNews[]> {
  const base = proxyBase()
  if (!base) return []

  try {
    const fromNews = await fetchFromNewsApi(base)
    if (fromNews.length) return fromNews
  } catch {
    // fall through to RSS
  }

  try {
    return await fetchFromRss(base)
  } catch {
    return []
  }
}

export async function getLiveNewsBySlug(slug: string): Promise<LiveNews | null> {
  const wanted = String(slug || '').trim().toLowerCase()
  if (!wanted) return null
  const news = await getLiveNews()
  return news.find((item) => item.slug === wanted) || null
}

export function liveNewsParagraphs(item: LiveNews) {
  return toParagraphs(item.body || item.description)
}
