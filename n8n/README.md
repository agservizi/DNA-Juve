# n8n self-hosted per Instagram

Questa cartella serve a togliere la pubblicazione Instagram dal codice applicativo e spostarla su un webhook n8n self-hosted.

Per il tuo setup attuale con Hostinger Cloud Starter, il percorso consigliato e Render: il sito resta dov'e, mentre n8n gira come servizio separato e pubblico.

## Percorso consigliato: Render

File pronti nel repo:

- [render.yaml](../render.yaml)
- [n8n/render.env.example](render.env.example)
- [n8n/connect-supabase-render.example.sh](connect-supabase-render.example.sh)

### Cosa fare su Render

1. Collega il repository GitHub a Render.
2. Usa [render.yaml](../render.yaml) come Blueprint.
3. Crea il web service Docker `bianconerihub-n8n`.
4. Lascia che Render crei anche il database `bianconerihub-n8n-db` dal Blueprint.
5. Inserisci i secret richiesti usando [n8n/render.env.example](render.env.example).
6. Esegui il deploy su Render.
7. Apri il dominio `.onrender.com` del servizio oppure collega `n8n.bianconerihub.com` come custom domain.
8. Importa [n8n/workflows/instagram-publisher.json](workflows/instagram-publisher.json) dentro n8n.
9. Salva in Supabase il webhook pubblico risultante.

### Valori finali che servono al progetto

Quando Render ha finito il deploy mi servono solo:

- `N8N_INSTAGRAM_WEBHOOK_URL`
- `N8N_INSTAGRAM_WEBHOOK_SECRET`

Il webhook finale avra forma:

```text
https://bianconerihub-n8n.onrender.com/webhook/bianconerihub-instagram
```

Se vuoi usare `n8n.bianconerihub.com`, puoi collegarlo dopo come custom domain Render.

## Nota importante su Render

I persistent disk di Render richiedono un servizio a pagamento. Per evitare quel costo, il setup qui usa un database PostgreSQL Render creato direttamente dal Blueprint per rendere n8n persistente senza disco locale.

Questo significa che:

- il web service Render puo essere creato senza disk
- workflow, credenziali e utenti n8n vivono nel database PostgreSQL Render
- non devi procurarti un Postgres esterno separato

## Cosa fa

- Supabase continua a gestire la coda degli articoli da pubblicare.
- La Edge Function `instagram-publisher` chiama un webhook n8n quando un articolo e pronto.
- n8n riceve immagine, caption e URL articolo, poi pubblica su Instagram tramite Graph API.

## Requisito non negoziabile

n8n deve essere raggiungibile da Internet in HTTPS. Se lo fai girare solo in locale su `localhost:5678`, Supabase non potra chiamarlo.

Opzioni pratiche:

- VPS con dominio o sottodominio dedicato
- Cloudflare Tunnel
- Tailscale Funnel

## Avvio rapido locale

1. Copia `n8n/.env.example` in `n8n/.env`.
2. Inserisci dominio pubblico, secret webhook e credenziali Meta.
3. Avvia n8n:

```bash
cd n8n
docker compose up -d
```

4. Apri l'editor n8n sul dominio configurato.
5. Importa [n8n/workflows/instagram-publisher.json](workflows/instagram-publisher.json) oppure crea il workflow a mano seguendo [n8n/workflows/instagram-publisher-blueprint.md](workflows/instagram-publisher-blueprint.md).
6. Salva in Supabase questi secret:

```bash
supabase secrets set \
  N8N_INSTAGRAM_WEBHOOK_URL="https://tuo-dominio-n8n/webhook/bianconerihub-instagram" \
  N8N_INSTAGRAM_WEBHOOK_SECRET="lo-stesso-secret-configurato-in-n8n"
```

7. Ridistribuisci la funzione:

```bash
supabase functions deploy instagram-publisher
```

8. Controlla in [src/pages/admin/Settings.jsx](src/pages/admin/Settings.jsx) che il modulo “Automazione Instagram” passi a stato attivo.

## Avvio rapido Render

1. Collega il repo a Render e scegli `Blueprint` oppure `New Web Service`.
2. Se usi il Blueprint, Render leggerà [render.yaml](../render.yaml).
3. Per i secret usa [n8n/render.env.example](render.env.example).
4. Il database viene creato dal Blueprint e collegato automaticamente al servizio n8n.
5. Esegui il deploy del servizio Docker.
6. Apri il dominio `.onrender.com` del servizio e accedi con la basic auth configurata.
7. Importa [n8n/workflows/instagram-publisher.json](workflows/instagram-publisher.json).
8. Salva su Supabase i secret:

```bash
supabase secrets set \
  N8N_INSTAGRAM_WEBHOOK_URL="https://bianconerihub-n8n.onrender.com/webhook/bianconerihub-instagram" \
  N8N_INSTAGRAM_WEBHOOK_SECRET="lo-stesso-secret-configurato-in-n8n"
```

9. Ridistribuisci la funzione:

```bash
supabase functions deploy instagram-publisher
```

In alternativa puoi usare direttamente [n8n/connect-supabase-render.example.sh](connect-supabase-render.example.sh).

## Payload inviato da Supabase a n8n

Il webhook riceve un JSON con questi campi:

```json
{
  "source": "bianconerihub",
  "action": "publish-instagram-article",
  "articleId": "uuid",
  "title": "Titolo articolo",
  "slug": "slug-articolo",
  "excerpt": "Sommario",
  "imageUrl": "https://...",
  "caption": "Testo Instagram finale",
  "articleUrl": "https://bianconerihub.com/articolo/slug-articolo",
  "publishedAt": "2026-04-11T12:00:00.000Z",
  "secret": "..."
}
```

In piu, se configurato, Supabase invia anche l'header `x-bianconerihub-secret`.

## Risposta attesa da n8n

Per chiudere correttamente il giro, il webhook deve rispondere con JSON simile a questo:

```json
{
  "success": true,
  "postId": "17900000000000000",
  "mediaId": "17800000000000000",
  "permalink": "https://www.instagram.com/p/XXXXXXXX/",
  "publishedAt": "2026-04-11T12:05:00.000Z"
}
```

Se qualcosa va male, rispondi con `success: false` e `error`.

## Note operative

- Il codice del progetto preferisce n8n quando trova `N8N_INSTAGRAM_WEBHOOK_URL`.
- Se il webhook n8n non e configurato, la funzione puo ancora usare la vecchia integrazione Meta diretta come fallback.
- La UI admin non cambia: toggle, immagine dedicata, preview caption e retry manuale restano identici.

## Setup minimo che resta fuori dal repo

Queste sono le sole parti esterne che non posso chiudere dal codice:

1. Portare n8n dietro un URL HTTPS pubblico.
2. Inserire nei secret Render il token Meta e l'Instagram Business Account ID.
3. Salvare su Supabase `N8N_INSTAGRAM_WEBHOOK_URL` e `N8N_INSTAGRAM_WEBHOOK_SECRET`.

Appena questi valori esistono, il flusso e operativo senza altre modifiche applicative.



