import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://invalid.supabase.local',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'invalid-anon-key',
  )
}
