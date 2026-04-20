export function readEnv(...names) {
  for (const name of names.flat()) {
    const value = process.env[name]
    if (typeof value === 'string' && value.trim()) return value.trim()
  }
  return ''
}

export function requireEnv(names, description) {
  const value = readEnv(names)
  if (!value) {
    const label = Array.isArray(names) ? names.join(' or ') : names
    throw new Error(`Missing environment: ${description || label}`)
  }
  return value
}

export function getSupabaseScriptConfig(options = {}) {
  const { requireServiceRole = false } = options
  const url = requireEnv(['SUPABASE_URL', 'VITE_SUPABASE_URL'], 'SUPABASE_URL or VITE_SUPABASE_URL')
  const key = requireServiceRole
    ? requireEnv('SUPABASE_SERVICE_ROLE_KEY')
    : requireEnv(
      ['SUPABASE_SERVICE_ROLE_KEY', 'SUPABASE_ANON_KEY', 'VITE_SUPABASE_ANON_KEY'],
      'SUPABASE_SERVICE_ROLE_KEY or SUPABASE_ANON_KEY or VITE_SUPABASE_ANON_KEY',
    )

  return { url, key }
}
