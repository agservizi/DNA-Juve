'use client'

import type { SupabaseClient, User } from '@supabase/supabase-js'
import { useCallback, useEffect, useRef, useState } from 'react'
import { isAdminProfile, type AdminProfile } from '@/lib/admin-auth'

export type AdminSessionStatus = 'loading' | 'guest' | 'denied' | 'admin'

export type AdminUser = User & {
  profile: {
    role: 'admin'
    username: string | null
  }
}

export function useAdminSession(client: SupabaseClient) {
  const [status, setStatus] = useState<AdminSessionStatus>('loading')
  const [user, setUser] = useState<AdminUser | null>(null)
  const [recovery, setRecovery] = useState(false)
  const requestId = useRef(0)

  const authorize = useCallback(async (candidate: User | null) => {
    const currentRequest = ++requestId.current

    if (!candidate) {
      setUser(null)
      setStatus('guest')
      return 'guest' as const
    }

    setStatus('loading')
    const { data: profile, error } = await client
      .from('profiles')
      .select('role,username')
      .eq('id', candidate.id)
      .maybeSingle<AdminProfile>()

    if (currentRequest !== requestId.current) return null

    if (error || !isAdminProfile(profile)) {
      setUser(null)
      setStatus('denied')
      return 'denied' as const
    }

    setUser({ ...candidate, profile })
    setStatus('admin')
    return 'admin' as const
  }, [client])

  const refresh = useCallback(async () => {
    setStatus('loading')
    const { data, error } = await client.auth.getUser()
    if (error) return authorize(null)
    return authorize(data.user)
  }, [authorize, client])

  useEffect(() => {
    void client.auth.getUser().then(({ data, error }) => {
      void authorize(error ? null : data.user)
    })

    const { data: { subscription } } = client.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') setRecovery(true)
      void authorize(session?.user ?? null)
    })

    return () => {
      requestId.current += 1
      subscription.unsubscribe()
    }
  }, [authorize, client])

  const signIn = useCallback(async (email: string, password: string) => {
    setRecovery(false)
    const result = await client.auth.signInWithPassword({ email, password })
    if (result.error) return { error: result.error, status: null }
    const nextStatus = await authorize(result.data.user)
    return { error: null, status: nextStatus }
  }, [authorize, client])

  const requestPasswordReset = useCallback(async (email: string) => client.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/admin/login?mode=recovery`,
  }), [client])

  const updateRecoveredPassword = useCallback(async (password: string) => {
    const result = await client.auth.updateUser({ password })
    if (!result.error) setRecovery(false)
    return result
  }, [client])

  const signOut = useCallback(async () => {
    requestId.current += 1
    const result = await client.auth.signOut({ scope: 'local' })
    setUser(null)
    setStatus('guest')
    return result
  }, [client])

  return { status, user, recovery, refresh, signIn, signOut, requestPasswordReset, updateRecoveredPassword }
}
