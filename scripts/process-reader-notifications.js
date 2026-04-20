#!/usr/bin/env node

import 'dotenv/config'
import { readEnv, requireEnv } from './env.js'

const supabaseUrl = requireEnv(['SUPABASE_URL', 'VITE_SUPABASE_URL'], 'SUPABASE_URL or VITE_SUPABASE_URL')
const anonKey = requireEnv(['SUPABASE_ANON_KEY', 'VITE_SUPABASE_ANON_KEY'], 'SUPABASE_ANON_KEY or VITE_SUPABASE_ANON_KEY')
const cronSecret = readEnv('CRON_SECRET')
const dryRun = process.argv.includes('--dry-run')

if (!cronSecret) {
  console.error('Missing environment: CRON_SECRET')
  process.exit(1)
}

const endpoint = `${supabaseUrl.replace(/\/+$/, '')}/functions/v1/push-notifications`

async function main() {
  if (dryRun) {
    console.log(`[dry-run] Ready to process pending reader notifications via ${endpoint}`)
    return
  }

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: anonKey,
    },
    body: JSON.stringify({
      action: 'process-pending',
      cronSecret,
    }),
  })

  const payload = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new Error(payload?.error || `Reader notification processing failed (${response.status})`)
  }

  console.log(JSON.stringify(payload, null, 2))
}

main().catch((error) => {
  console.error(error.message || error)
  process.exit(1)
})
