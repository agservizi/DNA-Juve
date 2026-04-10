import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Ban, Loader2, Search, Shield, UserCheck, Users } from 'lucide-react'
import { getReaderProfiles, updateReaderBan } from '@/lib/supabase'
import { useToast } from '@/hooks/useToast'
import { formatDate } from '@/lib/utils'
import { Button } from '@/components/ui/Button'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'

export default function Lettori() {
  const qc = useQueryClient()
  const { toast } = useToast()
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all') // 'all' | 'banned'
  const [confirmBan, setConfirmBan] = useState(null)

  const { data, isLoading } = useQuery({
    queryKey: ['admin-readers', search],
    queryFn: async () => {
      const { data, error } = await getReaderProfiles({ search, limit: 200 })
      if (error) throw error
      return data || []
    },
    staleTime: 30000,
  })

  const readers = (data || []).filter(r => {
    if (filter === 'banned') return r.is_banned
    return true
  })

  const banMutation = useMutation({
    mutationFn: ({ userId, isBanned }) => updateReaderBan(userId, isBanned),
    onSuccess: (_, { isBanned, username }) => {
      toast({
        title: isBanned ? `${username} bannato` : `${username} riabilitato`,
        variant: 'success',
      })
      qc.invalidateQueries({ queryKey: ['admin-readers'] })
      setConfirmBan(null)
    },
    onError: () => {
      toast({ title: 'Operazione non riuscita', variant: 'error' })
    },
  })

  return (
    <div>
      <div className="mb-8">
        <h1 className="font-display text-2xl font-black text-juve-black">Lettori</h1>
        <p className="text-sm text-gray-500 mt-1">Gestisci i lettori registrati</p>
      </div>

      {/* Filters */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Cerca per nome o email…"
            className="w-full border-2 border-gray-200 pl-9 pr-4 py-2 text-sm focus:outline-none focus:border-juve-gold transition-colors"
          />
        </div>
        <div className="flex gap-2">
          {[
            { id: 'all', label: 'Tutti' },
            { id: 'banned', label: 'Bannati' },
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
      </div>

      {/* Confirm dialog */}
      <ConfirmDialog
        open={!!confirmBan}
        onClose={() => setConfirmBan(null)}
        onConfirm={() => banMutation.mutate(confirmBan)}
        title={confirmBan ? (confirmBan.isBanned ? 'Bannare utente?' : 'Riabilitare utente?') : ''}
        description={confirmBan
          ? (confirmBan.isBanned
              ? `Vuoi bannare ${confirmBan.username}? Non potrà più partecipare alla community.`
              : `Vuoi riabilitare ${confirmBan.username}?`)
          : ''}
        confirmLabel={confirmBan?.isBanned ? 'Banna' : 'Riabilita'}
        confirmVariant={confirmBan?.isBanned ? 'danger' : 'gold'}
        loading={banMutation.isPending}
      />

      {/* Table */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white border border-gray-200"
      >
        <div className="flex items-center gap-2 border-b border-gray-100 px-6 py-4">
          <Users className="h-4 w-4 text-juve-gold" />
          <span className="font-bold text-sm uppercase tracking-wider">
            {isLoading ? '…' : `${readers.length} lettori`}
          </span>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-juve-gold" />
          </div>
        ) : readers.length === 0 ? (
          <div className="py-16 text-center text-gray-400 text-sm">Nessun lettore trovato</div>
        ) : (
          <div className="divide-y divide-gray-100">
            {readers.map(reader => (
              <div key={reader.id} className="flex items-center gap-4 px-6 py-4">
                <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
                  {reader.avatar_url
                    ? <img src={reader.avatar_url} alt="" className="w-8 h-8 rounded-full object-cover" />
                    : <span className="text-sm font-bold text-gray-500">{(reader.username || 'U')[0].toUpperCase()}</span>
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm truncate">{reader.username || '—'}</span>
                    {reader.is_banned && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider bg-red-50 text-red-600">
                        <Ban className="h-3 w-3" /> Bannato
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-gray-400 truncate">{reader.email || 'Email non disponibile'}</div>
                </div>
                <div className="text-xs text-gray-400 hidden sm:block shrink-0">
                  {reader.created_at ? formatDate(reader.created_at) : '—'}
                </div>
                <button
                  onClick={() => setConfirmBan({
                    userId: reader.id,
                    username: reader.username,
                    isBanned: !reader.is_banned,
                  })}
                  className={`shrink-0 p-2 transition-colors rounded ${
                    reader.is_banned
                      ? 'text-green-600 hover:bg-green-50'
                      : 'text-gray-400 hover:bg-red-50 hover:text-red-600'
                  }`}
                  title={reader.is_banned ? 'Riabilita' : 'Banna'}
                >
                  {reader.is_banned ? <UserCheck className="h-4 w-4" /> : <Shield className="h-4 w-4" />}
                </button>
              </div>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  )
}
