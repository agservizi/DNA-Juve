#!/usr/bin/env node
/**
 * auto-community.js — Auto-genera pagelle e sondaggi pre-partita
 *
 * Workflow:
 * 1. Fetch partite FINISHED recenti della Juve → crea pagelle con lineup
 * 2. Fetch prossima partita SCHEDULED → crea sondaggio pre-match
 *
 * Usage:
 *   node scripts/auto-community.js              # run once
 *   node scripts/auto-community.js --cron       # loop every 2h
 *   node scripts/auto-community.js --dry-run    # preview without saving
 */
import dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'

dotenv.config()

const JUVE_ID = 109
const API_BASE = 'https://api.football-data.org/v4'
const API_KEY = process.env.VITE_FOOTBALL_API_KEY || process.env.FOOTBALL_API_KEY || ''

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY
const supabase = createClient(supabaseUrl, supabaseKey)

const DRY_RUN = process.argv.includes('--dry-run')
const CRON = process.argv.includes('--cron')
const CRON_INTERVAL = 2 * 60 * 60 * 1000 // 2 ore

// ─── Football API helper ───────────────────────────────────────────
async function footballFetch(endpoint) {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    headers: { 'X-Auth-Token': API_KEY },
  })
  if (!res.ok) {
    console.error(`❌ Football API ${res.status}: ${endpoint}`)
    return null
  }
  return res.json()
}

// ─── POSIZIONE dal ruolo API ───────────────────────────────────────
function mapPosition(pos) {
  if (!pos) return 'CM'
  const map = { Goalkeeper: 'POR', Defence: 'DIF', Midfield: 'CEN', Offence: 'ATT' }
  return map[pos] || 'CM'
}

// ─── ROSA HARDCODED (fallback quando API free non dà lineup) ──────
const JUVE_SQUAD = [
  { name: 'Di Gregorio', number: 16, position: 'POR', starter: true },
  { name: 'Gatti', number: 4, position: 'DIF', starter: true },
  { name: 'Kalulu', number: 15, position: 'DIF', starter: true },
  { name: 'Cambiaso', number: 27, position: 'DIF', starter: true },
  { name: 'Holm', number: 2, position: 'DIF', starter: true },
  { name: 'Locatelli', number: 5, position: 'CEN', starter: true },
  { name: 'Koopmeiners', number: 8, position: 'CEN', starter: true },
  { name: 'Thuram', number: 19, position: 'CEN', starter: true },
  { name: 'Conceição', number: 7, position: 'ATT', starter: true },
  { name: 'Yıldız', number: 10, position: 'ATT', starter: true },
  { name: 'Vlahović', number: 9, position: 'ATT', starter: true },
  // Riserve principali
  { name: 'Perin', number: 1, position: 'POR', starter: false },
  { name: 'Bremer', number: 3, position: 'DIF', starter: false },
  { name: 'McKennie', number: 22, position: 'CEN', starter: false },
  { name: 'Miretti', number: 21, position: 'CEN', starter: false },
  { name: 'Zhegrova', number: 11, position: 'ATT', starter: false },
  { name: 'David', number: 30, position: 'ATT', starter: false },
  { name: 'Openda', number: 20, position: 'ATT', starter: false },
]

