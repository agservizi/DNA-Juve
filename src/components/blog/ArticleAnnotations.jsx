import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { StickyNote, Trash2, Plus, X } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { useReader } from '@/hooks/useReader'
import { addXP, XP_ACTIONS } from '@/lib/gamification'

const LS_KEY = 'fb-annotations'

function loadAnnotations() {
  try { return JSON.parse(localStorage.getItem(LS_KEY)) || {} } catch { return {} }
}
function saveAnnotations(data) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(data)) } catch {}
}

export default function ArticleAnnotations({ articleId, articleTitle }) {
  const { reader } = useReader()
  const [annotations, setAnnotations] = useState([])
  const [isOpen, setIsOpen] = useState(false)
  const [newNote, setNewNote] = useState('')
  const [highlight, setHighlight] = useState('')

  useEffect(() => {
    const all = loadAnnotations()
    setAnnotations(all[articleId] || [])
  }, [articleId])

  const addAnnotation = useCallback(() => {
    if (!newNote.trim() && !highlight.trim()) return
    const entry = {
      id: Date.now().toString(),
      highlight: highlight.trim(),
      note: newNote.trim(),
      createdAt: new Date().toISOString(),
    }
    const all = loadAnnotations()
    const list = [...(all[articleId] || []), entry]
    all[articleId] = list
    saveAnnotations(all)
    setAnnotations(list)
    setNewNote('')
    setHighlight('')
    // Award XP for annotation
    addXP(XP_ACTIONS.annotation, 'annotation')
  }, [articleId, newNote, highlight])

  const removeAnnotation = useCallback((id) => {
    const all = loadAnnotations()
    const list = (all[articleId] || []).filter(a => a.id !== id)
    all[articleId] = list
    saveAnnotations(all)
    setAnnotations(list)
  }, [articleId])

  const captureSelection = useCallback(() => {
    const sel = window.getSelection()
    if (sel && sel.toString().trim()) {
      setHighlight(sel.toString().trim().slice(0, 300))
      setIsOpen(true)
    }
  }, [])

  if (!reader) return null

  return (
    <div className="mt-8 pt-6 border-t border-gray-200">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <StickyNote className="h-4 w-4 text-juve-gold" />
          <h3 className="text-xs font-black uppercase tracking-widest">Le tue note</h3>
          {annotations.length > 0 && (
            <span className="text-[10px] font-bold bg-juve-gold text-black px-1.5 py-0.5">{annotations.length}</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={captureSelection}
            className="text-[10px] font-bold uppercase tracking-wider text-gray-400 hover:text-juve-gold transition-colors"
          >
            Seleziona testo per evidenziare
          </button>
          <Button variant="ghost" size="sm" onClick={() => setIsOpen(!isOpen)}>
            {isOpen ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {/* Add form */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden mb-4"
          >
            <div className="border-2 border-gray-200 p-4 space-y-3">
              {highlight && (
                <div className="bg-juve-gold/10 border-l-4 border-juve-gold px-3 py-2">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-1">Testo evidenziato</p>
                  <p className="text-sm italic text-gray-700 line-clamp-3">"{highlight}"</p>
                </div>
              )}
              <textarea
                value={newNote}
                onChange={e => setNewNote(e.target.value)}
                placeholder="Scrivi una nota..."
                rows={3}
                className="w-full border-2 border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-juve-gold transition-colors resize-none"
              />
              <div className="flex gap-2 justify-end">
                <Button variant="ghost" size="sm" onClick={() => { setIsOpen(false); setHighlight(''); setNewNote('') }}>
                  Annulla
                </Button>
                <Button variant="gold" size="sm" onClick={addAnnotation}>
                  Salva nota
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Annotations list */}
      {annotations.length > 0 && (
        <div className="space-y-3">
          {annotations.map((ann) => (
            <motion.div
              key={ann.id}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              className="border-l-2 border-juve-gold pl-3 py-1 group"
            >
              {ann.highlight && (
                <p className="text-sm italic text-gray-500 mb-1 line-clamp-2">"{ann.highlight}"</p>
              )}
              {ann.note && (
                <p className="text-sm text-gray-700">{ann.note}</p>
              )}
              <div className="flex items-center justify-between mt-1">
                <span className="text-[10px] text-gray-400">
                  {new Date(ann.createdAt).toLocaleDateString('it-IT', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                </span>
                <button
                  onClick={() => removeAnnotation(ann.id)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-red-500"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}
