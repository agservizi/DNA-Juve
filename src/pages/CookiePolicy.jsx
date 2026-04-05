import { motion } from 'framer-motion'
import SEO from '@/components/blog/SEO'
import { openCookiePreferences } from '@/lib/cookieConsent'

export default function CookiePolicy() {
  return (
    <>
      <SEO title="Cookie Policy" url="/cookie-policy" noindex />

      <div className="max-w-3xl mx-auto px-4 py-16">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="font-display text-4xl font-black mb-2">Cookie Policy</h1>
          <p className="text-sm text-gray-400 mb-10">Ultimo aggiornamento: 5 aprile 2026</p>

          <div className="prose prose-lg max-w-none prose-headings:font-display prose-headings:font-bold">
            <h2>1. Cosa sono cookie e tecnologie simili</h2>
            <p>
              I cookie sono piccoli file di testo che un sito memorizza nel browser. Su BianconeriHub
              utilizziamo anche tecnologie equivalenti, come storage locale del browser e token di sessione,
              quando servono per autenticazione, sicurezza, preferenze del lettore e funzionamento del magazine.
            </p>

            <h2>2. Tecnologie usate da BianconeriHub</h2>

            <h3>Cookie e strumenti essenziali</h3>
            <p>
              Sono necessari per il funzionamento del sito, dell&apos;area lettori e dell&apos;area admin.
              Senza questi strumenti il magazine non può garantire autenticazione, sicurezza o memorizzazione
              delle preferenze strettamente tecniche. Non richiedono consenso.
            </p>
            <table>
              <thead>
                <tr><th>Nome / categoria</th><th>Finalità</th><th>Durata indicativa</th></tr>
              </thead>
              <tbody>
                <tr><td>fb-cookie-consent</td><td>Memorizza la scelta dell&apos;utente sulle preferenze cookie</td><td>12 mesi</td></tr>
                <tr><td>sb-*-auth-token / token Supabase</td><td>Gestione sessione di accesso per area lettori e area amministrativa</td><td>sessione / rinnovo controllato da Supabase</td></tr>
                <tr><td>Storage locale del lettore</td><td>Preferenze, progressi, bozze e stato locale di Area Bianconera</td><td>fino a cancellazione da browser o logout</td></tr>
              </tbody>
            </table>

            <h3>Strumenti analitici opzionali</h3>
            <p>
              Attualmente il sito non attiva strumenti di analisi opzionali di terze parti dal banner.
              Se in futuro verranno introdotti, resteranno disattivati fino al consenso dell&apos;utente
              e verranno descritti in questa pagina.
            </p>

            <h3>Contenuti esterni e condivisione</h3>
            <p>
              Alcune funzioni del sito, come i link di condivisione social o eventuali contenuti incorporati
              da terze parti, possono portare l&apos;utente verso piattaforme esterne. Il caricamento di widget
              esterni che impostano tecnologie proprie resta soggetto alle preferenze selezionate e alle
              policy del relativo fornitore.
            </p>

            <h3>Cookie di marketing e profilazione</h3>
            <p>
              <strong>BianconeriHub non utilizza cookie di marketing o profilazione pubblicitaria.</strong>
            </p>

            <h2>3. Gestione delle preferenze</h2>
            <p>
              Al primo accesso viene mostrato un banner che consente di:
            </p>
            <ul>
              <li>accettare solo i cookie e gli strumenti essenziali;</li>
              <li>accettare tutte le categorie facoltative;</li>
              <li>personalizzare le preferenze.</li>
            </ul>
            <p>
              Le preferenze possono essere riaperte in qualsiasi momento dal footer del sito tramite il link
              <strong> “Rivedi preferenze cookie”</strong>.
            </p>

            <h2>4. Gestione tramite browser</h2>
            <p>
              L&apos;utente può inoltre cancellare o bloccare i cookie direttamente dal browser. Questa operazione,
              però, può compromettere alcune funzioni del sito come login, commenti, Area Bianconera e notifiche.
            </p>
            <p>Per disabilitare i cookie tramite browser, consultare le guide ufficiali:</p>
            <ul>
              <li>Chrome: Impostazioni → Privacy e sicurezza → Cookie</li>
              <li>Firefox: Impostazioni → Privacy e sicurezza → Cookie e dati dei siti web</li>
              <li>Safari: Preferenze → Privacy → Gestisci dati dei siti web</li>
              <li>Edge: Impostazioni → Cookie e autorizzazioni sito</li>
            </ul>

            <h2>5. Collegamenti con altre informative</h2>
            <p>
              Per il trattamento dei dati personali collegati a registrazione, commenti, proposte tifosi,
              newsletter, notifiche push e diritti dell&apos;interessato, consulta anche la{' '}
              <a href="/privacy">Privacy Policy</a>.
            </p>

            <div className="not-prose mt-8 border border-juve-gold/30 bg-juve-gold/5 p-5">
              <p className="text-sm font-semibold text-juve-black">
                Vuoi aggiornare subito le tue preferenze?
              </p>
              <button
                type="button"
                onClick={openCookiePreferences}
                className="mt-3 inline-flex items-center justify-center border border-juve-black px-4 py-2 text-xs font-black uppercase tracking-[0.22em] text-juve-black transition-colors hover:bg-juve-black hover:text-white"
              >
                Rivedi preferenze cookie
              </button>
            </div>

            <h2>6. Contatti</h2>
            <p>
              Per richieste relative a cookie e tecnologie simili puoi scrivere a{' '}
              <a href="mailto:info@bianconerihub.com">info@bianconerihub.com</a>.
            </p>
          </div>
        </motion.div>
      </div>
    </>
  )
}
