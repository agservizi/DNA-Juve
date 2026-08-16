import { createServiceClient } from '@/lib/telegram/session'
import { handleTelegramUpdate } from '@/lib/telegram/handler'
import type { TelegramUpdate } from '@/lib/telegram/api'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

function verifySecret(request: Request) {
  const expected = process.env.TELEGRAM_WEBHOOK_SECRET
  if (!expected) return true
  const header = request.headers.get('x-telegram-bot-api-secret-token')
  return header === expected
}

export async function POST(request: Request) {
  if (!verifySecret(request)) {
    return Response.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  }

  if (!process.env.TELEGRAM_BOT_TOKEN) {
    return Response.json({ ok: false, error: 'Bot non configurato' }, { status: 503 })
  }

  try {
    const update = (await request.json()) as TelegramUpdate
    const db = createServiceClient()
    await handleTelegramUpdate(db, update)
    return Response.json({ ok: true })
  } catch (error) {
    console.error('[telegram webhook]', error)
    return Response.json(
      { ok: false, error: error instanceof Error ? error.message : 'Errore webhook' },
      { status: 200 },
    )
  }
}
