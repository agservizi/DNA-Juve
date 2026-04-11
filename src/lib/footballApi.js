import { apiUrl, apiHeaders } from './apiProxy'

const JUVE_ID = 109
const FOOTBALL_CACHE_PREFIX = 'football-api-cache:v2:'
const DEFAULT_FINISHED_MATCH_DURATION_MS = 2 * 60 * 60 * 1000
const memoryCache = new Map()
const inFlightRequests = new Map()
const STADIUM_BY_TEAM_ID = {
  109: 'Allianz Stadium, Torino',
  108: 'Stadio Giuseppe Meazza, Milano',
  98: 'Stadio Olimpico, Roma',
  100: 'Stadio Olimpico, Roma',
  99: 'Stadio Diego Armando Maradona, Napoli',
  113: 'Gewiss Stadium, Bergamo',
  110: 'Artemio Franchi, Firenze',
  586: 'Stadio Renato Dall’Ara, Bologna',
  471: 'U-Power Stadium, Monza',
  450: 'Stadio Olimpico Grande Torino, Torino',
  115: 'Bluenergy Stadium, Udine',
  488: 'Stadio Marcantonio Bentegodi, Verona',
  584: 'Stadio Via del Mare, Lecce',
  445: 'Stadio Luigi Ferraris, Genova',
  107: 'Stadio Luigi Ferraris, Genova',
  112: 'Unipol Domus, Cagliari',
  454: 'MAPEI Stadium, Reggio Emilia',
  497: 'Stadio Carlo Castellani, Empoli',
  436: 'Stadio Ennio Tardini, Parma',
  657: 'Stadio Pier Luigi Penzo, Venezia',
}

function getCacheTtl(endpoint) {
  if (endpoint.includes('status=LIVE')) return 60 * 1000
  if (endpoint.includes('status=SCHEDULED')) return 2 * 60 * 1000
  if (endpoint.includes('status=FINISHED')) return 5 * 60 * 1000
  if (endpoint.includes('/standings')) return 2 * 60 * 60 * 1000
  return 15 * 60 * 1000
}

function getCacheKey(endpoint) {
  return `${FOOTBALL_CACHE_PREFIX}${endpoint}`
}

function readCachedEntry(cacheKey) {
  const cached = memoryCache.get(cacheKey)
  if (cached) return cached

  if (typeof window === 'undefined') return null

  try {
    const raw = window.sessionStorage.getItem(cacheKey)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return null
    memoryCache.set(cacheKey, parsed)
    return parsed
  } catch {
    return null
  }
}

function writeCachedEntry(cacheKey, entry) {
  memoryCache.set(cacheKey, entry)

  if (typeof window === 'undefined') return

  try {
    window.sessionStorage.setItem(cacheKey, JSON.stringify(entry))
  } catch {
    // Ignore storage quota/unavailable errors: in-memory cache is enough.
  }
}

async function fetchApi(endpoint) {
  const cacheKey = getCacheKey(endpoint)
  const now = Date.now()
  const ttl = getCacheTtl(endpoint)
  const cached = readCachedEntry(cacheKey)

  if (cached && now - cached.timestamp < ttl) {
    return cached.data
  }

  if (inFlightRequests.has(cacheKey)) {
    return inFlightRequests.get(cacheKey)
  }

  const request = fetch(`${apiUrl('football')}${endpoint}`, {
    headers: apiHeaders(),
  })
    .then(async (res) => {
      if (!res.ok) {
        const error = new Error(`Football API ${res.status}`)
        error.status = res.status
        error.retryAfter = res.headers.get('retry-after')

        // If we hit the provider rate limit, prefer slightly stale data over a hard failure.
        if (res.status === 429 && cached?.data) {
          return cached.data
        }

        throw error
      }

      const data = await res.json()
      writeCachedEntry(cacheKey, { data, timestamp: Date.now() })
      return data
    })
    .finally(() => {
      inFlightRequests.delete(cacheKey)
    })

  inFlightRequests.set(cacheKey, request)
  return request
}

export function shouldRetryFootballQuery(failureCount, error) {
  if (error?.status === 429) return false
  return failureCount < 1
}

