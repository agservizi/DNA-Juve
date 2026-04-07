import { useState, useRef, useEffect, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import { Play, Pause, Eye, Loader2, Film, X, Share2, Check, Link2, Maximize, Minimize, Volume2, VolumeX } from 'lucide-react'
import { getVideos, incrementVideoViews } from '@/lib/supabase'
import SEO from '@/components/blog/SEO'
import VideoPlayer from '@/components/blog/VideoPlayer'

const SITE_URL = (import.meta.env.VITE_SITE_URL || 'https://bianconerihub.com').replace(/\/+$/, '')

// ─── CUSTOM PLAYER (native video) ─────────────────────────────────
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

  const fmt = (s) => {
    if (!s || isNaN(s)) return '0:00'
    const m = Math.floor(s / 60)
    const sec = Math.floor(s % 60)
    return `${m}:${String(sec).padStart(2, '0')}`
  }

  const togglePlay = () => {
    const v = videoRef.current
    if (!v) return
    if (v.paused) { v.play(); setPlaying(true) }
    else { v.pause(); setPlaying(false) }
  }

  const toggleMute = () => {
    const v = videoRef.current
    if (!v) return
    v.muted = !v.muted
    setMuted(v.muted)
  }

  const handleVolumeChange = (e) => {
    const val = +e.target.value
    const v = videoRef.current
    if (v) { v.volume = val; v.muted = val === 0 }
    setVolume(val)
    setMuted(val === 0)
  }

  const handleSeek = (e) => {
    const rect = progressRef.current.getBoundingClientRect()
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
    const v = videoRef.current
    if (v && duration) v.currentTime = pct * duration
  }

  const toggleFullscreen = async () => {
    const el = containerRef.current
    if (!el) return
    if (!document.fullscreenElement) {
      await el.requestFullscreen?.() || el.webkitRequestFullscreen?.()
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
    const v = videoRef.current
    if (!v) return
    const onTime = () => { setCurrentTime(v.currentTime); if (v.buffered.length) setBuffered(v.buffered.end(v.buffered.length - 1)) }
    const onMeta = () => setDuration(v.duration)
    const onEnd = () => setPlaying(false)
    const onFs = () => setIsFullscreen(!!document.fullscreenElement)
    v.addEventListener('timeupdate', onTime)
    v.addEventListener('loadedmetadata', onMeta)
    v.addEventListener('ended', onEnd)
    document.addEventListener('fullscreenchange', onFs)
    return () => {
      v.removeEventListener('timeupdate', onTime)
      v.removeEventListener('loadedmetadata', onMeta)
      v.removeEventListener('ended', onEnd)
      document.removeEventListener('fullscreenchange', onFs)
    }
  }, [])

  useEffect(() => { scheduleHide() }, [playing, scheduleHide])

  const pct = duration ? (currentTime / duration) * 100 : 0
  const bufPct = duration ? (buffered / duration) * 100 : 0

  return (
    <div ref={containerRef} className="relative aspect-video bg-black group select-none" onMouseMove={scheduleHide} onClick={togglePlay}>
      <video ref={videoRef} src={src} poster={poster} playsInline preload="metadata" className="w-full h-full" />

      {/* Play overlay (when paused) */}
      <AnimatePresence>
        {!playing && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 flex items-center justify-center bg-black/40 cursor-pointer">
            <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }}
              className="w-16 h-16 sm:w-20 sm:h-20 bg-juve-gold flex items-center justify-center shadow-lg shadow-juve-gold/30">
              <Play className="h-8 w-8 sm:h-10 sm:w-10 text-juve-black fill-current ml-1" />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom controls */}
      <div onClick={e => e.stopPropagation()}
        className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent pt-10 pb-3 px-4 transition-opacity duration-300 ${showControls || !playing ? 'opacity-100' : 'opacity-0'}`}>

        {/* Progress bar */}
        <div ref={progressRef} className="w-full h-1.5 bg-white/20 cursor-pointer mb-3 group/progress" onClick={handleSeek}>
          {/* Buffered */}
          <div className="absolute h-1.5 bg-white/20 rounded-full" style={{ width: `${bufPct}%` }} />
          {/* Played */}
          <div className="relative h-full bg-juve-gold" style={{ width: `${pct}%` }}>
            <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3.5 h-3.5 bg-juve-gold rounded-full opacity-0 group-hover/progress:opacity-100 transition-opacity shadow-md" />
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Play/Pause */}
          <button onClick={togglePlay} className="text-white hover:text-juve-gold transition-colors">
            {playing ? <Pause className="h-5 w-5 fill-current" /> : <Play className="h-5 w-5 fill-current" />}
          </button>

          {/* Time */}
          <span className="text-xs text-white/80 font-mono tabular-nums min-w-[70px]">
            {fmt(currentTime)} / {fmt(duration)}
          </span>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Volume */}
          <div className="flex items-center gap-1.5 group/vol">
            <button onClick={toggleMute} className="text-white hover:text-juve-gold transition-colors">
              {muted || volume === 0 ? <VolumeX className="h-4.5 w-4.5" /> : <Volume2 className="h-4.5 w-4.5" />}
            </button>
            <input type="range" min="0" max="1" step="0.05" value={muted ? 0 : volume} onChange={handleVolumeChange}
              className="w-0 group-hover/vol:w-20 transition-all duration-200 accent-[#F5A623] h-1 cursor-pointer" />
          </div>

          {/* Fullscreen */}
          <button onClick={toggleFullscreen} className="text-white hover:text-juve-gold transition-colors">
            {isFullscreen ? <Minimize className="h-4.5 w-4.5" /> : <Maximize className="h-4.5 w-4.5" />}
          </button>
        </div>
      </div>

      {/* Title overlay */}
      {title && showControls && (
        <div className="absolute top-0 left-0 right-0 bg-gradient-to-b from-black/70 to-transparent p-4 pointer-events-none">
          <span className="text-white text-sm font-bold drop-shadow-md">{title}</span>
        </div>
      )}
    </div>
  )
}

// ─── YT IFrame API loader ─────────────────────────────────────────
let ytApiReady = false
let ytApiCallbacks = []
function loadYTApi() {
  return new Promise((resolve) => {
    if (ytApiReady) return resolve()
    ytApiCallbacks.push(resolve)
    if (document.getElementById('yt-iframe-api')) return
    const tag = document.createElement('script')
    tag.id = 'yt-iframe-api'
    tag.src = 'https://www.youtube.com/iframe_api'
    document.head.appendChild(tag)
    window.onYouTubeIframeAPIReady = () => {
      ytApiReady = true
      ytApiCallbacks.forEach(cb => cb())
      ytApiCallbacks = []
    }
  })
}

// ─── EMBED PLAYER (YouTube/Vimeo/Dailymotion) with full custom controls ──
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

  const isYT = video.platform === 'youtube' && video.video_id

  const thumbnail = video.thumbnail || (isYT
    ? `https://img.youtube.com/vi/${video.video_id}/maxresdefault.jpg`
    : null)

  const fmt = (s) => {
    if (!s || isNaN(s)) return '0:00'
    const m = Math.floor(s / 60)
    const sec = Math.floor(s % 60)
    return `${m}:${String(sec).padStart(2, '0')}`
  }

  const scheduleHide = useCallback(() => {
    clearTimeout(hideTimer.current)
    setShowControls(true)
    if (playing) hideTimer.current = setTimeout(() => setShowControls(false), 3000)
  }, [playing])

  // YouTube player init
  useEffect(() => {
    if (!started || !isYT) return
    let cancelled = false
    loadYTApi().then(() => {
      if (cancelled || !iframeContainerRef.current) return
      const player = new window.YT.Player(iframeContainerRef.current, {
        videoId: video.video_id,
        playerVars: { autoplay: 1, controls: 0, rel: 0, modestbranding: 1, showinfo: 0, iv_load_policy: 3, disablekb: 1, playsinline: 1 },
        events: {
          onReady: (e) => {
            ytPlayerRef.current = e.target
            setDuration(e.target.getDuration())
            setVolume(e.target.getVolume() / 100)
            setMuted(e.target.isMuted())
            setReady(true)
            setPlaying(true)
          },
          onStateChange: (e) => {
            // YT.PlayerState: PLAYING=1, PAUSED=2, ENDED=0, BUFFERING=3
            setPlaying(e.data === 1)
            if (e.data === 0) setPlaying(false)
          },
        },
      })
    })
    return () => { cancelled = true }
  }, [started, isYT, video.video_id])

  // Poll time for YouTube
  useEffect(() => {
    if (!ready || !isYT) return
    pollRef.current = setInterval(() => {
      const p = ytPlayerRef.current
      if (p && p.getCurrentTime) {
        setCurrentTime(p.getCurrentTime())
        if (!duration) setDuration(p.getDuration())
      }
    }, 250)
    return () => clearInterval(pollRef.current)
  }, [ready, isYT, duration])

  useEffect(() => { scheduleHide() }, [playing, scheduleHide])

  useEffect(() => {
    const onFs = () => setIsFullscreen(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', onFs)
    return () => document.removeEventListener('fullscreenchange', onFs)
  }, [])

  const togglePlay = () => {
    const p = ytPlayerRef.current
    if (!p) return
    if (playing) { p.pauseVideo(); setPlaying(false) }
    else { p.playVideo(); setPlaying(true) }
  }

  const toggleMute = () => {
    const p = ytPlayerRef.current
    if (!p) return
    if (p.isMuted()) { p.unMute(); setMuted(false) }
    else { p.mute(); setMuted(true) }
  }

  const handleVolumeChange = (e) => {
    const val = +e.target.value
    const p = ytPlayerRef.current
    if (p) { p.setVolume(val * 100); if (val === 0) p.mute(); else p.unMute() }
    setVolume(val)
    setMuted(val === 0)
  }

  const handleSeek = (e) => {
    const rect = progressRef.current.getBoundingClientRect()
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
    const p = ytPlayerRef.current
    if (p && duration) p.seekTo(pct * duration, true)
  }

  const toggleFullscreen = async () => {
    const el = containerRef.current
    if (!el) return
    if (!document.fullscreenElement) {
      await el.requestFullscreen?.() || el.webkitRequestFullscreen?.()
    } else {
      await document.exitFullscreen?.() || document.webkitExitFullscreen?.()
    }
  }

  // Pre-start: thumbnail with play button
  if (!started) {
    return (
      <div className="relative aspect-video bg-black cursor-pointer group" onClick={() => setStarted(true)}>
        {thumbnail && <img src={thumbnail} alt={video.title} className="w-full h-full object-cover" />}
        <div className="absolute inset-0 bg-black/40 group-hover:bg-black/30 transition-colors" />
        <div className="absolute inset-0 flex items-center justify-center">
          <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }}
            className="w-16 h-16 sm:w-20 sm:h-20 bg-juve-gold flex items-center justify-center shadow-lg shadow-juve-gold/30">
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

  // YouTube with full custom controls
  if (isYT) {
    const pct = duration ? (currentTime / duration) * 100 : 0

    return (
      <div ref={containerRef} className="relative aspect-video bg-black group select-none" onMouseMove={scheduleHide}>
        {/* YouTube iframe (controls hidden) */}
        <div className="w-full h-full pointer-events-none">
          <div ref={iframeContainerRef} className="w-full h-full" />
        </div>

        {/* Clickable overlay to toggle play */}
        <div className="absolute inset-0 z-10" onClick={togglePlay} />

        {/* Play overlay (when paused) */}
        <AnimatePresence>
          {!playing && ready && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 flex items-center justify-center bg-black/40 z-20 pointer-events-none">
              <motion.div className="w-16 h-16 sm:w-20 sm:h-20 bg-juve-gold flex items-center justify-center shadow-lg shadow-juve-gold/30">
                <Play className="h-8 w-8 sm:h-10 sm:w-10 text-juve-black fill-current ml-1" />
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Loading state */}
        {!ready && (
          <div className="absolute inset-0 flex items-center justify-center bg-black z-20">
            <Loader2 className="h-8 w-8 animate-spin text-juve-gold" />
          </div>
        )}

        {/* Bottom controls */}
        <div onClick={e => e.stopPropagation()}
          className={`absolute bottom-0 left-0 right-0 z-30 bg-gradient-to-t from-black/90 via-black/50 to-transparent pt-10 pb-3 px-4 transition-opacity duration-300 ${showControls || !playing ? 'opacity-100' : 'opacity-0'}`}>

          {/* Progress bar */}
          <div ref={progressRef} className="w-full h-1.5 bg-white/20 cursor-pointer mb-3 group/progress" onClick={handleSeek}>
            <div className="relative h-full bg-juve-gold" style={{ width: `${pct}%` }}>
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
              <input type="range" min="0" max="1" step="0.05" value={muted ? 0 : volume} onChange={handleVolumeChange}
                className="w-0 group-hover/vol:w-20 transition-all duration-200 accent-[#F5A623] h-1 cursor-pointer" />
            </div>
            <button onClick={toggleFullscreen} className="text-white hover:text-juve-gold transition-colors">
              {isFullscreen ? <Minimize className="h-4.5 w-4.5" /> : <Maximize className="h-4.5 w-4.5" />}
            </button>
          </div>
        </div>

        {/* Title overlay */}
        {showControls && (
          <div className="absolute top-0 left-0 right-0 z-30 bg-gradient-to-b from-black/70 to-transparent p-4 pointer-events-none">
            <span className="text-white text-sm font-bold drop-shadow-md">{video.title}</span>
          </div>
        )}
      </div>
    )
  }

  // Fallback: Vimeo / Dailymotion → iframe (API-less, custom wrapper)
  const embedUrl = (() => {
    if (video.platform === 'dailymotion' && video.video_id) return `https://www.dailymotion.com/embed/video/${video.video_id}?autoplay=1`
    if (video.platform === 'vimeo' && video.video_id) return `https://player.vimeo.com/video/${video.video_id}?autoplay=1`
    return null
  })()

  return (
    <div ref={containerRef} className="relative aspect-video bg-black">
      <iframe src={embedUrl} className="w-full h-full" allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
        allowFullScreen title={video.title} />
    </div>
  )
}

