import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { PlusCircle, Edit, Trash2, Eye, Search, Filter, Star, Loader2 } from 'lucide-react'
import { getAllArticles, deleteArticle } from '@/lib/supabase'
import { usePersistentAdminState } from '@/hooks/usePersistentAdminState'
import { formatDateShort, formatViews } from '@/lib/utils'
import { Dialog, DialogHeader, DialogTitle, DialogContent, DialogFooter } from '@/components/ui/Dialog'
import { useToast } from '@/hooks/useToast'

export default function ArticleList() {
  const [search, setSearch] = usePersistentAdminState('article-list-search', '')
  const [filterStatus, setFilterStatus] = usePersistentAdminState('article-list-status', 'all')
  const [deleteId, setDeleteId] = useState(null)
  const { toast } = useToast()
  const qc = useQueryClient()

  const isScheduledArticle = (article) => (
    article.status === 'draft' &&
    article.scheduled_at &&
    new Date(article.scheduled_at).getTime() > Date.now()
  )

  const { data: articles = [], isLoading } = useQuery({
    queryKey: ['all-articles'],
    queryFn: async () => {
      const { data } = await getAllArticles()
      return data || []
    },
  })

  const deleteMutation = useMutation({
    mutationFn: deleteArticle,
    onSuccess: () => {
      qc.invalidateQueries(['all-articles'])
      qc.invalidateQueries(['dashboard-stats'])
      toast({ title: 'Articolo eliminato', variant: 'success' })
      setDeleteId(null)
    },
    onError: () => {
      toast({ title: 'Errore durante l\'eliminazione', variant: 'destructive' })
    },
  })

  const filtered = articles.filter(a => {
    const matchSearch = !search || a.title.toLowerCase().includes(search.toLowerCase())
    const scheduled = isScheduledArticle(a)
    const matchStatus = filterStatus === 'all'
      || (filterStatus === 'published' && a.status === 'published')
      || (filterStatus === 'scheduled' && scheduled)
      || (filterStatus === 'draft' && a.status === 'draft' && !scheduled)
    return matchSearch && matchStatus
  })

  const scheduledOverview = useMemo(() => {
    const groups = articles
      .filter(isScheduledArticle)
      .sort((left, right) => new Date(left.scheduled_at).getTime() - new Date(right.scheduled_at).getTime())
      .reduce((acc, article) => {
        const dayKey = new Date(article.scheduled_at).toISOString().slice(0, 10)
        const current = acc.get(dayKey) || { dayKey, items: [] }
        current.items.push(article)
        acc.set(dayKey, current)
        return acc
      }, new Map())

    return Array.from(groups.values()).slice(0, 6)
  }, [articles])

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-black">Articoli</h1>
          <p className="text-sm text-gray-500 mt-1">{articles.length} articoli totali</p>
        </div>
        <Link
          to="/admin/articoli/nuovo"
          className="inline-flex w-full items-center justify-center gap-2 bg-juve-gold px-5 py-2.5 text-sm font-black uppercase tracking-wider text-black transition-colors hover:bg-juve-gold-dark sm:w-auto"
        >
          <PlusCircle className="h-4 w-4" />
          Nuovo
        </Link>
      </div>

      {/* Filters */}
      <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="relative w-full lg:w-auto">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Cerca articolo..."
            className="w-full border border-gray-300 py-2 pl-9 pr-4 text-sm focus:border-juve-black focus:outline-none lg:w-60"
          />
        </div>
        <div className="overflow-x-auto">
          <div className="flex min-w-max items-center gap-1 border border-gray-300">
          {['all', 'published', 'scheduled', 'draft'].map(s => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={`px-4 py-2 text-xs font-bold uppercase tracking-wider transition-colors ${
                filterStatus === s ? 'bg-juve-black text-white' : 'hover:bg-gray-100'
              }`}
            >
              {s === 'all' ? 'Tutti' : s === 'published' ? 'Pubblicati' : s === 'scheduled' ? 'Programmati' : 'Bozze'}
            </button>
          ))}
          </div>
        </div>
      </div>

      {scheduledOverview.length > 0 && (
        <div className="mb-6 border border-blue-200 bg-blue-50 p-5">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-sm font-black uppercase tracking-wider text-blue-900">Calendario pubblicazioni</h2>
              <p className="mt-1 text-xs text-blue-800">Prossime uscite programmate nei prossimi slot editoriali.</p>
            </div>
            <p className="text-xs font-bold uppercase tracking-wider text-blue-700">{articles.filter(isScheduledArticle).length} programmati</p>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3 xl:grid-cols-3">
            {scheduledOverview.map((group) => (
              <div key={group.dayKey} className="border border-blue-100 bg-white p-4">
                <p className="text-xs font-black uppercase tracking-wider text-blue-700">{formatDateShort(group.dayKey)}</p>
                <div className="mt-3 space-y-3">
                  {group.items.map((article) => (
                    <div key={article.id} className="border-l-2 border-juve-gold pl-3">
                      <p className="line-clamp-2 text-sm font-bold text-juve-black">{article.title}</p>
                      <p className="mt-1 text-xs text-gray-500">{new Date(article.scheduled_at).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })} · {article.categories?.name || 'Senza categoria'}</p>
                      <Link to={`/admin/articoli/${article.id}/modifica`} className="mt-2 inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-blue-700 hover:underline">
                        Modifica slot
                      </Link>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Table */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-juve-gold" />
        </div>
      ) : (
        <div className="bg-white border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-4 py-3 text-xs font-black uppercase tracking-wider text-gray-500">Titolo</th>
                  <th className="text-left px-4 py-3 text-xs font-black uppercase tracking-wider text-gray-500 hidden md:table-cell">Categoria</th>
                  <th className="text-left px-4 py-3 text-xs font-black uppercase tracking-wider text-gray-500">Stato</th>
                  <th className="text-left px-4 py-3 text-xs font-black uppercase tracking-wider text-gray-500 hidden lg:table-cell">Data</th>
                  <th className="text-right px-4 py-3 text-xs font-black uppercase tracking-wider text-gray-500 hidden lg:table-cell">Views</th>
                  <th className="w-24 px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                <AnimatePresence>
                  {filtered.map((article, i) => (
                    (() => {
                      const scheduled = isScheduledArticle(article)
                      const statusClasses = article.status === 'published'
                        ? 'bg-green-100 text-green-700'
                        : scheduled
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-amber-100 text-amber-700'
                      const statusLabel = article.status === 'published'
                        ? 'Pubblicato'
                        : scheduled
                          ? 'Programmato'
                          : 'Bozza'
                      const articleDate = scheduled
                        ? article.scheduled_at
                        : (article.published_at || article.created_at)

                      return (
                    <motion.tr
                      key={article.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ delay: i * 0.02 }}
                      className="hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {article.featured && <Star className="h-3.5 w-3.5 text-juve-gold shrink-0" />}
                          <span className="font-medium text-juve-black line-clamp-1">{article.title}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        {article.categories && (
                          <span
                            className="text-xs font-bold uppercase tracking-wider"
                            style={{ color: article.categories.color || '#F5A623' }}
                          >
                            {article.categories.name}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 font-bold uppercase tracking-wider ${statusClasses}`}>
                          {statusLabel}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500 hidden lg:table-cell">
                        {formatDateShort(articleDate)}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-400 text-right hidden lg:table-cell">
                        {article.views ? formatViews(article.views) : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          {article.status === 'published' && (
                            <a
                              href={`/articolo/${article.slug}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1.5 hover:bg-gray-200 transition-colors text-gray-400 hover:text-juve-black"
                              title="Visualizza"
                            >
                              <Eye className="h-4 w-4" />
                            </a>
                          )}
                          <Link
                            to={`/admin/articoli/${article.id}/modifica`}
                            className="p-1.5 hover:bg-gray-200 transition-colors text-gray-400 hover:text-juve-black"
                            title="Modifica"
                          >
                            <Edit className="h-4 w-4" />
                          </Link>
                          <button
                            onClick={() => setDeleteId(article.id)}
                            className="p-1.5 hover:bg-red-100 transition-colors text-gray-400 hover:text-red-600"
                            title="Elimina"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                      )
                    })()
                  ))}
                </AnimatePresence>
              </tbody>
            </table>

            {filtered.length === 0 && (
              <div className="text-center py-16 text-gray-400">
                <p className="font-display text-lg">Nessun articolo trovato</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Delete confirm dialog */}
      <Dialog open={!!deleteId} onClose={() => setDeleteId(null)}>
        <DialogHeader onClose={() => setDeleteId(null)}>
          <DialogTitle>Elimina articolo</DialogTitle>
        </DialogHeader>
        <DialogContent>
          <p className="text-gray-600 text-sm">
            Sei sicuro di voler eliminare questo articolo? Questa operazione è irreversibile.
          </p>
        </DialogContent>
        <DialogFooter>
          <button
            onClick={() => setDeleteId(null)}
            className="px-4 py-2 border border-gray-300 text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            Annulla
          </button>
          <button
            onClick={() => deleteMutation.mutate(deleteId)}
            disabled={deleteMutation.isPending}
            className="px-4 py-2 bg-red-600 text-white text-sm font-bold hover:bg-red-700 transition-colors disabled:opacity-60 flex items-center gap-2"
          >
            {deleteMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Elimina
          </button>
        </DialogFooter>
      </Dialog>
    </div>
  )
}
