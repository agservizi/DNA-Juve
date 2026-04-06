import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'
import { seedArticles } from './data/blogSeedArticles.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, '..')
const outputDir = path.join(rootDir, 'public', 'mock-covers')

const CATEGORY_STYLES = {
  calcio: {
    bgA: '#060606',
    bgB: '#1a1a1a',
    accent: '#f5a623',
    accent2: '#f9cf7a',
    text: '#ffffff',
    muted: '#d6d6d6',
  },
  mercato: {
    bgA: '#0f172a',
    bgB: '#1f2937',
    accent: '#f59e0b',
    accent2: '#fde68a',
    text: '#ffffff',
    muted: '#d8dee8',
  },
  formazione: {
    bgA: '#052e2b',
    bgB: '#14532d',
    accent: '#86efac',
    accent2: '#d1fae5',
    text: '#f4fffa',
    muted: '#d7f5e6',
  },
  champions: {
    bgA: '#1e1b4b',
    bgB: '#312e81',
    accent: '#c4b5fd',
    accent2: '#f5d76e',
    text: '#f9f9ff',
    muted: '#ddd9ff',
  },
  'serie-a': {
    bgA: '#450a0a',
    bgB: '#991b1b',
    accent: '#fca5a5',
    accent2: '#fee2e2',
    text: '#fff8f8',
    muted: '#ffd7d7',
  },
  interviste: {
    bgA: '#7c2d12',
    bgB: '#9a3412',
    accent: '#fdba74',
    accent2: '#ffedd5',
    text: '#fffaf6',
    muted: '#ffe1c4',
  },
}

function escapeXml(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;')
}

function hashString(value = '') {
  let hash = 0
  for (let index = 0; index < value.length; index += 1) {
    hash = ((hash << 5) - hash) + value.charCodeAt(index)
    hash |= 0
  }
  return Math.abs(hash)
}

function wrapText(value, maxChars) {
  const words = String(value || '').trim().split(/\s+/).filter(Boolean)
  const lines = []
  let current = ''

  words.forEach((word) => {
    const next = current ? `${current} ${word}` : word
    if (next.length > maxChars && current) {
      lines.push(current)
      current = word
      return
    }
    current = next
  })

  if (current) lines.push(current)
  return lines
}

function categoryLabel(slug) {
  return String(slug || 'editoriale')
    .replaceAll('-', ' ')
    .toUpperCase()
}

function buildTitle(article, variant) {
  const maxChars = variant === 0 ? 26 : variant === 1 ? 24 : 28
  const lines = wrapText(article.title, maxChars)
  return lines.slice(0, 4)
}

function buildExcerpt(article) {
  return wrapText(article.excerpt, 56).slice(0, 2)
}

function titleTspans(lines, x, firstY, step) {
  return lines
    .map((line, index) => `<tspan x="${x}" y="${firstY + (index * step)}">${escapeXml(line)}</tspan>`)
    .join('')
}

function excerptTspans(lines, x, firstY, step) {
  return lines
    .map((line, index) => `<tspan x="${x}" y="${firstY + (index * step)}">${escapeXml(line)}</tspan>`)
    .join('')
}

function buildPhotoShapes(style, seed, variant) {
  const xShift = 820 + (seed % 80)
  const yShift = 70 + (seed % 70)
  const rotate = (seed % 18) - 9

  if (variant === 0) {
    return `
      <g transform="translate(${xShift}, ${yShift}) rotate(${rotate} 180 260)">
        <rect x="0" y="0" width="330" height="500" rx="34" fill="rgba(255,255,255,0.08)" />
        <rect x="14" y="14" width="302" height="472" rx="28" fill="url(#imageGlow)" />
        <circle cx="212" cy="138" r="108" fill="${style.accent}" fill-opacity="0.22" />
        <circle cx="110" cy="214" r="144" fill="${style.accent2}" fill-opacity="0.16" />
        <path d="M36 408C92 312 180 262 296 208V486H36V408Z" fill="rgba(8,8,8,0.50)" />
        <path d="M86 486C140 356 214 268 328 214V486H86Z" fill="rgba(8,8,8,0.28)" />
      </g>
    `
  }

  if (variant === 1) {
    return `
      <g transform="translate(730, 88)">
        <rect x="0" y="0" width="452" height="544" rx="38" fill="rgba(255,255,255,0.05)" />
        <rect x="16" y="16" width="420" height="512" rx="30" fill="url(#imageGlow)" />
        <circle cx="312" cy="128" r="118" fill="${style.accent}" fill-opacity="0.22" />
        <circle cx="132" cy="246" r="164" fill="${style.accent2}" fill-opacity="0.18" />
        <path d="M48 452C116 318 198 232 390 148V528H48V452Z" fill="rgba(0,0,0,0.44)" />
        <path d="M172 528C218 354 286 252 422 176V528H172Z" fill="rgba(0,0,0,0.24)" />
      </g>
    `
  }

  return `
    <g transform="translate(0, 0)">
      <path d="M748 116C904 74 1098 116 1196 222V598C1090 652 924 676 760 618L748 116Z" fill="rgba(255,255,255,0.06)" />
      <path d="M776 142C934 118 1088 142 1172 232V572C1068 628 922 636 784 592L776 142Z" fill="url(#imageGlow)" />
      <circle cx="1058" cy="182" r="112" fill="${style.accent}" fill-opacity="0.20" />
      <circle cx="894" cy="268" r="160" fill="${style.accent2}" fill-opacity="0.16" />
      <path d="M792 494C874 360 984 282 1158 196V586C1024 624 910 628 792 586V494Z" fill="rgba(0,0,0,0.36)" />
      <path d="M920 596C968 424 1042 302 1172 230V586C1106 608 1020 614 920 596Z" fill="rgba(0,0,0,0.22)" />
    </g>
  `
}

