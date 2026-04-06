import { useState, useEffect, createContext, useContext } from 'react'
import { supabase, signIn, signOut, onAuthStateChange, getProfileByUserId } from '@/lib/supabase'

const AuthContext = createContext(null)
const PRIMARY_ADMIN_EMAIL = 'admin@bianconerihub.com'

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [profileLoading, setProfileLoading] = useState(true)

  useEffect(() => {
    let mounted = true

    const syncUserState = async (sessionUser) => {
      if (!mounted) return

      const nextUser = sessionUser ?? null
      setUser(nextUser)

      if (!nextUser?.id) {
        setProfile(null)
        setProfileLoading(false)
        setLoading(false)
        return
      }

      setProfileLoading(true)

      try {
        const { data } = await getProfileByUserId(nextUser.id)
        if (!mounted) return
        const normalizedProfile = nextUser?.email === PRIMARY_ADMIN_EMAIL
          ? { ...(data || {}), role: 'admin' }
          : (data || null)
        setProfile(normalizedProfile)
      } catch {
        if (!mounted) return
        setProfile(nextUser?.email === PRIMARY_ADMIN_EMAIL ? { id: nextUser.id, role: 'admin' } : null)
      } finally {
        if (!mounted) return
        setProfileLoading(false)
        setLoading(false)
      }
    }

    supabase.auth.getSession()
      .then(({ data: { session } }) => {
        syncUserState(session?.user ?? null)
      })
      .catch(() => {
        if (!mounted) return
        setUser(null)
        setProfile(null)
        setProfileLoading(false)
        setLoading(false)
      })

    const { data: { subscription } } = onAuthStateChange((_event, session) => {
      syncUserState(session?.user ?? null)
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  const refreshProfile = async (nextUser = user) => {
    const sessionUser = nextUser ?? null
    setUser(sessionUser)

    if (!sessionUser?.id) {
      setProfile(null)
      setProfileLoading(false)
      return null
    }

    setProfileLoading(true)

    try {
      const { data } = await getProfileByUserId(sessionUser.id)
      const normalizedProfile = sessionUser?.email === PRIMARY_ADMIN_EMAIL
        ? { ...(data || {}), role: 'admin' }
        : (data || null)
      setProfile(normalizedProfile)
      return normalizedProfile
    } catch {
      const fallbackProfile = sessionUser?.email === PRIMARY_ADMIN_EMAIL
        ? { id: sessionUser.id, role: 'admin' }
        : null
      setProfile(fallbackProfile)
      return fallbackProfile
    } finally {
      setProfileLoading(false)
    }
  }

  const login = async (email, password) => {
    const { data, error } = await signIn(email, password)
    if (error) throw error

    const sessionUser = data?.user || data?.session?.user || null
    const profileData = sessionUser?.id ? await refreshProfile(sessionUser) : null

    return { ...data, profile: profileData }
  }

  const logout = async () => {
    await signOut()
    setUser(null)
    setProfile(null)
  }

  return (
    <AuthContext.Provider value={{ user, profile, loading, profileLoading, login, logout, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
