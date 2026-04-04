self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

self.addEventListener('fetch', () => {
  // Intentionally empty: we don't cache requests here.
})

self.addEventListener('push', (event) => {
  let payload = {}

  try {
    payload = event.data ? event.data.json() : {}
  } catch {
    payload = {
      body: event.data?.text?.() || 'Nuovo aggiornamento disponibile.',
    }
  }

  const title = payload.title || 'BianconeriHub'
  const options = {
    body: payload.body || 'Nuovo aggiornamento disponibile.',
    icon: payload.icon || '/og-default.svg',
    badge: payload.badge || '/favicon.svg',
    data: {
      url: payload.url || '/area-bianconera',
    },
    tag: payload.tag || 'bianconerihub-notification',
    renotify: Boolean(payload.renotify),
  }

  event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const targetUrl = event.notification.data?.url || '/area-bianconera'

  event.waitUntil((async () => {
    const clientsList = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
    const matchingClient = clientsList.find((client) => client.url.includes(targetUrl))

    if (matchingClient) {
      await matchingClient.focus()
      return
    }

    await self.clients.openWindow(targetUrl)
  })())
})
