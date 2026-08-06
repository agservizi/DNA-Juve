import { NextResponse } from 'next/server'

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
const requests = new Map<string, { count: number; resetAt: number }>()

function limited(key: string) {
  const now = Date.now()
  const current = requests.get(key)
  if (!current || current.resetAt <= now) {
    requests.set(key, { count: 1, resetAt: now + 60_000 })
    return false
  }
  current.count += 1
  return current.count > 5
}

export async function POST(request: Request) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  if (limited(ip)) return NextResponse.json({ error: 'Troppi tentativi. Attendi un minuto e riprova.' }, { status: 429 })

  const contentLength = Number(request.headers.get('content-length') || 0)
  if (contentLength > 2_000) return NextResponse.json({ error: 'Richiesta non valida.' }, { status: 413 })

  const body = await request.json().catch(() => null) as { email?: unknown } | null
  const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : ''
  if (!emailPattern.test(email) || email.length > 254) {
    return NextResponse.json({ error: 'Inserisci un indirizzo email valido.' }, { status: 400 })
  }

  const apiKey = process.env.BREVO_API_KEY
  const listId = Number(process.env.BREVO_LIST_ID || '2')
  if (!apiKey || !Number.isInteger(listId) || listId <= 0) {
    console.error('[newsletter] Brevo non configurato')
    return NextResponse.json({ error: 'La newsletter non è disponibile in questo momento.' }, { status: 503 })
  }

  try {
    const response = await fetch('https://api.brevo.com/v3/contacts', {
      method: 'POST',
      headers: { 'api-key': apiKey, 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({ email, listIds: [listId], updateEnabled: true }),
      cache: 'no-store',
    })
    if (response.ok) return NextResponse.json({ ok: true })

    const payload = await response.json().catch(() => ({})) as { code?: string }
    if (response.status === 400 && payload.code === 'duplicate_parameter') return NextResponse.json({ ok: true, existing: true })
    console.error('[newsletter] Brevo ha rifiutato la richiesta', { status: response.status, code: payload.code })
    return NextResponse.json({ error: 'Iscrizione non riuscita. Riprova più tardi.' }, { status: 502 })
  } catch (error) {
    console.error('[newsletter] Brevo non raggiungibile', error instanceof Error ? error.message : 'errore sconosciuto')
    return NextResponse.json({ error: 'Servizio newsletter temporaneamente non raggiungibile.' }, { status: 502 })
  }
}
