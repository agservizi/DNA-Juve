import { motion } from 'framer-motion'
import SEO from '@/components/blog/SEO'

export default function CookiePolicy() {
  return (
    <>
      <SEO title="Cookie Policy" url="/cookie-policy" noindex />

      <div className="max-w-3xl mx-auto px-4 py-16">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="font-display text-4xl font-black mb-2">Cookie Policy</h1>
          <p className="text-sm text-gray-400 mb-10">Ultimo aggiornamento: 1 gennaio 2026</p>

          <div className="prose prose-lg max-w-none prose-headings:font-display prose-headings:font-bold">
            <h2>Cosa sono i cookie</h2>
            <p>
              I cookie sono piccoli file di testo che i siti web memorizzano sul dispositivo dell'utente
              durante la navigazione. Servono a migliorare l'esperienza d'uso e a fornire informazioni
              ai proprietari del sito.
            </p>

            <h2>Cookie utilizzati da BianconeriHub</h2>

            <h3>Cookie essenziali (tecnici)</h3>
            <p>Necessari per il funzionamento del sito. Non richiedono consenso.</p>
            <table>
              <thead>
                <tr><th>Nome</th><th>Finalità</th><th>Durata</th></tr>
              </thead>
              <tbody>
                <tr><td>fb-cookie-consent</td><td>Memorizza la scelta sui cookie</td><td>1 anno</td></tr>
                <tr><td>sb-*-auth-token</td><td>Sessione di autenticazione admin</td><td>Sessione</td></tr>
              </tbody>
            </table>

            <h3>Cookie analitici (anonimi)</h3>
            <p>
              Utilizzati per raccogliere informazioni aggregate e anonime sull'utilizzo del sito
              (pagine più visitate, durata della visita, provenienza geografica).
              Questi cookie non consentono l'identificazione personale dell'utente.
            </p>

            <h3>Cookie di marketing</h3>
            <p>
              <strong>BianconeriHub non utilizza cookie di marketing o profilazione.</strong> Non vengono
              effettuate attività di tracciamento pubblicitario né condivisione dati con terze parti
              a fini commerciali.
            </p>

            <h2>Gestione dei cookie</h2>
            <p>
              Al primo accesso al sito viene mostrato un banner che consente di accettare tutti i cookie
              o di limitarsi ai soli cookie essenziali. La scelta può essere modificata in qualsiasi
              momento cancellando i cookie dal proprio browser.
            </p>
            <p>
              Per disabilitare i cookie tramite browser, consultare le guide ufficiali:
            </p>
            <ul>
              <li>Chrome: Impostazioni → Privacy e sicurezza → Cookie</li>
              <li>Firefox: Impostazioni → Privacy e sicurezza → Cookie e dati dei siti web</li>
              <li>Safari: Preferenze → Privacy → Gestisci dati dei siti web</li>
              <li>Edge: Impostazioni → Cookie e autorizzazioni sito</li>
            </ul>

            <h2>Contatti</h2>
            <p>
              Per domande sulla gestione dei cookie, scrivere a{' '}
              <a href="mailto:info@bianconerihub.com">info@bianconerihub.com</a>.
            </p>
          </div>
        </motion.div>
      </div>
    </>
  )
}
