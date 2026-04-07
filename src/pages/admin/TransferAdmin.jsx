import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Trash2, Edit3, X, ChevronDown, ArrowUpDown, Loader2, AlertTriangle } from 'lucide-react'
import { supabase } from '@/lib/supabase'

const STATUS_OPTIONS = ['rumor', 'trattativa', 'accordo', 'ufficiale', 'sfumato']
const STATUS_LABELS = { rumor: 'Voce', trattativa: 'Trattativa', accordo: 'Accordo', ufficiale: 'Ufficiale', sfumato: 'Sfumato' }
const STATUS_COLORS = { rumor: 'bg-gray-400', trattativa: 'bg-yellow-500', accordo: 'bg-blue-500', ufficiale: 'bg-green-600', sfumato: 'bg-red-500' }
const DIRECTION_OPTIONS = ['in', 'out']

const emptyRumor = {
  player_name: '', from_team: '', to_team: 'Juventus', direction: 'in',
  status: 'rumor', fee: '', reliability: 50, source: '', source_url: '', notes: '', is_active: true,
}

export default function TransferAdmin() {
  const queryClient = useQueryClient()
  const [editingRumor, setEditingRumor] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({ ...emptyRumor })
  const [statusUpdate, setStatusUpdate] = useState({ rumorId: null, newStatus: '', note: '' })
  const [deleteTarget, setDeleteTarget] = useState(null)

  const { data: rumors = [], isLoading } = useQuery({
    queryKey: ['admin-transfer-rumors'],
    queryFn: async () => {
      const { data } = await supabase
        .from('transfer_rumors')
        .select('*, transfer_updates(id, old_status, new_status, note, source, created_at)')
        .order('updated_at', { ascending: false })
      return data || []
    },
  })

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      if (editingRumor) {
        const { error } = await supabase.from('transfer_rumors').update(data).eq('id', editingRumor)
        if (error) throw error
      } else {
        const { error } = await supabase.from('transfer_rumors').insert(data)
        if (error) throw error
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-transfer-rumors'] })
      resetForm()
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase.from('transfer_rumors').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-transfer-rumors'] }),
  })

  const updateStatusMutation = useMutation({
    mutationFn: async ({ rumorId, newStatus, note }) => {
      const rumor = rumors.find(r => r.id === rumorId)
      await supabase.from('transfer_updates').insert({
        rumor_id: rumorId, old_status: rumor?.status, new_status: newStatus, note,
      })
      await supabase.from('transfer_rumors').update({ status: newStatus }).eq('id', rumorId)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-transfer-rumors'] })
      setStatusUpdate({ rumorId: null, newStatus: '', note: '' })
    },
  })

  const resetForm = () => {
    setFormData({ ...emptyRumor })
    setEditingRumor(null)
    setShowForm(false)
  }

  const openEdit = (rumor) => {
    setFormData({
      player_name: rumor.player_name, from_team: rumor.from_team || '', to_team: rumor.to_team || 'Juventus',
      direction: rumor.direction, status: rumor.status, fee: rumor.fee || '', reliability: rumor.reliability,
      source: rumor.source || '', source_url: rumor.source_url || '', notes: rumor.notes || '', is_active: rumor.is_active,
    })
    setEditingRumor(rumor.id)
    setShowForm(true)
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    saveMutation.mutate(formData)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-display font-black text-juve-black">Trasferimenti</h1>
          <p className="text-sm text-gray-500">{rumors.length} voci di mercato</p>
        </div>
        <button
          onClick={() => { resetForm(); setShowForm(true) }}
          className="flex items-center gap-2 bg-juve-black text-white px-4 py-2 text-sm font-bold hover:bg-juve-gold hover:text-juve-black transition-colors"
        >
          <Plus className="h-4 w-4" /> Nuova voce
        </button>
      </div>

      {/* Form */}
      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden mb-6">
            <form onSubmit={handleSubmit} className="bg-white border border-gray-200 p-6 space-y-4">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-sm font-black uppercase tracking-widest text-gray-500">
                  {editingRumor ? 'Modifica voce' : 'Nuova voce di mercato'}
                </h2>
                <button type="button" onClick={resetForm} className="text-gray-400 hover:text-gray-600"><X className="h-4 w-4" /></button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-1">Giocatore *</label>
                  <input required value={formData.player_name} onChange={e => setFormData(p => ({ ...p, player_name: e.target.value }))}
                    className="w-full border border-gray-300 px-3 py-2 text-sm focus:border-juve-gold focus:outline-none" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-1">Direzione</label>
                  <select value={formData.direction} onChange={e => setFormData(p => ({ ...p, direction: e.target.value }))}
                    className="w-full border border-gray-300 px-3 py-2 text-sm focus:border-juve-gold focus:outline-none">
                    <option value="in">Entrata</option>
                    <option value="out">Uscita</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-1">Da squadra</label>
                  <input value={formData.from_team} onChange={e => setFormData(p => ({ ...p, from_team: e.target.value }))}
                    className="w-full border border-gray-300 px-3 py-2 text-sm focus:border-juve-gold focus:outline-none" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-1">A squadra</label>
                  <input value={formData.to_team} onChange={e => setFormData(p => ({ ...p, to_team: e.target.value }))}
                    className="w-full border border-gray-300 px-3 py-2 text-sm focus:border-juve-gold focus:outline-none" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-1">Stato</label>
                  <select value={formData.status} onChange={e => setFormData(p => ({ ...p, status: e.target.value }))}
                    className="w-full border border-gray-300 px-3 py-2 text-sm focus:border-juve-gold focus:outline-none">
                    {STATUS_OPTIONS.map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-1">Cifra</label>
                  <input value={formData.fee} onChange={e => setFormData(p => ({ ...p, fee: e.target.value }))} placeholder="es. 35M €"
                    className="w-full border border-gray-300 px-3 py-2 text-sm focus:border-juve-gold focus:outline-none" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-1">Affidabilità: {formData.reliability}%</label>
                  <input type="range" min="0" max="100" step="5" value={formData.reliability}
                    onChange={e => setFormData(p => ({ ...p, reliability: +e.target.value }))} className="w-full" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-1">Fonte</label>
                  <input value={formData.source} onChange={e => setFormData(p => ({ ...p, source: e.target.value }))} placeholder="es. Sky Sport"
                    className="w-full border border-gray-300 px-3 py-2 text-sm focus:border-juve-gold focus:outline-none" />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-1">Note</label>
                <textarea value={formData.notes} onChange={e => setFormData(p => ({ ...p, notes: e.target.value }))} rows={2}
                  className="w-full border border-gray-300 px-3 py-2 text-sm focus:border-juve-gold focus:outline-none" />
              </div>

              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={formData.is_active} onChange={e => setFormData(p => ({ ...p, is_active: e.target.checked }))} />
                  Attiva
                </label>
              </div>

              <div className="flex gap-2">
                <button type="submit" disabled={saveMutation.isPending}
                  className="bg-juve-black text-white px-6 py-2 text-sm font-bold hover:bg-juve-gold hover:text-juve-black transition-colors disabled:opacity-50">
                  {saveMutation.isPending ? 'Salvataggio...' : editingRumor ? 'Aggiorna' : 'Crea voce'}
                </button>
                <button type="button" onClick={resetForm} className="px-6 py-2 text-sm font-bold text-gray-500 hover:text-gray-800">
                  Annulla
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Lista rumors */}
      {isLoading ? (
        <div className="text-center py-12"><Loader2 className="h-6 w-6 animate-spin text-juve-gold mx-auto" /></div>
      ) : (
        <div className="space-y-3">
          {rumors.map((rumor) => (
            <div key={rumor.id} className="bg-white border border-gray-200 p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-[10px] font-bold uppercase text-white px-2 py-0.5 ${STATUS_COLORS[rumor.status]}`}>
                      {STATUS_LABELS[rumor.status]}
                    </span>
                    <span className={`text-[10px] font-bold uppercase tracking-widest ${rumor.direction === 'in' ? 'text-green-600' : 'text-red-500'}`}>
                      {rumor.direction === 'in' ? '↓ ENTRATA' : '↑ USCITA'}
                    </span>
                    {!rumor.is_active && <span className="text-[10px] bg-gray-200 text-gray-500 px-2 py-0.5 font-bold">ARCHIVIATA</span>}
                  </div>
                  <h3 className="font-display text-lg font-black text-juve-black mt-1">{rumor.player_name}</h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {rumor.from_team} → {rumor.to_team}
                    {rumor.fee && <> · <span className="font-bold">{rumor.fee}</span></>}
                    {rumor.source && <> · {rumor.source}</>}
                  </p>
                  {rumor.notes && <p className="text-xs text-gray-400 mt-1">{rumor.notes}</p>}
                  <div className="flex items-center gap-1 mt-2">
                    <div className="w-20 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{
                        width: `${rumor.reliability}%`,
                        backgroundColor: rumor.reliability >= 80 ? '#057a55' : rumor.reliability >= 50 ? '#F5A623' : '#e02424',
                      }} />
                    </div>
                    <span className="text-[10px] text-gray-400 font-bold">{rumor.reliability}%</span>
                  </div>

                  {/* Timeline updates */}
                  {rumor.transfer_updates?.length > 0 && (
                    <div className="mt-3 pl-3 border-l-2 border-juve-gold/30 space-y-1">
                      {rumor.transfer_updates
                        .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
                        .map(u => (
                          <div key={u.id} className="text-[10px] text-gray-400">
                            <span className="font-bold text-gray-600">{STATUS_LABELS[u.new_status]}</span>
                            {u.note && <> — {u.note}</>}
                          </div>
                        ))}
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-1 shrink-0">
                  <button onClick={() => openEdit(rumor)} className="p-1.5 text-gray-400 hover:text-juve-gold"><Edit3 className="h-4 w-4" /></button>
                  <button onClick={() => setStatusUpdate({ rumorId: rumor.id, newStatus: '', note: '' })} className="p-1.5 text-gray-400 hover:text-blue-500">
                    <ArrowUpDown className="h-4 w-4" />
                  </button>
                  <button onClick={() => setDeleteTarget(rumor)}
                    className="p-1.5 text-gray-400 hover:text-red-500"><Trash2 className="h-4 w-4" /></button>
                </div>
              </div>

              {/* Status update inline */}
              {statusUpdate.rumorId === rumor.id && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-3 pt-3 border-t border-gray-100 flex items-end gap-2">
                  <div className="flex-1">
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-1">Nuovo stato</label>
                    <select value={statusUpdate.newStatus} onChange={e => setStatusUpdate(p => ({ ...p, newStatus: e.target.value }))}
                      className="w-full border border-gray-300 px-3 py-1.5 text-sm">
                      <option value="">Seleziona...</option>
                      {STATUS_OPTIONS.filter(s => s !== rumor.status).map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
                    </select>
                  </div>
                  <div className="flex-1">
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-1">Nota</label>
                    <input value={statusUpdate.note} onChange={e => setStatusUpdate(p => ({ ...p, note: e.target.value }))}
                      placeholder="es. Accordo raggiunto" className="w-full border border-gray-300 px-3 py-1.5 text-sm" />
                  </div>
                  <button disabled={!statusUpdate.newStatus || updateStatusMutation.isPending}
                    onClick={() => updateStatusMutation.mutate(statusUpdate)}
                    className="bg-juve-gold text-juve-black px-4 py-1.5 text-sm font-bold disabled:opacity-50 hover:bg-juve-gold/80">
                    Aggiorna
                  </button>
                  <button onClick={() => setStatusUpdate({ rumorId: null, newStatus: '', note: '' })} className="text-gray-400 hover:text-gray-600 p-1.5">
                    <X className="h-4 w-4" />
                  </button>
                </motion.div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Delete confirmation modal */}
      <AnimatePresence>
        {deleteTarget && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            onClick={() => setDeleteTarget(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              className="bg-white dark:bg-[#1a1a1a] w-full max-w-sm p-6 shadow-2xl"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-red-100 flex items-center justify-center shrink-0">
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                </div>
                <div>
                  <h3 className="font-display text-lg font-black text-juve-black dark:text-white">Elimina voce</h3>
                  <p className="text-sm text-gray-500">Questa azione è irreversibile.</p>
                </div>
              </div>
              <p className="text-sm text-gray-700 dark:text-gray-300 mb-6">
                Vuoi eliminare la voce di mercato per <span className="font-bold">{deleteTarget.player_name}</span>?
              </p>
              <div className="flex gap-2 justify-end">
                <button onClick={() => setDeleteTarget(null)}
                  className="px-4 py-2 text-sm font-bold text-gray-500 hover:text-gray-800 transition-colors">
                  Annulla
                </button>
                <button
                  disabled={deleteMutation.isPending}
                  onClick={() => { deleteMutation.mutate(deleteTarget.id); setDeleteTarget(null) }}
                  className="bg-red-600 text-white px-4 py-2 text-sm font-bold hover:bg-red-700 transition-colors disabled:opacity-50"
                >
                  {deleteMutation.isPending ? 'Eliminazione...' : 'Elimina'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
