/**
 * Aggregator for match-day ops. Vercel Hobby only allows daily crons;
 * point an external scheduler (every 5 minutes) at this route with
 * Authorization: Bearer $CRON_SECRET for near-realtime kickoffs/reminders.
 */
export const dynamic = 'force-dynamic'

const jobs = ['score-predictions', 'reader-digest', 'telegram-channel'] as const

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET
  if (!secret) return Response.json({ ok: false, error: 'Cron non configurato' }, { status: 503 })
  if (request.headers.get('authorization') !== `Bearer ${secret}`) {
    return Response.json({ ok: false, error: 'Non autorizzato' }, { status: 401 })
  }

  const origin = new URL(request.url).origin
  const auth = request.headers.get('authorization') || ''
  const results: Record<string, unknown> = {}

  for (const job of jobs) {
    try {
      const response = await fetch(`${origin}/api/cron/${job}`, {
        headers: { authorization: auth },
        cache: 'no-store',
      })
      results[job] = await response.json().catch(() => ({ ok: false, status: response.status }))
    } catch (error) {
      results[job] = { ok: false, error: error instanceof Error ? error.message : 'fetch fallita' }
    }
  }

  return Response.json({ ok: true, results, at: new Date().toISOString() })
}
