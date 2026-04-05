import { useEffect, useState } from 'react'
import { Dialog, DialogHeader, DialogTitle, DialogContent } from '@/components/ui/Dialog'
import { Button } from '@/components/ui/Button'
import { useReader } from '@/hooks/useReader'
import { Loader2, UserCircle } from 'lucide-react'

export default function ReaderLoginDialog() {
  const {
    showLoginDialog,
    loginDialogMode,
    closeLogin,
    register,
    login,
    resendConfirmationEmail,
    sendPasswordReset,
    completePasswordReset,
  } = useReader()
  const [mode, setMode] = useState('register') // 'register' | 'login' | 'recovery'
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [nextPassword, setNextPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [successMode, setSuccessMode] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (showLoginDialog) {
      if (loginDialogMode === 'recovery') {
        setMode('recovery')
      } else {
        setMode(loginDialogMode === 'login' ? 'login' : 'register')
      }
      setError('')
      setSuccessMode(null)
    }
  }, [showLoginDialog, loginDialogMode])

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

    if (normalized.includes('email-not-confirmed-reminder-sent')) {
      return 'Il tuo account non è ancora confermato. Ti abbiamo appena reinviato una email di promemoria per completare la verifica.'
    }

    if (normalized.includes('email not confirmed')) {
      return 'Il tuo account non è ancora confermato. Controlla la tua email e completa la verifica.'
    }

    if (normalized.includes('password should be at least')) {
      return 'La password deve contenere almeno 6 caratteri.'
    }

    if (normalized.includes('same password')) {
      return 'Scegli una password diversa da quella attuale.'
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
        await login({
          email: email.trim(),
          password: password.trim(),
        })
        setSuccessMode('success')
      } else if (mode === 'recovery') {
        if (nextPassword.trim().length < 6) {
          throw new Error('La password deve contenere almeno 6 caratteri.')
        }
        if (nextPassword !== confirmPassword) {
          throw new Error('Le password non coincidono.')
        }
        await completePasswordReset(nextPassword.trim())
        setSuccessMode('password-updated')
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
    setNextPassword('')
    setConfirmPassword('')
    setSuccessMode(null)
    setLoading(false)
    setError('')
  }

  const handleForgotPassword = async () => {
    setError('')
    setLoading(true)

    try {
      await sendPasswordReset(email.trim())
      setSuccessMode('reset-email')
    } catch (err) {
      setError(formatReaderAuthError(err))
    } finally {
      setLoading(false)
    }
  }

  const handleResendConfirmation = async () => {
    setError('')
    setLoading(true)

    try {
      await resendConfirmationEmail(email.trim())
      setSuccessMode('confirmation-resent')
    } catch (err) {
      setError(formatReaderAuthError(err))
    } finally {
      setLoading(false)
    }
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
              {successMode === 'confirm-email'
                ? 'Conferma il tuo account'
                : successMode === 'reset-email'
                  ? 'Controlla la tua email'
                  : successMode === 'confirmation-resent'
                    ? 'Promemoria inviato'
                  : successMode === 'password-updated'
                    ? 'Password aggiornata'
                    : 'Benvenuto!'}
            </p>
            <p className="text-sm text-gray-500 mt-1">
              {successMode === 'confirm-email'
                ? 'Ti abbiamo inviato un link di conferma. Dopo la verifica potrai accedere con email e password.'
                : successMode === 'reset-email'
                  ? 'Ti abbiamo inviato un link per reimpostare la password. Aprilo e torna qui per scegliere la nuova password.'
                  : successMode === 'confirmation-resent'
                    ? 'Ti abbiamo reinviato una email di conferma. Aprila per attivare il tuo account.'
                  : successMode === 'password-updated'
                    ? 'Ora puoi accedere ad Area Bianconera con la nuova password.'
                    : 'Accesso effettuato con successo'}
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <p className="text-sm text-gray-600 mb-4">
              {mode === 'register'
                ? 'Crea il tuo profilo gratuito con password per salvare articoli, tracciare la tua cronologia e personalizzare il magazine.'
                : mode === 'recovery'
                  ? 'Imposta una nuova password per completare il recupero del tuo account.'
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

            {mode !== 'recovery' && (
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
            )}

            {mode !== 'recovery' ? (
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
            ) : (
              <>
                <div>
                  <label className="text-xs font-black uppercase tracking-widest mb-1.5 block">Nuova password</label>
                  <input
                    type="password"
                    value={nextPassword}
                    onChange={e => setNextPassword(e.target.value)}
                    placeholder="Almeno 6 caratteri"
                    className="w-full border-2 border-gray-300 px-4 py-2.5 text-sm focus:outline-none focus:border-juve-gold transition-colors"
                    required
                    minLength={6}
                  />
                </div>
                <div>
                  <label className="text-xs font-black uppercase tracking-widest mb-1.5 block">Conferma password</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    placeholder="Ripeti la nuova password"
                    className="w-full border-2 border-gray-300 px-4 py-2.5 text-sm focus:outline-none focus:border-juve-gold transition-colors"
                    required
                    minLength={6}
                  />
                </div>
              </>
            )}

            {error && (
              <p className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </p>
            )}

            {mode === 'login' && email.trim() && (
              <button
                type="button"
                onClick={handleResendConfirmation}
                disabled={loading}
                className="text-xs font-bold uppercase tracking-wider text-juve-gold transition-opacity hover:opacity-80 disabled:opacity-50"
              >
                Reinvia email di conferma
              </button>
            )}

            {mode === 'login' && (
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  disabled={loading}
                  className="text-xs font-bold text-juve-gold hover:underline disabled:opacity-60"
                >
                  Password dimenticata?
                </button>
              </div>
            )}

            <Button type="submit" variant="gold" size="lg" className="w-full">
              {loading ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {mode === 'login'
                    ? 'Accesso in corso...'
                    : mode === 'recovery'
                      ? 'Aggiornamento in corso...'
                      : 'Invio in corso...'}
                </span>
              ) : (
                mode === 'register' ? 'Registrati' : mode === 'recovery' ? 'Aggiorna password' : 'Accedi'
              )}
            </Button>

            <p className="text-center text-xs text-gray-500">
              {mode === 'register' ? (
                <>Hai gia un account?{' '}<button type="button" onClick={() => setMode('login')} className="text-juve-gold font-bold hover:underline">Accedi</button></>
              ) : mode === 'login' ? (
                <>Non hai un account?{' '}<button type="button" onClick={() => setMode('register')} className="text-juve-gold font-bold hover:underline">Registrati</button></>
              ) : (
                <>Torna all’accesso{' '}<button type="button" onClick={() => setMode('login')} className="text-juve-gold font-bold hover:underline">Accedi</button></>
              )}
            </p>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
