import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Upload, X, Image as ImageIcon, Loader2 } from 'lucide-react'
import { uploadImage } from '@/lib/supabase'
import { cn } from '@/lib/utils'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/Dialog'

export default function ImageUpload({ value, onChange, className }) {
  const [dragging, setDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState(null)
  const [urlOpen, setUrlOpen] = useState(false)
  const [urlValue, setUrlValue] = useState('')
  const inputRef = useRef(null)

  const handleFile = async (file) => {
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setError('Seleziona un file immagine valido')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('Il file è troppo grande (max 5MB)')
      return
    }

    setError(null)
    setUploading(true)
    try {
      const path = `covers/${Date.now()}-${file.name.replace(/\s+/g, '-')}`
      const url = await uploadImage(file, path)
      onChange(url)
    } catch (err) {
      setError('Errore durante il caricamento. Riprova.')
    } finally {
      setUploading(false)
    }
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setDragging(false)
    handleFile(e.dataTransfer.files[0])
  }

  const handleUrlInput = () => {
    setUrlValue('')
    setUrlOpen(true)
  }

  const confirmUrlInput = () => {
    const url = urlValue.trim()
    if (!url) return
    onChange(url)
    setUrlOpen(false)
    setUrlValue('')
  }

  return (
    <>
      <div className={cn('space-y-2', className)}>
        {value ? (
          <div className="relative group">
            <img
              src={value}
              alt="Cover"
              className="w-full h-48 object-cover border border-gray-200"
            />
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className="bg-white text-juve-black px-3 py-1.5 text-xs font-bold uppercase tracking-wider hover:bg-juve-gold transition-colors"
              >
                Cambia
              </button>
              <button
                type="button"
                onClick={() => onChange('')}
                className="bg-red-600 text-white p-1.5 hover:bg-red-700 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        ) : (
          <div
            onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            onClick={() => inputRef.current?.click()}
            className={cn(
              'border-2 border-dashed p-8 text-center cursor-pointer transition-all',
              dragging ? 'border-juve-gold bg-amber-50' : 'border-gray-300 hover:border-juve-black',
            )}
          >
            <AnimatePresence mode="wait">
              {uploading ? (
                <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <Loader2 className="h-8 w-8 animate-spin text-juve-gold mx-auto" />
                  <p className="text-sm text-gray-500 mt-2">Caricamento in corso…</p>
                </motion.div>
              ) : (
                <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  {dragging
                    ? <Upload className="h-8 w-8 text-juve-gold mx-auto" />
                    : <ImageIcon className="h-8 w-8 text-gray-400 mx-auto" />
                  }
                  <p className="text-sm font-medium text-gray-600 mt-2">
                    Trascina un'immagine oppure <span className="text-juve-gold">clicca per caricare</span>
                  </p>
                  <p className="text-xs text-gray-400 mt-1">PNG, JPG, WebP — max 5MB</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {!value && (
          <button
            type="button"
            onClick={handleUrlInput}
            className="text-xs text-gray-500 hover:text-juve-gold transition-colors underline"
          >
            Oppure incolla un URL immagine
          </button>
        )}

        {error && <p className="text-xs text-red-600">{error}</p>}

        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => handleFile(e.target.files[0])}
        />
      </div>

      <Dialog open={urlOpen} onClose={() => setUrlOpen(false)}>
        <DialogHeader onClose={() => setUrlOpen(false)}>
          <DialogTitle>Inserisci immagine da URL</DialogTitle>
        </DialogHeader>
        <DialogContent className="space-y-3">
          <p className="text-sm text-gray-500">
            Incolla il link diretto dell’immagine che vuoi usare come copertina.
          </p>
          <input
            autoFocus
            type="url"
            value={urlValue}
            onChange={(event) => setUrlValue(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault()
                confirmUrlInput()
              }
            }}
            placeholder="https://..."
            className="w-full border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:border-juve-black"
          />
        </DialogContent>
        <DialogFooter>
          <button
            type="button"
            onClick={() => setUrlOpen(false)}
            className="border border-gray-300 px-4 py-2 text-sm font-medium hover:border-juve-black transition-colors"
          >
            Annulla
          </button>
          <button
            type="button"
            onClick={confirmUrlInput}
            disabled={!urlValue.trim()}
            className="bg-juve-black px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-juve-gold hover:text-black disabled:opacity-50"
          >
            Usa immagine
          </button>
        </DialogFooter>
      </Dialog>
    </>
  )
}
