import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Mail, CheckCircle, Loader2 } from 'lucide-react'
import { addSubscriber } from '@/lib/brevo'

export default function Newsletter({ variant = 'banner' }) {
  const [email, setEmail] = useState('')
  const [state, setState] = useState('idle') // idle | loading | success | error

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!email) return
    setState('loading')
    try {
      await addSubscriber(email)
      setState('success')
      setEmail('')
    } catch {
      setState('error')
      setTimeout(() => setState('idle'), 3000)
    }
  }

  if (variant === 'inline') {
    return (
      <div className="bg-juve-black text-white p-6 my-8">
        <div className="flex items-start gap-4">
          <Mail className="h-6 w-6 text-juve-gold shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="font-display text-lg font-black mb-1">Newsletter BianconeriHub</h3>
            <p className="text-sm text-gray-400 mb-4">Ricevi le ultime notizie bianconere direttamente nella tua inbox.</p>
            <AnimatePresence mode="wait">
              {state === 'success' ? (
                <motion.div key="ok" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-2 text-green-400 text-sm">
                  <CheckCircle className="h-4 w-4" />
                  Iscrizione confermata! #FinoAllaFine
                </motion.div>
              ) : (
                <motion.form key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} onSubmit={handleSubmit} className="flex gap-2">
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                    placeholder="tua@email.it"
                    className="flex-1 bg-gray-900 border border-gray-700 px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-juve-gold"
                  />
                  <button type="submit" disabled={state === 'loading'}
                    className="flex items-center gap-2 px-4 py-2 bg-juve-gold text-black text-sm font-black hover:bg-juve-gold-dark disabled:opacity-60 whitespace-nowrap">
                    {state === 'loading' ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Iscriviti'}
                  </button>
                </motion.form>
              )}
            </AnimatePresence>
            {state === 'error' && <p className="text-xs text-red-400 mt-1">Errore. Riprova.</p>}
          </div>
        </div>
      </div>
    )
  }

  // Banner variant (footer-style)
  return (
    <section className="bg-juve-black text-white py-12 px-4 my-16">
      <div className="max-w-2xl mx-auto text-center">
        <div className="flex items-baseline justify-center gap-1 mb-2">
          <span className="font-display text-3xl font-black">BIANCONERI</span>
          <span className="font-display text-3xl font-black text-juve-gold">HUB</span>
        </div>
        <div className="h-0.5 w-12 bg-juve-gold mx-auto my-4" />
        <h2 className="font-display text-2xl font-black mb-2">Newsletter Bianconera</h2>
        <p className="text-gray-400 text-sm mb-6">
          Unisciti a migliaia di tifosi. Ricevi notizie, calciomercato e analisi direttamente nella tua inbox.
        </p>
        <AnimatePresence mode="wait">
          {state === 'success' ? (
            <motion.div key="ok" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              className="flex items-center justify-center gap-2 text-green-400">
              <CheckCircle className="h-5 w-5" />
              <span className="font-bold">Benvenuto nella famiglia bianconera!</span>
            </motion.div>
          ) : (
            <motion.form key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                placeholder="Inserisci la tua email…"
                className="flex-1 bg-gray-900 border border-gray-700 px-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-juve-gold"
              />
              <button type="submit" disabled={state === 'loading'}
                className="flex items-center justify-center gap-2 px-6 py-3 bg-juve-gold text-black font-black text-sm uppercase tracking-wider hover:bg-juve-gold-dark disabled:opacity-60 whitespace-nowrap">
                {state === 'loading' ? <Loader2 className="h-4 w-4 animate-spin" /> : <>
                  <Mail className="h-4 w-4" /> Iscriviti
                </>}
              </button>
            </motion.form>
          )}
        </AnimatePresence>
        {state === 'error' && (
          <p className="text-xs text-red-400 mt-2">Errore durante l'iscrizione. Riprova.</p>
        )}
        <p className="text-xs text-gray-600 mt-4">Nessuno spam. Cancellazione in qualsiasi momento.</p>
      </div>
    </section>
  )
}
