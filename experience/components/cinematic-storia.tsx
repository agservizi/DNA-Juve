'use client'

/**
 * Storia — sticky canvas + scroll-scrubbed JPG frame sequence.
 * Motore allineato alla tecnica sticky-canvas (progress → frame → canvas via RAF).
 * Compatibile con Lenis: non dipende da window.scroll, legge getBoundingClientRect ogni frame.
 */
import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { setCinemaEra } from '@/lib/cinema-spine'

export const historyMilestones = [
  {
    year: '1897',
    label: 'Le origini',
    title: 'Una panchina. Un nome. Tutto parte da lì.',
    copy: 'Primo novembre, Torino. Ragazzi del Massimo d’Azeglio, una idea in testa e zero certezze. La chiamano Juventus: gioventù. Non sanno ancora che avrebbero inventato un secolo.',
    era: 'Corso Re Umberto',
    grade: 'archive',
  },
  {
    year: '1903—05',
    label: 'Il bianconero',
    title: 'Rosa? No. Bianco e nero. E basta.',
    copy: 'Nel 1903 da Nottingham arrivano le maglie a strisce. Due anni dopo, il primo Scudetto. Da quel momento non siamo più “una squadra”: siamo quelli in bianconero.',
    era: 'L’identità che resta',
    grade: 'archive',
  },
  {
    year: '1923—35',
    label: 'Il Quinquennio',
    title: 'Cinque Scudetti di fila. Una dinastia.',
    copy: 'Con gli Agnelli la Juventus diventa sistema. Tra il ’30 e il ’35 cinque titoli consecutivi: non un momento fortunato, una macchina che non si ferma.',
    era: 'Torino che comanda',
    grade: 'classic',
  },
  {
    year: '1977—85',
    label: 'L’Europa',
    title: 'Prima l’Europa. Poi il tetto del continente.',
    copy: 'UEFA nel ’77, Coppa delle Coppe nell’84, Coppa dei Campioni nell’85. Gloria vera, e dentro anche la notte più nera: Heysel. Chi tifa Juventus porta entrambe.',
    era: 'Dal continente al mito',
    grade: 'classic',
  },
  {
    year: '1996',
    label: 'Il mondo',
    title: 'Roma. Tokyo. Il mondo in bianconero.',
    copy: 'I rigori con l’Ajax a Roma. Poi Tokyo, il River, la Coppa Intercontinentale. In pochi mesi diventiamo campioni d’Europa e del mondo. Quell’anno non si dimentica.',
    era: 'Del Piero, Vialli, Lippi',
    grade: 'night',
  },
  {
    year: '2011—17',
    label: 'La rinascita',
    title: 'Uno stadio nostro. Un ciclo che resta.',
    copy: 'Nel 2011 apriamo casa nostra. Poi lo Scudetto senza sconfitte. Nel 2017 nascono le Women e vincono subito. La Juventus cambia pelle senza smettere di essere Juventus.',
    era: 'Stadium · Women · ciclo',
    grade: 'night',
  },
] as const

const FRAME_COUNT = 49
const FRAME_SRC = (index: number) => `/media/storia/frames/frame_${String(index + 1).padStart(4, '0')}.png`
const ZEBRA_FALLBACK = '/media/zebra-fur.png'

function clamp01(n: number) {
  return Math.min(1, Math.max(0, n))
}

function eraFromProgress(progress: number) {
  const capped = clamp01(progress)
  if (capped >= 1) return historyMilestones.length - 1
  return Math.min(historyMilestones.length - 1, Math.floor(capped * historyMilestones.length))
}

function drawCover(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  cw: number,
  ch: number,
  zoom: number,
  panX: number,
  panY: number,
) {
  const iw = img.naturalWidth
  const ih = img.naturalHeight
  if (!iw || !ih) return

  const imgRatio = iw / ih
  const canvasRatio = cw / ch
  let drawW: number
  let drawH: number
  if (canvasRatio > imgRatio) {
    drawW = cw
    drawH = cw / imgRatio
  } else {
    drawH = ch
    drawW = ch * imgRatio
  }

  drawW *= zoom
  drawH *= zoom
  const drawX = (cw - drawW) * panX
  const drawY = (ch - drawH) * panY
  ctx.drawImage(img, drawX, drawY, drawW, drawH)
}

