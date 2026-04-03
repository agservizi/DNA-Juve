import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Vote, Check } from 'lucide-react'
import { cn } from '@/lib/utils'

const STORAGE_KEY = 'fb-poll'

// Demo poll
const POLL = {
  id: 'motm-derby-2026',
  question: 'Man of the Match — Derby della Mole',
  options: [
    { id: 'vlahovic',  label: 'Vlahovic',  votes: 342 },
    { id: 'yildiz',    label: 'Yildiz',    votes: 287 },
    { id: 'cambiaso',  label: 'Cambiaso',   votes: 156 },
    { id: 'locatelli', label: 'Locatelli', votes: 98 },
  ],
}

export default function PollWidget() {
  const [voted, setVoted] = useState(null)
  const [options, setOptions] = useState(POLL.options)

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        if (parsed.pollId === POLL.id) {
          setVoted(parsed.optionId)
          setOptions(parsed.options)
        }
      }
    } catch {}
  }, [])

  const totalVotes = options.reduce((sum, o) => sum + o.votes, 0)

  const handleVote = (optionId) => {
    if (voted) return
    const updated = options.map(o =>
      o.id === optionId ? { ...o, votes: o.votes + 1 } : o
    )
    setOptions(updated)
    setVoted(optionId)
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        pollId: POLL.id,
        optionId,
        options: updated,
      }))
    } catch {}
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="border border-gray-200"
    >
      <div className="flex items-center gap-2 px-4 py-3 border-b-2 border-juve-black">
        <Vote className="h-4 w-4 text-juve-gold" />
        <h3 className="text-xs font-black uppercase tracking-widest">Sondaggio</h3>
      </div>

      <div className="p-4">
        <p className="font-display text-sm font-bold mb-4">{POLL.question}</p>

        <div className="space-y-2">
          {options.map((option) => {
            const pct = totalVotes > 0 ? Math.round((option.votes / totalVotes) * 100) : 0
            const isSelected = voted === option.id

            return (
              <button
                key={option.id}
                onClick={() => handleVote(option.id)}
                disabled={!!voted}
                className={cn(
                  'w-full text-left relative overflow-hidden border transition-all',
                  voted
                    ? 'cursor-default'
                    : 'hover:border-juve-gold cursor-pointer',
                  isSelected
                    ? 'border-juve-gold'
                    : 'border-gray-200'
                )}
              >
                {/* Progress bar */}
                <AnimatePresence>
                  {voted && (
                    <motion.div
                      initial={{ scaleX: 0 }}
                      animate={{ scaleX: 1 }}
                      className="absolute inset-0 origin-left"
                      style={{
                        width: `${pct}%`,
                        backgroundColor: isSelected ? 'rgba(245,166,35,0.15)' : 'rgba(0,0,0,0.03)',
                      }}
                    />
                  )}
                </AnimatePresence>

                <div className="relative flex items-center justify-between px-3 py-2">
                  <div className="flex items-center gap-2">
                    {isSelected && <Check className="h-3.5 w-3.5 text-juve-gold" />}
                    <span className={cn('text-sm', isSelected ? 'font-bold' : 'font-medium')}>
                      {option.label}
                    </span>
                  </div>
                  {voted && (
                    <span className={cn(
                      'text-xs font-bold',
                      isSelected ? 'text-juve-gold' : 'text-gray-400'
                    )}>
                      {pct}%
                    </span>
                  )}
                </div>
              </button>
            )
          })}
        </div>

        <p className="text-[10px] text-gray-400 mt-3 text-right">
          {totalVotes + (voted ? 0 : 0)} voti totali
        </p>
      </div>
    </motion.div>
  )
}
