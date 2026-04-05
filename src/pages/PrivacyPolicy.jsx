import { motion } from 'framer-motion'
import SEO from '@/components/blog/SEO'

export default function PrivacyPolicy() {
  return (
    <>
      <SEO title="Privacy Policy" url="/privacy" noindex />

      <div className="max-w-3xl mx-auto px-4 py-16">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="font-display text-4xl font-black mb-2">Privacy Policy</h1>
          <p className="text-sm text-gray-400 mb-10">Ultimo aggiornamento: 5 aprile 2026</p>

          <div className="prose prose-lg max-w-none prose-headings:font-display prose-headings:font-bold">
            <h2>1. Titolare del trattamento</h2>
            <p>
              Il titolare del trattamento dei dati personali trattati attraverso il sito BianconeriHub
              è la redazione di BianconeriHub, contattabile all&apos;indirizzo{' '}
              <a href="mailto:info@bianconerihub.com">info@bianconerihub.com</a>.
            </p>

            <h2>2. Categorie di dati trattati</h2>
            <p>Il sito può trattare le seguenti categorie di dati personali:</p>
            <ul>
              <li><strong>Dati di navigazione e sicurezza:</strong> log tecnici, indirizzo IP, user agent, data e ora delle richieste, errori applicativi e dati minimi necessari alla protezione del sito.</li>
              <li><strong>Dati di account e autenticazione:</strong> email, identificativo utente, username, avatar, bio e dati di sessione per area amministrativa e Area Bianconera. Le credenziali e le funzioni di autenticazione sono gestite tramite Supabase Auth.</li>
              <li><strong>Dati di community:</strong> preferenze, cronologia di lettura, bookmark, gamification, sondaggi, notifiche interne e preferenze relative ad Area Bianconera.</li>
              <li><strong>Commenti e contributi editoriali:</strong> nome, email, contenuto del commento, proposte tifosi inviate alla redazione, eventuali note di stato e timestamp di invio o moderazione.</li>
              <li><strong>Dati newsletter:</strong> email fornita per l&apos;iscrizione o la cancellazione dalla newsletter.</li>
              <li><strong>Dati per notifiche push:</strong> endpoint di subscription, chiavi tecniche del browser e preferenze di ricezione, solo se l&apos;utente concede il permesso.</li>
            </ul>

            <h2>3. Finalità del trattamento</h2>
            <p>I dati personali sono trattati per le seguenti finalità:</p>
            <ul>
              <li>erogazione del sito, sicurezza, prevenzione di abusi e continuità tecnica del servizio;</li>
              <li>registrazione e gestione dell&apos;account utente in Area Bianconera;</li>
              <li>gestione del pannello amministrativo e delle funzioni editoriali riservate;</li>
              <li>pubblicazione, moderazione e gestione dei commenti agli articoli;</li>
              <li>ricezione, valutazione e risposta alle proposte inviate nella sezione “La Tua Voce”;</li>
              <li>invio della newsletter e di comunicazioni editoriali richieste dall&apos;utente;</li>
              <li>invio di notifiche push o notifiche interne solo per gli utenti che le attivano;</li>
              <li>miglioramento dell&apos;esperienza d&apos;uso, personalizzazione delle preferenze e funzioni di community.</li>
            </ul>

            <h2>4. Base giuridica</h2>
            <ul>
              <li><strong>Esecuzione di misure precontrattuali o del servizio richiesto</strong> (art. 6, par. 1, lett. b GDPR) per registrazione, autenticazione, gestione account, commenti, area lettori e funzioni editoriali richieste dall&apos;utente.</li>
              <li><strong>Consenso</strong> (art. 6, par. 1, lett. a GDPR) per newsletter, notifiche push e qualsiasi tecnologia opzionale che richieda una scelta preventiva.</li>
              <li><strong>Legittimo interesse</strong> (art. 6, par. 1, lett. f GDPR) per sicurezza, difesa del sito, prevenzione di abusi, logging tecnico, moderazione e tutela editoriale della piattaforma.</li>
              <li><strong>Adempimento di obblighi di legge</strong> (art. 6, par. 1, lett. c GDPR) ove richiesto da norme, richieste dell&apos;autorità o esigenze fiscali/amministrative.</li>
            </ul>

            <h2>5. Destinatari e fornitori coinvolti</h2>
            <p>I dati possono essere trattati, nei limiti delle rispettive competenze, da fornitori tecnologici che supportano il sito:</p>
            <ul>
              <li><strong>Supabase</strong> per autenticazione, database, storage e funzioni server;</li>
              <li><strong>Hostinger</strong> per infrastruttura, hosting e posta del dominio;</li>
              <li><strong>Brevo</strong> per newsletter e alcune comunicazioni email automatiche;</li>
              <li>altri fornitori tecnici strettamente necessari al funzionamento del sito, sempre in qualità di responsabili o sub-responsabili del trattamento quando applicabile.</li>
            </ul>
            <p>
              Alcuni fornitori possono trattare dati anche fuori dallo Spazio Economico Europeo.
              In tali casi il trattamento avviene con le garanzie previste dagli artt. 44 e ss. GDPR,
              come clausole contrattuali standard o strumenti equivalenti adottati dal fornitore.
            </p>

            <h2>6. Conservazione dei dati</h2>
            <ul>
              <li><strong>Account lettori e admin:</strong> fino alla cancellazione dell&apos;account o per il tempo necessario alla gestione del servizio.</li>
              <li><strong>Commenti:</strong> fino a rimozione del commento, de-pubblicazione dell&apos;articolo o richiesta legittima di cancellazione, salvo necessità di difesa.</li>
              <li><strong>Proposte tifosi:</strong> per il tempo utile alla valutazione editoriale e, se necessario, per la gestione di contatti successivi con l&apos;autore.</li>
              <li><strong>Newsletter:</strong> fino alla revoca del consenso o alla disiscrizione.</li>
              <li><strong>Notifiche push e subscription:</strong> fino a revoca del consenso, logout tecnico o disattivazione da parte dell&apos;utente.</li>
              <li><strong>Log tecnici e di sicurezza:</strong> per il tempo strettamente necessario a sicurezza, debugging e continuità del servizio.</li>
            </ul>

            <h2>7. Cookie e tecnologie simili</h2>
            <p>
              Il sito utilizza cookie e tecnologie simili per autenticazione, sicurezza, preferenze del lettore
              e, solo se attivati, categorie opzionali. Per maggiori dettagli consulta la{' '}
              <a href="/cookie-policy">Cookie Policy</a>.
            </p>

            <h2>8. Diritti dell&apos;interessato</h2>
            <p>L'utente ha diritto di:</p>
            <ul>
              <li>ottenere conferma dell&apos;esistenza dei propri dati personali e accedervi;</li>
              <li>richiedere rettifica, aggiornamento o integrazione dei dati inesatti;</li>
              <li>chiedere la cancellazione dei dati nei casi previsti dall&apos;art. 17 GDPR;</li>
              <li>limitare o opporsi al trattamento nei casi previsti dagli artt. 18 e 21 GDPR;</li>
              <li>ricevere i dati in formato strutturato, ove applicabile, o chiederne la portabilità;</li>
              <li>revocare in qualsiasi momento il consenso prestato, senza pregiudicare la liceità del trattamento precedente;</li>
              <li>proporre reclamo al Garante per la protezione dei dati personali.</li>
            </ul>
            <p>
              Per esercitare i tuoi diritti puoi scrivere a{' '}
              <a href="mailto:info@bianconerihub.com">info@bianconerihub.com</a>.
            </p>

            <h2>9. Modifiche alla presente informativa</h2>
            <p>
              La presente informativa può essere aggiornata per riflettere modifiche normative, tecniche o
              organizzative. Le versioni aggiornate saranno pubblicate su questa pagina con indicazione della
              data di ultimo aggiornamento.
            </p>
          </div>
        </motion.div>
      </div>
    </>
  )
}