export function CinematicStoria({ reduceMotion = false }: { reduceMotion?: boolean }) {
  const sectionRef = useRef<HTMLElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const introRef = useRef<HTMLDivElement>(null)
  const meterRef = useRef<HTMLSpanElement>(null)
  const frameLabelRef = useRef<HTMLElement>(null)
  const framesRef = useRef<HTMLImageElement[]>([])
  const fallbackRef = useRef<HTMLImageElement | null>(null)
  const lastFrameRef = useRef(-1)
  const lastEraRef = useRef(-1)
  const progressRef = useRef(0)
  const activeRef = useRef(false)
  const [activeEra, setActiveEra] = useState(0)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (reduceMotion) {
      setReady(true)
      return
    }

    const section = sectionRef.current
    const canvas = canvasRef.current
    if (!section || !canvas) return

    const ctx = canvas.getContext('2d', { alpha: false })
    if (!ctx) return

    let cancelled = false
    let rafId = 0
    const loaderBar = section.querySelector<HTMLElement>('[data-storia-loader]')

    const paint = (frameIndex: number, progress: number) => {
      const w = window.innerWidth
      const h = window.innerHeight
      const mobile = w <= 899
      const frames = framesRef.current
      const img = frames[frameIndex]
      // Camera move più marcata: lo scroll deve “sentirsi” anche se i frame sono simili
      const zoom = (mobile ? 1.32 : 1.08) + progress * (mobile ? 0.22 : 0.28)
      const panX = 0.35 + progress * 0.3
      const panY = 0.42 + Math.sin(progress * Math.PI * 2) * 0.1

      ctx.fillStyle = '#050505'
      ctx.fillRect(0, 0, w, h)

      if (img?.complete && img.naturalWidth > 0) {
        drawCover(ctx, img, w, h, zoom, panX, panY)
      } else if (fallbackRef.current?.complete && fallbackRef.current.naturalWidth > 0) {
        drawCover(ctx, fallbackRef.current, w, h, zoom, panX, panY)
      }

      const veil = ctx.createLinearGradient(0, 0, w * 0.5, 0)
      veil.addColorStop(0, 'rgba(4,4,4,.82)')
      veil.addColorStop(0.5, 'rgba(4,4,4,.28)')
      veil.addColorStop(1, 'rgba(4,4,4,0)')
      ctx.fillStyle = veil
      ctx.fillRect(0, 0, w, h)

      const bottom = ctx.createLinearGradient(0, h * 0.4, 0, h)
      bottom.addColorStop(0, 'rgba(0,0,0,0)')
      bottom.addColorStop(1, 'rgba(0,0,0,.75)')
      ctx.fillStyle = bottom
      ctx.fillRect(0, 0, w, h)
    }

    const resize = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1)
      const w = window.innerWidth
      const h = window.innerHeight
      canvas.width = Math.floor(w * dpr)
      canvas.height = Math.floor(h * dpr)
      canvas.style.width = `${w}px`
      canvas.style.height = `${h}px`
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      lastFrameRef.current = -1
      sync(true)
    }

    const applyEra = (era: number) => {
      if (era === lastEraRef.current) return
      lastEraRef.current = era
      setActiveEra(era)
      setCinemaEra(document.documentElement, era, historyMilestones.length)
    }

    const sync = (force = false) => {
      const rect = section.getBoundingClientRect()
      const scrollable = Math.max(1, section.offsetHeight - window.innerHeight)
      const progress = clamp01(-rect.top / scrollable)
      progressRef.current = progress
      section.style.setProperty('--storia-progress', progress.toFixed(4))

      // Skill formula: floor(progress * FRAME_COUNT), clamp to last
      const frame = Math.min(FRAME_COUNT - 1, Math.floor(progress * FRAME_COUNT))

      if (force || frame !== lastFrameRef.current) {
        lastFrameRef.current = frame
        paint(frame, progress)
        if (frameLabelRef.current) {
          frameLabelRef.current.textContent = `JUVENTUS · FRAME ${String(frame + 1).padStart(3, '0')}/${FRAME_COUNT}`
        }
      } else {
        // Anche a frame costante, aggiorna camera (pan/zoom) ad ogni tick Lenis
        paint(frame, progress)
      }

      if (introRef.current) {
        introRef.current.style.opacity = String(Math.max(0, 1 - progress / 0.12))
      }
      if (meterRef.current) {
        meterRef.current.style.transform = `scaleX(${progress})`
      }

      applyEra(eraFromProgress(progress))
    }

    const loop = () => {
      if (cancelled) return
      if (activeRef.current) sync()
      rafId = requestAnimationFrame(loop)
    }

    const io = new IntersectionObserver(
      ([entry]) => {
        activeRef.current = entry.isIntersecting
        if (entry.isIntersecting) sync(true)
      },
      { rootMargin: '20% 0px 20% 0px', threshold: 0 },
    )
    io.observe(section)

    const preload = async () => {
      const fallback = new Image()
      fallback.decoding = 'async'
      fallback.src = ZEBRA_FALLBACK
      fallbackRef.current = fallback
      await fallback.decode().catch(() => undefined)

      const imgs: HTMLImageElement[] = new Array(FRAME_COUNT)
      let loaded = 0

      await Promise.all(
        Array.from({ length: FRAME_COUNT }, (_, i) => {
          return new Promise<void>((resolve) => {
            const img = new Image()
            img.decoding = 'async'
            img.src = FRAME_SRC(i)
            const done = () => {
              loaded += 1
              if (loaderBar) loaderBar.style.transform = `scaleX(${loaded / FRAME_COUNT})`
              resolve()
            }
            img.onload = done
            img.onerror = done
            imgs[i] = img
          })
        }),
      )

      if (cancelled) return
      framesRef.current = imgs
      setReady(true)
      activeRef.current = true
      resize()
      rafId = requestAnimationFrame(loop)
    }

    void preload()
    window.addEventListener('resize', resize)

    return () => {
      cancelled = true
      activeRef.current = false
      cancelAnimationFrame(rafId)
      io.disconnect()
      window.removeEventListener('resize', resize)
    }
  }, [reduceMotion])

  if (reduceMotion) {
    return (
      <section className="cinematic-pulse cinematic-pulse--static" id="chapter-storia" aria-labelledby="pulse-title" data-cinema-room="storia" ref={sectionRef}>
        <div className="cinematic-pulse__stage">
          <div className="cinematic-pulse__intro">
            <p className="eyebrow">Dal 1897 a oggi</p>
            <h2 id="pulse-title">
              Dentro
              <br />
              <i>la storia.</i>
            </h2>
          </div>
          <div className="cinematic-pulse__deck">
            {historyMilestones.map((item, index) => (
              <article className="cinematic-pulse__card is-active" key={item.year} data-era-grade={item.grade}>
                <div className="cinematic-pulse__year" aria-hidden="true">
                  {item.year}
                </div>
                <span>
                  {String(index + 1).padStart(2, '0')} / {String(historyMilestones.length).padStart(2, '0')} · {item.label}
                </span>
                <small>{item.era}</small>
                <h3>{item.title}</h3>
                <p>{item.copy}</p>
              </article>
            ))}
          </div>
        </div>
      </section>
    )
  }

  return (
    <section
      className={`cinematic-pulse cinematic-pulse--film${ready ? ' is-ready' : ''}`}
      id="chapter-storia"
      aria-labelledby="pulse-title"
      data-cinema-room="storia"
      ref={sectionRef}
      style={{ '--storia-eras': historyMilestones.length } as CSSProperties}
    >
      <div className="cinematic-pulse__stage">
        <div className="cinematic-pulse__film" aria-hidden="true">
          <canvas ref={canvasRef} className="cinematic-pulse__canvas" />
          {!ready && (
            <div className="cinematic-pulse__loader">
              <b>Carico la pellicola</b>
              <i data-storia-loader />
            </div>
          )}
        </div>

        <div className="cinematic-pulse__chrome">
          <div className="cinematic-pulse__intro" ref={introRef}>
            <p className="eyebrow">Pellicola bianconera</p>
            <h2 id="pulse-title">
              Dentro
              <br />
              <i>la storia.</i>
            </h2>
            <span>Scorri. Ogni frame è un pezzo di noi.</span>
          </div>

          <div className="cinematic-pulse__deck" aria-live="polite">
            {historyMilestones.map((item, index) => {
              const active = index === activeEra
              return (
                <article
                  className={`cinematic-pulse__card${active ? ' is-active' : ''}`}
                  key={item.year}
                  data-pulse-card
                  data-era-grade={item.grade}
                  aria-hidden={!active}
                >
                  <div className="cinematic-pulse__year" aria-hidden="true">
                    {item.year}
                  </div>
                  <span>
                    {String(index + 1).padStart(2, '0')} / {String(historyMilestones.length).padStart(2, '0')} · {item.label}
                  </span>
                  <small>{item.era}</small>
                  <h3>{item.title}</h3>
                  <p>{item.copy}</p>
                </article>
              )
            })}
          </div>
        </div>

        <div className="cinematic-pulse__meter" aria-hidden="true">
          <span ref={meterRef} data-storia-meter />
          <b ref={frameLabelRef}>JUVENTUS · FRAME 001/{FRAME_COUNT}</b>
        </div>
        <a className="cinematic-pulse__source" href="https://www.juventus.com/it/club/la-storia" target="_blank" rel="noreferrer">
          Fonte ufficiale Juventus <i aria-hidden="true">↗︎</i>
        </a>
      </div>
    </section>
  )
}
