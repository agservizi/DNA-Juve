import { useState } from 'react'
import { Dialog, DialogHeader, DialogTitle, DialogContent } from '@/components/ui/Dialog'
import { Button } from '@/components/ui/Button'
import { useReader } from '@/hooks/useReader'
import { UserCircle } from 'lucide-react'

export default function ReaderLoginDialog() {
  const { showLoginDialog, closeLogin, register, login, loginDemo } = useReader()
  const [mode, setMode] = useState('register') // 'register' | 'login'
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [success, setSuccess] = useState(false)

  const handleSubmit = (e) => {
    e.preventDefault()
    if (mode === 'register' && name.trim() && email.trim()) {
      register(name.trim(), email.trim())
      setSuccess(true)
      setTimeout(() => { setSuccess(false); setName(''); setEmail('') }, 1500)
    } else if (mode === 'login' && email.trim()) {
      login(email.trim())
      setSuccess(true)
      setTimeout(() => { setSuccess(false); setName(''); setEmail('') }, 1500)
    }
  }

  const handleClose = () => {
    closeLogin()
    setMode('register')
    setName('')
    setEmail('')
    setSuccess(false)
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
        {success ? (
          <div className="text-center py-8">
            <div className="w-12 h-12 bg-juve-gold flex items-center justify-center mx-auto mb-4">
              <span className="text-black font-black text-lg">✓</span>
            </div>
            <p className="font-display text-xl font-bold">Benvenuto!</p>
            <p className="text-sm text-gray-500 mt-1">Accesso effettuato con successo</p>
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

            <Button type="submit" variant="gold" size="lg" className="w-full">
              {mode === 'register' ? 'Registrati' : 'Accedi'}
            </Button>

            <p className="text-center text-xs text-gray-500">
              {mode === 'register' ? (
                <>Hai gia un account?{' '}<button type="button" onClick={() => setMode('login')} className="text-juve-gold font-bold hover:underline">Accedi</button></>
              ) : (
                <>Non hai un account?{' '}<button type="button" onClick={() => setMode('register')} className="text-juve-gold font-bold hover:underline">Registrati</button></>
              )}
            </p>

            <div className="text-center pt-2 border-t border-gray-100 mt-4">
              <button type="button" onClick={loginDemo} className="text-xs text-gray-400 hover:text-juve-gold transition-colors">
                Prova con account demo
              </button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
