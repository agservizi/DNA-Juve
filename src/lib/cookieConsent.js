export const COOKIE_CONSENT_KEY = 'fb-cookie-consent'
export const COOKIE_CONSENT_OPEN_EVENT = 'fb-cookie-consent:open'

export const defaultCookieConsent = {
  essential: true,
  analytics: false,
  external: false,
  updatedAt: null,
}

function normalizeLegacyConsent(value) {
  if (value === 'all') {
    return {
      essential: true,
      analytics: true,
      external: true,
      updatedAt: new Date().toISOString(),
    }
  }

  if (value === 'essential') {
    return {
      ...defaultCookieConsent,
      updatedAt: new Date().toISOString(),
    }
  }

  return null
}

export function readCookieConsent() {
  if (typeof window === 'undefined') return null

  const raw = window.localStorage.getItem(COOKIE_CONSENT_KEY)
  if (!raw) return null

  const legacy = normalizeLegacyConsent(raw)
  if (legacy) return legacy

  try {
    const parsed = JSON.parse(raw)
    return {
      ...defaultCookieConsent,
      ...parsed,
      essential: true,
    }
  } catch {
    return null
  }
}

export function writeCookieConsent(consent) {
  if (typeof window === 'undefined') return

  const normalized = {
    ...defaultCookieConsent,
    ...consent,
    essential: true,
    updatedAt: new Date().toISOString(),
  }

  window.localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify(normalized))
  window.dispatchEvent(new CustomEvent('fb-cookie-consent:changed', { detail: normalized }))
}

export function hasCookieConsent() {
  return Boolean(readCookieConsent())
}

export function openCookiePreferences() {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new Event(COOKIE_CONSENT_OPEN_EVENT))
}