// ─── SHARE BUTTONS ─────────────────────────────────────────────────
function ShareButtons({ video }) {
  const [copied, setCopied] = useState(false)
  const url = `${SITE_URL}/video?v=${video.id}`
  const text = `${video.title} — BianconeriHub`
  const encodedUrl = encodeURIComponent(url)
  const encodedText = encodeURIComponent(text)

  const copyLink = async () => {
    try { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 2000) } catch {}
  }

  const buttons = [
    { label: 'WhatsApp', color: 'hover:bg-[#25D366] hover:text-white', href: `https://wa.me/?text=${encodedText}%20${encodedUrl}`,
      icon: <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg> },
    { label: 'X', color: 'hover:bg-black hover:text-white', href: `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`,
      icon: <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg> },
    { label: 'Facebook', color: 'hover:bg-[#1877F2] hover:text-white', href: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
      icon: <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg> },
    { label: 'Telegram', color: 'hover:bg-[#0088cc] hover:text-white', href: `https://t.me/share/url?url=${encodedUrl}&text=${encodedText}`,
      icon: <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4"><path d="M11.944 0A12 12 0 000 12a12 12 0 0012 12 12 12 0 0012-12A12 12 0 0012 0a12 12 0 00-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 01.171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.479.33-.913.492-1.302.48-.428-.013-1.252-.242-1.865-.44-.751-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg> },
  ]

  return (
    <div className="flex items-center gap-2 mt-3">
      <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mr-1"><Share2 className="h-3.5 w-3.5 inline -mt-0.5" /> Condividi</span>
      {buttons.map(btn => (
        <a key={btn.label} href={btn.href} target="_blank" rel="noopener noreferrer"
          className={`w-8 h-8 flex items-center justify-center border border-gray-200 dark:border-gray-700 text-gray-500 transition-colors ${btn.color}`}
          title={btn.label}>{btn.icon}</a>
      ))}
      <button onClick={copyLink}
        className={`w-8 h-8 flex items-center justify-center border transition-colors ${copied ? 'bg-green-600 text-white border-green-600' : 'border-gray-200 dark:border-gray-700 text-gray-500 hover:bg-juve-gold hover:text-juve-black hover:border-juve-gold'}`}
        title="Copia link">
        {copied ? <Check className="h-4 w-4" /> : <Link2 className="h-4 w-4" />}
      </button>
    </div>
  )
}