function buildTextBlock(article, style, variant) {
  const titles = buildTitle(article, variant)
  const excerpts = buildExcerpt(article)
  const category = categoryLabel(article.categorySlug)

  if (variant === 0) {
    return `
      <g>
        <rect x="72" y="76" width="192" height="38" rx="19" fill="${style.accent}" />
        <text x="168" y="100" text-anchor="middle" fill="#101010" font-family="Arial, Helvetica, sans-serif" font-size="18" font-weight="800" letter-spacing="2">${escapeXml(category)}</text>
        <text fill="${style.text}" font-family="Arial, Helvetica, sans-serif" font-size="64" font-weight="800" letter-spacing="-1.6">${titleTspans(titles, 72, 214, 70)}</text>
        <text fill="${style.muted}" font-family="Arial, Helvetica, sans-serif" font-size="27" font-weight="500">${excerptTspans(excerpts, 72, 518, 32)}</text>
      </g>
    `
  }

  if (variant === 1) {
    return `
      <g>
        <rect x="74" y="430" width="604" height="214" rx="30" fill="rgba(5,5,5,0.62)" />
        <rect x="96" y="454" width="178" height="34" rx="17" fill="${style.accent}" />
        <text x="185" y="476" text-anchor="middle" fill="#121212" font-family="Arial, Helvetica, sans-serif" font-size="16" font-weight="800" letter-spacing="2">${escapeXml(category)}</text>
        <text fill="${style.text}" font-family="Arial, Helvetica, sans-serif" font-size="54" font-weight="800" letter-spacing="-1.2">${titleTspans(titles, 96, 542, 58)}</text>
        <text fill="${style.muted}" font-family="Arial, Helvetica, sans-serif" font-size="24" font-weight="500">${excerptTspans(excerpts, 96, 622, 28)}</text>
      </g>
    `
  }

  return `
    <g>
      <rect x="70" y="84" width="176" height="36" rx="18" fill="${style.accent}" />
      <text x="158" y="107" text-anchor="middle" fill="#121212" font-family="Arial, Helvetica, sans-serif" font-size="16" font-weight="800" letter-spacing="2">${escapeXml(category)}</text>
      <text fill="${style.text}" font-family="Arial, Helvetica, sans-serif" font-size="58" font-weight="800" letter-spacing="-1.4">${titleTspans(titles, 70, 212, 64)}</text>
      <text fill="${style.muted}" font-family="Arial, Helvetica, sans-serif" font-size="25" font-weight="500">${excerptTspans(excerpts, 72, 506, 30)}</text>
    </g>
  `
}

function buildSvg(article) {
  const seed = hashString(article.slug)
  const variant = seed % 3
  const style = CATEGORY_STYLES[article.categorySlug] || CATEGORY_STYLES.calcio

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="1280" height="720" viewBox="0 0 1280 720" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="86" y1="42" x2="1186" y2="680" gradientUnits="userSpaceOnUse">
      <stop stop-color="${style.bgA}" />
      <stop offset="1" stop-color="${style.bgB}" />
    </linearGradient>
    <radialGradient id="imageGlow" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(220 126) rotate(48) scale(470 540)">
      <stop stop-color="${style.accent2}" stop-opacity="0.95" />
      <stop offset="0.45" stop-color="${style.accent}" stop-opacity="0.75" />
      <stop offset="1" stop-color="${style.bgB}" stop-opacity="0.96" />
    </radialGradient>
    <linearGradient id="sheen" x1="248" y1="152" x2="914" y2="640" gradientUnits="userSpaceOnUse">
      <stop stop-color="rgba(255,255,255,0.18)" />
      <stop offset="1" stop-color="rgba(255,255,255,0)" />
    </linearGradient>
    <filter id="blurSoft" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="34" />
    </filter>
  </defs>

  <rect width="1280" height="720" fill="#050505" />
  <rect x="24" y="24" width="1232" height="672" rx="34" fill="url(#bg)" />
  <rect x="24" y="24" width="1232" height="672" rx="34" stroke="rgba(255,255,255,0.08)" />
  <circle cx="216" cy="112" r="126" fill="${style.accent}" fill-opacity="0.10" filter="url(#blurSoft)" />
  <circle cx="1148" cy="610" r="144" fill="${style.accent2}" fill-opacity="0.08" filter="url(#blurSoft)" />
  <path d="M46 668C204 612 374 590 578 612C804 636 1016 644 1236 598" stroke="rgba(255,255,255,0.08)" stroke-width="2" />
  <path d="M62 640C224 576 396 554 612 582C820 608 1020 612 1218 564" stroke="rgba(255,255,255,0.05)" stroke-width="2" />
  ${buildPhotoShapes(style, seed, variant)}
  ${buildTextBlock(article, style, variant)}
  <text x="73" y="664" fill="rgba(255,255,255,0.38)" font-family="Arial, Helvetica, sans-serif" font-size="18" font-weight="700" letter-spacing="1.6">BIANCONERIHUB</text>
</svg>`
}

async function main() {
  await fs.mkdir(outputDir, { recursive: true })

  await Promise.all(
    seedArticles.map(async (article) => {
      const svg = buildSvg(article)
      const targetPath = path.join(outputDir, `${article.slug}.svg`)
      await fs.writeFile(targetPath, svg, 'utf8')
    }),
  )

  console.log(`Generated ${seedArticles.length} editorial-style mock article covers in ${outputDir}`)
}

main().catch((error) => {
  console.error('Cover generation failed:')
  console.error(error)
  process.exit(1)
})
