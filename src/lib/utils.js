import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format, formatDistanceToNow, parseISO } from 'date-fns'
import { it } from 'date-fns/locale'

export function cn(...inputs) {
  return twMerge(clsx(inputs))
}

export function formatDate(dateStr) {
  if (!dateStr) return ''
  try {
    return format(parseISO(dateStr), "d MMMM yyyy", { locale: it })
  } catch {
    return ''
  }
}

export function formatDateShort(dateStr) {
  if (!dateStr) return ''
  try {
    return format(parseISO(dateStr), "dd/MM/yyyy", { locale: it })
  } catch {
    return ''
  }
}

export function timeAgo(dateStr) {
  if (!dateStr) return ''
  try {
    return formatDistanceToNow(parseISO(dateStr), { addSuffix: true, locale: it })
  } catch {
    return ''
  }
}

export function slugify(text) {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[àáâãäå]/g, 'a')
    .replace(/[èéêë]/g, 'e')
    .replace(/[ìíîï]/g, 'i')
    .replace(/[òóôõö]/g, 'o')
    .replace(/[ùúûü]/g, 'u')
    .replace(/[ñ]/g, 'n')
    .replace(/[ç]/g, 'c')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function truncate(str, length = 120) {
  if (!str) return ''
  if (str.length <= length) return str
  return str.slice(0, length).trim() + '…'
}

export function formatViews(n) {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`
  return String(n)
}

export function readingTime(content) {
  if (!content) return 1
  const words = content.replace(/<[^>]*>/g, '').split(/\s+/).length
  return Math.max(1, Math.ceil(words / 200))
}

export function stripHtml(html) {
  if (!html) return ''
  return html.replace(/<[^>]*>/g, '')
}

export const CATEGORY_COLORS = {
  default: '#000000',
  calcio: '#1a56db',
  mercato: '#e3a008',
  formazione: '#057a55',
  champions: '#7e3af2',
  serie_a: '#e02424',
  interviste: '#ff5a1f',
}