// ─── AUTO-PAGELLE ──────────────────────────────────────────────────
async function generatePagelle() {
  console.log('\n⚽ Controllo partite finite per pagelle...')

  // Fetch ultime 5 partite finite
  const data = await footballFetch(`/teams/${JUVE_ID}/matches?status=FINISHED&limit=5`)
  if (!data?.matches?.length) {
    console.log('  Nessuna partita finita trovata.')
    return
  }

  for (const match of data.matches) {
    const apiMatchId = String(match.id)

    // Check se pagella già esiste
    const { data: existing } = await supabase
      .from('pagelle_matches')
      .select('id')
      .eq('match_id', apiMatchId)
      .maybeSingle()

    if (existing) {
      // Check se ha già giocatori, se no li aggiungiamo
      const { data: existingPlayers } = await supabase
        .from('pagelle_players')
        .select('id')
        .eq('match_id', existing.id)
        .limit(1)

      if (existingPlayers?.length > 0) {
        console.log(`  ⏭️  Pagella già completa: ${homeTeam} vs ${awayTeam}`)
        continue
      }

      // Partita esiste ma senza giocatori — popoliamo
      console.log(`\n  🔧 ${homeTeam} ${homeScore}-${awayScore} ${awayTeam} — aggiungo giocatori mancanti`)

      if (!DRY_RUN) {
        const rows = JUVE_SQUAD.map((p, i) => ({
          match_id: existing.id,
          player_name: p.name,
          player_number: p.number,
          position: p.position,
          is_starter: p.starter,
          display_order: p.starter ? i : 100 + i,
        }))
        const { error: pErr } = await supabase.from('pagelle_players').insert(rows)
        if (pErr) console.error(`    ❌ Errore:`, pErr.message)
        else console.log(`    ✅ ${rows.length} giocatori aggiunti`)
      }
      continue
    }

    // Fetch dettagli partita con lineup
    const matchDetail = await footballFetch(`/matches/${match.id}`)
    if (!matchDetail) continue

    const homeTeam = match.homeTeam.shortName || match.homeTeam.name
    const awayTeam = match.awayTeam.shortName || match.awayTeam.name
    const homeScore = match.score?.fullTime?.home ?? null
    const awayScore = match.score?.fullTime?.away ?? null
    const competition = match.competition?.name || 'Serie A'
    const matchDate = match.utcDate

    console.log(`\n  📋 ${homeTeam} ${homeScore}-${awayScore} ${awayTeam} (${competition})`)

    // Trova lineup Juventus
    const isHome = match.homeTeam.id === JUVE_ID
    const juveLineup = isHome
      ? matchDetail.homeTeam?.lineup || []
      : matchDetail.awayTeam?.lineup || []
    const juveBench = isHome
      ? matchDetail.homeTeam?.bench || []
      : matchDetail.awayTeam?.bench || []
    const juveSubs = isHome
      ? (matchDetail.homeTeam?.substitutions || [])
      : (matchDetail.awayTeam?.substitutions || [])

    // IDs dei subentrati effettivi
    const subInIds = new Set(juveSubs.map(s => s.playerIn?.id).filter(Boolean))

    if (juveLineup.length === 0) {
      console.log('    ℹ️  Lineup API non disponibile, uso rosa standard')
    }

    // Usa lineup API se disponibile, altrimenti fallback rosa hardcoded
    const useApiLineup = juveLineup.length > 0

    if (DRY_RUN) {
      if (useApiLineup) {
        console.log(`    [DRY-RUN] Titolari (API): ${juveLineup.map(p => p.name).join(', ')}`)
        console.log(`    [DRY-RUN] Subentrati: ${juveBench.filter(p => subInIds.has(p.id)).map(p => p.name).join(', ') || 'nessuno'}`)
      } else {
        const starters = JUVE_SQUAD.filter(p => p.starter)
        const subs = JUVE_SQUAD.filter(p => !p.starter)
        console.log(`    [DRY-RUN] Titolari (rosa): ${starters.map(p => p.name).join(', ')}`)
        console.log(`    [DRY-RUN] Riserve: ${subs.map(p => p.name).join(', ')}`)
      }
      continue
    }

    // Inserisco pagelle_matches
    const { data: pagellaMatch, error: matchErr } = await supabase
      .from('pagelle_matches')
      .insert({
        match_id: apiMatchId,
        home_team: homeTeam,
        away_team: awayTeam,
        home_score: homeScore,
        away_score: awayScore,
        competition,
        match_date: matchDate,
        is_active: true,
      })
      .select('id')
      .single()

    if (matchErr) {
      console.error(`    ❌ Errore inserimento match:`, matchErr.message)
      continue
    }

    // Inserisco giocatori
    const playerRows = []

    if (useApiLineup) {
      // Da API: titolari
      for (let i = 0; i < juveLineup.length; i++) {
        const p = juveLineup[i]
        playerRows.push({
          match_id: pagellaMatch.id,
          player_name: p.name || p.shortName || `Giocatore ${i + 1}`,
          player_number: p.shirtNumber || null,
          position: mapPosition(p.position),
          is_starter: true,
          display_order: i,
        })
      }
      // Da API: subentrati effettivi
      const benchIn = juveBench.filter(p => subInIds.has(p.id))
      for (let i = 0; i < benchIn.length; i++) {
        const p = benchIn[i]
        playerRows.push({
          match_id: pagellaMatch.id,
          player_name: p.name || p.shortName || `Sub ${i + 1}`,
          player_number: p.shirtNumber || null,
          position: mapPosition(p.position),
          is_starter: false,
          display_order: 100 + i,
        })
      }
    } else {
      // Fallback: rosa hardcoded
      for (let i = 0; i < JUVE_SQUAD.length; i++) {
        const p = JUVE_SQUAD[i]
        playerRows.push({
          match_id: pagellaMatch.id,
          player_name: p.name,
          player_number: p.number,
          position: p.position,
          is_starter: p.starter,
          display_order: p.starter ? i : 100 + i,
        })
      }
    }

    if (playerRows.length > 0) {
      const { error: playersErr } = await supabase
        .from('pagelle_players')
        .insert(playerRows)

      if (playersErr) {
        console.error(`    ❌ Errore inserimento giocatori:`, playersErr.message)
      } else {
        const starters = playerRows.filter(p => p.is_starter).length
        const subs = playerRows.length - starters
        console.log(`    ✅ Pagella creata: ${playerRows.length} giocatori (${starters} titolari + ${subs} riserve)`)
      }
    } else {
      console.log(`    ⚠️  Nessun giocatore disponibile`)
    }
  }
}

