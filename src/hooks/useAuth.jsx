import { useState, useEffect, createContext, useContext } from 'react'
import { supabase, signIn, signOut, onAuthStateChange, getProfileByUserId } from '@/lib/supabase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true

    const syncUserState = async (sessionUser) => {
      if (!mounted) return

      const nextUser = sessionUser ?? null
      setUser(nextUser)

      if (!nextUser?.id) {
        setProfile(null)
        setLoading(false)
        return
      }

      try {
        const { data } = await getProfileByUserId(nextUser.id)
        if (!mounted) return
        setProfile(data || null)
      } catch {
        if (!mounted) return
        setProfile(null)
      } finally {
        if (!mounted) return
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

  const login = async (email, password) => {
    const { data, error } = await signIn(email, password)
    if (error) throw error
    return data
  }

  const logout = async () => {
    await signOut()
    setUser(null)
    setProfile(null)
  }

  return (
    <AuthContext.Provider value={{ user, profile, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