/**
 * Next scheduled match for Juventus
 * Returns: { homeTeam, awayTeam, competition, utcDate, venue, ... }
 */
export async function getNextMatch() {
  const data = await fetchApi(`/teams/${JUVE_ID}/matches?status=SCHEDULED&limit=5`)
  const matches = data.matches || []
  // Return the earliest scheduled match
  return matches.sort((a, b) => new Date(a.utcDate) - new Date(b.utcDate))[0] || null
}

/**
 * Current live Juventus match, if any.
 * Returns null when there is no ongoing match.
 */
export async function getLiveMatch() {
  const data = await fetchApi(`/teams/${JUVE_ID}/matches?status=LIVE&limit=5`)
  const matches = data.matches || []
  const liveStatuses = new Set(['LIVE', 'IN_PLAY', 'PAUSED'])

  return matches
    .filter((match) => liveStatuses.has(match?.status))
    .sort((a, b) => new Date(b.utcDate) - new Date(a.utcDate))[0] || null
}

/**
 * Serie A standings
 * Returns: { standings: [{ table: [{ position, team, points, won, draw, lost, goalDifference, ... }] }] }
 */
export async function getStandings(competition = 'SA') {
  const data = await fetchApi(`/competitions/${competition}/standings`)
  const total = data.standings?.find(s => s.type === 'TOTAL')
  return total?.table || []
}

/**
 * All Juventus matches for a given season
 * Returns: { matches: [{ homeTeam, awayTeam, score, competition, utcDate, status, venue, ... }] }
 */
export async function getTeamMatches(season) {
  const params = season ? `?season=${season}` : ''
  const data = await fetchApi(`/teams/${JUVE_ID}/matches${params}`)
  return data.matches || []
}

export async function getRecentFinishedMatches(teamId, limit = 5) {
  const data = await fetchApi(`/teams/${teamId}/matches?status=FINISHED&limit=${limit}`)
  return data.matches || []
}

export function getMatchFinishedAt(match) {
  const updatedAt = new Date(match?.lastUpdated || '').getTime()
  if (Number.isFinite(updatedAt) && updatedAt > 0) return updatedAt

  const kickoff = new Date(match?.utcDate || '').getTime()
  if (Number.isFinite(kickoff) && kickoff > 0) {
    return kickoff + DEFAULT_FINISHED_MATCH_DURATION_MS
  }

  return null
}

export function getLatestFinishedMatch(matches = []) {
  return matches
    .filter((match) => match?.status === 'FINISHED')
    .sort((a, b) => {
      const finishedAtA = getMatchFinishedAt(a) || new Date(a?.utcDate || 0).getTime() || 0
      const finishedAtB = getMatchFinishedAt(b) || new Date(b?.utcDate || 0).getTime() || 0
      return finishedAtB - finishedAtA
    })[0] || null
}

export function getVenueLabel(match) {
  if (match?.venue && String(match.venue).trim()) return match.venue

  const fallbackVenue = STADIUM_BY_TEAM_ID[match?.homeTeam?.id]
  if (fallbackVenue) return fallbackVenue

  const homeTeamName = match?.homeTeam?.shortName || match?.homeTeam?.name || 'Squadra di casa'
  return `Stadio ${homeTeamName}`
}

/**
 * Rosa Juventus — dati Transfermarkt 2025/26
 * Immagini da TheSportsDB (free API)
 * Aggiornare manualmente a ogni stagione.
 */

const IMG = 'https://r2.thesportsdb.com/images/media/player/cutout/'