// ─── AUTO-SONDAGGI PRE-MATCH ──────────────────────────────────────
async function generateSondaggi() {
  console.log('\n🗳️  Controllo prossime partite per sondaggi...')

  const data = await footballFetch(`/teams/${JUVE_ID}/matches?status=SCHEDULED&limit=3`)
  if (!data?.matches?.length) {
    console.log('  Nessuna partita programmata trovata.')
    return
  }

  // Prendiamo la prossima partita
  const nextMatch = data.matches.sort((a, b) => new Date(a.utcDate) - new Date(b.utcDate))[0]
  if (!nextMatch) return

  const homeTeam = nextMatch.homeTeam.shortName || nextMatch.homeTeam.name
  const awayTeam = nextMatch.awayTeam.shortName || nextMatch.awayTeam.name
  const competition = nextMatch.competition?.name || 'Serie A'
  const matchDate = new Date(nextMatch.utcDate)
  const matchLabel = `${homeTeam} vs ${awayTeam}`
  const dateLabel = matchDate.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' })

  console.log(`  📅 Prossima: ${matchLabel} — ${dateLabel} (${competition})`)

  // ── Sondaggio 1: Pronostico risultato ────────────────────────────
  const pronosticoQuestion = `Pronostico: ${matchLabel}`

  const { data: existingPronostico } = await supabase
    .from('community_polls')
    .select('id')
    .eq('question', pronosticoQuestion)
    .maybeSingle()

  if (existingPronostico) {
    console.log(`  ⏭️  Sondaggio pronostico già esiste`)
  } else {
    const isHome = nextMatch.homeTeam.id === JUVE_ID
    const juveLabel = isHome ? homeTeam : awayTeam
    const opponentLabel = isHome ? awayTeam : homeTeam

    if (DRY_RUN) {
      console.log(`  [DRY-RUN] Sondaggio: "${pronosticoQuestion}"`)
      console.log(`    Opzioni: Vittoria ${juveLabel} | Pareggio | Vittoria ${opponentLabel}`)
    } else {
      // Scade 2h dopo la partita
      const expiresAt = new Date(matchDate.getTime() + 2 * 60 * 60 * 1000)

      const { data: poll, error: pollErr } = await supabase
        .from('community_polls')
        .insert({
          question: pronosticoQuestion,
          description: `${competition} — ${dateLabel}. Come finirà?`,
          category: 'partite',
          is_active: true,
          is_featured: true,
          expires_at: expiresAt.toISOString(),
        })
        .select('id')
        .single()

      if (pollErr) {
        console.error(`  ❌ Errore sondaggio pronostico:`, pollErr.message)
      } else {
        const options = [
          { poll_id: poll.id, label: `Vittoria ${juveLabel} ⚪⚫`, position: 0 },
          { poll_id: poll.id, label: `Pareggio 🤝`, position: 1 },
          { poll_id: poll.id, label: `Vittoria ${opponentLabel}`, position: 2 },
        ]
        await supabase.from('community_poll_options').insert(options)
        console.log(`  ✅ Sondaggio pronostico creato: "${pronosticoQuestion}"`)
      }
    }
  }

  // ── Sondaggio 2: MVP della partita ───────────────────────────────
  const mvpQuestion = `Chi sarà il MVP? ${matchLabel}`

  const { data: existingMvp } = await supabase
    .from('community_polls')
    .select('id')
    .eq('question', mvpQuestion)
    .maybeSingle()

  if (existingMvp) {
    console.log(`  ⏭️  Sondaggio MVP già esiste`)
  } else {
    // Top 4 giocatori per il sondaggio MVP (i più "legendary/gold" dalla rosa)
    const topPlayers = [
      'Vlahović', 'Yıldız', 'Koopmeiners', 'Conceição'
    ]

    if (DRY_RUN) {
      console.log(`  [DRY-RUN] Sondaggio: "${mvpQuestion}"`)
      console.log(`    Opzioni: ${topPlayers.join(' | ')}`)
    } else {
      const expiresAt = new Date(matchDate.getTime() + 2 * 60 * 60 * 1000)

      const { data: poll, error: pollErr } = await supabase
        .from('community_polls')
        .insert({
          question: mvpQuestion,
          description: `Chi sarà il migliore in campo contro ${nextMatch.homeTeam.id === JUVE_ID ? awayTeam : homeTeam}?`,
          category: 'partite',
          is_active: true,
          is_featured: false,
          expires_at: expiresAt.toISOString(),
        })
        .select('id')
        .single()

      if (pollErr) {
        console.error(`  ❌ Errore sondaggio MVP:`, pollErr.message)
      } else {
        const options = topPlayers.map((name, i) => ({
          poll_id: poll.id,
          label: name,
          position: i,
        }))
        await supabase.from('community_poll_options').insert(options)
        console.log(`  ✅ Sondaggio MVP creato: "${mvpQuestion}"`)
      }
    }
  }
}

// ─── MAIN ──────────────────────────────────────────────────────────
async function run() {
  console.log(`\n${'═'.repeat(50)}`)
  console.log(`🏟️  BianconeriHub — Auto Community`)
  console.log(`   ${new Date().toLocaleString('it-IT')}`)
  if (DRY_RUN) console.log('   ⚠️  MODALITÀ DRY-RUN (nessuna scrittura)')
  console.log(`${'═'.repeat(50)}`)

  if (!API_KEY) {
    console.error('❌ FOOTBALL_API_KEY non configurata. Uscita.')
    process.exit(1)
  }
  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Credenziali Supabase mancanti. Uscita.')
    process.exit(1)
  }

  await generatePagelle()
  await generateSondaggi()

  console.log(`\n✅ Completato.\n`)
}

if (CRON) {
  console.log(`🔄 Modalità cron: esecuzione ogni ${CRON_INTERVAL / 3600000}h`)
  const loop = async () => {
    await run().catch(e => console.error('Errore nel ciclo:', e))
    setTimeout(loop, CRON_INTERVAL)
  }
  loop()
} else {
  run().catch(e => {
    console.error(e)
    process.exit(1)
  })
}
