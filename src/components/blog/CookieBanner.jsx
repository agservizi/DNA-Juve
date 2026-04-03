import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Cookie, X, Check } from 'lucide-react'

const COOKIE_KEY = 'fb-cookie-consent'

export default function CookieBanner() {
  const [visible, setVisible] = useState(false)
  const [showDetails, setShowDetails] = useState(false)

  useEffect(() => {
    const consent = localStorage.getItem(COOKIE_KEY)
    if (!consent) {
      const timer = setTimeout(() => setVisible(true), 1500)
      return () => clearTimeout(timer)
    }
  }, [])

  const accept = (all = true) => {
    localStorage.setItem(COOKIE_KEY, all ? 'all' : 'essential')
    setVisible(false)
  }

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
                  <p className="text-sm font-bold text-juve-black mb-0.5">Questo sito usa i cookie</p>
                  <p className="text-xs text-gray-500 leading-relaxed">
                    Utilizziamo cookie essenziali per il funzionamento del sito e cookie analitici (anonimi) per migliorare l'esperienza.
                    {!showDetails && (
                      <button onClick={() => setShowDetails(true)} className="ml-1 text-juve-gold hover:underline">
                        Maggiori info
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
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs text-gray-500">
                          {[
                            { label: 'Essenziali', desc: 'Autenticazione, preferenze', required: true },
                            { label: 'Analitici', desc: 'Statistiche anonime di utilizzo', required: false },
                            { label: 'Marketing', desc: 'Non utilizzati', required: false, disabled: true },
                          ].map(c => (
                            <div key={c.label} className={`p-2 border ${c.disabled ? 'opacity-40' : 'border-gray-200'}`}>
                              <p className="font-bold text-juve-black">{c.label}</p>
                              <p>{c.desc}</p>
                              {c.required && <span className="text-[10px] text-green-600 font-bold">OBBLIGATORI</span>}
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0 flex-wrap">
                <button
                  onClick={() => accept(false)}
                  className="px-4 py-2 border border-gray-300 text-xs font-bold uppercase tracking-wider hover:bg-gray-50 transition-colors"
                >
                  Solo essenziali
                </button>
                <button
                  onClick={() => accept(true)}
                  className="flex items-center gap-1.5 px-5 py-2 bg-juve-gold text-black text-xs font-black uppercase tracking-wider hover:bg-juve-gold-dark transition-colors"
                >
                  <Check className="h-3.5 w-3.5" />
                  Accetta tutti
                </button>
                <button onClick={() => setVisible(false)} className="p-1.5 hover:bg-gray-100 transition-colors text-gray-400">
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
