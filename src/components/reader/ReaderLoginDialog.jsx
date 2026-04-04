import { useState } from 'react'
import { Dialog, DialogHeader, DialogTitle, DialogContent } from '@/components/ui/Dialog'
import { Button } from '@/components/ui/Button'
import { useReader } from '@/hooks/useReader'
import { Loader2, UserCircle } from 'lucide-react'

export default function ReaderLoginDialog() {
  const { showLoginDialog, closeLogin, register, login } = useReader()
  const [mode, setMode] = useState('register') // 'register' | 'login'
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [successMode, setSuccessMode] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const formatReaderAuthError = (err) => {
    const message = String(err?.message || '')
    const normalized = message.toLowerCase()

    if (
      err?.code === 'unexpected_failure' ||
      normalized.includes('database error saving new user') ||
      normalized.includes('saving new user')
    ) {
      return mode === 'register'
        ? 'La registrazione è momentaneamente non disponibile. Se hai già un account, usa "Accedi".'
        : 'Accesso momentaneamente non disponibile. Riprova tra poco.'
    }

    if (normalized.includes('user not found') || normalized.includes('signup is disabled')) {
      return 'Per questa email non risulta ancora un account. Usa "Registrati".'
    }

    if (normalized.includes('user already registered')) {
      return 'Questa email è già registrata. Usa "Accedi" con la tua password.'
    }

    if (normalized.includes('invalid login credentials')) {
      return 'Email o password non corretti.'
    }

    if (normalized.includes('password should be at least')) {
      return 'La password deve contenere almeno 6 caratteri.'
    }

    return message || 'Accesso non riuscito. Riprova.'
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      if (mode === 'register' && name.trim() && email.trim() && password.trim()) {
        const result = await register(name.trim(), email.trim(), password.trim())
        setSuccessMode(result?.mode === 'confirm-email' ? 'confirm-email' : 'success')
      } else if (mode === 'login' && email.trim() && password.trim()) {
        const result = await login({
          email: email.trim(),
          password: password.trim(),
        })
        setSuccessMode('success')
      }
    } catch (err) {
      const normalized = String(err?.message || '').toLowerCase()
      if (mode === 'register' && normalized.includes('user already registered')) {
        setMode('login')
      }
      setError(formatReaderAuthError(err))
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    closeLogin()
    setMode('register')
    setName('')
    setEmail('')
    setPassword('')
    setSuccessMode(null)
    setLoading(false)
    setError('')
  }

  return (
    <Dialog open={showLoginDialog} onClose={handleClose}>
      <DialogHeader onClose={handleClose}>
        <DialogTitle>
          <div className="flex items-center gap-2">
            <UserCircle className="h-5 w-5 text-juve-gold" />
            <span>Il Mio <span className="text-juve-gold">BIANCONERIHUB</span></span>
          </div>
        </DialogTitle>
      </DialogHeader>

      <DialogContent>
        {successMode ? (
          <div className="text-center py-8">
            <div className="w-12 h-12 bg-juve-gold flex items-center justify-center mx-auto mb-4">
              <span className="text-black font-black text-lg">✓</span>
            </div>
            <p className="font-display text-xl font-bold">
              {successMode === 'confirm-email' ? 'Conferma il tuo account' : 'Benvenuto!'}
            </p>
            <p className="text-sm text-gray-500 mt-1">
              {successMode === 'confirm-email'
                ? 'Ti abbiamo inviato un link di conferma. Dopo la verifica potrai accedere con email e password.'
                : 'Accesso effettuato con successo'}
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <p className="text-sm text-gray-600 mb-4">
              {mode === 'register'
                ? 'Crea il tuo profilo gratuito con password per salvare articoli, tracciare la tua cronologia e personalizzare il magazine.'
                : 'Accedi alla tua area personale con email e password.'}
            </p>

            {mode === 'register' && (
              <div>
                <label className="text-xs font-black uppercase tracking-widest mb-1.5 block">Nome</label>
                <input
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Il tuo nome"
                  className="w-full border-2 border-gray-300 px-4 py-2.5 text-sm focus:outline-none focus:border-juve-gold transition-colors"
                  required
                />
              </div>
            )}

            <div>
              <label className="text-xs font-black uppercase tracking-widest mb-1.5 block">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="la-tua@email.it"
                className="w-full border-2 border-gray-300 px-4 py-2.5 text-sm focus:outline-none focus:border-juve-gold transition-colors"
                required
              />
            </div>

            <div>
              <label className="text-xs font-black uppercase tracking-widest mb-1.5 block">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder={mode === 'register' ? 'Almeno 6 caratteri' : 'La tua password'}
                className="w-full border-2 border-gray-300 px-4 py-2.5 text-sm focus:outline-none focus:border-juve-gold transition-colors"
                required
                minLength={6}
              />
            </div>

            {error && (
              <p className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </p>
            )}

            <Button type="submit" variant="gold" size="lg" className="w-full">
              {loading ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {mode === 'login' ? 'Accesso in corso...' : 'Invio in corso...'}
                </span>
              ) : (
                mode === 'register' ? 'Registrati' : 'Accedi'
              )}
            </Button>

            <p className="text-center text-xs text-gray-500">
              {mode === 'register' ? (
                <>Hai gia un account?{' '}<button type="button" onClick={() => setMode('login')} className="text-juve-gold font-bold hover:underline">Accedi</button></>
              ) : (
                <>Non hai un account?{' '}<button type="button" onClick={() => setMode('register')} className="text-juve-gold font-bold hover:underline">Registrati</button></>
              )}
            </p>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
