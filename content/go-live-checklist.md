# Go-Live Checklist

## Gia chiuso

- Seed articoli pubblicati e verificati su Supabase
- Area Bianconera con proposte tifosi collegate a Supabase
- Moderazione admin per proposte tifosi
- Email esito proposta tifoso
- Breaking bar mobile corretta
- Upload cover su Supabase Storage sistemato con bucket e policy reali
- Commenti: tabella presente e frontend resiliente
- Editor admin: contenuto caricato correttamente in modifica
- Sidebar admin: collapse desktop e drawer mobile corretti
- Responsive: passata ampia su pubblico, Area Bianconera e admin

## Blocker rimasti prima del go-live pieno

- Moderazione commenti lato admin
- Messaggi errore piu precisi per upload e operazioni Supabase
- Test end-to-end dei flussi principali con account reale
- Verifica finale responsive su pagine admin piu dense

## Verifiche da fare manualmente

1. Creare un nuovo articolo e pubblicarlo con cover caricata da admin
2. Aprire l'articolo pubblico e verificare commenti, reaction, tag e correlati
3. Inviare una proposta da Area Bianconera e approvarla da admin
4. Verificare su mobile header, tab nav e sticky behavior
5. Controllare che in produzione non compaiano controlli demo

## Migliorie consigliate dopo il go-live

- Autosave editor admin
- Warning su modifiche non salvate
- Dashboard commenti con approva/rifiuta
- Rifinitura visuale finale della header
