import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Star, Users, ChevronRight, Loader2, Trophy } from 'lucide-react'
import { getPagelleMatches, getPagelleMatchById, getPagelleRatings, submitPagellaRating } from '@/lib/supabase'
import { useReader } from '@/hooks/useReader'
import SEO from '@/components/blog/SEO'

function RatingStars({ value, onChange, disabled }) {
  const [hover, setHover] = useState(0)

  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((star) => (
        <button
          key={star}
          disabled={disabled}
          onMouseEnter={() => !disabled && setHover(star)}
          onMouseLeave={() => setHover(0)}
          onClick={() => onChange?.(star)}
          className={`p-0.5 transition-colors ${disabled ? 'cursor-default' : 'cursor-pointer'}`}
        >
          <Star
            className={`h-4 w-4 ${
              star <= (hover || value)
                ? 'text-juve-gold fill-juve-gold'
                : 'text-gray-300'
            }`}
          />
        </button>
      ))}
    </div>
  )
}

function RatingBadge({ rating }) {
  if (!rating) return <span className="text-xs text-gray-400">—</span>
  const color = rating >= 7 ? 'bg-green-600' : rating >= 6 ? 'bg-juve-gold' : rating >= 5 ? 'bg-orange-500' : 'bg-red-600'
  return (
    <span className={`inline-flex items-center justify-center h-8 w-8 ${color} text-white text-sm font-black`}>
      {rating}
    </span>
  )
}

function PlayerRatingRow({ player, onRate, userRating, disabled }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      className="flex items-center gap-3 py-3 px-4 border-b border-gray-100 last:border-0"
    >
      <div className="w-8 text-center">
        <span className="text-xs font-bold text-gray-400">{player.player_number || '—'}</span>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-juve-black truncate">{player.player_name}</span>
          <span className="text-[10px] uppercase tracking-wider text-gray-400 font-bold">{player.position}</span>
          {!player.is_starter && (
            <span className="text-[9px] bg-gray-200 text-gray-500 px-1.5 py-0.5 font-bold uppercase tracking-wider">Sub</span>
          )}
        </div>
        <div className="mt-1">
          <RatingStars value={userRating} onChange={onRate} disabled={disabled} />
        </div>
      </div>
      <div className="flex flex-col items-center gap-0.5 shrink-0">
        <RatingBadge rating={player.avgRating} />
        <span className="text-[9px] text-gray-400 font-medium">{player.totalVotes} voti</span>
      </div>
    </motion.div>
  )
}

function MatchPagelle({ matchId }) {
  const { reader } = useReader()
  const queryClient = useQueryClient()
  const [userRatings, setUserRatings] = useState({})

  const { data: match } = useQuery({
    queryKey: ['pagelle-match', matchId],
    queryFn: async () => {
      const { data } = await getPagelleMatchById(matchId)
      return data
    },
  })

  const { data: players, isLoading } = useQuery({
    queryKey: ['pagelle-ratings', matchId],
    queryFn: async () => {
      const { data } = await getPagelleRatings(matchId)
      return data || []
    },
  })

  const rateMutation = useMutation({
    mutationFn: ({ playerId, rating }) => submitPagellaRating({
      playerId,
      userId: reader?.id,
      guestId: !reader?.id ? `guest-${Date.now()}` : null,
      rating,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pagelle-ratings', matchId] })
    },
  })

  const handleRate = (playerId, rating) => {
    setUserRatings(prev => ({ ...prev, [playerId]: rating }))
    rateMutation.mutate({ playerId, rating })
  }

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-juve-gold mx-auto" />
      </div>
    )
  }

  const starters = (players || []).filter(p => p.is_starter)
  const subs = (players || []).filter(p => !p.is_starter)

  return (
    <div>
      {match && (
        <div className="bg-juve-black text-white p-4 mb-4 text-center">
          <span className="text-[10px] uppercase tracking-widest text-juve-gold font-bold">{match.competition}</span>
          <div className="font-display text-xl font-black mt-1">
            {match.home_team} {match.home_score != null ? `${match.home_score} - ${match.away_score}` : 'vs'} {match.away_team}
          </div>
          <span className="text-xs text-gray-400">
            {new Date(match.match_date).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })}
          </span>
        </div>
      )}

      {starters.length > 0 && (
        <div className="bg-white border border-gray-200 mb-4">
          <div className="px-4 py-2 border-b border-gray-200 bg-gray-50">
            <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">Titolari</span>
          </div>
          {starters.map(player => (
            <PlayerRatingRow
              key={player.id}
              player={player}
              userRating={userRatings[player.id]}
              onRate={(r) => handleRate(player.id, r)}
              disabled={rateMutation.isPending}
            />
          ))}
        </div>
      )}

      {subs.length > 0 && (
        <div className="bg-white border border-gray-200">
          <div className="px-4 py-2 border-b border-gray-200 bg-gray-50">
            <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">Subentrati</span>
          </div>
          {subs.map(player => (
            <PlayerRatingRow
              key={player.id}
              player={player}
              userRating={userRatings[player.id]}
              onRate={(r) => handleRate(player.id, r)}
              disabled={rateMutation.isPending}
            />
          ))}
        </div>
      )}

      {(!players || players.length === 0) && (
        <div className="text-center py-12">
          <Star className="h-10 w-10 text-gray-300 mx-auto mb-4" />
          <p className="text-sm text-gray-500">Nessun giocatore inserito per questa partita.</p>
        </div>
      )}
    </div>
  )
}

