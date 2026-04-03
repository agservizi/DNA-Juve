import { motion } from 'framer-motion'
import SEO from '@/components/blog/SEO'

export default function PrivacyPolicy() {
  return (
    <>
      <SEO title="Privacy Policy" url="/privacy" noindex />

      <div className="max-w-3xl mx-auto px-4 py-16">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="font-display text-4xl font-black mb-2">Privacy Policy</h1>
          <p className="text-sm text-gray-400 mb-10">Ultimo aggiornamento: 1 gennaio 2026</p>

          <div className="prose prose-lg max-w-none prose-headings:font-display prose-headings:font-bold">
            <h2>1. Titolare del trattamento</h2>
            <p>
              Il titolare del trattamento dei dati personali è la redazione di BianconeriHub,
              raggiungibile all'indirizzo email <a href="mailto:info@bianconerihub.com">info@bianconerihub.com</a>.
            </p>

            <h2>2. Dati raccolti</h2>
            <p>Il sito raccoglie i seguenti dati:</p>
            <ul>
              <li><strong>Dati di navigazione:</strong> indirizzo IP, tipo di browser, pagine visitate, orario di accesso. Questi dati sono raccolti in forma anonima e aggregata a fini statistici.</li>
              <li><strong>Dati forniti volontariamente:</strong> nome, indirizzo email e contenuto dei commenti lasciati sugli articoli; indirizzo email per l'iscrizione alla newsletter.</li>
              <li><strong>Dati di autenticazione:</strong> email e password per l'accesso al pannello di amministrazione.</li>
            </ul>

            <h2>3. Finalità del trattamento</h2>
            <p>I dati personali sono trattati per le seguenti finalità:</p>
            <ul>
              <li>Gestione e pubblicazione dei commenti sugli articoli</li>
              <li>Invio della newsletter (previo consenso esplicito)</li>
              <li>Gestione dell'area amministrativa riservata</li>
              <li>Analisi statistiche anonime sull'utilizzo del sito</li>
            </ul>

            <h2>4. Base giuridica</h2>
            <p>
              Il trattamento è basato sul consenso dell'utente (art. 6, par. 1, lett. a) GDPR)
              per newsletter e commenti, e sul legittimo interesse (art. 6, par. 1, lett. f) GDPR)
              per i dati di navigazione e le finalità statistiche.
            </p>

            <h2>5. Conservazione dei dati</h2>
            <p>
              I dati dei commenti sono conservati per tutta la durata di pubblicazione dell'articolo.
              I dati della newsletter sono conservati fino alla cancellazione dell'iscrizione.
              I dati di navigazione anonimizzati sono conservati per un massimo di 26 mesi.
            </p>

            <h2>6. Diritti dell'interessato</h2>
            <p>L'utente ha diritto di:</p>
            <ul>
              <li>Accedere ai propri dati personali</li>
              <li>Richiedere la rettifica o la cancellazione dei dati</li>
              <li>Opporsi al trattamento o richiederne la limitazione</li>
              <li>Richiedere la portabilità dei dati</li>
              <li>Revocare il consenso in qualsiasi momento</li>
            </ul>
            <p>
              Per esercitare questi diritti, scrivere a <a href="mailto:info@bianconerihub.com">info@bianconerihub.com</a>.
            </p>

            <h2>7. Cookie</h2>
            <p>
              Il sito utilizza cookie tecnici essenziali e cookie analitici anonimi.
              Per maggiori dettagli, consultare la <a href="/cookie-policy">Cookie Policy</a>.
            </p>

            <h2>8. Modifiche</h2>
            <p>
              La presente informativa può essere aggiornata. Eventuali modifiche saranno pubblicate
              su questa pagina con indicazione della data di ultimo aggiornamento.
            </p>
          </div>
        </motion.div>
      </div>
    </>
  )
}
