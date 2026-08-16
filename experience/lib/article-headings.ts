/** Shared heuristics so Telegram (and pasted) section titles become real headings for the Indice. */

export function looksLikeSectionTitle(raw: string) {
  const t = String(raw || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  if (t.length < 8 || t.length > 110) return false
  if (/[.!…]$/.test(t)) return false
  if (/^(https?:|www\.)/i.test(t)) return false
  if (/^[-*•]\s/.test(t)) return false
  if (/^\d+[.)]\s/.test(t) && t.length > 60) return false
  const words = t.split(/\s+/).filter(Boolean).length
  if (words < 2 || words > 16) return false
  return true
}

/**
 * Turns short title-like <p> blocks into <h2> when a following content block exists.
 * Fixes Telegram articles already stored without enough headings for the Indice.
 */
export function promoteLikelyParagraphHeadings(html: string) {
  const source = String(html || '')
  if (!source) return source

  return source.replace(/<p(\s[^>]*)?>([\s\S]*?)<\/p>/gi, (match, _attrs, inner, offset: number) => {
    const text = String(inner)
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/gi, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/\s+/g, ' ')
      .trim()

    if (!looksLikeSectionTitle(text)) return match

    const after = source.slice(offset + match.length)
    const next = after.match(/^\s*(<(?:p|h[1-6]|ul|ol|blockquote|figure|div)\b)/i)
    if (!next) return match

    // Avoid promoting a lead that is immediately followed only by another short title-ish line
    // when this paragraph is the very first block and longer than a typical section head.
    const before = source.slice(0, offset).replace(/\s+/g, '')
    if (!before && text.length > 70) return match

    return `<h2>${inner}</h2>`
  })
}
