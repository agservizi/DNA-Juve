'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { X } from 'lucide-react'

export const COOKIE_CONSENT_KEY = 'fb-cookie-consent'
export const COOKIE_CONSENT_EVENT = 'bianconerihub:cookie-preferences'

type Consent = {
  version: 1
  essential: true
  analytics: boolean
  externalMedia: boolean
  updatedAt: string
}

const makeConsent = (optional: boolean): Consent => ({
  version: 1,
  essential: true,
  analytics: optional,
  externalMedia: optional,
  updatedAt: new Date().toISOString(),
})

const CONSENT_MAX_AGE_MS = 183 * 24 * 60 * 60 * 1000

export function readCookieConsent(): Consent | null {
  if (typeof window === 'undefined') return null
  try {
    const parsed = JSON.parse(window.localStorage.getItem(COOKIE_CONSENT_KEY) || 'null') as Consent | null
    if (parsed?.version !== 1 || parsed.essential !== true) return null
    const savedAt = Date.parse(parsed.updatedAt)
    if (!Number.isFinite(savedAt) || Date.now() - savedAt >= CONSENT_MAX_AGE_MS) {
      window.localStorage.removeItem(COOKIE_CONSENT_KEY)
      return null
    }
    return parsed
  } catch {
    return null
  }
}

export function CookieConsent() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const [customize, setCustomize] = useState(false)
  const [analytics, setAnalytics] = useState(false)
  const [externalMedia, setExternalMedia] = useState(false)

  useEffect(() => {
    const timer = window.setTimeout(() => setOpen(!readCookieConsent()), 0)
    const reopen = () => {
      const current = readCookieConsent()
      setAnalytics(Boolean(current?.analytics))
      setExternalMedia(Boolean(current?.externalMedia))
      setCustomize(true)
      setOpen(true)
    }
    window.addEventListener(COOKIE_CONSENT_EVENT, reopen)
    return () => { window.clearTimeout(timer); window.removeEventListener(COOKIE_CONSENT_EVENT, reopen) }
  }, [])

  const persist = (consent: Consent) => {
    window.localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify(consent))
    document.documentElement.dataset.analyticsConsent = consent.analytics ? 'granted' : 'denied'
    document.documentElement.dataset.externalMediaConsent = consent.externalMedia ? 'granted' : 'denied'
    window.dispatchEvent(new CustomEvent(`${COOKIE_CONSENT_EVENT}:changed`, { detail: consent }))
    setOpen(false)
  }

  if (!open || pathname.startsWith('/admin') || pathname.startsWith('/area-bianconera')) return null

  return <div className="cookie-consent" role="dialog" aria-labelledby="cookie-title" aria-describedby="cookie-description" onKeyDown={(event) => { if (event.key === 'Escape') persist(makeConsent(false)) }}>
    <div className="cookie-consent__panel">
      <button className="cookie-consent__close" type="button" aria-label="Rifiuta i cookie facoltativi e chiudi" title="Rifiuta i cookie facoltativi" autoFocus onClick={() => persist(makeConsent(false))}><X aria-hidden="true" size={18}/></button>
      <p className="cookie-consent__kicker">Privacy</p>
      <h2 id="cookie-title">Le tue preferenze</h2>
      <p id="cookie-description">Gli strumenti facoltativi restano spenti finché non li autorizzi. Chiudendo mantieni solo quelli essenziali.</p>
      {customize && <div className="cookie-consent__options">
        <label><span><strong>Essenziali</strong><small>Login, sicurezza e preferenze tecniche.</small></span><input type="checkbox" checked disabled /></label>
        <label><span><strong>Analisi anonime</strong><small>Misurazione facoltativa delle prestazioni.</small></span><input type="checkbox" checked={analytics} onChange={(event) => setAnalytics(event.target.checked)} /></label>
        <label><span><strong>Contenuti esterni</strong><small>Video e widget forniti da piattaforme terze.</small></span><input type="checkbox" checked={externalMedia} onChange={(event) => setExternalMedia(event.target.checked)} /></label>
      </div>}
      <div className="cookie-consent__actions">
        <button type="button" className="is-choice" onClick={() => persist(makeConsent(false))}>Rifiuta</button>
        {customize
          ? <button type="button" className="is-choice" onClick={() => persist({ ...makeConsent(false), analytics, externalMedia })}>Salva</button>
          : <button type="button" className="is-choice" onClick={() => persist(makeConsent(true))}>Accetta</button>}
      </div>
      <div className="cookie-consent__links">{!customize&&<button type="button" onClick={() => setCustomize(true)}>Personalizza</button>}<a href="/cookie-policy">Cookie Policy</a></div>
    </div>
  </div>
}

export function CookiePreferencesButton() {
  return <button className="footer-cookie-button" type="button" onClick={() => window.dispatchEvent(new Event(COOKIE_CONSENT_EVENT))}>Rivedi preferenze cookie</button>
}
