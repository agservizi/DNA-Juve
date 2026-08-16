import 'server-only'

export type LiveNews = {
  id: string
  title: string
  description: string
  source: string
  url: string
  image: string | null
  date: string
  author: string | null
}

const RSS_FEEDS = [
  { route: 'rss/gazzetta', source: 'La Gazzetta dello Sport', juveOnly: true },
  { route: 'rss/tuttosport', source: 'Tuttosport', juveOnly: false },
  { route: 'rss/tuttojuve', source: 'TuttoJuve', juveOnly: false },
  { route: 'rss/juventusnews24', source: 'JuventusNews24', juveOnly: false },
  { route: 'rss/juvenews', source: 'JuveNews', juveOnly: false },
] as const

const JUVE_RE = /juve|juventus|bianconer/i

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

function parseRssXml(xml: string, source: string, juveOnly: boolean): LiveNews[] {
  const items = xml.match(/<item[\s\S]*?<\/item>/gi) || []
  const out: LiveNews[] = []

  for (const item of items) {
    const rawTitle = tagContent(item, 'title')
    const rawDescription = tagContent(item, 'description') || tagContent(item, 'content:encoded')
    const link = cleanHtml(tagContent(item, 'link') || tagContent(item, 'guid'))
    const pubDate = tagContent(item, 'pubDate')
    const title = cleanHtml(rawTitle)
    const description = cleanHtml(rawDescription).slice(0, 300)
    if (!title || !link) continue
    if (juveOnly && !JUVE_RE.test(`${title} ${description}`)) continue

    let date = new Date().toISOString()
    if (pubDate) {
      const parsed = new Date(pubDate)
      if (!Number.isNaN(parsed.getTime())) date = parsed.toISOString()
    }

    out.push({
      id: link || `${source}-${title.slice(0, 40)}`,
      title,
      description,
      source,
      url: link,
      image: extractImage(item, rawDescription),
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
    .map((a) => ({
      id: a.url,
      title: cleanHtml(a.title || ''),
      description: cleanHtml(a.description || ''),
      source: a.source?.name || 'Sconosciuta',
      url: a.url,
      image: a.urlToImage || null,
      date: a.publishedAt,
      author: a.author || null,
    }))
    .filter((a: LiveNews) => a.title && JUVE_RE.test(`${a.title} ${a.description}`))
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
      return parseRssXml(xml, feed.source, feed.juveOnly)
    }),
  )

  const articles = results
    .filter((r): r is PromiseFulfilledResult<LiveNews[]> => r.status === 'fulfilled')
    .flatMap((r) => r.value)
    .sort((a, b) => +new Date(b.date) - +new Date(a.date))

  return dedupe(articles).slice(0, 40)
}

/** NewsAPI first (if key valid), otherwise RSS via proxy-api — same sources as the legacy Vite app. */
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