export function getSquadPlayers() {
  const SQUAD = [
    { id: 1,  name: 'Perin',        number: 1,  role: 'POR', nat: '🇮🇹', img: `${IMG}oo0l5m1759222361.png`, rarity: 'silver' },
    { id: 2,  name: 'Di Gregorio',   number: 16, role: 'POR', nat: '🇮🇹', img: `${IMG}fgvi9t1759222392.png`, rarity: 'gold' },
    { id: 3,  name: 'Pinsoglio',     number: 23, role: 'POR', nat: '🇮🇹', img: `${IMG}8s18041759222421.png`, rarity: 'bronze' },
    { id: 4,  name: 'Holm',          number: 2,  role: 'DIF', nat: '🇸🇪', img: `${IMG}za5z3l1758897172.png`, rarity: 'bronze' },
    { id: 5,  name: 'Bremer',        number: 3,  role: 'DIF', nat: '🇧🇷', img: `${IMG}3qx4p71759224866.png`, rarity: 'gold' },
    { id: 6,  name: 'Gatti',         number: 4,  role: 'DIF', nat: '🇮🇹', img: `${IMG}z1jv3i1759224911.png`, rarity: 'silver' },
    { id: 7,  name: 'Kelly',         number: 6,  role: 'DIF', nat: '🇬🇧', img: `${IMG}asto6f1759224942.png`, rarity: 'bronze' },
    { id: 8,  name: 'Kalulu',        number: 15, role: 'DIF', nat: '🇫🇷', img: `${IMG}bl8oj61759224970.png`, rarity: 'silver' },
    { id: 9,  name: 'Cambiaso',      number: 27, role: 'DIF', nat: '🇮🇹', img: `${IMG}6r741t1759225481.png`, rarity: 'gold' },
    { id: 10, name: 'Cabal',         number: 32, role: 'DIF', nat: '🇨🇴', img: `${IMG}qbfpln1759225060.png`, rarity: 'bronze' },
    { id: 11, name: 'Locatelli',     number: 5,  role: 'CEN', nat: '🇮🇹', img: `${IMG}0zlnug1759225148.png`, rarity: 'silver' },
    { id: 12, name: 'Koopmeiners',   number: 8,  role: 'CEN', nat: '🇳🇱', img: `${IMG}pvqhh01759225850.png`, rarity: 'legendary' },
    { id: 13, name: 'Adžić',         number: 17, role: 'CEN', nat: '🇲🇪', img: `${IMG}bjgbrx1759225187.png`, rarity: 'bronze' },
    { id: 14, name: 'Kostić',        number: 18, role: 'CEN', nat: '🇷🇸', img: `${IMG}1kqxaz1759225234.png`, rarity: 'bronze' },
    { id: 15, name: 'Thuram',        number: 19, role: 'CEN', nat: '🇫🇷', img: `${IMG}z7zq751759225259.png`, rarity: 'gold' },
    { id: 16, name: 'Miretti',       number: 21, role: 'CEN', nat: '🇮🇹', img: `${IMG}cjhsf71759225300.png`, rarity: 'silver' },
    { id: 17, name: 'McKennie',      number: 22, role: 'CEN', nat: '🇺🇸', img: `${IMG}ct34v01759225325.png`, rarity: 'gold' },
    { id: 18, name: 'Conceição',     number: 7,  role: 'ATT', nat: '🇵🇹', img: `${IMG}ekqivz1759225498.png`, rarity: 'legendary' },
    { id: 19, name: 'Vlahović',      number: 9,  role: 'ATT', nat: '🇷🇸', img: `${IMG}rl2w191759225532.png`, rarity: 'legendary' },
    { id: 20, name: 'Yıldız',        number: 10, role: 'ATT', nat: '🇹🇷', img: `${IMG}zgep4d1759225554.png`, rarity: 'legendary' },
    { id: 21, name: 'Zhegrova',      number: 11, role: 'ATT', nat: '🇽🇰', img: `${IMG}0cl9vy1759225607.png`, rarity: 'gold' },
    { id: 22, name: 'Boga',          number: 13, role: 'ATT', nat: '🇨🇮', img: `${IMG}spr68z1766319612.png`, rarity: 'silver' },
    { id: 23, name: 'Milik',         number: 14, role: 'ATT', nat: '🇵🇱', img: `${IMG}3wwsgd1759225651.png`, rarity: 'silver' },
    { id: 24, name: 'Openda',        number: 20, role: 'ATT', nat: '🇧🇪', img: `${IMG}1chuok1759225712.png`, rarity: 'gold' },
    { id: 25, name: 'David',         number: 30, role: 'ATT', nat: '🇨🇦', img: `${IMG}nyd9d91759225738.png`, rarity: 'gold' },
  ]
  return SQUAD
}

export { JUVE_ID }
