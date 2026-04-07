const IS_DEV = import.meta.env.DEV

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || ''
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

/**
 * Build the correct API URL depending on environment:
 * - Dev: /api/{route}/{path} (Vite proxy)
 * - Prod: Supabase Edge Function proxy-api/{route}/{path}
 */
export function apiUrl(route, path = '') {
  if (IS_DEV) {
    return `/api/${route}${path ? `/${path}` : ''}`
  }
  const base = `${SUPABASE_URL}/functions/v1/proxy-api/${route}`
  return path ? `${base}/${path}` : base
}

/**
 * Get headers for production Edge Function calls
 */
export function apiHeaders(extra = {}) {
  if (IS_DEV) return extra
  const authHeader = SUPABASE_ANON_KEY ? { Authorization: `Bearer ${SUPABASE_ANON_KEY}` } : {}
  return {
    ...extra,
    apikey: SUPABASE_ANON_KEY,
    ...authHeader,
  }
}
