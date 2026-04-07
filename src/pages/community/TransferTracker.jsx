import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import { Repeat, ArrowUpRight, ArrowDownLeft, ChevronDown, ChevronUp, Loader2, TrendingUp, XCircle, CheckCircle, AlertCircle, Clock } from 'lucide-react'
import { getTransferRumors, getTransferUpdates } from '@/lib/supabase'
import SEO from '@/components/blog/SEO'

const STATUS_CONFIG = {
  rumor: { label: 'Voce', color: '#6b7280', icon: AlertCircle, bg: 'bg-gray-100' },
  trattativa: { label: 'Trattativa', color: '#F5A623', icon: Clock, bg: 'bg-amber-50' },
  accordo: { label: 'Accordo', color: '#1a56db', icon: TrendingUp, bg: 'bg-blue-50' },
  ufficiale: { label: 'Ufficiale', color: '#057a55', icon: CheckCircle, bg: 'bg-green-50' },
  sfumato: { label: 'Sfumato', color: '#e02424', icon: XCircle, bg: 'bg-red-50' },
}

const STATUS_ORDER = ['rumor', 'trattativa', 'accordo', 'ufficiale']

function ReliabilityBar({ value }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-gray-200 overflow-hidden">
        <div
          className="h-full transition-all"
          style={{
            width: `${value}%`,
            backgroundColor: value >= 80 ? '#057a55' : value >= 50 ? '#F5A623' : '#e02424',
          }}
        />
      </div>
      <span className="text-[10px] font-bold text-gray-500 shrink-0">{value}%</span>
    </div>
  )
}

function StatusTimeline({ status }) {
  const currentIndex = STATUS_ORDER.indexOf(status)
  return (
    <div className="flex items-center gap-1">
      {STATUS_ORDER.map((s, i) => {
        const cfg = STATUS_CONFIG[s]
        const isActive = i <= currentIndex && status !== 'sfumato'
        return (
          <div key={s} className="flex items-center gap-1">
            <div
              className={`h-2.5 w-2.5 rounded-full border-2 ${isActive ? '' : 'border-gray-300 bg-white'}`}
              style={isActive ? { borderColor: cfg.color, backgroundColor: cfg.color } : {}}
              title={cfg.label}
            />
            {i < STATUS_ORDER.length - 1 && (
              <div className={`h-0.5 w-4 ${i < currentIndex && status !== 'sfumato' ? 'bg-juve-gold' : 'bg-gray-200'}`} />
            )}
          </div>
        )
      })}
    </div>
  )
}

