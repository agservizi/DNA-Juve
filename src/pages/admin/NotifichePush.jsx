import { useEffect, useRef, useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Bell, CheckCircle2, Loader2, Send } from 'lucide-react'
import { sendBroadcastPushNotification } from '@/lib/supabase'
import { useToast } from '@/hooks/useToast'
import { Button } from '@/components/ui/Button'

const PRESET_URLS = [
  { label: 'Home', value: '/' },
  { label: 'Area Bianconera', value: '/area-bianconera' },
  { label: 'Notizie Live', value: '/notizie-live' },
  { label: 'Calendario', value: '/calendario' },
  { label: 'Calciomercato', value: '/calciomercato' },
  { label: 'Forum', value: '/community/forum' },
]

const PUSH_DRAFT_STORAGE_KEY = 'admin-push-notification-draft'

function getSummaryCount(value) {
  if (Array.isArray(value)) return value.length

  const numericValue = Number(value)
  return Number.isFinite(numericValue) ? numericValue : 0
}

function getFailedDeliveries(value) {
  if (!Array.isArray(value)) return []

  return value.filter((entry) => entry && typeof entry === 'object')
}

export default function NotifichePush() {
  const { toast } = useToast()
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [url, setUrl] = useState('/')
  const [customUrl, setCustomUrl] = useState('')
  const [sent, setSent] = useState(null)
  const draftHydratedRef = useRef(false)

  useEffect(() => {
    if (typeof window === 'undefined' || draftHydratedRef.current) return

    draftHydratedRef.current = true

    try {
      const rawDraft = window.localStorage.getItem(PUSH_DRAFT_STORAGE_KEY)
      if (!rawDraft) return

      const parsedDraft = JSON.parse(rawDraft)
      setTitle(typeof parsedDraft.title === 'string' ? parsedDraft.title : '')
      setBody(typeof parsedDraft.body === 'string' ? parsedDraft.body : '')
      setUrl(typeof parsedDraft.url === 'string' ? parsedDraft.url : '/')
      setCustomUrl(typeof parsedDraft.customUrl === 'string' ? parsedDraft.customUrl : '')
    } catch {
      // Ignore invalid local drafts.
    }
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined' || !draftHydratedRef.current) return

    const draftPayload = {
      title,
      body,
      url,
      customUrl,
    }

    try {
      if (!title && !body && !customUrl && url === '/') {
        window.localStorage.removeItem(PUSH_DRAFT_STORAGE_KEY)
        return
      }

      window.localStorage.setItem(PUSH_DRAFT_STORAGE_KEY, JSON.stringify(draftPayload))
    } catch {
      // Ignore localStorage quota errors.
    }
  }, [title, body, url, customUrl])

  const sendMutation = useMutation({
    mutationFn: () =>
      sendBroadcastPushNotification({
        title: title.trim(),
        body: body.trim(),
        url: customUrl.trim() || url,
      }),
    onSuccess: (result) => {
      setSent(result?.data || {})
      setTitle('')
      setBody('')
      setUrl('/')
      setCustomUrl('')
      if (typeof window !== 'undefined') {
        try {
          window.localStorage.removeItem(PUSH_DRAFT_STORAGE_KEY)
        } catch {
          // Ignore storage cleanup failures.
        }
      }
      toast({ title: 'Notifica inviata', variant: 'success' })
    },
    onError: (err) => {
      toast({ title: err?.message || 'Invio non riuscito', variant: 'error' })
    },
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!title.trim()) return
    setSent(null)
    sendMutation.mutate()
  }

  const failedDeliveries = getFailedDeliveries(sent?.failed)
  const summaryItems = sent
    ? [
      { label: 'Consegnate', value: getSummaryCount(sent.delivered) },
      { label: 'Fallite', value: getSummaryCount(sent.failed) },
      { label: 'Saltate', value: getSummaryCount(sent.skipped) },
    ]
    : []

  return (
    <div>
      <div className="mb-8">
        <h1 className="font-display text-2xl font-black text-juve-black">Notifiche Push</h1>
        <p className="text-sm text-gray-500 mt-1">Invia una notifica push a tutti gli iscritti</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Form */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white border border-gray-200 p-6"
        >
          <div className="flex items-center gap-2 mb-6">
            <Bell className="h-4 w-4 text-juve-gold" />
            <h2 className="font-bold text-sm uppercase tracking-wider">Componi notifica</h2>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-black uppercase tracking-widest mb-1.5 block">
                Titolo <span className="text-red-500">*</span>
              </label>
              <input
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="Es. Notizie di mercato in arrivo!"
                maxLength={80}
                className="w-full border-2 border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:border-juve-gold transition-colors"
                required
              />
              <p className="text-xs text-gray-400 mt-1">{title.length}/80</p>
            </div>

            <div>
              <label className="text-xs font-black uppercase tracking-widest mb-1.5 block">Messaggio</label>
              <textarea
                value={body}
                onChange={e => setBody(e.target.value)}
                placeholder="Testo della notifica (opzionale)"
                maxLength={180}
                rows={3}
                className="w-full border-2 border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:border-juve-gold transition-colors resize-none"
              />
              <p className="text-xs text-gray-400 mt-1">{body.length}/180</p>
            </div>

            <div>
              <label className="text-xs font-black uppercase tracking-widest mb-1.5 block">Link di destinazione</label>
              <div className="grid grid-cols-2 gap-2 mb-2">
                {PRESET_URLS.map(preset => (
                  <button
                    key={preset.value}
                    type="button"
                    onClick={() => { setUrl(preset.value); setCustomUrl('') }}
                    className={`text-xs px-3 py-1.5 border-2 font-bold transition-colors text-left ${
                      url === preset.value && !customUrl
                        ? 'border-juve-gold bg-juve-gold/10 text-juve-black'
                        : 'border-gray-200 text-gray-600 hover:border-juve-gold'
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
              <input
                value={customUrl}
                onChange={e => setCustomUrl(e.target.value)}
                placeholder="Oppure URL personalizzato (es. /articolo/slug)"
                className="w-full border-2 border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:border-juve-gold transition-colors"
              />
            </div>

            <Button
              type="submit"
              variant="gold"
              size="lg"
              className="w-full"
              disabled={!title.trim() || sendMutation.isPending}
            >
              {sendMutation.isPending ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Invio in corso…
                </span>
              ) : (
                <span className="inline-flex items-center gap-2">
                  <Send className="h-4 w-4" />
                  Invia a tutti
                </span>
              )}
            </Button>
          </form>
        </motion.div>

        {/* Preview + result */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="space-y-4"
        >
          {/* Preview */}
          <div className="bg-white border border-gray-200 p-6">
            <h2 className="font-bold text-sm uppercase tracking-wider mb-4">Anteprima</h2>
            <div className="bg-gray-900 rounded-2xl p-4 text-white max-w-xs mx-auto">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-juve-gold rounded-lg flex items-center justify-center shrink-0">
                  <Bell className="h-5 w-5 text-black" />
                </div>
                <div className="min-w-0">
                  <p className="font-bold text-sm leading-tight">
                    {title || 'Titolo della notifica'}
                  </p>
                  <p className="text-xs text-gray-300 mt-0.5 leading-tight">
                    {body || 'Messaggio della notifica'}
                  </p>
                  <p className="text-[10px] text-gray-500 mt-1">bianconerihub.com · ora</p>
                </div>
              </div>
            </div>
          </div>

          {/* Result */}
          {sent && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-green-50 border border-green-200 p-6"
            >
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <h3 className="font-bold text-sm text-green-800 uppercase tracking-wider">Risultato invio</h3>
              </div>
              <dl className="grid grid-cols-3 gap-4">
                {summaryItems.map(item => (
                  <div key={item.label}>
                    <dt className="text-xs text-green-600 font-bold uppercase tracking-wider">{item.label}</dt>
                    <dd className="font-display text-2xl font-black text-green-900">{item.value}</dd>
                  </div>
                ))}
              </dl>

              {failedDeliveries.length > 0 && (
                <div className="mt-4 border-t border-green-200 pt-4">
                  <p className="text-xs font-bold uppercase tracking-wider text-green-700">Errori di consegna</p>
                  <ul className="mt-2 space-y-2 text-xs text-green-900">
                    {failedDeliveries.slice(0, 5).map((entry, index) => (
                      <li key={`${entry.endpoint || 'endpoint'}-${index}`} className="break-all">
                        <strong>{entry.endpoint || 'endpoint sconosciuto'}</strong>: {String(entry.error || 'Errore sconosciuto')}
                      </li>
                    ))}
                  </ul>
                  {failedDeliveries.length > 5 && (
                    <p className="mt-2 text-xs text-green-700">Altri {failedDeliveries.length - 5} errori non mostrati.</p>
                  )}
                </div>
              )}
            </motion.div>
          )}

          <div className="bg-amber-50 border border-amber-200 p-4">
            <p className="text-xs text-amber-700">
              <strong>Nota:</strong> la notifica viene inviata a tutti gli utenti con le Push Notification attive (sia loggati che guest). Per inviare a singoli utenti usa la sezione <em>Lettori</em>.
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