export default function Pagelle() {
  const [selectedMatch, setSelectedMatch] = useState(null)

  const { data: matches, isLoading } = useQuery({
    queryKey: ['pagelle-matches'],
    queryFn: async () => {
      const { data } = await getPagelleMatches()
      return data || []
    },
  })

  return (
    <>
      <SEO title="Pagelle Post-Partita" description="Dai i tuoi voti ai giocatori della Juventus dopo ogni partita. Le pagelle dei tifosi bianconeri." url="/community/pagelle" />

      <section className="bg-juve-black text-white py-10 md:py-14">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <div className="flex items-center justify-center gap-2 mb-3">
              <Trophy className="h-4 w-4 text-juve-gold" />
              <span className="text-xs font-black uppercase tracking-widest text-juve-gold">Community</span>
            </div>
            <h1 className="font-display text-3xl sm:text-4xl md:text-5xl font-black leading-tight mb-2">
              PAGELLE
            </h1>
            <p className="text-sm text-gray-400 max-w-lg mx-auto">
              Vota i giocatori della Juventus dopo ogni partita. Le pagelle restano pubbliche: puoi lasciare i tuoi voti anche senza registrazione.
            </p>
          </motion.div>
        </div>
      </section>

      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-6 border border-juve-gold/30 bg-juve-gold/10 p-4 text-sm text-gray-700">
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-juve-gold">Accesso</p>
          <p className="mt-2 leading-relaxed">
            Questa sezione e pubblica come i sondaggi. Il login serve invece per entrare nel forum e usare le funzioni sincronizzate dell&apos;Area Bianconera.
          </p>
        </div>

        {selectedMatch ? (
          <div>
            <button
              onClick={() => setSelectedMatch(null)}
              className="text-xs font-bold uppercase tracking-widest text-juve-gold hover:text-juve-gold-dark mb-4 inline-flex items-center gap-1"
            >
              ← Tutte le partite
            </button>
            <MatchPagelle matchId={selectedMatch} />
          </div>
        ) : (
          <>
            {isLoading && (
              <div className="text-center py-16">
                <Loader2 className="h-6 w-6 animate-spin text-juve-gold mx-auto mb-3" />
                <p className="text-sm text-gray-500">Caricamento partite...</p>
              </div>
            )}

            {!isLoading && (!matches || matches.length === 0) && (
              <div className="text-center py-16">
                <Trophy className="h-10 w-10 text-gray-300 mx-auto mb-4" />
                <p className="text-sm text-gray-500 mb-1">Nessuna pagella disponibile.</p>
                <p className="text-[10px] text-gray-400">Le pagelle vengono attivate dopo ogni partita.</p>
              </div>
            )}

            {matches && matches.length > 0 && (
              <div className="space-y-3">
                {matches.map((match) => (
                  <motion.button
                    key={match.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    onClick={() => setSelectedMatch(match.id)}
                    className="w-full bg-white border border-gray-200 p-4 text-left hover:border-juve-gold transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-widest text-juve-gold mb-1 block">{match.competition}</span>
                        <div className="font-display text-lg font-black text-juve-black">
                          {match.home_team} {match.home_score != null ? `${match.home_score} - ${match.away_score}` : 'vs'} {match.away_team}
                        </div>
                        <span className="text-xs text-gray-400">
                          {new Date(match.match_date).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })}
                        </span>
                      </div>
                      <ChevronRight className="h-5 w-5 text-gray-400" />
                    </div>
                  </motion.button>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </>
  )
}
