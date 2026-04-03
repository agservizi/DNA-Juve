import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { PlusCircle, Edit, Trash2, Eye, Search, Filter, Star, Loader2 } from 'lucide-react'
import { getAllArticles, deleteArticle } from '@/lib/supabase'
import { formatDateShort, formatViews } from '@/lib/utils'
import { Dialog, DialogHeader, DialogTitle, DialogContent, DialogFooter } from '@/components/ui/Dialog'
import { useToast } from '@/hooks/useToast'

export default function ArticleList() {
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [deleteId, setDeleteId] = useState(null)
  const { toast } = useToast()
  const qc = useQueryClient()

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
    const matchStatus = filterStatus === 'all' || a.status === filterStatus
    return matchSearch && matchStatus
  })

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl font-black">Articoli</h1>
          <p className="text-sm text-gray-500 mt-1">{articles.length} articoli totali</p>
        </div>
        <Link
          to="/admin/articoli/nuovo"
          className="flex items-center gap-2 bg-juve-gold text-black px-5 py-2.5 text-sm font-black uppercase tracking-wider hover:bg-juve-gold-dark transition-colors"
        >
          <PlusCircle className="h-4 w-4" />
          Nuovo
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Cerca articolo..."
            className="pl-9 pr-4 py-2 border border-gray-300 text-sm focus:outline-none focus:border-juve-black w-60"
          />
        </div>
        <div className="flex items-center gap-1 border border-gray-300">
          {['all', 'published', 'draft'].map(s => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={`px-4 py-2 text-xs font-bold uppercase tracking-wider transition-colors ${
                filterStatus === s ? 'bg-juve-black text-white' : 'hover:bg-gray-100'
              }`}
            >
              {s === 'all' ? 'Tutti' : s === 'published' ? 'Pubblicati' : 'Bozze'}
            </button>
          ))}
        </div>
      </div>

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
                        <span className={`text-xs px-2 py-0.5 font-bold uppercase tracking-wider ${
                          article.status === 'published'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-amber-100 text-amber-700'
                        }`}>
                          {article.status === 'published' ? 'Pubblicato' : 'Bozza'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500 hidden lg:table-cell">
                        {formatDateShort(article.published_at || article.created_at)}
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
