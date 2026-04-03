import { apiUrl, apiHeaders } from './apiProxy'

const JUVE_ID = 109

async function fetchApi(endpoint) {
  const res = await fetch(`${apiUrl('football')}${endpoint}`, {
    headers: apiHeaders(),
  })
  if (!res.ok) throw new Error(`Football API ${res.status}`)
  return res.json()
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
