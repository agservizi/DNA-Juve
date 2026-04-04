import { useState } from 'react'
import { Dialog, DialogHeader, DialogTitle, DialogContent } from '@/components/ui/Dialog'
import { Button } from '@/components/ui/Button'
import { useReader } from '@/hooks/useReader'
import { Loader2, MailCheck, UserCircle } from 'lucide-react'

export default function ReaderLoginDialog() {
  const { showLoginDialog, closeLogin, register, login } = useReader()
  const [mode, setMode] = useState('register') // 'register' | 'login'
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [successMode, setSuccessMode] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      if (mode === 'register' && name.trim() && email.trim()) {
        const result = await register(name.trim(), email.trim())
        setSuccessMode(result?.mode === 'magic-link' ? 'magic-link' : 'success')
      } else if (mode === 'login' && email.trim()) {
        const result = await login(email.trim())
        setSuccessMode(result?.mode === 'magic-link' ? 'magic-link' : 'success')
      }
    } catch (err) {
      setError(String(err?.message || 'Accesso non riuscito. Riprova.'))
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    closeLogin()
    setMode('register')
    setName('')
    setEmail('')
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
              {successMode === 'magic-link'
                ? <MailCheck className="h-6 w-6 text-black" />
                : <span className="text-black font-black text-lg">✓</span>
              }
            </div>
            <p className="font-display text-xl font-bold">
              {successMode === 'magic-link' ? 'Controlla la tua email' : 'Benvenuto!'}
            </p>
            <p className="text-sm text-gray-500 mt-1">
              {successMode === 'magic-link'
                ? 'Ti abbiamo inviato un link magico per accedere e sincronizzare il tuo profilo.'
                : 'Accesso effettuato con successo'}
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <p className="text-sm text-gray-600 mb-4">
              {mode === 'register'
                ? 'Crea il tuo profilo gratuito per salvare articoli, tracciare la tua cronologia e personalizzare il magazine.'
                : 'Inserisci la tua email per accedere alla tua area personale.'}
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

            {error && (
              <p className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </p>
            )}

            <Button type="submit" variant="gold" size="lg" className="w-full">
              {loading ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Invio in corso...
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
