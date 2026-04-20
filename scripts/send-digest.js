#!/usr/bin/env node
// ── BianconeriHub Newsletter Digest — Automated Sender ──────────────────────────
// Fetches news from RSS feeds, renders the email template, and sends
// via Brevo API to all subscribers in the contact list.
//
// Usage:
//   node scripts/send-digest.js              # send now
//   node scripts/send-digest.js --dry-run    # preview without sending
//   node scripts/send-digest.js --cron       # run on schedule (every 8h)
//
// Requires: BREVO_API_KEY, BREVO_LIST_ID, SITE_URL in .env
// ────────────────────────────────────────────────────────────────────────────

import 'dotenv/config'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { parseString } from 'xml2js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const BREVO_API_KEY = process.env.VITE_BREVO_API_KEY || process.env.BREVO_API_KEY || ''
const BREVO_LIST_ID = parseInt(process.env.VITE_BREVO_LIST_ID || process.env.BREVO_LIST_ID || '2', 10)
const SITE_URL = process.env.SITE_URL || 'https://bianconerihub.com'
const SENDER_EMAIL = process.env.SENDER_EMAIL || 'newsletter@bianconerihub.com'
const SENDER_NAME = process.env.SENDER_NAME || 'BianconeriHub'

const DRY_RUN = process.argv.includes('--dry-run')
const CRON_MODE = process.argv.includes('--cron')
const CRON_INTERVAL = 8 * 60 * 60 * 1000 // 8 hours

// ── RSS Feeds ───────────────────────────────────────────────────────────────

const MERCATO_FEED = 'https://www.tuttojuve.com/rss/?section=6'

const NEWS_FEEDS = [
  { url: 'https://www.gazzetta.it/rss/calcio.xml', source: 'La Gazzetta dello Sport' },
  { url: 'https://www.tuttosport.com/rss/calcio/serie-a/juventus', source: 'Tuttosport' },
  { url: 'https://www.juventusnews24.com/feed/', source: 'JuventusNews24' },
  { url: 'https://www.juvenews.eu/feed/rss.xml', source: 'JuveNews' },
]

const JUVE_KEYWORDS = ['juventus', 'juve', 'bianconeri', 'bianconero']

// ── Helpers ─────────────────────────────────────────────────────────────────

function cleanHtml(str) {
  if (!str) return ''
  return str.replace(/<[^>]+>/g, '').replace(/&[^;]+;/g, (m) => {
    const map = { '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'", '&rsquo;': "'", '&lsquo;': "'", '&egrave;': 'è', '&eacute;': 'é', '&agrave;': 'à', '&ograve;': 'ò', '&ugrave;': 'ù', '&hellip;': '…', '&ndash;': '–', '&mdash;': '—' }
    return map[m] || m
  }).trim()
}

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const hours = Math.floor(diff / (1000 * 60 * 60))
  if (hours < 1) return 'Adesso'
  if (hours < 24) return `${hours}h fa`
  const days = Math.floor(hours / 24)
  if (days === 1) return 'Ieri'
  return `${days}g fa`
}

function containsJuve(text) {
  const lower = text.toLowerCase()
  return JUVE_KEYWORDS.some(k => lower.includes(k))
}

async function fetchXml(url) {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'DNAJuve-Newsletter/1.0' },
  })
  if (!res.ok) throw new Error(`${url}: ${res.status}`)
  return res.text()
}

function parseRss(xmlText) {
  return new Promise((resolve, reject) => {
    parseString(xmlText, { trim: true }, (err, result) => {
      if (err) return reject(err)
      const channel = result?.rss?.channel?.[0]
      if (!channel?.item) return resolve([])
      resolve(channel.item.map(item => ({
        title: cleanHtml(item.title?.[0] || ''),
        description: cleanHtml(item.description?.[0] || '').slice(0, 300),
        url: item.link?.[0] || '',
        date: item.pubDate?.[0] ? new Date(item.pubDate[0]).toISOString() : new Date().toISOString(),
      })))
    })
  })
}

// ── Fetch News ──────────────────────────────────────────────────────────────

