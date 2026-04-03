import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles, ChevronDown, ChevronUp } from 'lucide-react'
import { stripHtml } from '@/lib/utils'

function generateSummary(htmlContent) {
  const text = stripHtml(htmlContent)
  const sentences = text
    .replace(/([.!?])\s+/g, '$1|')
    .split('|')
    .map(s => s.trim())
    .filter(s => s.length > 30)

  // Take first sentence + one from the middle + last meaningful one
  const picks = []
  if (sentences[0]) picks.push(sentences[0])
  const mid = Math.floor(sentences.length / 2)
  if (sentences[mid] && mid > 0) picks.push(sentences[mid])
  const last = sentences[sentences.length - 1]
  if (last && picks.indexOf(last) === -1 && sentences.length > 2) picks.push(last)

  return picks.join(' ')
}

export default function TldrSummary({ content }) {
  const [open, setOpen] = useState(false)
  const summary = generateSummary(content)

  if (!summary) return null

  return (
    <div className="mb-8">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-4 py-2.5 bg-juve-gold/10 border-2 border-juve-gold/30 hover:border-juve-gold transition-colors w-full text-left group"
      >
        <Sparkles className="h-4 w-4 text-juve-gold shrink-0" />
        <span className="text-xs font-black uppercase tracking-widest flex-1">TL;DR — Riassunto rapido</span>
        {open
          ? <ChevronUp className="h-4 w-4 text-gray-400 group-hover:text-juve-gold transition-colors" />
          : <ChevronDown className="h-4 w-4 text-gray-400 group-hover:text-juve-gold transition-colors" />
        }
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-juve-gold/5 border-2 border-juve-gold/30 border-t-0 px-4 py-3">
              <p className="text-sm leading-relaxed text-gray-700">{summary}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
