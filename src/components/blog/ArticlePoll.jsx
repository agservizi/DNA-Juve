import { useMemo } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Vote, Check } from 'lucide-react'
import { getArticlePoll, voteArticlePoll } from '@/lib/supabase'
import { useReader } from '@/hooks/useReader'
import { cn } from '@/lib/utils'

export default function ArticlePoll({ articleId }) {
  const qc = useQueryClient()
  const { reader, openLogin } = useReader()

  const { data: poll, isLoading } = useQuery({
    queryKey: ['article-poll', articleId, reader?.id || null],
    queryFn: async () => {
      const { data, error } = await getArticlePoll(articleId, reader?.id || null)
      if (error) throw error
      return data
    },
    enabled: Boolean(articleId),
    staleTime: 30000,
  })

  const voteMutation = useMutation({
    mutationFn: async (optionId) => {
      if (!reader?.id) {
        throw new Error('login-required')
      }
      const { error } = await voteArticlePoll({
        pollId: poll.id,
        optionId,
        userId: reader.id,
      })
      if (error) throw error
      return true
    },
    onSuccess: () => {
      qc.invalidateQueries(['article-poll', articleId])
    },
  })

  const options = useMemo(() => {
    if (!poll?.options) return []
    return poll.options.map((option) => {
      const percentage = poll.totalVotes > 0
        ? Math.round((option.votes / poll.totalVotes) * 100)
        : 0

      return { ...option, percentage }
    })
  }, [poll])

  if (isLoading || !poll?.is_active || options.length < 2) return null

  const hasVoted = Boolean(poll.currentVote)

  const handleVote = async (optionId) => {
    if (!reader?.id) {
      openLogin('login')
      return
    }

    if (voteMutation.isPending) return
    await voteMutation.mutateAsync(optionId).catch(() => {})
  }

  return (
    <section className="mt-8 border-2 border-gray-200 bg-white">
      <div className="flex items-center gap-2 border-b-2 border-juve-black px-4 py-3">
        <Vote className="h-4 w-4 text-juve-gold" />
        <h2 className="text-xs font-black uppercase tracking-widest">Il Sondaggio Del Magazine</h2>
      </div>

      <div className="p-4">
        <p className="font-display text-xl font-bold text-juve-black mb-4">{poll.question}</p>

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
                  hasVoted ? 'cursor-default' : 'hover:border-juve-gold cursor-pointer',
                  isSelected ? 'border-juve-gold' : 'border-gray-200'
                )}
              >
                {hasVoted && (
                  <div
                    className="absolute inset-y-0 left-0"
                    style={{
                      width: `${option.percentage}%`,
                      backgroundColor: isSelected ? 'rgba(245,166,35,0.15)' : 'rgba(0,0,0,0.03)',
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
            ? `${poll.totalVotes} voti raccolti su questo articolo.`
            : 'Accedi ad Area Bianconera per votare e vedere i risultati.'}
        </p>
      </div>
    </section>
  )
}
