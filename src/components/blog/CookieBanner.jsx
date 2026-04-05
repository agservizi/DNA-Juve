import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Cookie, X, Check, ShieldCheck } from 'lucide-react'
import {
  COOKIE_CONSENT_OPEN_EVENT,
  readCookieConsent,
  writeCookieConsent,
} from '@/lib/cookieConsent'

export default function CookieBanner() {
  const [visible, setVisible] = useState(false)
  const [showDetails, setShowDetails] = useState(false)
  const [preferences, setPreferences] = useState({
    essential: true,
    analytics: false,
    external: false,
  })

  useEffect(() => {
    const consent = readCookieConsent()
    if (!consent) {
      const timer = setTimeout(() => setVisible(true), 1500)
      return () => clearTimeout(timer)
    }

    setPreferences({
      essential: true,
      analytics: Boolean(consent.analytics),
      external: Boolean(consent.external),
    })
  }, [])

  useEffect(() => {
    const openPreferences = () => {
      const consent = readCookieConsent()
      setPreferences({
        essential: true,
        analytics: Boolean(consent?.analytics),
        external: Boolean(consent?.external),
      })
      setShowDetails(true)
      setVisible(true)
    }

    window.addEventListener(COOKIE_CONSENT_OPEN_EVENT, openPreferences)
    return () => window.removeEventListener(COOKIE_CONSENT_OPEN_EVENT, openPreferences)
  }, [])

  const saveConsent = (nextConsent) => {
    writeCookieConsent(nextConsent)
    setVisible(false)
  }

  const acceptAll = () => saveConsent({ essential: true, analytics: true, external: true })
  const acceptEssentialOnly = () => saveConsent({ essential: true, analytics: false, external: false })
  const saveCustomPreferences = () => saveConsent(preferences)

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 100 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 100 }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t-2 border-juve-black shadow-2xl"
        >
          <div className="max-w-6xl mx-auto px-4 py-4">
            <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
              <div className="flex items-start gap-3 flex-1">
                <Cookie className="h-5 w-5 text-juve-gold shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-bold text-juve-black mb-0.5">Cookie e tecnologie simili</p>
                  <p className="text-xs text-gray-500 leading-relaxed">
                    Utilizziamo solo i cookie e gli strumenti tecnici necessari al funzionamento del magazine, dell&apos;area utenti e della sicurezza.
                    Le tecnologie opzionali restano disattivate finché non le scegli tu.
                    {!showDetails && (
                      <button onClick={() => setShowDetails(true)} className="ml-1 text-juve-gold hover:underline">
                        Personalizza
                      </button>
                    )}
                  </p>

                  <AnimatePresence>
                    {showDetails && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="mt-2 overflow-hidden"
                      >
                        <div className="grid gap-2 text-xs text-gray-500">
                          <div className="p-3 border border-gray-200">
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <p className="font-bold text-juve-black">Essenziali</p>
                                <p className="mt-1">Autenticazione, sicurezza, preferenze di base e memorizzazione del consenso.</p>
                              </div>
                              <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-green-700">
                                <ShieldCheck className="h-3 w-3" />
                                Sempre attivi
                              </span>
                            </div>
                          </div>

                          <label className="flex items-start justify-between gap-4 p-3 border border-gray-200 cursor-pointer">
                            <div>
                              <p className="font-bold text-juve-black">Analitici</p>
                              <p className="mt-1">Misurazioni aggregate sul traffico e sulle sezioni più lette, da attivare solo se introdurremo analytics opzionali.</p>
                            </div>
                            <input
                              type="checkbox"
                              className="mt-1 h-4 w-4 accent-juve-gold"
                              checked={preferences.analytics}
                              onChange={(event) =>
                                setPreferences((prev) => ({ ...prev, analytics: event.target.checked }))
                              }
                            />
                          </label>

                          <label className="flex items-start justify-between gap-4 p-3 border border-gray-200 cursor-pointer">
                            <div>
                              <p className="font-bold text-juve-black">Contenuti esterni e condivisione</p>
                              <p className="mt-1">Eventuali widget o contenuti incorporati di terze parti che potrebbero impostare tecnologie proprie.</p>
                            </div>
                            <input
                              type="checkbox"
                              className="mt-1 h-4 w-4 accent-juve-gold"
                              checked={preferences.external}
                              onChange={(event) =>
                                setPreferences((prev) => ({ ...prev, external: event.target.checked }))
                              }
                            />
                          </label>
                        </div>
                        <p className="mt-3 text-[11px] text-gray-500">
                          Nessun cookie di marketing o profilazione viene attivato da questo banner.
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0 flex-wrap">
                <button
                  onClick={acceptEssentialOnly}
                  className="px-4 py-2 border border-gray-300 text-xs font-bold uppercase tracking-wider hover:bg-gray-50 transition-colors"
                >
                  Solo essenziali
                </button>
                {showDetails && (
                  <button
                    onClick={saveCustomPreferences}
                    className="px-4 py-2 border border-juve-gold text-xs font-bold uppercase tracking-wider text-juve-black hover:bg-juve-gold/10 transition-colors"
                  >
                    Salva preferenze
                  </button>
                )}
                <button
                  onClick={acceptAll}
                  className="flex items-center gap-1.5 px-5 py-2 bg-juve-gold text-black text-xs font-black uppercase tracking-wider hover:bg-juve-gold-dark transition-colors"
                >
                  <Check className="h-3.5 w-3.5" />
                  Accetta tutti
                </button>
                <button
                  onClick={acceptEssentialOnly}
                  className="p-1.5 hover:bg-gray-100 transition-colors text-gray-400"
                  aria-label="Chiudi e mantieni solo i cookie essenziali"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
