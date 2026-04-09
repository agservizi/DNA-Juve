import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { BarChart3, CheckCircle, Users, Clock, Loader2 } from 'lucide-react'
import { getCommunityPolls, getCommunityPollById, voteCommunityPoll } from '@/lib/supabase'
import { useReader } from '@/hooks/useReader'
import SEO from '@/components/blog/SEO'

function PollCard({ poll: pollSummary }) {
  const { reader } = useReader()
  const queryClient = useQueryClient()
  const [selectedOption, setSelectedOption] = useState(null)

  const { data: poll, isLoading } = useQuery({
    queryKey: ['community-poll', pollSummary.id],
    queryFn: async () => {
      const { data } = await getCommunityPollById(pollSummary.id, reader?.id)
      return data
    },
  })

  const voteMutation = useMutation({
    mutationFn: (optionId) => voteCommunityPoll({
      pollId: pollSummary.id,
      optionId,
      userId: reader?.id,
      guestId: !reader?.id ? `guest-${Date.now()}` : null,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['community-poll', pollSummary.id] })
    },
  })

  const hasVoted = poll?.currentVote || voteMutation.isSuccess
  const totalVotes = poll?.totalVotes || 0

  const handleVote = (optionId) => {
    if (hasVoted) return
    setSelectedOption(optionId)
    voteMutation.mutate(optionId)
  }

  if (isLoading) {
    return (
      <div className="bg-white border border-gray-200 p-6">
        <Loader2 className="h-5 w-5 animate-spin text-juve-gold mx-auto" />
      </div>
    )
  }

  if (!poll) return null

  const isExpired = poll.expires_at && new Date(poll.expires_at) < new Date()

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white border border-gray-200 overflow-hidden"
    >
      {poll.cover_image && (
        <div className="h-32 bg-gray-100 overflow-hidden">
          <img src={poll.cover_image} alt="" className="w-full h-full object-cover" />
        </div>
      )}
      <div className="p-5">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-[10px] font-bold uppercase tracking-widest text-juve-gold">{poll.category}</span>
          {isExpired && (
            <span className="text-[10px] font-bold uppercase tracking-widest text-red-500 flex items-center gap-1">
              <Clock className="h-3 w-3" /> Chiuso
            </span>
          )}
        </div>

        <h3 className="font-display text-lg font-black text-juve-black leading-tight mb-4">{poll.question}</h3>
        {poll.description && <p className="text-sm text-gray-500 mb-4">{poll.description}</p>}

        <div className="space-y-2">
          {(poll.options || []).map((option) => {
            const percentage = totalVotes > 0 ? Math.round((option.votes / totalVotes) * 100) : 0
            const isSelected = option.id === (poll.currentVote || selectedOption)

            return (
              <button
                key={option.id}
                onClick={() => handleVote(option.id)}
                disabled={hasVoted || isExpired || voteMutation.isPending}
                className={`relative w-full text-left p-3 border transition-all overflow-hidden ${
                  isSelected
                    ? 'border-juve-gold bg-juve-gold/5'
                    : hasVoted
                    ? 'border-gray-200 bg-gray-50'
                    : 'border-gray-200 hover:border-juve-gold hover:bg-gray-50 cursor-pointer'
                }`}
              >
                {hasVoted && (
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${percentage}%` }}
                    transition={{ duration: 0.6, ease: 'easeOut' }}
                    className={`absolute inset-y-0 left-0 ${isSelected ? 'bg-juve-gold/15' : 'bg-gray-100'}`}
                  />
                )}
                <div className="relative flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {isSelected && <CheckCircle className="h-4 w-4 text-juve-gold shrink-0" />}
                    <span className={`text-sm font-medium ${isSelected ? 'text-juve-black font-bold' : 'text-gray-700'}`}>
                      {option.label}
                    </span>
                  </div>
                  {hasVoted && (
                    <span className={`text-sm font-bold ${isSelected ? 'text-juve-gold' : 'text-gray-400'}`}>
                      {percentage}%
                    </span>
                  )}
                </div>
              </button>
            )
          })}
        </div>

        <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-100">
          <div className="flex items-center gap-1.5 text-gray-400">
            <Users className="h-3.5 w-3.5" />
            <span className="text-xs font-medium">{totalVotes} voti</span>
          </div>
          {poll.expires_at && !isExpired && (
            <span className="text-[10px] text-gray-400">
              Scade: {new Date(poll.expires_at).toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })}
            </span>
          )}
        </div>
      </div>
    </motion.div>
  )
}

export default function Sondaggi() {
  const { data: polls, isLoading } = useQuery({
    queryKey: ['community-polls'],
    queryFn: async () => {
      const { data } = await getCommunityPolls({ active: true })
      return data || []
    },
  })

  return (
    <>
      <SEO title="Sondaggi Live" description="Vota nei sondaggi della community bianconera. Chi dovrebbe giocare? Qual è il miglior acquisto?" url="/community/sondaggi" />

      <section className="bg-juve-black text-white py-10 md:py-14">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <div className="flex items-center justify-center gap-2 mb-3">
              <BarChart3 className="h-4 w-4 text-juve-gold" />
              <span className="text-xs font-black uppercase tracking-widest text-juve-gold">Community</span>
            </div>
            <h1 className="font-display text-3xl sm:text-4xl md:text-5xl font-black leading-tight mb-2">
              SONDAGGI LIVE
            </h1>
            <p className="text-sm text-gray-400 max-w-lg mx-auto">
              Esprimi la tua opinione. I sondaggi restano pubblici: puoi votare subito anche senza account e confrontarti con la community bianconera.
            </p>
          </motion.div>
        </div>
      </section>

      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-6 border border-juve-gold/30 bg-juve-gold/10 p-4 text-sm text-gray-700">
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-juve-gold">Accesso</p>
          <p className="mt-2 leading-relaxed">
            Sondaggi e pagelle sono aperti anche ai visitatori. La registrazione resta richiesta solo per il forum e per le funzioni personali di Area Bianconera.
          </p>
        </div>

        {isLoading && (
          <div className="text-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-juve-gold mx-auto mb-3" />
            <p className="text-sm text-gray-500">Caricamento sondaggi...</p>
          </div>
        )}

        {!isLoading && (!polls || polls.length === 0) && (
          <div className="text-center py-16">
            <BarChart3 className="h-10 w-10 text-gray-300 mx-auto mb-4" />
            <p className="text-sm text-gray-500 mb-1">Nessun sondaggio attivo al momento.</p>
            <p className="text-[10px] text-gray-400">I nuovi sondaggi verranno pubblicati presto!</p>
          </div>
        )}

        {polls && polls.length > 0 && (
          <div className="grid gap-6 md:grid-cols-2">
            {polls.map((poll) => (
              <PollCard key={poll.id} poll={poll} />
            ))}
          </div>
        )}
      </div>
    </>
  )
}