async function fetchMercatoNews() {
  try {
    const xml = await fetchXml(MERCATO_FEED)
    const items = await parseRss(xml)
    return items.slice(0, 5).map(i => ({ ...i, source: 'TuttoJuve' }))
  } catch (err) {
    console.warn('[Mercato RSS] Error:', err.message)
    return []
  }
}

async function fetchLiveNews() {
  const results = await Promise.allSettled(
    NEWS_FEEDS.map(async (feed) => {
      const xml = await fetchXml(feed.url)
      const items = await parseRss(xml)
      return items
        .filter(i => containsJuve(`${i.title} ${i.description}`))
        .slice(0, 5)
        .map(i => ({ ...i, source: feed.source }))
    })
  )

  const articles = results
    .filter(r => r.status === 'fulfilled')
    .flatMap(r => r.value)

  articles.sort((a, b) => new Date(b.date) - new Date(a.date))

  // Deduplicate
  const seen = new Set()
  return articles.filter(a => {
    const key = a.title.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 40)
    if (seen.has(key)) return false
    seen.add(key)
    return true
  }).slice(0, 8)
}

// ── Build Email HTML ────────────────────────────────────────────────────────

function buildEmailHtml(mercato, notizie) {
  const templatePath = path.join(__dirname, 'email-template.html')
  let html = fs.readFileSync(templatePath, 'utf-8')

  const today = new Date().toLocaleDateString('it-IT', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  })

  // Replace static params
  html = html.replace(/\{\{params\.date\}\}/g, today)
  html = html.replace(/\{\{params\.siteUrl\}\}/g, SITE_URL)

  // Build mercato articles HTML
  const mercatoHtml = mercato.map(a => `
    <tr>
      <td style="padding:0 30px 16px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e5e5;">
          <tr>
            <td style="border-left:3px solid #F5A623;padding:14px 16px;">
              <p style="font-family:'Inter',Arial,sans-serif;font-size:10px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#F5A623;margin:0 0 6px;">
                ${a.source} &bull; ${timeAgo(a.date)}
              </p>
              <p style="font-family:'Playfair Display',Georgia,serif;font-size:16px;font-weight:900;color:#000000;line-height:1.3;margin:0 0 8px;">
                ${a.title}
              </p>
              <p style="font-family:'Inter',Arial,sans-serif;font-size:12px;color:#666666;line-height:1.5;margin:0 0 10px;">
                ${a.description}
              </p>
              <a href="${a.url}" target="_blank" style="font-family:'Inter',Arial,sans-serif;font-size:11px;font-weight:700;color:#F5A623;text-decoration:none;">
                Leggi di pi&ugrave; &rarr;
              </a>
            </td>
          </tr>
        </table>
      </td>
    </tr>`).join('\n')

  // Build notizie articles HTML
  const notizieHtml = notizie.map(a => `
    <tr>
      <td style="padding:0 30px 12px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="padding:12px 0;border-bottom:1px solid #f0f0f0;">
              <p style="font-family:'Inter',Arial,sans-serif;font-size:10px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#F5A623;margin:0 0 4px;">
                ${a.source} &bull; ${timeAgo(a.date)}
              </p>
              <a href="${a.url}" target="_blank" style="text-decoration:none;">
                <p style="font-family:'Playfair Display',Georgia,serif;font-size:15px;font-weight:900;color:#000000;line-height:1.3;margin:0;">
                  ${a.title}
                </p>
              </a>
            </td>
          </tr>
        </table>
      </td>
    </tr>`).join('\n')

  // Replace template loops with rendered content
  html = html.replace(/\s*<!-- \{\{#each params\.mercato\}\} -->[\s\S]*?<!-- \{\{\/each\}\} -->/,
    mercato.length > 0 ? mercatoHtml : `
    <tr><td style="padding:0 30px 16px;">
      <p style="font-family:'Inter',Arial,sans-serif;font-size:13px;color:#999;text-align:center;">Nessuna voce di mercato oggi.</p>
    </td></tr>`)

  html = html.replace(/\s*<!-- \{\{#each params\.notizie\}\} -->[\s\S]*?<!-- \{\{\/each\}\} -->/,
    notizie.length > 0 ? notizieHtml : `
    <tr><td style="padding:0 30px 12px;">
      <p style="font-family:'Inter',Arial,sans-serif;font-size:13px;color:#999;text-align:center;">Nessuna notizia live oggi.</p>
    </td></tr>`)

  return html
}

// ── Brevo API ───────────────────────────────────────────────────────────────

async function brevoRequest(endpoint, method = 'GET', body = null) {
  const res = await fetch(`https://api.brevo.com/v3${endpoint}`, {
    method,
    headers: {
      'api-key': BREVO_API_KEY,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: body ? JSON.stringify(body) : null,
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`Brevo ${endpoint}: ${res.status} ${text}`)
  }
  return res.status === 204 ? null : res.json()
}

async function getSubscribers() {
  const data = await brevoRequest(`/contacts/lists/${BREVO_LIST_ID}/contacts?limit=500`)
  return data?.contacts || []
}

async function sendEmail(to, htmlContent, name = '') {
  return brevoRequest('/smtp/email', 'POST', {
    sender: { name: SENDER_NAME, email: SENDER_EMAIL },
    to: [{ email: to, name }],
    subject: `BianconeriHub — Notizie Bianconere del ${new Date().toLocaleDateString('it-IT', { day: 'numeric', month: 'long' })}`,
    htmlContent: htmlContent.replace(/\{\{params\.name\}\}/g, name ? ` ${name}` : ''),
    headers: {
      'X-Mailin-Tag': 'fb-digest',
    },
  })
}

// ── Main ────────────────────────────────────────────────────────────────────

async function sendDigest() {
  console.log(`\n📧 BianconeriHub Newsletter Digest — ${new Date().toLocaleString('it-IT')}`)
  console.log('─'.repeat(60))

  if (!BREVO_API_KEY) {
    console.error('❌ BREVO_API_KEY non configurata. Aggiungi nel .env')
    process.exit(1)
  }

  // 1. Fetch content
  console.log('📰 Fetching news...')
  const [mercato, notizie] = await Promise.all([
    fetchMercatoNews(),
    fetchLiveNews(),
  ])

  console.log(`   Mercato: ${mercato.length} notizie`)
  console.log(`   Live:    ${notizie.length} notizie`)

  if (mercato.length === 0 && notizie.length === 0) {
    console.log('⚠️  Nessuna notizia da inviare. Skip.')
    return
  }

  // 2. Build email
  console.log('🎨 Building email template...')
  const html = buildEmailHtml(mercato, notizie)

  if (DRY_RUN) {
    const previewPath = path.join(__dirname, 'preview-digest.html')
    fs.writeFileSync(previewPath, html.replace(/\{\{params\.name\}\}/g, ' Tifoso'))
    console.log(`\n👁️  Preview salvata in: ${previewPath}`)
    console.log('   Apri nel browser per verificare il template.')
    console.log('   (--dry-run: nessuna email inviata)')
    return
  }

  // 3. Get subscribers
  console.log('📋 Fetching subscribers...')
  const subscribers = await getSubscribers()
  console.log(`   ${subscribers.length} iscritti`)

  if (subscribers.length === 0) {
    console.log('⚠️  Nessun iscritto nella lista. Skip.')
    return
  }

  // 4. Send emails
  console.log('📤 Sending emails...')
  let sent = 0
  let errors = 0

  for (const sub of subscribers) {
    try {
      await sendEmail(sub.email, html, sub.attributes?.NOME || '')
      sent++
      // Rate limit: ~10 emails/sec (Brevo free tier)
      await new Promise(r => setTimeout(r, 100))
    } catch (err) {
      errors++
      console.warn(`   ❌ ${sub.email}: ${err.message}`)
    }
  }

  console.log(`\n✅ Completato: ${sent} inviate, ${errors} errori`)
  console.log('─'.repeat(60))
}

// ── Run ─────────────────────────────────────────────────────────────────────

if (CRON_MODE) {
  console.log(`🔄 Cron mode: invio ogni ${CRON_INTERVAL / 3600000}h`)
  sendDigest()
  setInterval(sendDigest, CRON_INTERVAL)
} else {
  sendDigest().catch(err => {
    console.error('💥 Fatal error:', err)
    process.exit(1)
  })
}
