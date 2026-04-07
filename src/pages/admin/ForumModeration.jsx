import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Loader2, Lock, MessageSquare, Pin, Search, Trash2 } from 'lucide-react'
import { deleteForumThread, getForumThreads, updateForumThreadModeration } from '@/lib/supabase'
import { Button } from '@/components/ui/Button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/Dialog'
import { useToast } from '@/hooks/useToast'

const PAGE_SIZE = 20

function timeAgo(dateStr) {
  if (!dateStr) return ''
  const diff = Date.now() - new Date(dateStr).getTime()
  const hours = Math.floor(diff / (1000 * 60 * 60))
  if (hours < 1) return 'Adesso'
  if (hours < 24) return `${hours}h fa`
  const days = Math.floor(hours / 24)
  if (days === 1) return 'Ieri'
  return `${days}g fa`
}

export default function ForumModeration() {
  const [page, setPage] = useState(1)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [threadToDelete, setThreadToDelete] = useState(null)
  const queryClient = useQueryClient()
  const { toast } = useToast()

  const { data, isLoading } = useQuery({
    queryKey: ['admin-forum-threads', page, searchQuery],
    queryFn: async () => {
      const result = await getForumThreads({
        page,
        limit: PAGE_SIZE,
        search: searchQuery,
        sortBy: 'recent',
      })

      return {
        threads: result.data || [],
        count: result.count || 0,
      }
    },
  })

  const threads = data?.threads || []
  const visibleThreads = useMemo(() => {
    if (statusFilter === 'pinned') return threads.filter((thread) => thread.is_pinned)
    if (statusFilter === 'locked') return threads.filter((thread) => thread.is_locked)
    if (statusFilter === 'open') return threads.filter((thread) => !thread.is_locked)
    return threads
  }, [statusFilter, threads])

  const totalPages = Math.max(1, Math.ceil((data?.count || 0) / PAGE_SIZE))

  const refreshForum = () => {
    queryClient.invalidateQueries({ queryKey: ['admin-forum-threads'] })
    queryClient.invalidateQueries({ queryKey: ['forum-thread'] })
    queryClient.invalidateQueries({ queryKey: ['forum-threads'] })
    queryClient.invalidateQueries({ queryKey: ['forum-threads-overview'] })
  }

  const moderationMutation = useMutation({
    mutationFn: ({ threadId, updates }) => updateForumThreadModeration(threadId, updates),
    onSuccess: () => {
      refreshForum()
    },
    onError: () => {
      toast({ title: 'Operazione non riuscita', description: 'Non sono riuscito ad aggiornare lo stato del thread.', variant: 'destructive' })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (threadId) => deleteForumThread(threadId),
    onSuccess: () => {
      refreshForum()
      setThreadToDelete(null)
      toast({ title: 'Thread eliminato', description: 'La discussione è stata rimossa dal forum.', variant: 'success' })
    },
    onError: () => {
      toast({ title: 'Eliminazione fallita', description: 'Non sono riuscito a eliminare il thread selezionato.', variant: 'destructive' })
    },
  })

  return (
    <div className="space-y-6">
      <section className="border border-gray-200 bg-white p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.22em] text-juve-gold">Moderazione</p>
            <h1 className="mt-2 font-display text-3xl font-black text-juve-black">Forum</h1>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-gray-600">
              Gestisci i thread della community: blocca discussioni, pinnale in alto o rimuovi quelle da moderare.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {[
              { label: 'Thread caricati', value: threads.length },
              { label: 'Pinnati in pagina', value: threads.filter((thread) => thread.is_pinned).length },
              { label: 'Chiusi in pagina', value: threads.filter((thread) => thread.is_locked).length },
            ].map((item) => (
              <div key={item.label} className="border border-gray-200 bg-gray-50 px-4 py-3">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">{item.label}</p>
                <p className="mt-2 font-display text-2xl font-black text-juve-black">{item.value}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border border-gray-200 bg-white p-6">
        <div className="grid gap-3 lg:grid-cols-[1fr_auto_auto]">
          <label className="relative block">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              value={searchQuery}
              onChange={(event) => {
                setSearchQuery(event.target.value)
                setPage(1)
              }}
              placeholder="Cerca thread per titolo, autore o contenuto..."
              className="w-full border border-gray-200 py-2.5 pl-10 pr-3 text-sm focus:border-juve-gold focus:outline-none"
            />
          </label>

          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className="border border-gray-200 px-3 py-2.5 text-sm focus:border-juve-gold focus:outline-none"
          >
            <option value="all">Tutti gli stati</option>
            <option value="open">Aperti</option>
            <option value="locked">Chiusi</option>
            <option value="pinned">Pinnati</option>
          </select>

          <div className="flex items-center justify-end text-xs text-gray-400">
            Pagina {page} di {totalPages}
          </div>
        </div>
      </section>

      <section className="border border-gray-200 bg-white">
        {isLoading ? (
          <div className="py-16 text-center">
            <Loader2 className="mx-auto mb-3 h-6 w-6 animate-spin text-juve-gold" />
            <p className="text-sm text-gray-500">Caricamento thread forum...</p>
          </div>
        ) : visibleThreads.length === 0 ? (
          <div className="py-16 text-center">
            <MessageSquare className="mx-auto mb-4 h-10 w-10 text-gray-300" />
            <p className="text-sm text-gray-500">Nessun thread trovato con i filtri attuali.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {visibleThreads.map((thread) => {
              const busy = moderationMutation.isPending || deleteMutation.isPending

              return (
                <div key={thread.id} className="grid gap-4 p-5 lg:grid-cols-[1fr_auto] lg:items-center">
                  <div>
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      {thread.forum_categories && (
                        <span className="text-[10px] font-black uppercase tracking-[0.2em]" style={{ color: thread.forum_categories.color }}>
                          {thread.forum_categories.name}
                        </span>
                      )}
                      {thread.is_pinned && (
                        <span className="inline-flex items-center gap-1 bg-juve-gold/15 px-2 py-1 text-[10px] font-black uppercase tracking-widest text-juve-black">
                          <Pin className="h-3 w-3" /> Pinnato
                        </span>
                      )}
                      {thread.is_locked && (
                        <span className="inline-flex items-center gap-1 bg-gray-100 px-2 py-1 text-[10px] font-black uppercase tracking-widest text-gray-500">
                          <Lock className="h-3 w-3" /> Chiuso
                        </span>
                      )}
                    </div>
                    <h2 className="font-display text-xl font-black text-juve-black">{thread.title}</h2>
                    <p className="mt-2 line-clamp-2 text-sm text-gray-600">{thread.content}</p>
                    <div className="mt-3 flex flex-wrap items-center gap-3 text-[11px] text-gray-400">
                      <span>{thread.author_name}</span>
                      <span>{thread.views || 0} view</span>
                      <span>{thread.reply_count || 0} risposte</span>
                      <span>{thread.like_count || 0} like</span>
                      <span>{thread.follower_count || 0} follower</span>
                      <span>Attivita: {timeAgo(thread.last_reply_at || thread.created_at)}</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 lg:justify-end">
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => moderationMutation.mutate({ threadId: thread.id, updates: { is_pinned: !thread.is_pinned } })}
                      className={`inline-flex items-center gap-2 px-3 py-2 text-xs font-black uppercase tracking-widest transition-colors ${thread.is_pinned ? 'bg-juve-black text-white' : 'border border-gray-200 text-gray-600 hover:border-juve-gold hover:text-juve-black'} disabled:opacity-50`}
                    >
                      <Pin className="h-3.5 w-3.5" />
                      {thread.is_pinned ? 'Rimuovi pin' : 'Pinna'}
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => moderationMutation.mutate({ threadId: thread.id, updates: { is_locked: !thread.is_locked } })}
                      className={`inline-flex items-center gap-2 px-3 py-2 text-xs font-black uppercase tracking-widest transition-colors ${thread.is_locked ? 'bg-gray-200 text-juve-black' : 'border border-gray-200 text-gray-600 hover:border-juve-gold hover:text-juve-black'} disabled:opacity-50`}
                    >
                      <Lock className="h-3.5 w-3.5" />
                      {thread.is_locked ? 'Riapri' : 'Blocca'}
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => setThreadToDelete(thread)}
                      className="inline-flex items-center gap-2 border border-red-200 px-3 py-2 text-xs font-black uppercase tracking-widest text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50"
                    >
                      <Trash2 className="h-3.5 w-3.5" /> Elimina
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>

      {totalPages > 1 && (
        <section className="flex flex-wrap items-center justify-between gap-3 border border-gray-200 bg-white px-5 py-4">
          <p className="text-sm text-gray-500">Totale thread: {data?.count || 0}</p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              disabled={page === 1}
              className="border border-gray-200 px-3 py-2 text-xs font-bold uppercase tracking-widest text-gray-500 hover:border-juve-gold hover:text-juve-black disabled:opacity-40"
            >
              Precedente
            </button>
            <button
              type="button"
              onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
              disabled={page === totalPages}
              className="border border-gray-200 px-3 py-2 text-xs font-bold uppercase tracking-widest text-gray-500 hover:border-juve-gold hover:text-juve-black disabled:opacity-40"
            >
              Successiva
            </button>
          </div>
        </section>
      )}

      <Dialog open={Boolean(threadToDelete)} onClose={() => !deleteMutation.isPending && setThreadToDelete(null)}>
        <DialogHeader onClose={() => !deleteMutation.isPending && setThreadToDelete(null)}>
          <DialogTitle>Eliminare il thread?</DialogTitle>
        </DialogHeader>
        <DialogContent>
          <p className="text-sm leading-relaxed text-gray-600">
            Stai per rimuovere definitivamente la discussione
            {' '}
            <span className="font-semibold text-juve-black">{threadToDelete?.title}</span>.
            Questa azione non puo essere annullata.
          </p>
        </DialogContent>
        <DialogFooter>
          <Button
            type="button"
            variant="ghost"
            onClick={() => setThreadToDelete(null)}
            disabled={deleteMutation.isPending}
          >
            Annulla
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={() => threadToDelete?.id && deleteMutation.mutate(threadToDelete.id)}
            disabled={deleteMutation.isPending}
          >
            {deleteMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
            Elimina thread
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  )
}
