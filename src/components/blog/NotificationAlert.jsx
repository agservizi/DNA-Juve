import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Bell, BellOff, BellRing } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { useReader } from '@/hooks/useReader'

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

  useEffect(() => {
    const prefs = loadNotifPrefs()
    setEnabled(prefs.enabled)
    if (typeof Notification !== 'undefined') {
      setPermission(Notification.permission)
    }
  }, [])

  const toggleNotifications = async () => {
    if (!enabled) {
      // Request permission
      if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
        const result = await Notification.requestPermission()
        setPermission(result)
        if (result !== 'granted') return
      } else if (typeof Notification !== 'undefined' && Notification.permission === 'denied') {
        return
      }
      saveNotifPrefs({ enabled: true, lastCheck: new Date().toISOString() })
      setEnabled(true)
      syncRemoteState?.()
    } else {
      saveNotifPrefs({ enabled: false, lastCheck: null })
      setEnabled(false)
      syncRemoteState?.()
    }
  }

  if (!reader) return null

  const favCats = preferences?.favoriteCategories || []
  const hasFavs = favCats.length > 0

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="border-2 border-gray-200 p-4"
    >
      <div className="flex items-center gap-2 mb-3">
        <BellRing className="h-4 w-4 text-juve-gold" />
        <h3 className="text-xs font-black uppercase tracking-widest">Notifiche Articoli</h3>
      </div>

      <p className="text-sm text-gray-500 mb-4">
        {hasFavs
          ? 'Ricevi una notifica quando escono nuovi articoli nelle tue categorie preferite.'
          : 'Seleziona delle categorie preferite per ricevere notifiche mirate.'}
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
          disabled={!hasFavs || permission === 'denied'}
        >
          {enabled ? 'Disattiva' : 'Attiva notifiche'}
        </Button>
      </div>

      {permission === 'denied' && (
        <p className="text-xs text-red-500 mt-2">
          Le notifiche sono bloccate nel browser. Abilita nelle impostazioni del sito.
        </p>
      )}
    </motion.div>
  )
}