function RumorCard({ rumor }) {
  const [expanded, setExpanded] = useState(false)
  const cfg = STATUS_CONFIG[rumor.status] || STATUS_CONFIG.rumor
  const Icon = cfg.icon

  const { data: updates } = useQuery({
    queryKey: ['transfer-updates', rumor.id],
    queryFn: async () => { const { data } = await getTransferUpdates(rumor.id); return data || [] },
    enabled: expanded,
  })

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white border border-gray-200 overflow-hidden"
    >
      <div className="p-4 cursor-pointer hover:bg-gray-50 transition-colors" onClick={() => setExpanded(!expanded)}>
        <div className="flex items-start gap-3">
          <div className="w-12 h-12 bg-gray-100 shrink-0 overflow-hidden flex items-center justify-center">
            {rumor.player_image ? (
              <img src={rumor.player_image} alt="" className="w-full h-full object-cover" />
            ) : (
              rumor.direction === 'in' ? <ArrowDownLeft className="h-5 w-5 text-green-500" /> : <ArrowUpRight className="h-5 w-5 text-red-500" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest px-1.5 py-0.5 ${cfg.bg}`} style={{ color: cfg.color }}>
                <Icon className="h-3 w-3" />{cfg.label}
              </span>
              <span className="text-[10px] text-gray-400">
                {rumor.direction === 'in' ? 'Entrata' : 'Uscita'}
              </span>
            </div>
            <h3 className="font-display text-base font-black text-juve-black leading-tight">{rumor.player_name}</h3>
            <p className="text-xs text-gray-500 mt-0.5">
              {rumor.direction === 'in' ? `${rumor.from_team || '?'} → Juventus` : `Juventus → ${rumor.to_team || '?'}`}
              {rumor.fee && <span className="ml-2 font-bold text-juve-gold">{rumor.fee}</span>}
            </p>
            <div className="mt-2">
              <StatusTimeline status={rumor.status} />
            </div>
            {rumor.reliability != null && (
              <div className="mt-2 max-w-xs">
                <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">Affidabilità</span>
                <ReliabilityBar value={rumor.reliability} />
              </div>
            )}
          </div>
          <button className="p-1 text-gray-400 shrink-0">
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="px-4 pb-4 border-t border-gray-100 pt-3">
              {rumor.notes && <p className="text-sm text-gray-600 mb-3">{rumor.notes}</p>}
              {rumor.source && (
                <p className="text-[10px] text-gray-400 mb-3">
                  Fonte: {rumor.source_url ? <a href={rumor.source_url} target="_blank" rel="noopener noreferrer" className="text-juve-gold hover:underline">{rumor.source}</a> : rumor.source}
                </p>
              )}
              {updates && updates.length > 0 && (
                <div className="border-l-2 border-juve-gold pl-3 space-y-2 mt-3">
                  {updates.map(u => (
                    <div key={u.id} className="text-xs">
                      <span className="text-[10px] text-gray-400">{new Date(u.created_at).toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })}</span>
                      <span className="ml-2 font-bold" style={{ color: (STATUS_CONFIG[u.new_status] || {}).color }}>
                        {(STATUS_CONFIG[u.new_status] || {}).label || u.new_status}
                      </span>
                      {u.note && <span className="ml-1 text-gray-600">— {u.note}</span>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

export default function TransferTracker() {
  const [filter, setFilter] = useState(null)
  const [dirFilter, setDirFilter] = useState(null)

  const { data: rumors, isLoading } = useQuery({
    queryKey: ['transfer-rumors', filter, dirFilter],
    queryFn: async () => {
      const { data } = await getTransferRumors({ status: filter || undefined, direction: dirFilter || undefined })
      return data || []
    },
  })

  return (
    <>
      <SEO title="Trasferimenti" description="Segui le trattative della Juventus in tempo reale: rumors, accordi e trasferimenti ufficiali." url="/calciomercato/tracker" />

      <section className="bg-juve-black text-white py-10 md:py-14">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <div className="flex items-center justify-center gap-2 mb-3">
              <Repeat className="h-4 w-4 text-juve-gold" />
              <span className="text-xs font-black uppercase tracking-widest text-juve-gold">Calciomercato</span>
            </div>
            <h1 className="font-display text-3xl sm:text-4xl md:text-5xl font-black leading-tight mb-2">
              TRASFERIMENTI
            </h1>
            <p className="text-sm text-gray-400 max-w-lg mx-auto">
              Segui ogni trattativa dalla voce all'ufficialità. Aggiornamento in tempo reale.
            </p>
          </motion.div>
        </div>
      </section>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Filters */}
        <div className="flex flex-wrap gap-2 mb-4">
          <button
            onClick={() => setFilter(null)}
            className={`px-3 py-1.5 text-xs font-bold uppercase tracking-widest border transition-colors ${!filter ? 'bg-juve-black text-white border-juve-black' : 'border-gray-300 text-gray-600 hover:border-juve-gold'}`}
          >
            Tutti
          </button>
          {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`px-3 py-1.5 text-xs font-bold uppercase tracking-widest border transition-colors ${filter === key ? 'text-white border-transparent' : 'border-gray-300 text-gray-600 hover:border-juve-gold'}`}
              style={filter === key ? { backgroundColor: cfg.color, borderColor: cfg.color } : {}}
            >
              {cfg.label}
            </button>
          ))}
        </div>
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setDirFilter(null)}
            className={`px-3 py-1.5 text-xs font-bold uppercase tracking-widest border transition-colors ${!dirFilter ? 'bg-juve-gold text-juve-black border-juve-gold' : 'border-gray-300 text-gray-600 hover:border-juve-gold'}`}
          >
            Tutti
          </button>
          <button
            onClick={() => setDirFilter('in')}
            className={`px-3 py-1.5 text-xs font-bold uppercase tracking-widest border transition-colors flex items-center gap-1 ${dirFilter === 'in' ? 'bg-green-600 text-white border-green-600' : 'border-gray-300 text-gray-600 hover:border-juve-gold'}`}
          >
            <ArrowDownLeft className="h-3 w-3" /> Entrate
          </button>
          <button
            onClick={() => setDirFilter('out')}
            className={`px-3 py-1.5 text-xs font-bold uppercase tracking-widest border transition-colors flex items-center gap-1 ${dirFilter === 'out' ? 'bg-red-600 text-white border-red-600' : 'border-gray-300 text-gray-600 hover:border-juve-gold'}`}
          >
            <ArrowUpRight className="h-3 w-3" /> Uscite
          </button>
        </div>

        {isLoading && (
          <div className="text-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-juve-gold mx-auto mb-3" />
            <p className="text-sm text-gray-500">Caricamento trattative...</p>
          </div>
        )}

        {!isLoading && (!rumors || rumors.length === 0) && (
          <div className="text-center py-16">
            <Repeat className="h-10 w-10 text-gray-300 mx-auto mb-4" />
            <p className="text-sm text-gray-500 mb-1">Nessuna trattativa in corso.</p>
            <p className="text-[10px] text-gray-400">Le trattative verranno aggiunte durante le finestre di mercato.</p>
          </div>
        )}

        {rumors && rumors.length > 0 && (
          <div className="space-y-3">
            {rumors.map(rumor => (
              <RumorCard key={rumor.id} rumor={rumor} />
            ))}
          </div>
        )}
      </div>
    </>
  )
}
