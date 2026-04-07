import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Play, Pause, Loader2, Maximize, Minimize, Volume2, VolumeX } from 'lucide-react'

function formatDuration(seconds) {
  if (!seconds) return ''
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  return `${minutes}:${String(remainingSeconds).padStart(2, '0')}`
}

function extractYouTubeId(value) {
  if (!value) return ''

  const source = String(value)
  const match = source.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([^?&/]+)/i)
  return match?.[1] || source
}

function extractVimeoId(value) {
  if (!value) return ''

  const source = String(value)
  const match = source.match(/vimeo\.com\/(?:video\/)?(\d+)/i) || source.match(/^(\d+)$/)
  return match?.[1] || ''
}

export function isNativeVideo(video) {
  return video?.platform === 'custom' || video?.platform === 'native' || (!video?.video_id && !!video?.video_url)
}

function getEmbedUrl(video) {
  if (video.platform === 'dailymotion' && video.video_id) return `https://www.dailymotion.com/embed/video/${video.video_id}?autoplay=1`

  if (video.platform === 'vimeo') {
    const vimeoId = extractVimeoId(video.video_id || video.video_url)
    if (vimeoId) return `https://player.vimeo.com/video/${vimeoId}?autoplay=1`
  }

  return video.video_url || null
}

function CustomPlayer({ src, poster, title }) {
  const videoRef = useRef(null)
  const containerRef = useRef(null)
  const progressRef = useRef(null)
  const [playing, setPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(1)
  const [muted, setMuted] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [showControls, setShowControls] = useState(true)
  const [buffered, setBuffered] = useState(0)
  const hideTimer = useRef(null)

  const fmt = (seconds) => {
    if (!seconds || Number.isNaN(seconds)) return '0:00'
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = Math.floor(seconds % 60)
    return `${minutes}:${String(remainingSeconds).padStart(2, '0')}`
  }

  const togglePlay = () => {
    const video = videoRef.current
    if (!video) return

    if (video.paused) {
      video.play()
      setPlaying(true)
    } else {
      video.pause()
      setPlaying(false)
    }
  }

  const toggleMute = () => {
    const video = videoRef.current
    if (!video) return

    video.muted = !video.muted
    setMuted(video.muted)
  }

  const handleVolumeChange = (event) => {
    const value = Number(event.target.value)
    const video = videoRef.current
    if (video) {
      video.volume = value
      video.muted = value === 0
    }

    setVolume(value)
    setMuted(value === 0)
  }

  const handleSeek = (event) => {
    const progress = progressRef.current
    const video = videoRef.current
    if (!progress || !video || !duration) return

    const rect = progress.getBoundingClientRect()
    const percentage = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width))
    video.currentTime = percentage * duration
  }

  const toggleFullscreen = async () => {
    const element = containerRef.current
    if (!element) return

    if (!document.fullscreenElement) {
      await element.requestFullscreen?.() || element.webkitRequestFullscreen?.()
    } else {
      await document.exitFullscreen?.() || document.webkitExitFullscreen?.()
    }
  }

  const scheduleHide = useCallback(() => {
    clearTimeout(hideTimer.current)
    setShowControls(true)
    if (playing) hideTimer.current = setTimeout(() => setShowControls(false), 3000)
  }, [playing])

  useEffect(() => {
    const video = videoRef.current
    if (!video) return undefined

    const onTimeUpdate = () => {
      setCurrentTime(video.currentTime)
      if (video.buffered.length) setBuffered(video.buffered.end(video.buffered.length - 1))
    }
    const onLoadedMetadata = () => setDuration(video.duration)
    const onEnded = () => setPlaying(false)
    const onFullscreenChange = () => setIsFullscreen(!!document.fullscreenElement)

    video.addEventListener('timeupdate', onTimeUpdate)
    video.addEventListener('loadedmetadata', onLoadedMetadata)
    video.addEventListener('ended', onEnded)
    document.addEventListener('fullscreenchange', onFullscreenChange)

    return () => {
      clearTimeout(hideTimer.current)
      video.removeEventListener('timeupdate', onTimeUpdate)
      video.removeEventListener('loadedmetadata', onLoadedMetadata)
      video.removeEventListener('ended', onEnded)
      document.removeEventListener('fullscreenchange', onFullscreenChange)
    }
  }, [])

  useEffect(() => {
    scheduleHide()
  }, [playing, scheduleHide])

  const progress = duration ? (currentTime / duration) * 100 : 0
  const bufferedProgress = duration ? (buffered / duration) * 100 : 0

  return (
    <div ref={containerRef} className="relative aspect-video bg-black group select-none" onMouseMove={scheduleHide} onClick={togglePlay}>
      <video ref={videoRef} src={src} poster={poster} playsInline preload="metadata" className="w-full h-full" />

      <AnimatePresence>
        {!playing && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 flex items-center justify-center bg-black/40 cursor-pointer">
            <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }} className="w-16 h-16 sm:w-20 sm:h-20 bg-juve-gold flex items-center justify-center shadow-lg shadow-juve-gold/30">
              <Play className="h-8 w-8 sm:h-10 sm:w-10 text-juve-black fill-current ml-1" />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div onClick={(event) => event.stopPropagation()} className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent pt-10 pb-3 px-4 transition-opacity duration-300 ${showControls || !playing ? 'opacity-100' : 'opacity-0'}`}>
        <div ref={progressRef} className="w-full h-1.5 bg-white/20 cursor-pointer mb-3 group/progress" onClick={handleSeek}>
          <div className="absolute h-1.5 bg-white/20 rounded-full" style={{ width: `${bufferedProgress}%` }} />
          <div className="relative h-full bg-juve-gold" style={{ width: `${progress}%` }}>
            <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3.5 h-3.5 bg-juve-gold rounded-full opacity-0 group-hover/progress:opacity-100 transition-opacity shadow-md" />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button onClick={togglePlay} className="text-white hover:text-juve-gold transition-colors">
            {playing ? <Pause className="h-5 w-5 fill-current" /> : <Play className="h-5 w-5 fill-current" />}
          </button>
          <span className="text-xs text-white/80 font-mono tabular-nums min-w-[70px]">
            {fmt(currentTime)} / {fmt(duration)}
          </span>
          <div className="flex-1" />
          <div className="flex items-center gap-1.5 group/vol">
            <button onClick={toggleMute} className="text-white hover:text-juve-gold transition-colors">
              {muted || volume === 0 ? <VolumeX className="h-4.5 w-4.5" /> : <Volume2 className="h-4.5 w-4.5" />}
            </button>
            <input type="range" min="0" max="1" step="0.05" value={muted ? 0 : volume} onChange={handleVolumeChange} className="w-0 group-hover/vol:w-20 transition-all duration-200 accent-[#F5A623] h-1 cursor-pointer" />
          </div>
          <button onClick={toggleFullscreen} className="text-white hover:text-juve-gold transition-colors">
            {isFullscreen ? <Minimize className="h-4.5 w-4.5" /> : <Maximize className="h-4.5 w-4.5" />}
          </button>
        </div>
      </div>

      {title && showControls && (
        <div className="absolute top-0 left-0 right-0 bg-gradient-to-b from-black/70 to-transparent p-4 pointer-events-none">
          <span className="text-white text-sm font-bold drop-shadow-md">{title}</span>
        </div>
      )}
    </div>
  )
}

let ytApiReady = false
let ytApiCallbacks = []

function loadYTApi() {
  return new Promise((resolve) => {
    if (ytApiReady) return resolve()

    ytApiCallbacks.push(resolve)
    if (document.getElementById('yt-iframe-api')) return undefined

    const tag = document.createElement('script')
    tag.id = 'yt-iframe-api'
    tag.src = 'https://www.youtube.com/iframe_api'
    document.head.appendChild(tag)

    window.onYouTubeIframeAPIReady = () => {
      ytApiReady = true
      ytApiCallbacks.forEach((callback) => callback())
      ytApiCallbacks = []
    }

    return undefined
  })
}

function EmbedPlayer({ video }) {
  const containerRef = useRef(null)
  const iframeContainerRef = useRef(null)
  const progressRef = useRef(null)
  const ytPlayerRef = useRef(null)
  const pollRef = useRef(null)
  const [started, setStarted] = useState(false)
  const [playing, setPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(video.duration || 0)
  const [volume, setVolume] = useState(1)
  const [muted, setMuted] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [showControls, setShowControls] = useState(true)
  const [ready, setReady] = useState(false)
  const hideTimer = useRef(null)
  const youTubeId = extractYouTubeId(video.video_id || video.video_url)
  const isYouTube = video.platform === 'youtube' && !!youTubeId
  const thumbnail = video.thumbnail || (isYouTube ? `https://img.youtube.com/vi/${youTubeId}/maxresdefault.jpg` : null)

  const fmt = (seconds) => {
    if (!seconds || Number.isNaN(seconds)) return '0:00'
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = Math.floor(seconds % 60)
    return `${minutes}:${String(remainingSeconds).padStart(2, '0')}`
  }

  const scheduleHide = useCallback(() => {
    clearTimeout(hideTimer.current)
    setShowControls(true)
    if (playing) hideTimer.current = setTimeout(() => setShowControls(false), 3000)
  }, [playing])

  useEffect(() => {
    if (!started || !isYouTube) return undefined

    let cancelled = false

    loadYTApi().then(() => {
      if (cancelled || !iframeContainerRef.current) return

      new window.YT.Player(iframeContainerRef.current, {
        videoId: youTubeId,
        playerVars: { autoplay: 1, controls: 0, rel: 0, modestbranding: 1, showinfo: 0, iv_load_policy: 3, disablekb: 1, playsinline: 1 },
        events: {
          onReady: (event) => {
            ytPlayerRef.current = event.target
            setDuration(event.target.getDuration())
            setVolume(event.target.getVolume() / 100)
            setMuted(event.target.isMuted())
            setReady(true)
            setPlaying(true)
          },
          onStateChange: (event) => {
            setPlaying(event.data === 1)
            if (event.data === 0) setPlaying(false)
          },
        },
      })
    })

    return () => {
      cancelled = true
    }
  }, [started, isYouTube, youTubeId])

  useEffect(() => {
    if (!ready || !isYouTube) return undefined

    pollRef.current = setInterval(() => {
      const player = ytPlayerRef.current
      if (player?.getCurrentTime) {
        setCurrentTime(player.getCurrentTime())
        if (!duration) setDuration(player.getDuration())
      }
    }, 250)

    return () => clearInterval(pollRef.current)
  }, [ready, isYouTube, duration])

  useEffect(() => {
    scheduleHide()
  }, [playing, scheduleHide])

  useEffect(() => {
    const onFullscreenChange = () => setIsFullscreen(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', onFullscreenChange)
    return () => {
      clearTimeout(hideTimer.current)
      clearInterval(pollRef.current)
      document.removeEventListener('fullscreenchange', onFullscreenChange)
    }
  }, [])

  const togglePlay = () => {
    const player = ytPlayerRef.current
    if (!player) return

    if (playing) {
      player.pauseVideo()
      setPlaying(false)
    } else {
      player.playVideo()
      setPlaying(true)
    }
  }

  const toggleMute = () => {
    const player = ytPlayerRef.current
    if (!player) return

    if (player.isMuted()) {
      player.unMute()
      setMuted(false)
    } else {
      player.mute()
      setMuted(true)
    }
  }

  const handleVolumeChange = (event) => {
    const value = Number(event.target.value)
    const player = ytPlayerRef.current
    if (player) {
      player.setVolume(value * 100)
      if (value === 0) player.mute()
      else player.unMute()
    }

    setVolume(value)
    setMuted(value === 0)
  }

  const handleSeek = (event) => {
    const progress = progressRef.current
    const player = ytPlayerRef.current
    if (!progress || !player || !duration) return

    const rect = progress.getBoundingClientRect()
    const percentage = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width))
    player.seekTo(percentage * duration, true)
  }

  const toggleFullscreen = async () => {
    const element = containerRef.current
    if (!element) return

    if (!document.fullscreenElement) {
      await element.requestFullscreen?.() || element.webkitRequestFullscreen?.()
    } else {
      await document.exitFullscreen?.() || document.webkitExitFullscreen?.()
    }
  }

  if (!started) {
    return (
      <div className="relative aspect-video bg-black cursor-pointer group" onClick={() => setStarted(true)}>
        {thumbnail && <img src={thumbnail} alt={video.title} className="w-full h-full object-cover" />}
        <div className="absolute inset-0 bg-black/40 group-hover:bg-black/30 transition-colors" />
        <div className="absolute inset-0 flex items-center justify-center">
          <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }} className="w-16 h-16 sm:w-20 sm:h-20 bg-juve-gold flex items-center justify-center shadow-lg shadow-juve-gold/30">
            <Play className="h-8 w-8 sm:h-10 sm:w-10 text-juve-black fill-current ml-1" />
          </motion.div>
        </div>
        <div className="absolute top-0 left-0 right-0 bg-gradient-to-b from-black/70 to-transparent p-4">
          <span className="text-white text-sm font-bold drop-shadow-md">{video.title}</span>
        </div>
        <div className="absolute bottom-3 left-4 flex items-center gap-2">
          <div className="h-1 w-8 bg-juve-gold" />
          <span className="text-[10px] font-black uppercase tracking-widest text-white/80">BianconeriHub</span>
        </div>
        {video.duration > 0 && (
          <span className="absolute bottom-3 right-3 bg-black/80 text-white text-[10px] font-bold px-2 py-0.5">
            {formatDuration(video.duration)}
          </span>
        )}
      </div>
    )
  }

  if (isYouTube) {
    const progress = duration ? (currentTime / duration) * 100 : 0

    return (
      <div ref={containerRef} className="relative aspect-video bg-black group select-none" onMouseMove={scheduleHide}>
        <div className="w-full h-full pointer-events-none">
          <div ref={iframeContainerRef} className="w-full h-full" />
        </div>

        <div className="absolute inset-0 z-10" onClick={togglePlay} />

        <AnimatePresence>
          {!playing && ready && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 flex items-center justify-center bg-black/40 z-20 pointer-events-none">
              <motion.div className="w-16 h-16 sm:w-20 sm:h-20 bg-juve-gold flex items-center justify-center shadow-lg shadow-juve-gold/30">
                <Play className="h-8 w-8 sm:h-10 sm:w-10 text-juve-black fill-current ml-1" />
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {!ready && (
          <div className="absolute inset-0 flex items-center justify-center bg-black z-20">
            <Loader2 className="h-8 w-8 animate-spin text-juve-gold" />
          </div>
        )}

        <div onClick={(event) => event.stopPropagation()} className={`absolute bottom-0 left-0 right-0 z-30 bg-gradient-to-t from-black/90 via-black/50 to-transparent pt-10 pb-3 px-4 transition-opacity duration-300 ${showControls || !playing ? 'opacity-100' : 'opacity-0'}`}>
          <div ref={progressRef} className="w-full h-1.5 bg-white/20 cursor-pointer mb-3 group/progress" onClick={handleSeek}>
            <div className="relative h-full bg-juve-gold" style={{ width: `${progress}%` }}>
              <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3.5 h-3.5 bg-juve-gold rounded-full opacity-0 group-hover/progress:opacity-100 transition-opacity shadow-md" />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button onClick={togglePlay} className="text-white hover:text-juve-gold transition-colors">
              {playing ? <Pause className="h-5 w-5 fill-current" /> : <Play className="h-5 w-5 fill-current" />}
            </button>
            <span className="text-xs text-white/80 font-mono tabular-nums min-w-[70px]">
              {fmt(currentTime)} / {fmt(duration)}
            </span>
            <div className="flex-1" />
            <div className="flex items-center gap-1.5 group/vol">
              <button onClick={toggleMute} className="text-white hover:text-juve-gold transition-colors">
                {muted || volume === 0 ? <VolumeX className="h-4.5 w-4.5" /> : <Volume2 className="h-4.5 w-4.5" />}
              </button>
              <input type="range" min="0" max="1" step="0.05" value={muted ? 0 : volume} onChange={handleVolumeChange} className="w-0 group-hover/vol:w-20 transition-all duration-200 accent-[#F5A623] h-1 cursor-pointer" />
            </div>
            <button onClick={toggleFullscreen} className="text-white hover:text-juve-gold transition-colors">
              {isFullscreen ? <Minimize className="h-4.5 w-4.5" /> : <Maximize className="h-4.5 w-4.5" />}
            </button>
          </div>
        </div>

        {showControls && (
          <div className="absolute top-0 left-0 right-0 z-30 bg-gradient-to-b from-black/70 to-transparent p-4 pointer-events-none">
            <span className="text-white text-sm font-bold drop-shadow-md">{video.title}</span>
          </div>
        )}
      </div>
    )
  }

  const embedUrl = getEmbedUrl(video)

  return (
    <div ref={containerRef} className="relative aspect-video bg-black">
      <iframe src={embedUrl} className="w-full h-full" allow="autoplay; fullscreen; encrypted-media; picture-in-picture" allowFullScreen title={video.title} />
    </div>
  )
}

export default function VideoPlayer({ video }) {
  if (!video) return null

  if (isNativeVideo(video)) {
    return <CustomPlayer src={video.video_url} poster={video.thumbnail} title={video.title} />
  }

  return <EmbedPlayer video={video} />
}