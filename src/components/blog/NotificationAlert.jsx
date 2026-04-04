import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Bell, BellOff, BellRing, Loader2, Send } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { useReader } from '@/hooks/useReader'
import {
  deletePushSubscription,
  pushNotificationsConfigured,
  sendTestPushNotification,
  upsertPushSubscription,
  vapidPublicKey,
} from '@/lib/supabase'
import {
  getCurrentPushSubscription,
  isPushSupported,
  subscribeToPush,
  unsubscribeFromPush,
} from '@/lib/pushNotifications'

const LS_KEY = 'fb-notifications'

function loadNotifPrefs() {
  try { return JSON.parse(localStorage.getItem(LS_KEY)) || { enabled: false, lastCheck: null } }
  catch { return { enabled: false, lastCheck: null } }
}

function saveNotifPrefs(data) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(data)) } catch {}
}

export default function NotificationAlert() {
  const { reader, preferences, syncRemoteState } = useReader()
  const [enabled, setEnabled] = useState(false)
  const [permission, setPermission] = useState('default')
  const [loading, setLoading] = useState(false)
  const [sendingTest, setSendingTest] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const pushSupported = isPushSupported()

  useEffect(() => {
    const prefs = loadNotifPrefs()
    setEnabled(Boolean(prefs.enabled))

    if (typeof Notification !== 'undefined') {
      setPermission(Notification.permission)
    }

    let active = true

    if (pushSupported) {
      getCurrentPushSubscription()
        .then((subscription) => {
          if (!active) return

          if (!subscription && prefs.enabled) {
            saveNotifPrefs({ enabled: false, lastCheck: prefs.lastCheck || null })
            setEnabled(false)
            return
          }

          if (subscription) setEnabled(true)
        })
        .catch(() => {})
    }

    return () => {
      active = false
    }
  }, [pushSupported])

  const toggleNotifications = async () => {
    if (!reader?.id || loading) return
    setLoading(true)
    setErrorMessage('')

    try {
      if (!enabled) {
        if (!pushSupported) throw new Error('Il browser non supporta le notifiche push.')
        if (!pushNotificationsConfigured) throw new Error('Configurazione notifiche incompleta: chiave VAPID pubblica mancante.')

        if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
          const result = await Notification.requestPermission()
          setPermission(result)
          if (result !== 'granted') return
        } else if (typeof Notification !== 'undefined' && Notification.permission === 'denied') {
          return
        }

        const subscription = await subscribeToPush(vapidPublicKey)
        const result = await upsertPushSubscription(reader.id, subscription)
        if (result.error) throw result.error

        const nextPrefs = { enabled: true, lastCheck: new Date().toISOString() }
        saveNotifPrefs(nextPrefs)
        setEnabled(true)
        await syncRemoteState?.({ notificationsEnabled: true })
        return
      }

      const subscription = await getCurrentPushSubscription()
      if (subscription?.endpoint) {
        await deletePushSubscription(reader.id, subscription.endpoint)
      }
      await unsubscribeFromPush()

      saveNotifPrefs({ enabled: false, lastCheck: null })
      setEnabled(false)
      await syncRemoteState?.({ notificationsEnabled: false })
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Operazione notifiche non riuscita.')
    } finally {
      setLoading(false)
    }
  }

  const handleSendTest = async () => {
    if (!enabled || sendingTest) return
    setSendingTest(true)
    setErrorMessage('')
    try {
      const result = await sendTestPushNotification()
      if (result.error) throw result.error
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Invio test non riuscito.')
    } finally {
      setSendingTest(false)
    }
  }

  if (!reader) return null

  const favCats = preferences?.favoriteCategories || []
  const hasFavs = favCats.length > 0
  const disabled = loading || !pushSupported || !pushNotificationsConfigured || permission === 'denied'

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="border-2 border-gray-200 p-4"
    >
      <div className="mb-3 flex items-center gap-2">
        <BellRing className="h-4 w-4 text-juve-gold" />
        <h3 className="text-xs font-black uppercase tracking-widest">Notifiche Articoli</h3>
      </div>

      <p className="mb-4 text-sm text-gray-500">
        {hasFavs
          ? 'Ricevi una notifica quando escono nuovi articoli nelle tue categorie preferite.'
          : 'Attiva le notifiche e scegli delle categorie preferite per ricevere avvisi mirati.'}
      </p>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {enabled ? (
            <Bell className="h-5 w-5 text-juve-gold" />
          ) : (
            <BellOff className="h-5 w-5 text-gray-400" />
          )}
          <span className={`text-sm font-medium ${enabled ? 'text-juve-gold' : 'text-gray-400'}`}>
            {enabled ? 'Attive' : 'Disattive'}
          </span>
        </div>

        <Button
          variant={enabled ? 'ghost' : 'gold'}
          size="sm"
          onClick={toggleNotifications}
          disabled={disabled}
        >
          {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          {enabled ? 'Disattiva' : 'Attiva notifiche'}
        </Button>
      </div>

      {enabled && (
        <div className="mt-3 flex items-center justify-between gap-3 border-t border-gray-200 pt-3">
          <p className="text-xs text-gray-500">
            {hasFavs
              ? 'Le push useranno anche le categorie preferite salvate in Area Bianconera.'
              : 'Senza categorie preferite riceverai solo test e avvisi generali.'}
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={handleSendTest}
            disabled={sendingTest}
          >
            {sendingTest ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
            Invia test
          </Button>
        </div>
      )}

      {permission === 'denied' && (
        <p className="mt-2 text-xs text-red-500">
          Le notifiche sono bloccate nel browser. Abilita nelle impostazioni del sito.
        </p>
      )}

      {!pushSupported && (
        <p className="mt-2 text-xs text-red-500">
          Questo browser non supporta le push notification.
        </p>
      )}

      {pushSupported && !pushNotificationsConfigured && (
        <p className="mt-2 text-xs text-red-500">
          Configurazione push mancante: imposta la chiave pubblica VAPID nel frontend.
        </p>
      )}

      {errorMessage && (
        <p className="mt-2 text-xs text-red-500">
          {errorMessage}
        </p>
      )}
    </motion.div>
  )
}
