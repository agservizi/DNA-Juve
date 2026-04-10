import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import {
  BarChart3, Check, ChevronDown, ChevronUp, Loader2, Plus,
  Star, Trash2, X, ToggleLeft, ToggleRight,
} from 'lucide-react'
import {
  getCommunityPolls,
  createCommunityPoll,
  updateCommunityPoll,
  deleteCommunityPoll,
} from '@/lib/supabase'
import { useToast } from '@/hooks/useToast'
import { Button } from '@/components/ui/Button'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { formatDate } from '@/lib/utils'

const CATEGORIES = ['generale', 'calcio', 'mercato', 'champions', 'serie-a', 'formazione']

function CreatePollForm({ onCancel, onCreated }) {
  const { toast } = useToast()
  const [question, setQuestion] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('generale')
  const [options, setOptions] = useState(['', ''])
  const [expiresAt, setExpiresAt] = useState('')
  const [isFeatured, setIsFeatured] = useState(false)

  const createMutation = useMutation({
    mutationFn: () =>
      createCommunityPoll({
        question: question.trim(),
        description: description.trim() || null,
        category,
        is_featured: isFeatured,
        expires_at: expiresAt ? new Date(expiresAt).toISOString() : null,
        options: options.map(o => o.trim()).filter(Boolean),
      }),
    onSuccess: () => {
      toast({ title: 'Sondaggio creato', variant: 'success' })
      onCreated()
    },
    onError: () => toast({ title: 'Errore nella creazione', variant: 'error' }),
  })

  const addOption = () => setOptions(prev => [...prev, ''])
  const removeOption = (i) => setOptions(prev => prev.filter((_, idx) => idx !== i))
  const setOption = (i, val) => setOptions(prev => prev.map((o, idx) => idx === i ? val : o))

  const validOptions = options.map(o => o.trim()).filter(Boolean)

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white border border-juve-gold p-6 mb-6"
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-sm uppercase tracking-wider">Nuovo sondaggio</h3>
        <button onClick={onCancel} className="text-gray-400 hover:text-gray-600"><X className="h-4 w-4" /></button>
      </div>

      <div className="space-y-4">
        <div>
          <label className="text-xs font-black uppercase tracking-widest mb-1.5 block">Domanda *</label>
          <input
            value={question}
            onChange={e => setQuestion(e.target.value)}
            placeholder="Es. Chi sarà il MVP di questa stagione?"
            className="w-full border-2 border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:border-juve-gold"
          />
        </div>

        <div>
          <label className="text-xs font-black uppercase tracking-widest mb-1.5 block">Descrizione</label>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Descrizione opzionale"
            rows={2}
            className="w-full border-2 border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:border-juve-gold resize-none"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-black uppercase tracking-widest mb-1.5 block">Categoria</label>
            <select
              value={category}
              onChange={e => setCategory(e.target.value)}
              className="w-full border-2 border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:border-juve-gold"
            >
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-black uppercase tracking-widest mb-1.5 block">Scade il</label>
            <input
              type="datetime-local"
              value={expiresAt}
              onChange={e => setExpiresAt(e.target.value)}
              className="w-full border-2 border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:border-juve-gold"
            />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-black uppercase tracking-widest">Opzioni *</label>
            <button type="button" onClick={addOption} className="text-xs text-juve-gold font-bold hover:underline flex items-center gap-1">
              <Plus className="h-3 w-3" /> Aggiungi opzione
            </button>
          </div>
          <div className="space-y-2">
            {options.map((opt, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="text-xs text-gray-400 w-4 shrink-0">{i + 1}.</span>
                <input
                  value={opt}
                  onChange={e => setOption(i, e.target.value)}
                  placeholder={`Opzione ${i + 1}`}
                  className="flex-1 border-2 border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-juve-gold"
                />
                {options.length > 2 && (
                  <button onClick={() => removeOption(i)} className="text-gray-400 hover:text-red-500">
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        <label className="flex items-center gap-3 cursor-pointer">
          <button
            type="button"
            onClick={() => setIsFeatured(f => !f)}
            className={`transition-colors ${isFeatured ? 'text-juve-gold' : 'text-gray-300'}`}
          >
            <Star className="h-5 w-5 fill-current" />
          </button>
          <span className="text-sm font-bold">In evidenza</span>
        </label>

        <div className="flex gap-3 pt-2">
          <Button
            variant="gold"
            size="sm"
            onClick={() => createMutation.mutate()}
            disabled={!question.trim() || validOptions.length < 2 || createMutation.isPending}
          >
            {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Check className="h-4 w-4" /> Crea</>}
          </Button>
          <Button variant="outline" size="sm" onClick={onCancel}>Annulla</Button>
        </div>
      </div>
    </motion.div>
  )
}

function PollRow({ poll, onToggle, onDelete }) {
  const [expanded, setExpanded] = useState(false)
  const totalVotes = poll.community_poll_votes_aggregate?.count ||
    (poll._voteCount ?? 0)

  const isExpired = poll.expires_at && new Date(poll.expires_at) < new Date()

  return (
    <div className="border-b border-gray-100 last:border-none">
      <div className="flex items-center gap-4 px-6 py-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-sm truncate">{poll.question}</span>
            {poll.is_featured && <Star className="h-3.5 w-3.5 text-juve-gold fill-current shrink-0" />}
            {isExpired && (
              <span className="text-[10px] font-black uppercase tracking-wider text-gray-400 border border-gray-200 px-1.5 py-0.5">Scaduto</span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-xs text-gray-400">{poll.category}</span>
            <span className="text-gray-300">·</span>
            <span className="text-xs text-gray-400">{formatDate(poll.created_at)}</span>
            {poll.expires_at && (
              <>
                <span className="text-gray-300">·</span>
                <span className="text-xs text-gray-400">scade {formatDate(poll.expires_at)}</span>
              </>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => onToggle(poll)}
            title={poll.is_active ? 'Disattiva' : 'Attiva'}
            className={`p-1.5 rounded transition-colors ${poll.is_active ? 'text-green-600 hover:bg-green-50' : 'text-gray-400 hover:bg-gray-50'}`}
          >
            {poll.is_active ? <ToggleRight className="h-5 w-5" /> : <ToggleLeft className="h-5 w-5" />}
          </button>
          <button
            onClick={() => setExpanded(e => !e)}
            className="p-1.5 text-gray-400 hover:text-juve-gold"
          >
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
          <button
            onClick={() => onDelete(poll)}
            className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="px-6 pb-4">
              {poll.community_poll_options?.length ? (
                <div className="space-y-1.5">
                  {[...poll.community_poll_options].sort((a, b) => a.position - b.position).map(opt => (
                    <div key={opt.id} className="flex items-center gap-3">
                      <span className="text-xs text-gray-400 w-4 shrink-0">{opt.position + 1}.</span>
                      <span className="text-sm flex-1">{opt.label}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-gray-400">Nessuna opzione</p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default function SondaggiAdmin() {
  const qc = useQueryClient()
  const { toast } = useToast()
  const [showCreate, setShowCreate] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [filter, setFilter] = useState('all') // 'all' | 'active' | 'expired'

  const { data: polls = [], isLoading } = useQuery({
    queryKey: ['admin-community-polls'],
    queryFn: async () => {
      const { data, error } = await getCommunityPolls({ active: false, limit: 100 })
      if (error) throw error
      return data || []
    },
    staleTime: 30000,
  })

  const filteredPolls = polls.filter(p => {
    if (filter === 'active') return p.is_active && !(p.expires_at && new Date(p.expires_at) < new Date())
    if (filter === 'expired') return p.expires_at && new Date(p.expires_at) < new Date()
    return true
  })

  const toggleMutation = useMutation({
    mutationFn: (poll) => updateCommunityPoll(poll.id, { is_active: !poll.is_active }),
    onSuccess: () => {
      toast({ title: 'Sondaggio aggiornato', variant: 'success' })
      qc.invalidateQueries({ queryKey: ['admin-community-polls'] })
    },
    onError: () => toast({ title: 'Errore aggiornamento', variant: 'error' }),
  })

  const deleteMutation = useMutation({
    mutationFn: (pollId) => deleteCommunityPoll(pollId),
    onSuccess: () => {
      toast({ title: 'Sondaggio eliminato', variant: 'success' })
      qc.invalidateQueries({ queryKey: ['admin-community-polls'] })
      setConfirmDelete(null)
    },
    onError: () => toast({ title: 'Errore eliminazione', variant: 'error' }),
  })

  return (
    <div>
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-black text-juve-black">Sondaggi Community</h1>
          <p className="text-sm text-gray-500 mt-1">Crea e gestisci i sondaggi della community</p>
        </div>
        <Button variant="gold" size="sm" onClick={() => setShowCreate(s => !s)}>
          <Plus className="h-4 w-4 mr-2" />
          Nuovo sondaggio
        </Button>
      </div>

      {showCreate && (
        <CreatePollForm
          onCancel={() => setShowCreate(false)}
          onCreated={() => {
            setShowCreate(false)
            qc.invalidateQueries({ queryKey: ['admin-community-polls'] })
          }}
        />
      )}

      {/* Confirm delete */}
      <ConfirmDialog
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={() => deleteMutation.mutate(confirmDelete.id)}
        title="Elimina sondaggio?"
        description="Questa azione elimina anche tutti i voti. Non è reversibile."
        confirmLabel="Elimina"
        confirmVariant="danger"
        loading={deleteMutation.isPending}
      />

      {/* Filters */}
      <div className="flex gap-2 mb-4">
        {[
          { id: 'all', label: 'Tutti' },
          { id: 'active', label: 'Attivi' },
          { id: 'expired', label: 'Scaduti' },
        ].map(f => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={`px-4 py-2 text-xs font-black uppercase tracking-wider border-2 transition-colors ${
              filter === f.id
                ? 'bg-juve-black text-white border-juve-black'
                : 'border-gray-200 text-gray-600 hover:border-juve-gold'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white border border-gray-200"
      >
        <div className="flex items-center gap-2 border-b border-gray-100 px-6 py-4">
          <BarChart3 className="h-4 w-4 text-juve-gold" />
          <span className="font-bold text-sm uppercase tracking-wider">
            {isLoading ? '…' : `${filteredPolls.length} sondaggi`}
          </span>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-juve-gold" />
          </div>
        ) : filteredPolls.length === 0 ? (
          <div className="py-16 text-center text-gray-400 text-sm">Nessun sondaggio</div>
        ) : (
          filteredPolls.map(poll => (
            <PollRow
              key={poll.id}
              poll={poll}
              onToggle={p => toggleMutation.mutate(p)}
              onDelete={p => setConfirmDelete(p)}
            />
          ))
        )}
      </motion.div>
    </div>
  )
}
