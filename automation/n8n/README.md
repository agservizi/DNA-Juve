# Automazione n8n — BianconeriHub

Pubblica articoli automaticamente da RSS Juventus, riscritti con **Groq** in stile editoriale umano e pubblicati su Supabase.

## Architettura

```
RSS (TuttoJuve, JuveNews, …)
  → Groq (riscrittura editoriale JSON)
  → Edge Function `n8n-publish-article`
  → Supabase (articles + tag + immagini Storage)
```

## Prerequisiti

1. **Supabase Edge Function** deployata: `n8n-publish-article`
2. **n8n** su `https://automa.coresuite.it/` (NAS Docker)
3. **Groq API key** salvata come credential in n8n (non nel repo)
4. Variabili ambiente in n8n:
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
   - `N8N_PUBLISH_SECRET` (stesso valore impostato su Supabase)

## 1. Deploy Edge Function

```bash
supabase secrets set N8N_PUBLISH_SECRET="genera-un-secret-lungo-e-random"
supabase functions deploy n8n-publish-article
```

Opzionale:

```bash
supabase secrets set SITE_URL="https://bianconerihub.com"
supabase secrets set N8N_DEFAULT_AUTHOR_EMAIL="admin@bianconerihub.com"
```

## 2. Import workflow in n8n

1. Apri `https://automa.coresuite.it/`
2. **Workflows → Import from File**
3. Seleziona `automation/n8n/bianconerihub-publish-articles.json`
4. Collega credential **Groq API** al nodo `Groq — Riscrittura umana`
5. In **Settings → Variables** (o env del container n8n) imposta:
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
   - `N8N_PUBLISH_SECRET`

## 3. Credential Groq in n8n

1. **Credentials → Add credential → Groq API** (o Header Auth generico)
2. Incolla la API key Groq
3. **Non** committare la key nel repository

> ⚠️ Se hai condiviso la key in chat, **rigenerala** dal dashboard Groq.

## 4. Endpoint publish

```
POST {SUPABASE_URL}/functions/v1/n8n-publish-article
Headers:
  Content-Type: application/json
  apikey: {SUPABASE_ANON_KEY}
  Authorization: Bearer {SUPABASE_ANON_KEY}
  x-n8n-secret: {N8N_PUBLISH_SECRET}
```

### Payload esempio

```json
{
  "title": "Juventus, nuovo assalto al mercato: le priorità di Motta",
  "slug": "juventus-nuovo-assalto-mercato-priorita-motta",
  "excerpt": "La Juventus lavora sul mercato con obiettivi chiari: ecco cosa cambia in rosa e perché il club punta su profili già pronti.",
  "content": "<p>Primo paragrafo...</p><h2>Cosa succede davvero</h2><p>Secondo paragrafo...</p>",
  "category_slug": "mercato",
  "tags": ["juventus", "calciomercato", "motta"],
  "status": "published",
  "source_url": "https://fonte-originale.it/articolo",
  "cover_image_url": "https://fonte-originale.it/immagine.jpg",
  "meta_title": "Juventus mercato: priorità e scenario",
  "meta_description": "Analisi sul mercato Juventus: obiettivi, tempi e impatto in rosa."
}
```

## Immagini

La edge function:

- scarica `cover_image_url` e la salva in `article-images/covers/…`
- accetta `inline_image_urls[]` e le inserisce nel contenuto HTML
- accetta anche `cover_image` già pronto (URL pubblico)

Limiti bucket: **5 MB**, formati `png/jpeg/webp/gif`.

## Dedupe

Se invii `source_url` già presente in `articles`, la function risponde con `skipped: true` e non crea duplicati.

## Prompt editoriale

Vedi `automation/prompts/bianconerihub-editorial.md` per affinare tono e struttura.

## Test manuale

Esegui il workflow in modalità **Manual** su un solo item RSS, oppure:

```bash
curl -X POST "$SUPABASE_URL/functions/v1/n8n-publish-article" \
  -H "Content-Type: application/json" \
  -H "apikey: $SUPABASE_ANON_KEY" \
  -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
  -H "x-n8n-secret: $N8N_PUBLISH_SECRET" \
  -d @automation/examples/publish-payload.json
```

## NAS (SSH)

n8n gira in Docker sul NAS:

- Path: `/opt/corehost/apps/n8n/`
- Container: `n8n` / `n8n-db`
- URL editor: `https://automa.coresuite.it/`
- Workflow importato: `BianconeriHub — Pubblica articoli (RSS + Groq)`

Setup automatico sul NAS:

```bash
# Dal PC (PowerShell)
Get-Content -Raw automation/n8n/setup-nas.sh | ssh Carmine@192.168.1.50 "tr -d '\r' > /tmp/setup-bianconerihub-n8n.sh && bash /tmp/setup-bianconerihub-n8n.sh"
Get-Content -Raw automation/n8n/bianconerihub-publish-articles.json | ssh Carmine@192.168.1.50 "cat > /tmp/bianconerihub-publish-articles.json"
```

Poi completa manualmente:

1. Modifica `/opt/corehost/apps/n8n/.env`:
   - `SUPABASE_ANON_KEY` (da Supabase Dashboard → Settings → API)
   - `GROQ_API_KEY` (nuova key rigenerata da Groq)
2. Riavvia: `cd /opt/corehost/apps/n8n && docker compose up -d`
3. Deploy function Supabase con lo **stesso** `N8N_PUBLISH_SECRET` del file `.env` NAS:

```bash
bash scripts/deploy-n8n-publish-function.sh
```

4. In n8n: apri il workflow → **Activate** (dopo test manuale)
