import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Edit, Trash2, Loader2, Tag } from 'lucide-react'
import { getCategories, createCategory, updateCategory, deleteCategory } from '@/lib/supabase'
import { usePersistentAdminState } from '@/hooks/usePersistentAdminState'
import { slugify } from '@/lib/utils'
import { Dialog, DialogHeader, DialogTitle, DialogContent, DialogFooter } from '@/components/ui/Dialog'
import { useToast } from '@/hooks/useToast'

const COLORS = [
  '#F5A623', '#E02424', '#1a56db', '#057a55',
  '#7e3af2', '#ff5a1f', '#0e9f6e', '#3f83f8',
  '#000000', '#6b7280',
]

export default function Categories() {
  const [modal, setModal] = useState(null) // null | 'new' | { edit: category }
  const [form, setForm, clearFormDraft] = usePersistentAdminState('categories-form', { name: '', slug: '', color: '#F5A623' })
  const [deleteTarget, setDeleteTarget] = useState(null)
  const { toast } = useToast()
  const qc = useQueryClient()

  const { data: categories = [], isLoading } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const { data } = await getCategories()
      return data || []
    },
  })

  const openNew = () => {
    setForm({ name: '', slug: '', color: '#F5A623' })
    clearFormDraft()
    setModal('new')
  }

  const openEdit = (cat) => {
    setForm({ name: cat.name, slug: cat.slug, color: cat.color || '#F5A623' })
    setModal({ edit: cat })
  }

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (modal?.edit) return updateCategory(modal.edit.id, form)
      return createCategory(form)
    },
    onSuccess: () => {
      qc.invalidateQueries(['categories'])
      toast({ title: modal?.edit ? 'Categoria aggiornata' : 'Categoria creata', variant: 'success' })
      setModal(null)
      setForm({ name: '', slug: '', color: '#F5A623' })
      clearFormDraft()
    },
    onError: () => toast({ title: 'Errore nel salvataggio', variant: 'destructive' }),
  })

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      const { error } = await deleteCategory(id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries(['categories'])
      toast({ title: 'Categoria eliminata', variant: 'success' })
      setDeleteTarget(null)
    },
    onError: (err) => toast({ title: 'Errore durante l\'eliminazione', description: err.message, variant: 'destructive' }),
  })

  const handleFormChange = (field, value) => {
    setForm(prev => {
      const next = { ...prev, [field]: value }
      if (field === 'name' && !modal?.edit) next.slug = slugify(value)
      return next
    })
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl font-black">Categorie</h1>
          <p className="text-sm text-gray-500 mt-1">{categories.length} categorie</p>
        </div>
        <button
          onClick={openNew}
          className="flex items-center gap-2 bg-juve-gold text-black px-5 py-2.5 text-sm font-black uppercase tracking-wider hover:bg-juve-gold-dark transition-colors"
        >
          <Plus className="h-4 w-4" />
          Nuova categoria
        </button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-juve-gold" />
        </div>
      ) : (
        <div className="bg-white border border-gray-200">
          {categories.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <Tag className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p className="font-display text-lg">Nessuna categoria</p>
              <p className="text-sm mt-1">Crea la prima categoria del magazine</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              <AnimatePresence>
                {categories.map((cat, i) => (
                  <motion.div
                    key={cat.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ delay: i * 0.04 }}
                    className="flex items-center gap-4 px-6 py-4 hover:bg-gray-50 transition-colors"
                  >
                    <div
                      className="w-4 h-4 rounded-sm shrink-0"
                      style={{ backgroundColor: cat.color || '#F5A623' }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-juve-black">{cat.name}</p>
                      <p className="text-xs text-gray-400 font-mono mt-0.5">/categoria/{cat.slug}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => openEdit(cat)}
                        className="p-1.5 hover:bg-gray-200 transition-colors text-gray-400 hover:text-juve-black"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setDeleteTarget(cat)}
                        className="p-1.5 hover:bg-red-100 transition-colors text-gray-400 hover:text-red-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      )}

      {/* Create/edit modal */}
      <Dialog open={!!modal} onClose={() => setModal(null)}>
        <DialogHeader onClose={() => setModal(null)}>
          <DialogTitle>{modal?.edit ? 'Modifica Categoria' : 'Nuova Categoria'}</DialogTitle>
        </DialogHeader>
        <DialogContent className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">Nome</label>
            <input
              value={form.name}
              onChange={e => handleFormChange('name', e.target.value)}
              placeholder="es. Mercato"
              className="w-full border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:border-juve-black"
            />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">Slug</label>
            <input
              value={form.slug}
              onChange={e => handleFormChange('slug', e.target.value)}
              placeholder="es. mercato"
              className="w-full border border-gray-300 px-3 py-2 text-sm font-mono focus:outline-none focus:border-juve-black"
            />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">Colore</label>
            <div className="flex flex-wrap gap-2">
              {COLORS.map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => handleFormChange('color', c)}
                  className="w-7 h-7 border-2 transition-transform hover:scale-110"
                  style={{
                    backgroundColor: c,
                    borderColor: form.color === c ? '#000' : 'transparent',
                  }}
                />
              ))}
              <input
                type="color"
                value={form.color}
                onChange={e => handleFormChange('color', e.target.value)}
                className="w-7 h-7 cursor-pointer border border-gray-300 p-0.5"
                title="Colore personalizzato"
              />
            </div>
          </div>
        </DialogContent>
        <DialogFooter>
          <button
            onClick={() => setModal(null)}
            className="px-4 py-2 border border-gray-300 text-sm font-medium hover:bg-gray-50"
          >
            Annulla
          </button>
          <button
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending || !form.name || !form.slug}
            className="px-5 py-2 bg-juve-gold text-black text-sm font-black uppercase tracking-wider hover:bg-juve-gold-dark disabled:opacity-60 flex items-center gap-2"
          >
            {saveMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Salva
          </button>
        </DialogFooter>
      </Dialog>

      {/* Delete confirm */}
      <Dialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)}>
        <DialogHeader onClose={() => setDeleteTarget(null)}>
          <DialogTitle>Elimina categoria</DialogTitle>
        </DialogHeader>
        <DialogContent>
          <p className="text-gray-600 text-sm">
            Eliminare la categoria <strong>"{deleteTarget?.name}"</strong>? Gli articoli associati perderanno la categoria.
          </p>
        </DialogContent>
        <DialogFooter>
          <button onClick={() => setDeleteTarget(null)} className="px-4 py-2 border border-gray-300 text-sm font-medium">
            Annulla
          </button>
          <button
            onClick={() => deleteMutation.mutate(deleteTarget.id)}
            disabled={deleteMutation.isPending}
            className="px-4 py-2 bg-red-600 text-white text-sm font-bold hover:bg-red-700 disabled:opacity-60 flex items-center gap-2"
          >
            {deleteMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Elimina
          </button>
        </DialogFooter>
      </Dialog>
    </div>
  )
}
