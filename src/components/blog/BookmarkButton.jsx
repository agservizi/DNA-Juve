import { motion } from 'framer-motion'
import { Bookmark, BookmarkCheck } from 'lucide-react'
import { useReader } from '@/hooks/useReader'

export default function BookmarkButton({ article, size = 'default', showLabel = false }) {
  const { reader, isBookmarked, toggleBookmark, openLogin } = useReader()
  const saved = isBookmarked(article.id)
  const Icon = saved ? BookmarkCheck : Bookmark
  const iconSize = size === 'sm' ? 'h-4 w-4' : 'h-5 w-5'

  const handleClick = (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (!reader) { openLogin(); return }
    toggleBookmark(article)
  }

  return (
    <motion.button
      whileTap={{ scale: 0.9 }}
      onClick={handleClick}
      className={`inline-flex items-center gap-1.5 transition-colors ${
        saved
          ? 'text-juve-gold'
          : 'text-gray-400 hover:text-juve-gold'
      } ${size === 'sm' ? 'p-1' : 'p-2 hover:bg-gray-100'}`}
      aria-label={saved ? 'Rimuovi dai segnalibri' : 'Salva nei segnalibri'}
    >
      <Icon className={iconSize} />
      {showLabel && (
        <span className="text-xs font-bold uppercase tracking-wider">
          {saved ? 'Salvato' : 'Salva'}
        </span>
      )}
    </motion.button>
  )
}
