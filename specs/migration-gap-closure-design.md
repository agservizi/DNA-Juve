# Migrazione completa BianconeriHub

## Requisiti

- Quando un visitatore usa una funzione pubblica, il sistema deve eseguire l'operazione reale oppure mostrare un errore esplicito; non deve simulare successi o dati reali.
- Quando un contenuto viene programmato, il sistema deve conservarne lo stato e renderlo pubblico al primo trigger affidabile successivo alla scadenza.
- Quando un utente usa community o Area Bianconera, il sistema deve applicare autenticazione, ownership, validazione e RLS.
- Quando sono caricati strumenti opzionali o contenuti esterni, il sistema deve rispettare il consenso salvato.
- Quando una rotta legacy ha una controparte Next, le funzioni editoriali ancora valide devono essere preservate.

## Architettura

### Frontend

- Componenti accessibili con stati loading, empty, success ed error.
- Design token e componenti REUI coerenti; layout mobile senza overflow.
- Preferenze cookie versionate e riapribili dal footer.
- Progressive enhancement per motion, WebGL e media esterni.

### Backend

- Supabase come fonte dati unica; nessun fallback demo presentato come reale.
- Route server autenticate per mutazioni e integrazioni con segreti.
- Scheduler idempotente per articoli scaduti e health diagnostics.
- Sitemap, feed e metadata generati dai contenuti pubblicabili.

### Sicurezza

- Auth e ruoli verificati server-side; RLS per ownership.
- Input validato, HTML sanificato, output senza segreti.
- Errori strutturati senza leak; eventi amministrativi tracciabili.
- Integrazioni opzionali disattivate finché manca il consenso.

## Criteri di accettazione

- Lint, typecheck, build e test automatici verdi.
- Nessuna rotta pubblica o admin nota restituisce 500 nello smoke test.
- Newsletter, forum, autore, calendario e scheduling non mostrano falsi successi.
- Manifest, favicon, cookie manager, sitemap e structured data presenti.
- Area Bianconera conserva i moduli personali legacy ancora supportati.
