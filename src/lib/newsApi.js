// ── News API Service ────────────────────────────────────────────────────────
// Primary: NewsAPI.org  |  Fallback: RSS feeds (Gazzetta, Sky Sport, Tuttosport)
// Dev: Vite proxy  |  Prod: Supabase Edge Function

import { apiUrl, apiHeaders } from './apiProxy'

const QUERY = 'Juventus calciomercato OR Juventus mercato OR Juventus trasferimento'
const QUERY_EN = 'Juventus transfer OR Juventus signing'

// ── NewsAPI.org ─────────────────────────────────────────────────────────────

async function fetchFromNewsAPI() {
  const params = new URLSearchParams({
    q: QUERY,
    language: 'it',
    sortBy: 'publishedAt',
    pageSize: '30',
  })

  const res = await fetch(`${apiUrl('news', 'everything')}?${params}`, { headers: apiHeaders() })
  if (!res.ok) throw new Error(`NewsAPI error: ${res.status}`)

  const json = await res.json()
  if (json.status !== 'ok') throw new Error(json.message || 'NewsAPI failed')

  return (json.articles || [])
    .map(normalizeNewsApiArticle)
    .filter(a => containsJuve(`${a.title} ${a.description}`))
}

function normalizeNewsApiArticle(a) {
  return {
    id: a.url,
    title: cleanHtml(a.title || ''),
    description: cleanHtml(a.description || ''),
    source: a.source?.name || 'Sconosciuta',
    url: a.url,
    image: a.urlToImage || null,
    date: a.publishedAt,
    author: a.author || null,
  }
}

// ── RSS Feed Fallback ───────────────────────────────────────────────────────

const RSS_FEEDS = [
  { name: 'Gazzetta dello Sport', route: 'rss/gazzetta', source: 'La Gazzetta dello Sport' },
  { name: 'Sky Sport', route: 'rss/sky', source: 'Sky Sport' },
  { name: 'Tuttosport', route: 'rss/tuttosport', source: 'Tuttosport' },
  { name: 'Calciomercato.com', route: 'rss/calciomercato', source: 'Calciomercato.com' },
]

const JUVE_KEYWORDS = ['juventus', 'juve', 'bianconeri', 'bianconero']

function containsJuve(text) {
  const lower = text.toLowerCase()
  return JUVE_KEYWORDS.some(k => lower.includes(k))
}
const MERCATO_KEYWORDS = ['mercato', 'trasfer', 'acquist', 'cessio', 'rinnov', 'contratto', 'offerta', 'trattativa', 'colpo', 'affare', 'prestito', 'parametro', 'clausola']

function isJuveTransferNews(text) {
  const lower = text.toLowerCase()
  const hasJuve = containsJuve(text)
  const hasMercato = MERCATO_KEYWORDS.some(k => lower.includes(k))
  return hasJuve && hasMercato
}

// Decode HTML entities and strip tags
function cleanHtml(str) {
  if (!str) return ''
  // Strip HTML tags
  let clean = str.replace(/<[^>]+>/g, '')
  // Decode HTML entities using a temporary textarea
  const textarea = document.createElement('textarea')
  textarea.innerHTML = clean
  return textarea.value.trim()
}

function parseRSSXml(xmlText, sourceName) {
  const parser = new DOMParser()
  const doc = parser.parseFromString(xmlText, 'text/xml')
  const items = doc.querySelectorAll('item')
  const results = []

  items.forEach((item) => {
    const rawTitle = item.querySelector('title')?.textContent || ''
    const rawDescription = item.querySelector('description')?.textContent || ''
    const link = item.querySelector('link')?.textContent || ''
    const pubDate = item.querySelector('pubDate')?.textContent || ''

    // Clean HTML tags and decode entities
    const title = cleanHtml(rawTitle)
    const description = cleanHtml(rawDescription)

    // Extract image from media:content, enclosure, or raw description
    let image = null
    const mediaContent = item.querySelector('content')
    if (mediaContent) image = mediaContent.getAttribute('url')
    if (!image) {
      const enclosure = item.querySelector('enclosure')
      if (enclosure) image = enclosure.getAttribute('url')
    }
    if (!image) {
      const imgMatch = rawDescription.match(/<img[^>]+src="([^"]+)"/)
      if (imgMatch) image = imgMatch[1]
    }

    const fullText = `${title} ${description}`
    if (isJuveTransferNews(fullText)) {
      results.push({
        id: link || `${sourceName}-${title.slice(0, 30)}`,
        title,
        description: description.slice(0, 300),
        source: sourceName,
        url: link.trim(),
        image,
        date: pubDate ? new Date(pubDate).toISOString() : new Date().toISOString(),
        author: null,
      })
    }
  })

  return results
}

