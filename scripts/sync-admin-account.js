import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'
import { getSupabaseScriptConfig } from './env.js'

const email = process.env.ADMIN_EMAIL?.trim().toLowerCase()
const password = process.env.ADMIN_PASSWORD?.trim()
if (!email || !password) throw new Error('ADMIN_EMAIL e ADMIN_PASSWORD sono obbligatorie')

async function findUser(client) {
  for (let page = 1; page <= 20; page += 1) {
    const { data, error } = await client.auth.admin.listUsers({ page, perPage: 200 })
    if (error) throw error
    const found = data.users.find((user) => user.email?.toLowerCase() === email)
    if (found) return found
    if (data.users.length < 200) return null
  }
  return null
}

async function main() {
  const { url, key } = getSupabaseScriptConfig({ requireServiceRole: true })
  const client = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
  let user = await findUser(client)
  if (user) {
    const { data, error } = await client.auth.admin.updateUserById(user.id, { password, email_confirm: true })
    if (error) throw error
    user = data.user
  } else {
    const { data, error } = await client.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { display_name: 'BianconeriHub Admin' } })
    if (error || !data.user) throw error || new Error('Creazione admin non riuscita')
    user = data.user
  }
  const { error: profileError } = await client.from('profiles').upsert({ id: user.id, username: 'BianconeriHub Admin', role: 'admin' }, { onConflict: 'id' })
  if (profileError) throw profileError
  console.log('Account admin sincronizzato e ruolo verificato.')
}

main().catch((error) => { console.error(error.message || error); process.exit(1) })
