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

export const DEFAULT_NOTIFICATION_SETTINGS = {
  quietHoursEnabled: true,
  quietHoursStart: '23:00',
  quietHoursEnd: '08:00',
  digestHour: '08:30',
  liveMode: 'smart',
}

export const DEFAULT_READER_PREFERENCES = {
  favoriteCategories: [],
  timeZone: 'auto',
  deliveryRegion: 'auto',
  reminderOffsets: [60, 15],
  cityLabel: '',
  notificationSettings: DEFAULT_NOTIFICATION_SETTINGS,
}

export const MATCH_REMINDER_PRESETS = [
  { minutes: 24 * 60, label: '24h prima', shortLabel: '24h' },
  { minutes: 3 * 60, label: '3h prima', shortLabel: '3h' },
  { minutes: 60, label: '1h prima', shortLabel: '1h' },
  { minutes: 15, label: '15m prima', shortLabel: '15m' },
  { minutes: 0, label: 'Al calcio d’inizio', shortLabel: 'Kickoff' },
]

function padTimePart(value) {
  return String(value).padStart(2, '0')
}

function getDateFormatterParts(dateInput, timeZone, locale = 'it-IT') {
  const date = dateInput instanceof Date ? dateInput : new Date(dateInput)

  return new Intl.DateTimeFormat(locale, {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date)
}

function partsToObject(parts) {
  return parts.reduce((acc, part) => {
    if (part.type !== 'literal') acc[part.type] = part.value
    return acc
  }, {})
}

function toMinuteOfDay(timeValue) {
  const [hours = '0', minutes = '0'] = String(timeValue || '00:00').split(':')
  return (Number.parseInt(hours, 10) * 60) + Number.parseInt(minutes, 10)
}

function getRegionLabel(region) {
  const labels = {
    IT: 'Italia',
    GB: 'Regno Unito',
    US: 'Stati Uniti',
    FR: 'Francia',
    ES: 'Spagna',
    BR: 'Brasile',
    AE: 'Emirati Arabi Uniti',
    JP: 'Giappone',
    AU: 'Australia',
  }

  return labels[region] || region || 'Globale'
}

export function mergeReaderPreferences(preferences = {}) {
  return {
    ...DEFAULT_READER_PREFERENCES,
    ...preferences,
    favoriteCategories: Array.isArray(preferences?.favoriteCategories)
      ? preferences.favoriteCategories
      : DEFAULT_READER_PREFERENCES.favoriteCategories,
    reminderOffsets: Array.isArray(preferences?.reminderOffsets)
      ? preferences.reminderOffsets
      : DEFAULT_READER_PREFERENCES.reminderOffsets,
    notificationSettings: {
      ...DEFAULT_NOTIFICATION_SETTINGS,
      ...(preferences?.notificationSettings || {}),
    },
  }
}

export function getClientLocaleContext(preferredTimeZone = 'auto', cityLabel = '') {
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

  const tzLabel = timeZone.split('/').pop()?.replace(/_/g, ' ') || fallback.timeZoneLabel

  return {
    locale,
    timeZone,
    region: region || fallback.region,
    regionLabel: getRegionLabel(region || fallback.region),
    // cityLabel sovrascrive timeZoneLabel quando rilevato via Geolocation API
    timeZoneLabel: cityLabel || tzLabel,
    cityLabel: cityLabel || '',
    isAutoDetected: !preferredTimeZone || preferredTimeZone === 'auto',
  }
}

/**
 * Rileva la città reale dell'utente tramite Geolocation API + Nominatim.
 * Restituisce una Promise<string> con il nome della città o stringa vuota.
 */
export async function detectRealCity() {
  if (typeof window === 'undefined' || !navigator.geolocation) return ''
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${coords.latitude}&lon=${coords.longitude}&format=json&accept-language=it`,
            { headers: { 'Accept-Language': 'it' } }
          )
          const json = await res.json()
          const city =
            json.address?.city ||
            json.address?.town ||
            json.address?.village ||
            json.address?.municipality ||
            json.address?.county ||
            ''
          resolve(city)
        } catch {
          resolve('')
        }
      },
      () => resolve(''),
      { timeout: 8000, maximumAge: 3600000 }
    )
  })
}

export function getTimeZoneDateParts(dateInput, { locale = 'it-IT', timeZone = 'Europe/Rome' } = {}) {
  try {
    const parts = partsToObject(getDateFormatterParts(dateInput, timeZone, locale))
    return {
      year: Number.parseInt(parts.year, 10),
      month: Number.parseInt(parts.month, 10),
      day: Number.parseInt(parts.day, 10),
      hour: Number.parseInt(parts.hour, 10),
      minute: Number.parseInt(parts.minute, 10),
      second: Number.parseInt(parts.second, 10),
    }
  } catch {
    const date = new Date(dateInput)
    return {
      year: date.getUTCFullYear(),
      month: date.getUTCMonth() + 1,
      day: date.getUTCDate(),
      hour: date.getUTCHours(),
      minute: date.getUTCMinutes(),
      second: date.getUTCSeconds(),
    }
  }
}

export function getTimeZoneMinuteOfDay(timeZone, now = new Date(), locale = 'it-IT') {
  const parts = getTimeZoneDateParts(now, { locale, timeZone })
  return (parts.hour * 60) + parts.minute
}

export function getCurrentTimeLabel(timeZone, locale = 'it-IT') {
  return new Intl.DateTimeFormat(locale, {
    hour: '2-digit',
    minute: '2-digit',
    timeZone,
  }).format(new Date())
}

export function isWithinQuietHours({ timeZone = 'Europe/Rome', quietHoursEnabled = true, quietHoursStart = '23:00', quietHoursEnd = '08:00', locale = 'it-IT' } = {}, now = new Date()) {
  if (!quietHoursEnabled) return false

  const currentMinute = getTimeZoneMinuteOfDay(timeZone, now, locale)
  const startMinute = toMinuteOfDay(quietHoursStart)
  const endMinute = toMinuteOfDay(quietHoursEnd)

  if (startMinute === endMinute) return true
  if (startMinute < endMinute) {
    return currentMinute >= startMinute && currentMinute < endMinute
  }

  return currentMinute >= startMinute || currentMinute < endMinute
}

export function getNextQuietHoursEnd({ timeZone = 'Europe/Rome', quietHoursEnabled = true, quietHoursStart = '23:00', quietHoursEnd = '08:00', locale = 'it-IT' } = {}, now = new Date()) {
  if (!quietHoursEnabled) return now.toISOString()

  const endMinute = toMinuteOfDay(quietHoursEnd)
  const currentMinute = getTimeZoneMinuteOfDay(timeZone, now, locale)
  const parts = getTimeZoneDateParts(now, { locale, timeZone })
  const targetUtc = Date.UTC(parts.year, parts.month - 1, parts.day, Math.floor(endMinute / 60), endMinute % 60, 0)
  const candidate = new Date(targetUtc)

  if (currentMinute < endMinute) return candidate.toISOString()

  candidate.setUTCDate(candidate.getUTCDate() + 1)
  return candidate.toISOString()
}

export function getRelativeMatchKickoff(dateStr, { locale = 'it-IT', timeZone, now = Date.now() } = {}) {
  if (!dateStr) return null

  const kickoff = new Date(dateStr).getTime()
  if (Number.isNaN(kickoff)) return null

  const diffMs = kickoff - now
  const absMinutes = Math.round(Math.abs(diffMs) / 60000)
  const absHours = Math.floor(absMinutes / 60)
  const days = Math.floor(absMinutes / (60 * 24))

  const dateLabel = formatDateLocalized(dateStr, {
    locale,
    timeZone,
    options: { weekday: 'long', day: 'numeric', month: 'long' },
  })
  const timeLabel = formatTimeLocalized(dateStr, { locale, timeZone })

  if (diffMs <= -60 * 1000) {
    if (absMinutes < 60) {
      return { shortLabel: `${absMinutes}m fa`, fullLabel: `Iniziata ${absMinutes} minuti fa`, urgency: 'started' }
    }

    if (absHours < 24) {
      return { shortLabel: `${absHours}h fa`, fullLabel: `Iniziata ${absHours} ore fa`, urgency: 'started' }
    }

    return { shortLabel: 'Giocata', fullLabel: `Giocata ${dateLabel}${timeLabel ? ` alle ${timeLabel}` : ''}`, urgency: 'past' }
  }

  if (diffMs < 60 * 1000) {
    return { shortLabel: 'Ora', fullLabel: 'Calcio d’inizio adesso', urgency: 'live' }
  }

  if (absMinutes < 60) {
    return { shortLabel: `Tra ${absMinutes}m`, fullLabel: `Calcio d’inizio tra ${absMinutes} minuti`, urgency: 'soon' }
  }

  if (absHours < 24) {
    return { shortLabel: `Tra ${absHours}h`, fullLabel: `Calcio d’inizio tra ${absHours} ore`, urgency: 'today' }
  }

  if (days === 1) {
    return { shortLabel: 'Domani', fullLabel: `Domani${timeLabel ? ` alle ${timeLabel}` : ''}`, urgency: 'upcoming' }
  }

  return { shortLabel: `${days}g`, fullLabel: `${dateLabel}${timeLabel ? ` alle ${timeLabel}` : ''}`, urgency: 'upcoming' }
}

export function getRelativeDateLabel(dateStr, { now = Date.now() } = {}) {
  if (!dateStr) return ''

  const target = new Date(dateStr).getTime()
  if (Number.isNaN(target)) return ''

  const diffMs = target - now
  const absMinutes = Math.round(Math.abs(diffMs) / 60000)
  const absHours = Math.floor(absMinutes / 60)
  const absDays = Math.floor(absHours / 24)

  if (diffMs < 0) {
    if (absMinutes < 60) return `${absMinutes}m fa`
    if (absHours < 24) return `${absHours}h fa`
    if (absDays === 1) return 'Ieri'
    return `${absDays}g fa`
  }

  if (absMinutes < 60) return `Tra ${absMinutes}m`
  if (absHours < 24) return `Tra ${absHours}h`
  if (absDays === 1) return 'Domani'
  return `Tra ${absDays}g`
}

export function getContextualTimeBucket(localeContext, now = new Date()) {
  const currentMinute = getTimeZoneMinuteOfDay(localeContext?.timeZone || 'Europe/Rome', now, localeContext?.locale || 'it-IT')
  const hour = Math.floor(currentMinute / 60)

  if (hour < 6) return 'night'
  if (hour < 12) return 'morning'
  if (hour < 18) return 'afternoon'
  return 'evening'
}

export function getSoftLocalizationSegment(localeContext, preferences = {}, now = new Date()) {
  const bucket = getContextualTimeBucket(localeContext, now)
  const favoriteCategories = Array.isArray(preferences?.favoriteCategories) ? preferences.favoriteCategories : []

  return {
    region: localeContext?.region || 'IT',
    regionLabel: localeContext?.regionLabel || getRegionLabel(localeContext?.region),
    bucket,
    prefersDigest: Boolean(preferences?.notificationSettings?.digestHour),
    followsManyCategories: favoriteCategories.length >= 3,
  }
}

export function getSmartDeliveryLabel(localeContext, notificationSettings = {}) {
  const merged = {
    ...DEFAULT_NOTIFICATION_SETTINGS,
    ...(notificationSettings || {}),
  }
  const currentTime = getCurrentTimeLabel(localeContext?.timeZone || 'Europe/Rome', localeContext?.locale || 'it-IT')
  const quietStatus = isWithinQuietHours({
    ...merged,
    timeZone: localeContext?.timeZone || 'Europe/Rome',
    locale: localeContext?.locale || 'it-IT',
  })

  return quietStatus
    ? `Quiet hours attive adesso (${currentTime})`
    : `Invio smart attivo (${currentTime})`
}

function toICSDate(dateInput) {
  const date = new Date(dateInput)
  return [
    date.getUTCFullYear(),
    padTimePart(date.getUTCMonth() + 1),
    padTimePart(date.getUTCDate()),
    'T',
    padTimePart(date.getUTCHours()),
    padTimePart(date.getUTCMinutes()),
    padTimePart(date.getUTCSeconds()),
    'Z',
  ].join('')
}

function escapeICSValue(value) {
  return String(value || '')
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n')
}

export function buildMatchCalendarPayload(match, { title, description, location, siteUrl = 'https://bianconerihub.com' } = {}) {
  if (!match?.utcDate) return null

  const home = match.homeTeam?.shortName || match.homeTeam?.name || match.home || 'Juventus'
  const away = match.awayTeam?.shortName || match.awayTeam?.name || match.away || 'Avversario'
  const eventTitle = title || `${home} vs ${away}`
  const eventDescription = description || `Segui ${eventTitle} su BianconeriHub.`
  const eventLocation = location || match.venue || ''
  const startDate = new Date(match.utcDate)
  const endDate = new Date(startDate.getTime() + (2 * 60 * 60 * 1000))
  const detailsUrl = match.slug ? `${siteUrl.replace(/\/+$/, '')}/articolo/${match.slug}` : `${siteUrl.replace(/\/+$/, '')}/calendario`

  const ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//BianconeriHub//Match Reminder//IT',
    'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `UID:${escapeICSValue(`${eventTitle}-${startDate.toISOString()}`)}`,
    `DTSTAMP:${toICSDate(new Date())}`,
    `DTSTART:${toICSDate(startDate)}`,
    `DTEND:${toICSDate(endDate)}`,
    `SUMMARY:${escapeICSValue(eventTitle)}`,
    `DESCRIPTION:${escapeICSValue(`${eventDescription} ${detailsUrl}`)}`,
    `LOCATION:${escapeICSValue(eventLocation)}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n')

  const googleUrl = new URL('https://calendar.google.com/calendar/render')
  googleUrl.searchParams.set('action', 'TEMPLATE')
  googleUrl.searchParams.set('text', eventTitle)
  googleUrl.searchParams.set('dates', `${toICSDate(startDate)}/${toICSDate(endDate)}`)
  googleUrl.searchParams.set('details', `${eventDescription} ${detailsUrl}`.trim())
  googleUrl.searchParams.set('location', eventLocation)

  return {
    title: eventTitle,
    description: eventDescription,
    location: eventLocation,
    startDate,
    endDate,
    googleUrl: googleUrl.toString(),
    ics,
    icsFileName: `${slugify(eventTitle)}.ics`,
  }
}

export function downloadICSFile(filename, icsContent) {
  if (typeof window === 'undefined') return false

  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' })
  const url = window.URL.createObjectURL(blob)
  const link = window.document.createElement('a')
  link.href = url
  link.download = filename
  window.document.body.appendChild(link)
  link.click()
  window.document.body.removeChild(link)
  window.URL.revokeObjectURL(url)
  return true
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
