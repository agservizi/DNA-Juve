'use client'

import { useState, type FormEvent } from 'react'

export function NewsletterCapture({ compact = false }: { compact?: boolean }) {
  const [email, setEmail] = useState('')
  const [state, setState] = useState<'idle' | 'sending' | 'done' | 'error'>('idle')
  const [message, setMessage] = useState('')

  async function subscribe(event: FormEvent) {
    event.preventDefault()
    setState('sending')
    setMessage('')
    try {
      const response = await fetch('/api/newsletter', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const payload = (await response.json().catch(() => ({}))) as { error?: string }
      if (!response.ok) throw new Error(payload.error || 'Iscrizione non riuscita.')
      setEmail('')
      setState('done')
      setMessage('Iscrizione confermata. #FinoAllaFine')
    } catch (error) {
      setState('error')
      setMessage(error instanceof Error ? error.message : 'Iscrizione non riuscita.')
    }
  }

  return (
    <div className={`newsletter-capture${compact ? ' is-compact' : ''}`}>
      <p className="newsletter-kicker">Newsletter BianconeriHub</p>
      <h2>{compact ? 'Resta aggiornato.' : 'Le notizie nella tua inbox.'}</h2>
      {state === 'done' ? (
        <p role="status">{message}</p>
      ) : (
        <form onSubmit={subscribe}>
          <input
            required
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="tua@email.it"
            aria-describedby="newsletter-capture-feedback"
            autoComplete="email"
          />
          <button type="submit" disabled={state === 'sending'}>
            {state === 'sending' ? 'Iscrizione…' : 'Iscriviti'}
          </button>
        </form>
      )}
      {message && state === 'error' && (
        <p id="newsletter-capture-feedback" role="alert">
          {message}
        </p>
      )}
      <small>Nessuno spam. Cancellazione in qualsiasi momento.</small>
    </div>
  )
}
