import 'dotenv/config'
import { randomBytes } from 'node:crypto'
import { createClient } from '@supabase/supabase-js'
import { getSupabaseScriptConfig } from './env.js'

const targetEmail = (process.env.ADMIN_EMAIL || 'admin@bianconerihub.com').trim().toLowerCase()
const newPassword = process.env.ADMIN_NEW_PASSWORD?.trim() || generatePassword()

function generatePassword() {
  const base = randomBytes(12).toString('base64url')
  return `Bh!${base.slice(0, 14)}9`
}

async function findUserByEmail(supabase, email) {
  let page = 1
  const perPage = 200

  while (page <= 20) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage })
    if (error) throw error

    const users = data?.users || []
    const match = users.find((user) => user.email?.toLowerCase() === email)
    if (match) return match

    if (users.length < perPage) break
    page += 1
  }

  return null
}

async function main() {
  const { url, key } = getSupabaseScriptConfig({ requireServiceRole: true })
  const supabase = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const user = await findUserByEmail(supabase, targetEmail)
  if (!user?.id) {
    throw new Error(`Utente non trovato: ${targetEmail}`)
  }

  const { data, error } = await supabase.auth.admin.updateUserById(user.id, {
    password: newPassword,
  })

  if (error) throw error

  console.log('Password aggiornata con successo.')
  console.log(`Email: ${targetEmail}`)
  console.log(`User ID: ${data.user?.id || user.id}`)
  console.log('La password è stata letta dalla configurazione o generata in modo sicuro e non viene mostrata nei log.')
}

main().catch((error) => {
  console.error(error.message || error)
  process.exit(1)
})
