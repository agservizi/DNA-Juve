import { getTeamMatches, type Match } from '@/lib/match-market-content'
import { getLiveNews } from '@/lib/live-news'
import { currentWeekendKey, weekendLabel } from '@/lib/weekend'
import {
  announceKickoff,
  announceFulltime,
  announceLiveDigest,
  announceMorningBrief,
  announceWeekAhead,
  announceWeekendWrap,
  getChannelSettings,
} from '@/lib/telegram/channel'
import { createServiceClient } from '@/lib/telegram/session'

export const dynamic = 'force-dynamic'

const siteUrl = () =>
  (process.env.NEXT_PUBLIC_SITE_URL || 'https://bianconerihub.com').replace(/\/+$/, '')

function romeHourMinute(): string {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Rome',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(new Date())
}

function romeDayOfWeek(): number {
  const rome = new Intl.DateTimeFormat('en-US', { timeZone: 'Europe/Rome', weekday: 'short' }).format(new Date())
  return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(rome)
}

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET
  if (!secret) return Response.json({ ok: false, error: 'Cron non configurato' }, { status: 503 })
  if (request.headers.get('authorization') !== `Bearer ${secret}`) {
    return Response.json({ ok: false, error: 'Non autorizzato' }, { status: 401 })
  }

  const results: Record<string, unknown> = {}

  try {
    const settings = await getChannelSettings()
    const now = romeHourMinute()
    const matches = await getTeamMatches()
    const nowMs = Date.now()

    // ── Kickoff T-60 and T-10 ──
    const upcoming = matches.filter((m) => !m.played)
    for (const m of upcoming) {
      const kickMs = Date.parse(m.date)
      if (!Number.isFinite(kickMs)) continue
      const diffMin = (kickMs - nowMs) / 60_000
      if (diffMin > 0 && diffMin <= 60) {
        const tag = diffMin <= 10 ? 't10' : 't60'
        const res = await announceKickoff({ ...m, id: m.id } as Match)
        results[`kickoff:${m.id}:${tag}`] = res
      }
    }

    // ── Fulltime for newly finished matches ──
    const played = matches.filter((m) => m.played)
    for (const m of played) {
      const res = await announceFulltime(m)
      results[`fulltime:${m.id}`] = res
    }

    // ── Digest at configured hours ──
    const digestHours = settings.digest_hours || ['08:00', '18:00']
    if (digestHours.includes(now.slice(0, 5))) {
      const news = await getLiveNews()
      const items = news.slice(0, 8).map((n) => ({
        title: n.title,
        url: n.editorial ? `${siteUrl()}/articolo/${n.slug}` : n.url,
      }))
      const res = await announceLiveDigest(items)
      results.digest = res
    }

    // ── Morning brief (Mon–Sat 07:50–08:10) ──
    if (now >= '07:50' && now <= '08:10' && romeDayOfWeek() !== 0) {
      const news = await getLiveNews()
      const items = news.slice(0, 6).map((n) => ({
        title: n.title,
        url: n.editorial ? `${siteUrl()}/articolo/${n.slug}` : n.url,
      }))
      const res = await announceMorningBrief(items)
      results.morning_brief = res
    }

    // ── Week ahead (Monday 09:00–09:10) ──
    if (now >= '09:00' && now <= '09:10' && romeDayOfWeek() === 1) {
      const nextWeek = upcoming
        .filter((m) => {
          const d = Date.parse(m.date) - nowMs
          return d > 0 && d <= 7 * 24 * 60 * 60 * 1000
        })
        .slice(0, 5)
      const res = await announceWeekAhead(nextWeek)
      results.week_ahead = res
    }

    // ── Weekend wrap (Monday 10:00–10:15) ──
    if (now >= '10:00' && now <= '10:15' && romeDayOfWeek() === 1) {
      const weekendKey = currentWeekendKey()
      const db = createServiceClient()
      const { count } = await db
        .from('gallery_items')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'published')
        .eq('weekend_key', weekendKey)
      const weekendMatches = played.filter((m) => {
        const kick = Date.parse(m.date)
        return Number.isFinite(kick) && nowMs - kick < 3 * 24 * 60 * 60 * 1000
      })
      const res = await announceWeekendWrap({
        weekendKey,
        label: weekendLabel(weekendKey),
        results: weekendMatches,
        galleryCount: count || 0,
      })
      results.weekend = res
    }

    return Response.json({ ok: true, results, at: new Date().toISOString() })
  } catch (error) {
    return Response.json(
      { ok: false, error: error instanceof Error ? error.message : 'Cron telegram-channel fallito' },
      { status: 500 },
    )
  }
}
