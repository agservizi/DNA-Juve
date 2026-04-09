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

export const COMMON_TIMEZONE_OPTIONS = [
  { value: 'auto', label: 'Automatico (browser)' },
  { value: 'Europe/Rome', label: 'Europa - Roma' },
  { value: 'Europe/London', label: 'Europa - Londra' },
  { value: 'Europe/Paris', label: 'Europa - Parigi' },
  { value: 'Europe/Madrid', label: 'Europa - Madrid' },
  { value: 'America/New_York', label: 'America - New York' },
  { value: 'America/Chicago', label: 'America - Chicago' },
  { value: 'America/Los_Angeles', label: 'America - Los Angeles' },
  { value: 'America/Sao_Paulo', label: 'America - San Paolo' },
  { value: 'Asia/Dubai', label: 'Asia - Dubai' },
  { value: 'Asia/Tokyo', label: 'Asia - Tokyo' },
  { value: 'Australia/Sydney', label: 'Australia - Sydney' },
]

export function getClientLocaleContext(preferredTimeZone = 'auto') {
  const fallback = {
    locale: 'it-IT',
    timeZone: 'Europe/Rome',
    region: 'IT',
    timeZoneLabel: 'Rome',
  }

  if (typeof window === 'undefined') return fallback

  const locale = window.navigator?.languages?.[0] || window.navigator?.language || fallback.locale

  let detectedTimeZone = fallback.timeZone
  try {
    detectedTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || fallback.timeZone
  } catch {
    detectedTimeZone = fallback.timeZone
  }

  const timeZone = preferredTimeZone && preferredTimeZone !== 'auto'
    ? preferredTimeZone
    : detectedTimeZone

  let region = ''
  try {
    if (typeof Intl.Locale === 'function') {
      region = new Intl.Locale(locale).region || ''
    }
  } catch {
    region = ''
  }

  if (!region && locale.includes('-')) {
    region = locale.split('-')[1]?.toUpperCase() || ''
  }

  return {
    locale,
    timeZone,
    region: region || fallback.region,
    timeZoneLabel: timeZone.split('/').pop()?.replace(/_/g, ' ') || fallback.timeZoneLabel,
    isAutoDetected: !preferredTimeZone || preferredTimeZone === 'auto',
  }
}

export function formatDateLocalized(dateStr, { locale = 'it-IT', timeZone, options = {} } = {}) {
  if (!dateStr) return ''

  try {
    return new Intl.DateTimeFormat(locale, {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      ...(timeZone ? { timeZone } : {}),
      ...options,
    }).format(new Date(dateStr))
  } catch {
    return ''
  }
}

export function formatTimeLocalized(dateStr, { locale = 'it-IT', timeZone, options = {} } = {}) {
  if (!dateStr) return ''

  try {
    return new Intl.DateTimeFormat(locale, {
      hour: '2-digit',
      minute: '2-digit',
      ...(timeZone ? { timeZone } : {}),
      ...options,
    }).format(new Date(dateStr))
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
