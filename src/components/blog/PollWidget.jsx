import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Vote, Check, ArrowRight } from 'lucide-react'
import { getLatestArticlePoll, voteArticlePoll } from '@/lib/supabase'
import { useReader } from '@/hooks/useReader'
import { cn } from '@/lib/utils'

export default function PollWidget() {
  const qc = useQueryClient()
  const { reader, openLogin } = useReader()

  const { data: poll, isLoading } = useQuery({
    queryKey: ['sidebar-article-poll', reader?.id || null],
    queryFn: async () => {
      const { data, error } = await getLatestArticlePoll(reader?.id || null)
      if (error) throw error
      return data
    },
    staleTime: 30000,
    refetchOnWindowFocus: false,
  })

  const voteMutation = useMutation({
    mutationFn: async (optionId) => {
      if (!reader?.id) throw new Error('login-required')

      const { error } = await voteArticlePoll({
        pollId: poll.id,
        optionId,
        userId: reader.id,
      })

      if (error) throw error
      return true
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sidebar-article-poll'] })
    },
  })

  const options = useMemo(() => {
    if (!poll?.options) return []

    return poll.options.map((option) => ({
      ...option,
      percentage: poll.totalVotes > 0 ? Math.round((option.votes / poll.totalVotes) * 100) : 0,
    }))
  }, [poll])

  if (isLoading) {
    return (
      <div className="border border-gray-200">
        <div className="flex items-center gap-2 border-b-2 border-juve-black px-4 py-3">
          <Vote className="h-4 w-4 text-juve-gold" />
          <h3 className="text-xs font-black uppercase tracking-widest">Sondaggio</h3>
        </div>
        <div className="p-4">
          <p className="text-sm text-gray-500">Caricamento sondaggio del magazine...</p>
        </div>
      </div>
    )
  }

  if (!poll?.is_active || options.length < 2) return null

  const hasVoted = Boolean(poll.currentVote)

  const handleVote = async (optionId) => {
    if (!reader?.id) {
      openLogin('login')
      return
    }

    if (voteMutation.isPending || hasVoted) return
    await voteMutation.mutateAsync(optionId).catch(() => {})
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="border border-gray-200"
    >
      <div className="flex items-center gap-2 border-b-2 border-juve-black px-4 py-3">
        <Vote className="h-4 w-4 text-juve-gold" />
        <h3 className="text-xs font-black uppercase tracking-widest">Sondaggio</h3>
      </div>

      <div className="p-4">
        {poll.articleCategory?.name && (
          <p
            className="mb-2 text-[11px] font-black uppercase tracking-[0.24em]"
            style={{ color: poll.articleCategory.color || '#C7A14A' }}
          >
            {poll.articleCategory.name}
          </p>
        )}

        <Link
          to={`/articolo/${poll.articleSlug}`}
          className="group mb-4 block border-l-2 border-juve-gold pl-3"
        >
          <p className="line-clamp-2 font-display text-lg font-bold leading-tight text-juve-black transition-colors group-hover:text-juve-gold">
            {poll.articleTitle}
          </p>
          <div className="mt-2 flex items-center gap-1 text-[11px] font-bold uppercase tracking-widest text-gray-500 transition-colors group-hover:text-juve-black">
            <span>Apri l'articolo</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </div>
        </Link>

        <p className="mb-4 font-display text-sm font-bold text-juve-black">{poll.question}</p>

        <div className="space-y-2">
          {options.map((option) => {
            const isSelected = poll.currentVote === option.id

            return (
              <button
                key={option.id}
                type="button"
                onClick={() => handleVote(option.id)}
                disabled={voteMutation.isPending || hasVoted}
                className={cn(
                  'relative w-full overflow-hidden border text-left transition-all',
                  hasVoted ? 'cursor-default' : 'cursor-pointer hover:border-juve-gold',
                  isSelected ? 'border-juve-gold' : 'border-gray-200'
                )}
              >
                {hasVoted && (
                  <div
                    className="absolute inset-y-0 left-0"
                    style={{
                      width: `${option.percentage}%`,
                      backgroundColor: isSelected ? 'rgba(199,161,74,0.16)' : 'rgba(17,17,17,0.04)',
                    }}
                  />
                )}

                <div className="relative flex items-center justify-between gap-3 px-4 py-3">
                  <div className="flex items-center gap-2">
                    {isSelected && <Check className="h-4 w-4 text-juve-gold" />}
                    <span className={cn('text-sm', isSelected ? 'font-bold text-juve-black' : 'font-medium text-gray-700')}>
                      {option.label}
                    </span>
                  </div>

                  {hasVoted && (
                    <span className={cn('text-xs font-bold', isSelected ? 'text-juve-gold' : 'text-gray-500')}>
                      {option.percentage}%
                    </span>
                  )}
                </div>
              </button>
            )
          })}
        </div>

        <p className="mt-3 text-[11px] text-gray-500">
          {hasVoted
            ? `${poll.totalVotes} voti raccolti finora.`
            : 'Accedi ad Area Bianconera per votare e vedere il risultato della community.'}
        </p>
      </div>
    </motion.div>
  )
}
