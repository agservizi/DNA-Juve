import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { addXP, XP_ACTIONS, updateWeeklyProgress } from '@/lib/gamification'
import { getArticleReactions, upsertArticleReaction, deleteArticleReaction } from '@/lib/supabase'
import { useReader } from '@/hooks/useReader'

const REACTIONS = [
  { emoji: '🔥', label: 'Fuoco' },
  { emoji: '👏', label: 'Applauso' },
  { emoji: '❤️', label: 'Cuore' },
  { emoji: '😮', label: 'Wow' },
  { emoji: '😂', label: 'Divertente' },
]

const LS_KEY = 'fb-reactions'

function loadReactions() {
  try { return JSON.parse(localStorage.getItem(LS_KEY)) || {} } catch { return {} }
}
function saveReactions(data) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(data)) } catch {}
}

export default function ArticleReactions({ articleId }) {
  const { authUser, isAuthenticated, openLogin } = useReader()
  const [counts, setCounts] = useState({})
  const [userReaction, setUserReaction] = useState(null)
  const [storageMode, setStorageMode] = useState('remote')
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    let active = true

    const loadReactionState = async () => {
      const { data, error } = await getArticleReactions(articleId, { userId: authUser?.id || null })

      if (!active) return

      if (!error && data?.source === 'remote') {
        setCounts(data.counts || {})
        setUserReaction(data.userReaction || null)
        setStorageMode('remote')
        return
      }

      const all = loadReactions()
      const article = all[articleId] || {}
      setCounts(article.counts || {})
      setUserReaction(article.userReaction || null)
      setStorageMode('local')
    }

    loadReactionState()

    return () => {
      active = false
    }
  }, [articleId, authUser?.id])

  const handleReact = useCallback(async (emoji) => {
    if (storageMode === 'remote') {
      if (!isAuthenticated || !authUser?.id) {
        openLogin('login')
        return
      }

      setIsSubmitting(true)

      const prevReaction = userReaction
      const result = prevReaction === emoji
        ? await deleteArticleReaction({ articleId, userId: authUser.id })
        : await upsertArticleReaction({ articleId, userId: authUser.id, emoji })

      if (result.error) {
        setIsSubmitting(false)
        return
      }

      if (prevReaction !== emoji) {
        addXP(XP_ACTIONS.reaction, 'reaction')
        updateWeeklyProgress('reactions')
      }

      const refreshed = await getArticleReactions(articleId, { userId: authUser.id })
      if (!refreshed.error && refreshed.data) {
        setCounts(refreshed.data.counts || {})
        setUserReaction(refreshed.data.userReaction || null)
        setStorageMode(refreshed.data.source || 'remote')
      }

      setIsSubmitting(false)
      return
    }

    const all = loadReactions()
    const article = all[articleId] || { counts: {}, userReaction: null }
    const prevReaction = article.userReaction

    if (prevReaction === emoji) {
      // Remove reaction
      article.counts[emoji] = Math.max(0, (article.counts[emoji] || 1) - 1)
      if (article.counts[emoji] === 0) delete article.counts[emoji]
      article.userReaction = null
    } else {
      // Remove previous
      if (prevReaction) {
        article.counts[prevReaction] = Math.max(0, (article.counts[prevReaction] || 1) - 1)
        if (article.counts[prevReaction] === 0) delete article.counts[prevReaction]
      }
      // Add new
      article.counts[emoji] = (article.counts[emoji] || 0) + 1
      article.userReaction = emoji
      // Award XP + weekly progress for new reaction
      addXP(XP_ACTIONS.reaction, 'reaction')
      updateWeeklyProgress('reactions')
    }

    all[articleId] = article
    saveReactions(all)
    setCounts({ ...article.counts })
    setUserReaction(article.userReaction)
  }, [articleId, authUser?.id, isAuthenticated, openLogin, storageMode, userReaction])

  const total = Object.values(counts).reduce((s, v) => s + v, 0)

  return (
    <div className="flex flex-wrap items-center gap-2">
      {REACTIONS.map(({ emoji, label }) => {
        const count = counts[emoji] || 0
        const isActive = userReaction === emoji
        return (
          <motion.button
            key={emoji}
            whileTap={{ scale: 0.9 }}
            onClick={() => handleReact(emoji)}
            disabled={isSubmitting}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 border-2 text-sm transition-all ${
              isActive
                ? 'border-juve-gold bg-juve-gold/10'
                : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
            }`}
            aria-label={label}
          >
            <span className="text-base">{emoji}</span>
            <AnimatePresence mode="wait">
              {count > 0 && (
                <motion.span
                  key={count}
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 5 }}
                  className={`text-xs font-bold ${isActive ? 'text-juve-gold' : 'text-gray-500'}`}
                >
                  {count}
                </motion.span>
              )}
            </AnimatePresence>
          </motion.button>
        )
      })}
      {total > 0 && (
        <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400 ml-1">
          {total} reazion{total === 1 ? 'e' : 'i'}
        </span>
      )}
      {storageMode === 'remote' && !isAuthenticated && (
        <button
          type="button"
          onClick={() => openLogin('login')}
          className="text-[10px] font-bold uppercase tracking-widest text-juve-gold ml-1"
        >
          Accedi per reagire
        </button>
      )}
    </div>
  )
}
