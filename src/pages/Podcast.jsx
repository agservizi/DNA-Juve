import { useState, useRef, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import { Play, Pause, SkipBack, SkipForward, Volume2, Headphones, Clock, Loader2, X } from 'lucide-react'
import { getPodcasts } from '@/lib/supabase'
import SEO from '@/components/blog/SEO'

function formatTime(seconds) {
  if (!seconds || !isFinite(seconds)) return '0:00'
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${String(s).padStart(2, '0')}`
}

function MiniPlayer({ episode, onClose }) {
  const audioRef = useRef(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)

  useEffect(() => {
    if (audioRef.current && episode?.audio_url) {
      audioRef.current.src = episode.audio_url
      audioRef.current.play().then(() => setIsPlaying(true)).catch(() => {})
    }
    return () => { if (audioRef.current) audioRef.current.pause() }
  }, [episode?.id])

  const togglePlay = () => {
    if (!audioRef.current) return
    if (isPlaying) { audioRef.current.pause(); setIsPlaying(false) }
    else { audioRef.current.play().then(() => setIsPlaying(true)).catch(() => {}) }
  }

  const seek = (e) => {
    if (!audioRef.current || !duration) return
    const rect = e.currentTarget.getBoundingClientRect()
    const pct = (e.clientX - rect.left) / rect.width
    audioRef.current.currentTime = pct * duration
  }

  if (!episode) return null

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-juve-black text-white border-t-2 border-juve-gold shadow-2xl">
      <audio
        ref={audioRef}
        onTimeUpdate={() => setCurrentTime(audioRef.current?.currentTime || 0)}
        onLoadedMetadata={() => setDuration(audioRef.current?.duration || 0)}
        onEnded={() => setIsPlaying(false)}
      />
      <div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-3">
        {episode.cover_image && (
          <div className="w-10 h-10 bg-gray-800 shrink-0 overflow-hidden hidden sm:block">
            <img src={episode.cover_image} alt="" className="w-full h-full object-cover" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold truncate">{episode.title}</p>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-[10px] text-gray-400 shrink-0 w-8">{formatTime(currentTime)}</span>
            <div className="flex-1 h-1 bg-gray-700 cursor-pointer" onClick={seek}>
              <div className="h-full bg-juve-gold" style={{ width: duration ? `${(currentTime / duration) * 100}%` : '0%' }} />
            </div>
            <span className="text-[10px] text-gray-400 shrink-0 w-8">{formatTime(duration)}</span>
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button onClick={togglePlay} className="p-2 hover:bg-white/10 transition-colors">
            {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
          </button>
          <button onClick={onClose} className="p-2 hover:bg-white/10 transition-colors">
            <X className="h-4 w-4 text-gray-400" />
          </button>
        </div>
      </div>
    </div>
  )
}

function EpisodeCard({ episode, onPlay, isActive }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-white border overflow-hidden ${isActive ? 'border-juve-gold' : 'border-gray-200'}`}
    >
      <div className="flex items-start gap-4 p-4">
        <div className="w-20 h-20 bg-gray-100 shrink-0 overflow-hidden">
          {episode.cover_image ? (
            <img src={episode.cover_image} alt="" className="w-full h-full object-cover" loading="lazy" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Headphones className="h-8 w-8 text-gray-300" />
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            {episode.episode_number && (
              <span className="text-[10px] font-bold uppercase tracking-widest text-juve-gold">EP. {episode.episode_number}</span>
            )}
            {episode.published_at && (
              <span className="text-[10px] text-gray-400">
                {new Date(episode.published_at).toLocaleDateString('it-IT', { day: 'numeric', month: 'short', year: 'numeric' })}
              </span>
            )}
          </div>
          <h3 className="font-display text-base font-black text-juve-black leading-tight line-clamp-2 mb-1">{episode.title}</h3>
          {episode.description && <p className="text-xs text-gray-500 line-clamp-2">{episode.description}</p>}
          <div className="flex items-center gap-3 mt-2">
            <button
              onClick={() => onPlay(episode)}
              className="inline-flex items-center gap-1.5 bg-juve-black text-white px-3 py-1 text-[10px] font-black uppercase tracking-widest hover:bg-juve-gold hover:text-juve-black transition-colors"
            >
              <Play className="h-3 w-3" /> Ascolta
            </button>
            {episode.duration > 0 && (
              <span className="text-[10px] text-gray-400 flex items-center gap-0.5">
                <Clock className="h-3 w-3" /> {formatTime(episode.duration)}
              </span>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  )
}

export default function Podcast() {
  const [activeEpisode, setActiveEpisode] = useState(null)

  const { data: episodes, isLoading } = useQuery({
    queryKey: ['podcasts'],
    queryFn: async () => { const { data } = await getPodcasts(); return data || [] },
  })

  return (
    <>
      <SEO title="Podcast" description="Ascolta il podcast bianconero: analisi, interviste e approfondimenti sulla Juventus." url="/podcast" />

      <section className="bg-juve-black text-white py-10 md:py-14">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <div className="flex items-center justify-center gap-2 mb-3">
              <Headphones className="h-4 w-4 text-juve-gold" />
              <span className="text-xs font-black uppercase tracking-widest text-juve-gold">Contenuti</span>
            </div>
            <h1 className="font-display text-3xl sm:text-4xl md:text-5xl font-black leading-tight mb-2">PODCAST</h1>
            <p className="text-sm text-gray-400 max-w-lg mx-auto">
              Analisi, interviste e approfondimenti bianconeri da ascoltare ovunque.
            </p>
          </motion.div>
        </div>
      </section>

      <div className={`max-w-4xl mx-auto px-4 py-8 ${activeEpisode ? 'pb-24' : ''}`}>
        {isLoading && (
          <div className="text-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-juve-gold mx-auto mb-3" />
            <p className="text-sm text-gray-500">Caricamento episodi...</p>
          </div>
        )}

        {!isLoading && (!episodes || episodes.length === 0) && (
          <div className="text-center py-16">
            <Headphones className="h-10 w-10 text-gray-300 mx-auto mb-4" />
            <p className="text-sm text-gray-500 mb-1">Nessun episodio disponibile.</p>
            <p className="text-[10px] text-gray-400">Il podcast è in arrivo! Resta sintonizzato.</p>
          </div>
        )}

        {episodes && episodes.length > 0 && (
          <div className="space-y-4">
            {episodes.map(ep => (
              <EpisodeCard key={ep.id} episode={ep} onPlay={setActiveEpisode} isActive={activeEpisode?.id === ep.id} />
            ))}
          </div>
        )}
      </div>

      {activeEpisode && <MiniPlayer episode={activeEpisode} onClose={() => setActiveEpisode(null)} />}
    </>
  )
}
