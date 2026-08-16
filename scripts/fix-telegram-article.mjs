import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

function loadEnv(path) {
  const out = {}
  for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/)
    if (!m) continue
    out[m[1]] = m[2].replace(/^["']|["']$/g, '')
  }
  return out
}

function escapeHtml(value) {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

/** Only promote clear section titles — avoid TOC spam from short fragments. */
function looksLikeHeading(line, next, prev) {
  const t = line.trim()
  if (t.length < 24 || t.length > 100) return false
  if (/[.!?…]$/.test(t)) return false
  if (/^(https?:|www\.)/i.test(t)) return false
  if (/^[-*•\d]+[.)]\s/.test(t)) return false
  const words = t.split(/\s+/).filter(Boolean).length
  if (words < 4 || words > 14) return false
  if (!next || next.length < 60) return false
  // Prefer titles after a real paragraph (or near the top after the lead)
  if (prev && prev.length < 40) return false
  return true
}

function plainTextToHtml(text) {
  const lines = String(text || '')
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map((line) => line.trim())

  const parts = []
  for (const line of lines) {
    if (!line) {
      if (parts.length && parts[parts.length - 1] !== '') parts.push('')
      continue
    }
    parts.push(line)
  }
  while (parts[0] === '') parts.shift()
  while (parts.length && parts[parts.length - 1] === '') parts.pop()
  if (!parts.length) return ''

  const out = []
  for (let i = 0; i < parts.length; i++) {
    if (parts[i] === '') continue
    const line = parts[i]
    const next = parts.slice(i + 1).find((p) => p !== '')
    const prev = [...parts.slice(0, i)].reverse().find((p) => p !== '')
    if (looksLikeHeading(line, next, prev)) out.push(`<h2>${escapeHtml(line)}</h2>`)
    else out.push(`<p>${escapeHtml(line)}</p>`)
  }
  return out.join('\n')
}

const env = loadEnv(join(root, '.env'))
const db = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const slug = process.argv[2] || 'dibu-martinez-presenta-una-nuova-offerta'

const { data, error } = await db.from('articles').select('id,slug,content').eq('slug', slug).single()
if (error) throw error

const plain = String(data.content || '')
  .replace(/<br\s*\/?>/gi, '\n')
  .replace(/<\/p>/gi, '\n')
  .replace(/<\/h[1-6]>/gi, '\n')
  .replace(/<[^>]+>/g, '')
  .replace(/&nbsp;/g, ' ')
  .replace(/&amp;/g, '&')
  .replace(/&lt;/g, '<')
  .replace(/&gt;/g, '>')
  .replace(/&quot;/g, '"')
  .replace(/&#39;/g, "'")
  .trim()

const html = plainTextToHtml(plain)
const h2count = (html.match(/<h2>/g) || []).length
const pcount = (html.match(/<p>/g) || []).length
const { error: up } = await db.from('articles').update({ content: html, featured: true }).eq('id', data.id)
if (up) throw up
console.log({ slug, h2count, pcount })
console.log(html.match(/<h2>.*?<\/h2>/g))