async function fetchFromRSS() {
  const results = await Promise.allSettled(
    RSS_FEEDS.map(async (feed) => {
      const res = await fetch(apiUrl(feed.route), { headers: apiHeaders() })
      if (!res.ok) throw new Error(`RSS ${feed.name}: ${res.status}`)
      const xml = await res.text()
      return parseRSSXml(xml, feed.source)
    })
  )

  const articles = results
    .filter(r => r.status === 'fulfilled')
    .flatMap(r => r.value)

  // Sort by date descending
  articles.sort((a, b) => new Date(b.date) - new Date(a.date))

  // Deduplicate by similar titles
  const seen = new Set()
  return articles.filter(a => {
    const key = a.title.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 40)
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

// ── Public API ──────────────────────────────────────────────────────────────

let _cache = { data: null, timestamp: 0 }
const CACHE_TTL = 15 * 60 * 1000 // 15 minutes

export async function getTransferNews() {
  // Return cached if fresh
  if (_cache.data && Date.now() - _cache.timestamp < CACHE_TTL) {
    return _cache.data
  }

  let articles = []

  // Try NewsAPI first
  try {
    articles = await fetchFromNewsAPI()
    if (articles.length > 0) {
      _cache = { data: articles, timestamp: Date.now() }
      return articles
    }
  } catch (err) {
    console.warn('[NewsAPI] Failed, falling back to RSS:', err.message)
  }

  // Fallback to RSS
  try {
    articles = await fetchFromRSS()
    if (articles.length > 0) {
      _cache = { data: articles, timestamp: Date.now() }
      return articles
    }
  } catch (err) {
    console.warn('[RSS] Failed:', err.message)
  }

  return articles
}

// ── TuttoJuve Calciomercato RSS ─────────────────────────────────────────────
// Dedicated feed for the Calciomercato/Rumor Tracker page

let _tjCache = { data: null, timestamp: 0 }

function parseTuttoJuveRSS(xmlText) {
  const parser = new DOMParser()
  const doc = parser.parseFromString(xmlText, 'text/xml')
  const items = doc.querySelectorAll('item')
  const results = []

  items.forEach((item) => {
    const rawTitle = item.querySelector('title')?.textContent || ''
    const rawDescription = item.querySelector('description')?.textContent || ''
    const link = item.querySelector('link')?.textContent || ''
    const pubDate = item.querySelector('pubDate')?.textContent || ''

    const title = cleanHtml(rawTitle)
    const description = cleanHtml(rawDescription)

    // Extract image
    let image = null
    const mediaContent = item.querySelector('content')
    if (mediaContent) image = mediaContent.getAttribute('url')
    if (!image) {
      const enclosure = item.querySelector('enclosure')
      if (enclosure) image = enclosure.getAttribute('url')
    }
    if (!image) {
      const imgMatch = rawDescription.match(/<img[^>]+src="([^"]+)"/)
      if (imgMatch) image = imgMatch[1]
    }

    if (title) {
      results.push({
        id: link || `tuttojuve-${title.slice(0, 30)}`,
        title,
        description: description.slice(0, 400),
        source: 'TuttoJuve',
        url: link.trim(),
        image,
        date: pubDate ? new Date(pubDate).toISOString() : new Date().toISOString(),
      })
    }
  })

  return results
}

export async function getTuttoJuveCalciomercato() {
  // Return cached if fresh
  if (_tjCache.data && Date.now() - _tjCache.timestamp < CACHE_TTL) {
    return _tjCache.data
  }

  try {
    const res = await fetch(apiUrl('rss/tuttojuve'), { headers: apiHeaders() })
    if (!res.ok) throw new Error(`TuttoJuve RSS: ${res.status}`)
    const xml = await res.text()
    const articles = parseTuttoJuveRSS(xml)

    if (articles.length > 0) {
      _tjCache = { data: articles, timestamp: Date.now() }
      return articles
    }
  } catch (err) {
    console.warn('[TuttoJuve RSS] Failed:', err.message)
  }

  return []
}

// ── Demo fallback data (when both APIs fail) ────────────────────────────────
export const DEMO_RUMORS = [
  {
    id: 'r-01',
    player: 'Jonathan David',
    age: 26,
    role: 'Attaccante',
    from: 'Lille',
    to: 'Juventus',
    direction: 'in',
    reliability: 90,
    source: 'Sky Sport',
    fee: 'Parametro zero',
    date: '2026-03-28',
    status: 'hot',
    details: 'Accordo trovato con il giocatore per un contratto di 5 anni a 5M/anno. Manca solo la firma.',
  },
  {
    id: 'r-02',
    player: 'Alejandro Garnacho',
    age: 21,
    role: 'Esterno',
    from: 'Manchester United',
    to: 'Juventus',
    direction: 'in',
    reliability: 65,
    source: 'La Gazzetta dello Sport',
    fee: '€45M',
    date: '2026-03-25',
    status: 'warm',
    details: 'La Juventus ha avviato i contatti con il Manchester United. Il giocatore avrebbe dato il suo ok al trasferimento.',
  },
  {
    id: 'r-03',
    player: 'Adrien Rabiot',
    age: 31,
    role: 'Centrocampista',
    from: 'Marseille',
    to: 'Juventus',
    direction: 'in',
    reliability: 40,
    source: 'Tuttosport',
    fee: '€10M',
    date: '2026-03-20',
    status: 'cold',
    details: 'Ritorno suggestivo ma complicato. L\'ex bianconero ha un contratto fino al 2027 con il Marsiglia.',
  },
  {
    id: 'r-04',
    player: 'Dean Huijsen',
    age: 21,
    role: 'Difensore',
    from: 'Bournemouth',
    to: 'Juventus',
    direction: 'in',
    reliability: 55,
    source: 'Corriere dello Sport',
    fee: '€30M (clausola)',
    date: '2026-03-22',
    status: 'warm',
    details: 'La Juventus potrebbe esercitare la clausola di riacquisto inserita nella cessione dell\'estate scorsa.',
  },
  {
    id: 'r-05',
    player: 'Weston McKennie',
    age: 27,
    role: 'Centrocampista',
    from: 'Juventus',
    to: 'Aston Villa',
    direction: 'out',
    reliability: 70,
    source: 'The Athletic',
    fee: '€20M',
    date: '2026-03-26',
    status: 'warm',
    details: 'Emery lo vuole a Birmingham. La Juventus chiede almeno 20 milioni per lasciar partire l\'americano.',
  },
  {
    id: 'r-06',
    player: 'Filip Kostic',
    age: 33,
    role: 'Esterno',
    from: 'Juventus',
    to: 'Fenerbahce',
    direction: 'out',
    reliability: 80,
    source: 'Sky Sport',
    fee: '€3M',
    date: '2026-03-27',
    status: 'hot',
    details: 'Trattativa in stato avanzato. Il serbo è pronto a trasferirsi in Turchia. Accordo vicino.',
  },
  {
    id: 'r-07',
    player: 'Khvicha Kvaratskhelia',
    age: 25,
    role: 'Esterno',
    from: 'PSG',
    to: 'Juventus',
    direction: 'in',
    reliability: 25,
    source: 'Calciomercato.com',
    fee: '€80M',
    date: '2026-03-15',
    status: 'cold',
    details: 'Sogno proibito. Il georgiano non si è ambientato a Parigi ma il prezzo è fuori portata.',
  },
  {
    id: 'r-08',
    player: 'Nicolò Fagioli',
    age: 25,
    role: 'Centrocampista',
    from: 'Juventus',
    to: 'Napoli',
    direction: 'out',
    reliability: 50,
    source: 'La Gazzetta dello Sport',
    fee: '€25M',
    date: '2026-03-23',
    status: 'warm',
    details: 'Conte lo vuole ma la Juventus non è convinta di cederlo a una rivale diretta.',
  },
  {
    id: 'r-09',
    player: 'Viktor Gyökeres',
    age: 28,
    role: 'Attaccante',
    from: 'Sporting CP',
    to: 'Juventus',
    direction: 'in',
    reliability: 35,
    source: 'Record',
    fee: '€100M (clausola)',
    date: '2026-03-18',
    status: 'cold',
    details: 'La clausola rescissoria è troppo alta. La Juve monitora ma non può competere con i club inglesi.',
  },
  {
    id: 'r-10',
    player: 'Andrea Cambiaso',
    age: 26,
    role: 'Terzino',
    from: 'Juventus',
    to: 'Real Madrid',
    direction: 'out',
    reliability: 60,
    source: 'Marca',
    fee: '€55M',
    date: '2026-03-24',
    status: 'warm',
    details: 'Il Real Madrid ha messo gli occhi su Cambiaso come erede di Mendy. La Juve lo considera incedibile.',
  },
  {
    id: 'r-11',
    player: 'Riccardo Calafiori',
    age: 24,
    role: 'Difensore',
    from: 'Arsenal',
    to: 'Juventus',
    direction: 'in',
    reliability: 30,
    source: 'Tuttosport',
    fee: '€50M',
    date: '2026-03-12',
    status: 'cold',
    details: 'Ex Bologna, potrebbe lasciare Londra per tornare in Italia. Operazione molto complicata.',
  },
  {
    id: 'r-12',
    player: 'Teun Koopmeiners',
    age: 28,
    role: 'Centrocampista',
    from: 'Juventus',
    to: '—',
    direction: 'renewal',
    reliability: 85,
    source: 'Sky Sport',
    fee: 'Rinnovo fino al 2030',
    date: '2026-03-29',
    status: 'hot',
    details: 'Rinnovo in dirittura d\'arrivo. L\'olandese prolungherà fino al 2030 con adeguamento a 6M/anno.',
  },
]
