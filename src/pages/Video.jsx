import { useState, useRef } from 'react'
import { motion } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import { Play, Eye, Clock, Loader2, Film, X, Maximize, Volume2 } from 'lucide-react'
import { getVideos, incrementVideoViews } from '@/lib/supabase'
import SEO from '@/components/blog/SEO'

function getEmbedUrl(video) {
  if (video.platform === 'youtube' && video.video_id) return `https://www.youtube.com/embed/${video.video_id}?autoplay=1&rel=0`
  if (video.platform === 'dailymotion' && video.video_id) return `https://www.dailymotion.com/embed/video/${video.video_id}?autoplay=1`
  if (video.platform === 'vimeo' && video.video_id) return `https://player.vimeo.com/video/${video.video_id}?autoplay=1`
  return null // custom/upload → use native <video>
}

function isNativeVideo(video) {
  return video.platform === 'custom' || !getEmbedUrl(video)
}

function formatDuration(seconds) {
  if (!seconds) return ''
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

const VIDEO_CATEGORIES = [
  { value: 'highlights', label: 'Highlights' },
  { value: 'interviste', label: 'Interviste' },
  { value: 'analisi', label: 'Analisi' },
  { value: 'allenamenti', label: 'Allenamenti' },
]

function VideoCard({ video, onClick }) {
  const thumbnail = video.thumbnail || (video.platform === 'youtube' && video.video_id ? `https://img.youtube.com/vi/${video.video_id}/hqdefault.jpg` : null)

  return (
    <motion.button
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      onClick={onClick}
      className="w-full text-left bg-white border border-gray-200 overflow-hidden hover:border-juve-gold transition-colors group"
    >
      <div className="relative aspect-video bg-gray-100">
        {thumbnail ? (
          <img src={thumbnail} alt={video.title} className="w-full h-full object-cover" loading="lazy" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Film className="h-10 w-10 text-gray-300" />
          </div>
        )}
        <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <div className="w-12 h-12 bg-juve-gold flex items-center justify-center">
            <Play className="h-6 w-6 text-juve-black fill-current" />
          </div>
        </div>
        {video.duration > 0 && (
          <span className="absolute bottom-2 right-2 bg-black/80 text-white text-[10px] font-bold px-1.5 py-0.5">
            {formatDuration(video.duration)}
          </span>
        )}
      </div>
      <div className="p-3">
        <span className="text-[10px] font-bold uppercase tracking-widest text-juve-gold mb-1 block">{video.category}</span>
        <h3 className="font-display text-sm font-black text-juve-black leading-tight line-clamp-2 mb-1">{video.title}</h3>
        <div className="flex items-center gap-2 text-[10px] text-gray-400">
          <span className="flex items-center gap-0.5"><Eye className="h-3 w-3" />{video.views || 0}</span>
          {video.published_at && (
            <span>{new Date(video.published_at).toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })}</span>
          )}
        </div>
      </div>
    </motion.button>
  )
}

export default function Video() {
  const [activeCategory, setActiveCategory] = useState(null)
  const [activeVideo, setActiveVideo] = useState(null)

  const { data: videos, isLoading } = useQuery({
    queryKey: ['videos', activeCategory],
    queryFn: async () => {
      const { data } = await getVideos({ category: activeCategory || undefined })
      return data || []
    },
  })

  const handlePlay = (video) => {
    setActiveVideo(video)
    incrementVideoViews(video.id).catch(() => {})
  }

  return (
    <>
      <SEO title="Video" description="Guarda gli highlights, le interviste e le analisi video della Juventus." url="/video" />

      <section className="bg-juve-black text-white py-10 md:py-14">
        <div className="max-w-5xl mx-auto px-4 text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <div className="flex items-center justify-center gap-2 mb-3">
              <Play className="h-4 w-4 text-juve-gold" />
              <span className="text-xs font-black uppercase tracking-widest text-juve-gold">Contenuti</span>
            </div>
            <h1 className="font-display text-3xl sm:text-4xl md:text-5xl font-black leading-tight mb-2">VIDEO</h1>
            <p className="text-sm text-gray-400 max-w-lg mx-auto">
              Highlights, interviste, analisi tattiche e tanto altro in formato video.
            </p>
          </motion.div>
        </div>
      </section>

      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Active video player */}
        {activeVideo && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
            <div className="relative aspect-video bg-black mb-3 overflow-hidden">
              {isNativeVideo(activeVideo) ? (
                <video
                  src={activeVideo.video_url}
                  controls
                  autoPlay
                  className="w-full h-full"
                  controlsList="nodownload"
                  playsInline
                >
                  Il tuo browser non supporta il video.
                </video>
              ) : (
                <iframe
                  src={getEmbedUrl(activeVideo)}
                  className="w-full h-full"
                  allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
                  allowFullScreen
                  title={activeVideo.title}
                />
              )}
            </div>
            <div className="flex items-start justify-between gap-4">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-juve-gold">{activeVideo.category}</span>
                <h2 className="font-display text-xl font-black text-juve-black dark:text-white mb-1">{activeVideo.title}</h2>
                {activeVideo.description && <p className="text-sm text-gray-600 dark:text-gray-400">{activeVideo.description}</p>}
                <div className="flex items-center gap-3 mt-2 text-[10px] text-gray-400">
                  <span className="flex items-center gap-0.5"><Eye className="h-3 w-3" />{activeVideo.views || 0} visualizzazioni</span>
                  {activeVideo.published_at && (
                    <span>{new Date(activeVideo.published_at).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                  )}
                </div>
              </div>
              <button onClick={() => setActiveVideo(null)}
                className="shrink-0 flex items-center gap-1 text-xs text-gray-400 hover:text-juve-gold font-bold uppercase tracking-widest transition-colors">
                <X className="h-3.5 w-3.5" /> Chiudi
              </button>
            </div>
          </motion.div>
        )}

        {/* Category filters */}
        <div className="flex flex-wrap gap-2 mb-6">
          <button
            onClick={() => setActiveCategory(null)}
            className={`px-3 py-1.5 text-xs font-bold uppercase tracking-widest border transition-colors ${
              !activeCategory ? 'bg-juve-black text-white border-juve-black' : 'border-gray-300 text-gray-600 hover:border-juve-gold'
            }`}
          >
            Tutti
          </button>
          {VIDEO_CATEGORIES.map(cat => (
            <button
              key={cat.value}
              onClick={() => setActiveCategory(cat.value)}
              className={`px-3 py-1.5 text-xs font-bold uppercase tracking-widest border transition-colors ${
                activeCategory === cat.value ? 'bg-juve-gold text-juve-black border-juve-gold' : 'border-gray-300 text-gray-600 hover:border-juve-gold'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {isLoading && (
          <div className="text-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-juve-gold mx-auto mb-3" />
            <p className="text-sm text-gray-500">Caricamento video...</p>
          </div>
        )}

        {!isLoading && (!videos || videos.length === 0) && (
          <div className="text-center py-16">
            <Film className="h-10 w-10 text-gray-300 mx-auto mb-4" />
            <p className="text-sm text-gray-500 mb-1">Nessun video disponibile.</p>
            <p className="text-[10px] text-gray-400">I video verranno pubblicati presto!</p>
          </div>
        )}

        {videos && videos.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {videos.map(video => (
              <VideoCard key={video.id} video={video} onClick={() => handlePlay(video)} />
            ))}
          </div>
        )}
      </div>
    </>
  )
}
