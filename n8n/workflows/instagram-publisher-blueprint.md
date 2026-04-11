# Workflow blueprint: publish-instagram-article

Questo blueprint descrive il workflow n8n da creare. Ho scelto un formato leggibile invece di un export JSON fragile, cosi puoi ricostruirlo o adattarlo senza dipendere dalla versione esatta di n8n.

## Nodo 1: Webhook

- Tipo: Webhook
- HTTP Method: `POST`
- Path: `bianconerihub-instagram`
- Response Mode: `Using Respond to Webhook Node`

## Nodo 2: Code - Validate Request

Tipo: Code

Codice:

```javascript
const payload = $json.body ?? $json;
const headerSecret = $json.headers?.['x-bianconerihub-secret'] ?? $json.headers?.['X-BianconeriHub-Secret'];
const expectedSecret = $env.N8N_INSTAGRAM_WEBHOOK_SECRET || '';
const providedSecret = headerSecret || payload.secret || '';

if (!payload.imageUrl) {
  throw new Error('imageUrl mancante');
}

if (!payload.caption) {
  throw new Error('caption mancante');
}

if (expectedSecret && providedSecret !== expectedSecret) {
  throw new Error('Secret webhook non valido');
}

return [{
  json: {
    ...payload,
    imageUrl: String(payload.imageUrl).trim(),
    caption: String(payload.caption).trim(),
  },
}];
```

## Nodo 3: HTTP Request - Create Media Container

- Metodo: `POST`
- URL: `https://graph.facebook.com/v23.0/{{$env.INSTAGRAM_BUSINESS_ACCOUNT_ID}}/media`
- Send Body As: `Form URLencoded`
- Campi body:
  - `image_url` = `{{$json.imageUrl}}`
  - `caption` = `{{$json.caption}}`
  - `access_token` = `{{$env.INSTAGRAM_ACCESS_TOKEN}}`

## Nodo 4: Wait

- Tipo: Wait
- Modalita: `After Time Interval`
- Valore consigliato: `3 seconds`

## Nodo 5: HTTP Request - Publish Media

- Metodo: `POST`
- URL: `https://graph.facebook.com/v23.0/{{$env.INSTAGRAM_BUSINESS_ACCOUNT_ID}}/media_publish`
- Send Body As: `Form URLencoded`
- Campi body:
  - `creation_id` = `{{$node["Create Media Container"].json["id"]}}`
  - `access_token` = `{{$env.INSTAGRAM_ACCESS_TOKEN}}`

## Nodo 6: HTTP Request - Fetch Media Details

- Metodo: `GET`
- URL: `={{'https://graph.facebook.com/v23.0/' + $node["Publish Media"].json["id"] + '?fields=id,permalink,timestamp&access_token=' + $env.INSTAGRAM_ACCESS_TOKEN}}`

## Nodo 7: Respond to Webhook - Success

Risposta JSON:

```json
{
  "success": true,
  "postId": "={{$node[\"Publish Media\"].json[\"id\"]}}",
  "mediaId": "={{$node[\"Create Media Container\"].json[\"id\"]}}",
  "permalink": "={{$json[\"permalink\"] || null}}",
  "publishedAt": "={{$json[\"timestamp\"] || $now.toISO()}}"
}
```

## Error workflow

Attiva `Error Trigger` oppure usa un ramo `On Error` e chiudi con `Respond to Webhook`:

```json
{
  "success": false,
  "error": "={{$json.error?.message || 'Pubblicazione Instagram fallita in n8n'}}"
}
```

## Test rapido

Puoi testare il webhook con questo payload:

```json
{
  "source": "bianconerihub",
  "action": "publish-instagram-article",
  "articleId": "test-id",
  "title": "Test articolo",
  "slug": "test-articolo",
  "excerpt": "Test caption",
  "imageUrl": "https://images.unsplash.com/photo-1511884642898-4c92249e20b6?auto=format&fit=crop&w=1200&q=80",
  "caption": "Test Instagram da n8n",
  "articleUrl": "https://bianconerihub.com/articolo/test-articolo",
  "publishedAt": "2026-04-11T12:00:00.000Z",
  "secret": "inserisci-il-tuo-secret"
}
```
