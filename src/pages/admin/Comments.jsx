import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { CheckCircle2, Loader2, MessageSquare, Search, Trash2, XCircle } from 'lucide-react'
import { Link } from 'react-router-dom'
import { deleteComment, getAllComments, updateComment } from '@/lib/supabase'
import { usePersistentAdminState } from '@/hooks/usePersistentAdminState'
import { useToast } from '@/hooks/useToast'
import { timeAgo, truncate } from '@/lib/utils'

const FILTERS = [
  { id: 'pending', label: 'Da moderare' },
  { id: 'approved', label: 'Pubblicati' },
  { id: 'all', label: 'Tutti' },
]

export default function CommentsAdmin() {
  const qc = useQueryClient()
  const { toast } = useToast()
  const [status, setStatus] = usePersistentAdminState('comments-status', 'pending')
  const [query, setQuery] = usePersistentAdminState('comments-query', '')

  const { data: comments = [], isLoading } = useQuery({
    queryKey: ['admin-comments', status],
    queryFn: async () => {
      const { data, error } = await getAllComments({ status })
      if (error) throw error
      return data || []
    },
  })

  const filteredComments = useMemo(() => {
    const needle = query.trim().toLowerCase()
    if (!needle) return comments

    return comments.filter((comment) =>
      [comment.author_name, comment.author_email, comment.content, comment.articles?.title]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(needle))
    )
  }, [comments, query])

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['admin-comments'] })
  }

  const approveMutation = useMutation({
    mutationFn: (id) => updateComment(id, { approved: true }),
    onSuccess: () => {
      toast({ title: 'Commento approvato', variant: 'success' })
      refresh()
    },
    onError: (error) => toast({ title: 'Errore', description: error.message, variant: 'destructive' }),
  })

  const unapproveMutation = useMutation({
    mutationFn: (id) => updateComment(id, { approved: false }),
    onSuccess: () => {
      toast({ title: 'Commento rimesso in moderazione', variant: 'success' })
      refresh()
    },
    onError: (error) => toast({ title: 'Errore', description: error.message, variant: 'destructive' }),
  })

  const deleteMutation = useMutation({
    mutationFn: (id) => deleteComment(id),
    onSuccess: () => {
      toast({ title: 'Commento eliminato', variant: 'success' })
      refresh()
    },
    onError: (error) => toast({ title: 'Errore', description: error.message, variant: 'destructive' }),
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-black">Moderazione Commenti</h1>
        <p className="mt-1 text-sm text-gray-500">
          Gestisci i commenti in arrivo, approva quelli validi e rimuovi il rumore prima che arrivi sul magazine.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="flex flex-wrap items-center gap-2">
          {FILTERS.map((filter) => (
            <button
              key={filter.id}
              type="button"
              onClick={() => setStatus(filter.id)}
              className={`px-4 py-2 text-xs font-black uppercase tracking-wider transition-colors ${
                status === filter.id
                  ? 'bg-juve-black text-white'
                  : 'border border-gray-200 bg-white text-gray-500 hover:border-juve-gold hover:text-juve-black'
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>

        <label className="flex items-center gap-2 border border-gray-200 bg-white px-3 py-2">
          <Search className="h-4 w-4 text-gray-400" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Cerca autore, email, articolo..."
            className="w-full bg-transparent text-sm outline-none"
          />
        </label>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-7 w-7 animate-spin text-juve-gold" />
        </div>
      ) : filteredComments.length === 0 ? (
        <div className="border border-dashed border-gray-300 bg-white p-10 text-center">
          <MessageSquare className="mx-auto h-8 w-8 text-gray-300" />
          <p className="mt-3 text-sm font-semibold text-gray-600">Nessun commento in questa vista</p>
          <p className="mt-1 text-sm text-gray-400">Quando arriveranno nuovi messaggi dei lettori, li troverai qui.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredComments.map((comment, index) => {
            const busy = approveMutation.isPending || unapproveMutation.isPending || deleteMutation.isPending

            return (
              <motion.div
                key={comment.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.03 }}
                className="border border-gray-200 bg-white p-5"
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-bold text-juve-black">{comment.author_name}</p>
                      {comment.author_email && <p className="text-sm text-gray-500">{comment.author_email}</p>}
                      <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider ${
                        comment.approved ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'
                      }`}>
                        {comment.approved ? 'Pubblicato' : 'In moderazione'}
                      </span>
                    </div>

                    <p className="mt-1 text-xs uppercase tracking-widest text-gray-400">
                      {timeAgo(comment.created_at)}
                    </p>

                    <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-gray-700">
                      {comment.content}
                    </p>

                    <div className="mt-4 flex flex-wrap items-center gap-2 text-sm text-gray-500">
                      <span>Articolo:</span>
                      {comment.articles?.slug ? (
                        <Link to={`/articolo/${comment.articles.slug}`} target="_blank" className="font-semibold text-juve-black hover:text-juve-gold">
                          {truncate(comment.articles.title || comment.articles.slug, 80)}
                        </Link>
                      ) : (
                        <span>{truncate(comment.articles?.title || 'Articolo non disponibile', 80)}</span>
                      )}
                    </div>
                  </div>

                  <div className="flex shrink-0 flex-wrap items-center gap-2">
                    {!comment.approved ? (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => approveMutation.mutate(comment.id)}
                        className="inline-flex items-center gap-2 bg-green-600 px-4 py-2 text-xs font-black uppercase tracking-wider text-white transition-colors hover:bg-green-700 disabled:opacity-60"
                      >
                        <CheckCircle2 className="h-4 w-4" />
                        Approva
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => unapproveMutation.mutate(comment.id)}
                        className="inline-flex items-center gap-2 border border-amber-300 px-4 py-2 text-xs font-black uppercase tracking-wider text-amber-700 transition-colors hover:bg-amber-50 disabled:opacity-60"
                      >
                        <XCircle className="h-4 w-4" />
                        Rimetti in review
                      </button>
                    )}

                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => deleteMutation.mutate(comment.id)}
                      className="inline-flex items-center gap-2 border border-red-200 px-4 py-2 text-xs font-black uppercase tracking-wider text-red-600 transition-colors hover:bg-red-50 disabled:opacity-60"
                    >
                      <Trash2 className="h-4 w-4" />
                      Elimina
                    </button>
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>
      )}
    </div>
  )
}