// ─── HELPERS ───────────────────────────────────────────────────────
function formatDuration(seconds) {
  if (!seconds) return ''
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

function isNativeVideo(video) {
  return video.platform === 'custom' || (!video.video_id && video.video_url)
}

const VIDEO_CATEGORIES = [
  { value: 'highlights', label: 'Highlights' },
  { value: 'interviste', label: 'Interviste' },
  { value: 'analisi', label: 'Analisi' },
  { value: 'allenamenti', label: 'Allenamenti' },
]

// ─── VIDEO CARD ────────────────────────────────────────────────────
function VideoCard({ video, onClick }) {
  const thumbnail = video.thumbnail || (video.platform === 'youtube' && video.video_id ? `https://img.youtube.com/vi/${video.video_id}/hqdefault.jpg` : null)

  return (
    <motion.button
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      onClick={onClick}
      className="w-full text-left bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-gray-800 overflow-hidden hover:border-juve-gold transition-colors group"
    >
      <div className="relative aspect-video bg-gray-100 dark:bg-gray-900">
        {thumbnail ? (
          <img src={thumbnail} alt={video.title} className="w-full h-full object-cover" loading="lazy" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Film className="h-10 w-10 text-gray-300" />
          </div>
        )}
        <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <div className="w-12 h-12 bg-juve-gold flex items-center justify-center">
            <Play className="h-6 w-6 text-juve-black fill-current ml-0.5" />
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
        <h3 className="font-display text-sm font-black text-juve-black dark:text-white leading-tight line-clamp-2 mb-1">{video.title}</h3>
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

// ─── PAGE ──────────────────────────────────────────────────────────
export default function Video() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [activeCategory, setActiveCategory] = useState(null)
  const [activeVideo, setActiveVideo] = useState(null)

  const { data: videos, isLoading } = useQuery({
    queryKey: ['videos', activeCategory],
    queryFn: async () => {
      const { data } = await getVideos({ category: activeCategory || undefined })
      return data || []
    },
  })

  // Auto-select video from ?v= query param
  useEffect(() => {
    const vid = searchParams.get('v')
    if (vid && videos?.length && !activeVideo) {
      const found = videos.find(v => v.id === vid)
      if (found) {
        setActiveVideo(found)
        incrementVideoViews(found.id).then?.(() => {}, () => {})
      }
    }
  }, [videos, searchParams, activeVideo])

  const handlePlay = (video) => {
    setActiveVideo(video)
    setSearchParams({ v: video.id }, { replace: true })
    incrementVideoViews(video.id).then?.(() => {}, () => {})
  }

  const handleClose = () => {
    setActiveVideo(null)
    setSearchParams({}, { replace: true })
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
            <VideoPlayer video={activeVideo} />

            <div className="flex items-start justify-between gap-4 mt-3">
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
                <ShareButtons video={activeVideo} />
              </div>
              <button onClick={handleClose}
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
