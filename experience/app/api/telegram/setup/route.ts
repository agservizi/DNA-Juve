import { getMyCommands, getWebhookInfo, setMyCommands, setWebhook } from '@/lib/telegram/api'

export const dynamic = 'force-dynamic'

/**
 * GET /api/telegram/setup?token=CRON_SECRET
 * Registers Telegram webhook + bot command menu for this deployment.
 */
export async function GET(request: Request) {
  const url = new URL(request.url)
  const token = url.searchParams.get('token') || request.headers.get('authorization')?.replace(/^Bearer\s+/i, '')
  const secret = process.env.CRON_SECRET || process.env.TELEGRAM_WEBHOOK_SECRET
  if (!secret || token !== secret) {
    return Response.json({ ok: false, error: 'Non autorizzato' }, { status: 401 })
  }

  if (!process.env.TELEGRAM_BOT_TOKEN) {
    return Response.json({ ok: false, error: 'TELEGRAM_BOT_TOKEN mancante' }, { status: 503 })
  }

  const site = (process.env.NEXT_PUBLIC_SITE_URL || '').replace(/\/+$/, '')
  if (!site.startsWith('https://')) {
    return Response.json({ ok: false, error: 'NEXT_PUBLIC_SITE_URL deve essere https in produzione' }, { status: 400 })
  }

  const webhookUrl = `${site}/api/telegram/webhook`
  const webhook = await setWebhook(webhookUrl, process.env.TELEGRAM_WEBHOOK_SECRET)
  const commands = await setMyCommands()
  const info = await getWebhookInfo()
  const registeredCommands = await getMyCommands()
  return Response.json({
    ok: true,
    webhookUrl,
    webhook,
    commands,
    registeredCommands,
    info,
  })
}
