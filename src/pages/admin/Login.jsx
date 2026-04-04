import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Lock, Mail, Eye, EyeOff, Loader2 } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPwd, setShowPwd] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const { login, user, loading: authLoading } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (!authLoading && user) {
      navigate('/admin', { replace: true })
    }
  }, [authLoading, user, navigate])

  const getAuthErrorMessage = (err) => {
    const message = String(err?.message || '').toLowerCase()

    if (message.includes('email not confirmed')) {
      return 'Questa email esiste ma non e ancora confermata.'
    }

    if (message.includes('invalid login credentials')) {
      return 'Email o password non validi. Riprova.'
    }

    if (message.includes('signup disabled')) {
      return 'L’accesso email/password non e disponibile al momento.'
    }

    if (message.includes('failed to fetch') || message.includes('network')) {
      return 'Connessione a Supabase non riuscita. Controlla rete e configurazione.'
    }

    return 'Accesso non riuscito. Riprova tra un attimo.'
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const data = await login(email, password)
      if (data?.session?.user || data?.user) {
        navigate('/admin', { replace: true })
      }
    } catch (err) {
      setError(getAuthErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-juve-black flex items-center justify-center p-4">
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-5" style={{
        backgroundImage: 'repeating-linear-gradient(45deg, #F5A623 0, #F5A623 1px, transparent 0, transparent 50%)',
        backgroundSize: '20px 20px',
      }} />

      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.4 }}
        className="relative w-full max-w-sm"
      >
        {/* Gold top border */}
        <div className="h-1 bg-juve-gold w-full" />

        <div className="bg-white p-8">
          {/* Logo */}
          <div className="text-center mb-8">
            <div className="flex items-baseline justify-center gap-1 mb-1">
              <span className="font-display text-3xl font-black text-juve-black">BIANCONERI</span>
              <span className="font-display text-3xl font-black text-juve-gold">HUB</span>
            </div>
            <p className="text-xs text-gray-500 uppercase tracking-widest">Admin Panel</p>
          </div>

          <h1 className="font-display text-xl font-black text-center mb-6">Accedi alla Redazione</h1>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-1.5">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  placeholder="admin@bianconerihub.com"
                  className="w-full border-2 border-gray-200 pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:border-juve-black transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type={showPwd ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  className="w-full border-2 border-gray-200 pl-9 pr-10 py-2.5 text-sm focus:outline-none focus:border-juve-black transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPwd(!showPwd)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {error && (
              <motion.p
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-sm text-red-600 bg-red-50 px-3 py-2 border-l-4 border-red-500"
              >
                {error}
              </motion.p>
            )}

            <button
              type="submit"
              disabled={loading || authLoading}
              className="w-full bg-juve-black text-white py-3 font-black uppercase tracking-widest text-sm hover:bg-juve-gold hover:text-black transition-colors disabled:opacity-60 flex items-center justify-center gap-2 mt-2"
            >
              {loading || authLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Accesso in corso…
                </>
              ) : (
                'Accedi'
              )}
            </button>
          </form>
        </div>

        <div className="h-1 bg-juve-gold w-full" />
      </motion.div>
    </div>
  )
}
