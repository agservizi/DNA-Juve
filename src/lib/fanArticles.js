import { apiHeaders, apiUrl } from './apiProxy'
import { slugify } from './utils'

const CATEGORY_IMAGE_STYLES = {
  calcio: '000000/F5A623',
  mercato: '1f2937/F5A623',
  formazione: '065f46/FFFFFF',
  champions: '312e81/FFFFFF',
  'serie-a': '991b1b/FFFFFF',
  interviste: '9a3412/FFFFFF',
}

const CATEGORY_TAG_NAMES = {
  calcio: 'Calcio',
  mercato: 'Mercato',
  formazione: 'Formazione',
  champions: 'Champions',
  'serie-a': 'Serie A',
  interviste: 'Interviste',
}

const STOP_WORDS = new Set([
  'alla', 'allo', 'agli', 'alle', 'anche', 'ancora', 'avere', 'basta', 'come',
  'con', 'contro', 'cosa', 'dalla', 'dalle', 'dello', 'degli', 'della', 'delle',
  'dopo', 'dove', 'fare', 'fino', 'gli', 'hai', 'hanno', 'nella', 'nelle',
  'nello', 'negli', 'non', 'per', 'pero', 'piu', 'poi', 'questa', 'questo',
  'quella', 'quello', 'sara', 'sono', 'sotto', 'sulla', 'sulle', 'sullo',
  'tutto', 'tutti', 'una', 'uno', 'dell', 'dall', 'sull', 'nell', 'juve',
  'juventus', 'bianconera', 'bianconero', 'bianconeri',
])

export function buildFanArticlePlaceholder(categorySlug, title) {
  const palette = CATEGORY_IMAGE_STYLES[categorySlug] || '111827/F5A623'
  const label = (title || 'Voce Tifosa').slice(0, 28)
  return `https://placehold.co/1280x720/${palette}?text=${encodeURIComponent(label)}`
}

function normalizeWords(value = '') {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
}

export function deriveFanArticleTags({ title = '', excerpt = '', pitch = '', categorySlug = '' }) {
  const counts = new Map()
  const words = normalizeWords(`${title} ${excerpt} ${pitch}`)

  for (const word of words) {
    if (word.length < 4 || STOP_WORDS.has(word)) continue
    counts.set(word, (counts.get(word) || 0) + 1)
  }

  const topWords = [...counts.entries()]
    .sort((a, b) => {
      if (b[1] !== a[1]) return b[1] - a[1]
      return a[0].localeCompare(b[0])
    })
    .slice(0, 4)
    .map(([word]) => word)

  const tags = []
  if (CATEGORY_TAG_NAMES[categorySlug]) {
    tags.push(CATEGORY_TAG_NAMES[categorySlug])
  }

  for (const word of topWords) {
    const name = word.charAt(0).toUpperCase() + word.slice(1)
    if (!tags.includes(name)) tags.push(name)
  }

  return tags.map((name) => ({ name, slug: slugify(name) }))
}

export async function sendFanArticleStatusEmail({ to, name, title, status, notes = '', articleEditUrl = '' }) {
  const subject = status === 'approved'
    ? `La tua proposta su BianconeriHub e stata approvata`
    : status === 'rejected'
      ? `Aggiornamento sulla tua proposta su BianconeriHub`
      : `La tua proposta e in revisione su BianconeriHub`

  const intro = status === 'approved'
    ? `Ciao ${name || 'tifoso'}, la tua proposta "${title}" e stata approvata dalla redazione.`
    : status === 'rejected'
      ? `Ciao ${name || 'tifoso'}, abbiamo revisionato la tua proposta "${title}".`
      : `Ciao ${name || 'tifoso'}, la tua proposta "${title}" e stata presa in carico dalla redazione.`

  const statusLine = status === 'approved'
    ? 'La redazione ha trasformato il contenuto in una bozza interna del magazine.'
    : status === 'rejected'
      ? 'Per ora non la pubblichiamo, ma puoi ripartire dalla tua area personale e inviare una nuova versione.'
      : 'Il pezzo e ora in valutazione. Se servira, la redazione puo usare le note interne per rifinirlo.'

  const notesBlock = notes.trim()
    ? `<p style="font-family:Arial,sans-serif;font-size:14px;line-height:1.6;color:#444;margin:16px 0 0;"><strong>Nota della redazione:</strong><br>${notes.replace(/\n/g, '<br>')}</p>`
    : ''

  const ctaBlock = status === 'approved' && articleEditUrl
    ? `<p style="margin:24px 0 0;"><a href="${articleEditUrl}" style="display:inline-block;background:#F5A623;color:#111;padding:12px 18px;font-family:Arial,sans-serif;font-size:13px;font-weight:700;text-decoration:none;">Apri la bozza in redazione</a></p>`
    : ''

  const htmlContent = `
    <div style="background:#f7f7f7;padding:32px 16px;">
      <div style="max-width:640px;margin:0 auto;background:#ffffff;border-top:4px solid #F5A623;padding:32px;">
        <p style="font-family:Arial,sans-serif;font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#B08A18;margin:0 0 12px;">BianconeriHub</p>
        <h1 style="font-family:Georgia,serif;font-size:28px;line-height:1.2;color:#111;margin:0 0 16px;">Aggiornamento sulla tua proposta</h1>
        <p style="font-family:Arial,sans-serif;font-size:15px;line-height:1.7;color:#444;margin:0 0 12px;">${intro}</p>
        <p style="font-family:Arial,sans-serif;font-size:15px;line-height:1.7;color:#444;margin:0;">${statusLine}</p>
        ${notesBlock}
        ${ctaBlock}
      </div>
    </div>
  `.trim()

  const res = await fetch(apiUrl('brevo', 'smtp/email'), {
    method: 'POST',
    headers: apiHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({
      sender: { name: 'BianconeriHub', email: 'newsletter@bianconerihub.com' },
      to: [{ email: to, name: name || undefined }],
      subject,
      htmlContent,
      headers: { 'X-Mailin-Tag': 'fan-article-status' },
    }),
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(text || `Email status ${res.status}`)
  }

  return true
}
