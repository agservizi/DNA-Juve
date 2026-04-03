import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Upload, X, Image as ImageIcon, Loader2 } from 'lucide-react'
import { uploadImage } from '@/lib/supabase'
import { cn } from '@/lib/utils'

export default function ImageUpload({ value, onChange, className }) {
  const [dragging, setDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState(null)
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
    const url = window.prompt('Inserisci URL immagine')
    if (url) onChange(url)
  }

  return (
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
  )
}
