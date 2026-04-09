const SW_PATH = '/sw.js'

function isIosDevice() {
  if (typeof navigator === 'undefined') return false

  return /iphone|ipad|ipod/i.test(navigator.userAgent)
}

function isStandaloneDisplayMode() {
  if (typeof window === 'undefined') return false

  const standaloneMedia = typeof window.matchMedia === 'function'
    ? window.matchMedia('(display-mode: standalone)').matches
    : false

  return standaloneMedia || window.navigator.standalone === true
}

export function getPushSupportStatus() {
  if (typeof window === 'undefined') {
    return { supported: false, reason: 'server' }
  }

  if (!window.isSecureContext) {
    return { supported: false, reason: 'insecure-context' }
  }

  if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
    return { supported: false, reason: 'unsupported-browser' }
  }

  if (isIosDevice() && !isStandaloneDisplayMode()) {
    return { supported: false, reason: 'ios-standalone-required' }
  }

  return { supported: true, reason: 'supported' }
}

export function isPushSupported() {
  return getPushSupportStatus().supported
}

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const normalized = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/')

  const rawData = window.atob(normalized)
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)))
}

export async function registerPushServiceWorker() {
  if (!isPushSupported()) return null

  const existingRegistration = await navigator.serviceWorker.getRegistration(SW_PATH)

  if (!existingRegistration) {
    await navigator.serviceWorker.register(SW_PATH, { scope: '/' })
  }

  return navigator.serviceWorker.ready
}

export async function getCurrentPushSubscription() {
  if (!isPushSupported()) return null
  const registration = await registerPushServiceWorker()
  return registration?.pushManager.getSubscription() || null
}

export async function subscribeToPush(vapidPublicKey) {
  if (!isPushSupported()) throw new Error('Le push notification non sono supportate su questo browser.')
  if (!vapidPublicKey) throw new Error('Configurazione push incompleta: chiave pubblica VAPID mancante.')

  const registration = await registerPushServiceWorker()
  const existing = await registration.pushManager.getSubscription()
  if (existing) return existing

  return registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
  })
}

export async function unsubscribeFromPush() {
  const subscription = await getCurrentPushSubscription()
  if (!subscription) return false
  return subscription.unsubscribe()
}
