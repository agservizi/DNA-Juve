import { motion, AnimatePresence } from 'framer-motion'
import { X, Clock, User } from 'lucide-react'
import { formatDate, readingTime } from '@/lib/utils'
import { sanitizeHtml } from '@/lib/sanitize'

export default function ArticlePreviewModal({ open, onClose, article }) {
  if (!article) return null

  const mins = readingTime(article.content)
  const today = new Date().toISOString()

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 z-50"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 30 }}
            className="fixed inset-4 md:inset-8 z-50 bg-white overflow-y-auto"
          >
            {/* Preview header */}
            <div className="sticky top-0 bg-juve-black text-white px-6 py-3 flex items-center justify-between z-10">
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold uppercase tracking-widest text-juve-gold">Anteprima articolo</span>
                <span className="text-xs text-gray-400">— così apparirà sul sito</span>
              </div>
              <button onClick={onClose} className="hover:text-juve-gold transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="max-w-4xl mx-auto px-4 py-10">
              {/* Category */}
              {article.categoryName && (
                <span
                  className="inline-block px-3 py-1 text-xs font-black uppercase tracking-widest text-black mb-4"
                  style={{ backgroundColor: article.categoryColor || '#F5A623' }}
                >
                  {article.categoryName}
                </span>
              )}

              {/* Title */}
              <h1 className="font-display text-4xl md:text-5xl font-black leading-tight text-juve-black mb-4">
                {article.title || 'Titolo articolo…'}
              </h1>

              {/* Excerpt */}
              {article.excerpt && (
                <p className="text-lg text-gray-600 leading-relaxed mb-6 font-light border-l-4 border-juve-gold pl-4">
                  {article.excerpt}
                </p>
              )}

              {/* Meta */}
              <div className="flex flex-wrap items-center gap-4 py-4 border-y border-gray-200 mb-6 text-sm text-gray-600">
                <span className="flex items-center gap-1.5">
                  <User className="h-4 w-4" />
                  Redazione
                </span>
                <span>{formatDate(today)}</span>
                <span className="flex items-center gap-1.5">
                  <Clock className="h-4 w-4" />
                  {mins} min di lettura
                </span>
              </div>

              {/* Cover image */}
              {article.cover_image && (
                <figure className="mb-8">
                  <img src={article.cover_image} alt={article.title} className="w-full max-h-[500px] object-cover" />
                </figure>
              )}

              {/* Content */}
              <div
                className="prose prose-lg max-w-none
                  prose-headings:font-display prose-headings:font-bold prose-headings:text-juve-black
                  prose-a:text-juve-gold prose-a:no-underline
                  prose-blockquote:border-juve-gold prose-blockquote:bg-gray-50
                  prose-strong:text-juve-black"
                dangerouslySetInnerHTML={{ __html: sanitizeHtml(article.content) || '<p class="text-gray-400 italic">Il contenuto dell\'articolo apparirà qui…</p>' }}
              />
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
