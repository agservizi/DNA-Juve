const SW_PATH = '/sw.js'

export function isPushSupported() {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  )
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

  const registration = await navigator.serviceWorker.register(SW_PATH)
  await navigator.serviceWorker.ready
  return registration
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
