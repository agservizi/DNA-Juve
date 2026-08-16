'use client'

import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'

const INTRO_KEY = 'bianconerihub:intro-seen'
const DURATION_MS = 11_500
const SHOT_MS = 2_050
const SOLID_AT = 8_600

type Shot = {
  src: string
  alt: string
  cam: {
    from: { scale: number; x: string; y: string; rotateX: number; rotateY: number; rotateZ: number }
    to: { scale: number; x: string; y: string; rotateX: number; rotateY: number; rotateZ: number }
  }
  focus: string
}

const SHOTS: Shot[] = [
  {
    src: '/media/intro/05-alps-aerial.png',
    alt: 'Allianz Stadium dall’alto verso le Alpi',
    focus: '52% 42%',
    cam: {
      from: { scale: 1.28, x: '-6%', y: '4%', rotateX: 8, rotateY: -10, rotateZ: -2 },
      to: { scale: 1.42, x: '2%', y: '-2%', rotateX: 2, rotateY: 4, rotateZ: 1 },
    },
  },
  {
    src: '/media/intro/01-facade-sun.png',
    alt: 'Facciata Allianz Stadium contro sole',
    focus: '50% 38%',
    cam: {
      from: { scale: 1.35, x: '8%', y: '6%', rotateX: 4, rotateY: 12, rotateZ: 2 },
      to: { scale: 1.55, x: '-2%', y: '-4%', rotateX: -2, rotateY: -4, rotateZ: -1 },
    },
  },
  {
    src: '/media/intro/02-interior-night.png',
    alt: 'Interno Allianz Stadium di notte',
    focus: '50% 55%',
    cam: {
      from: { scale: 1.22, x: '0%', y: '8%', rotateX: 12, rotateY: 0, rotateZ: 0 },
      to: { scale: 1.48, x: '0%', y: '-6%', rotateX: 0, rotateY: 0, rotateZ: 0 },
    },
  },
  {
    src: '/media/intro/03-roof-aerial.png',
    alt: 'Tetto e piloni Allianz Stadium',
    focus: '40% 48%',
    cam: {
      from: { scale: 1.32, x: '-10%', y: '2%', rotateX: 6, rotateY: -14, rotateZ: -3 },
      to: { scale: 1.5, x: '4%', y: '-2%', rotateX: 1, rotateY: 6, rotateZ: 1 },
    },
  },
  {
    src: '/media/intro/04-city-aerial.png',
    alt: 'Vista aerea Allianz Stadium e Torino',
    focus: '50% 45%',
    cam: {
      from: { scale: 1.26, x: '4%', y: '-4%', rotateX: 5, rotateY: 8, rotateZ: 1 },
      to: { scale: 1.4, x: '-3%', y: '2%', rotateX: 1, rotateY: -3, rotateZ: -1 },
    },
  },
  {
    src: '/media/intro/06-sunset.png',
    alt: 'Allianz Stadium al tramonto',
    focus: '48% 40%',
    cam: {
      from: { scale: 1.3, x: '-4%', y: '5%', rotateX: 3, rotateY: -6, rotateZ: 1 },
      to: { scale: 1.18, x: '0%', y: '0%', rotateX: 0, rotateY: 0, rotateZ: 0 },
    },
  },
]

function shouldPlayIntro(pathname: string) {
  if (pathname.startsWith('/admin') || pathname.startsWith('/area-bianconera')) return false
  if (pathname !== '/') return false
  try {
    return window.localStorage.getItem(INTRO_KEY) !== '1'
  } catch {
    return false
  }
}

function markSeen() {
  try {
    window.localStorage.setItem(INTRO_KEY, '1')
  } catch {
    /* ignore */
  }
}

export function SiteIntro() {
  const pathname = usePathname()
  const reduced = useReducedMotion()
  const stageRef = useRef<HTMLDivElement>(null)
  const [active, setActive] = useState(false)
  const [shot, setShot] = useState(0)
  const [solid, setSolid] = useState(false)
  const [tilt, setTilt] = useState({ x: 0, y: 0 })

  useEffect(() => {
    if (reduced || !shouldPlayIntro(pathname)) return
    setActive(true)
  }, [pathname, reduced])

  useEffect(() => {
    if (!active) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const shotTimers = SHOTS.map((_, index) =>
      window.setTimeout(() => setShot(index), index * SHOT_MS),
    )
    const solidTimer = window.setTimeout(() => setSolid(true), SOLID_AT)
    const endTimer = window.setTimeout(() => {
      markSeen()
      setActive(false)
    }, DURATION_MS)

    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' || event.key === 'Enter' || event.key === ' ') {
        event.preventDefault()
        markSeen()
        setActive(false)
      }
    }
    window.addEventListener('keydown', onKey)

    return () => {
      document.body.style.overflow = previous
      shotTimers.forEach((id) => window.clearTimeout(id))
      window.clearTimeout(solidTimer)
      window.clearTimeout(endTimer)
      window.removeEventListener('keydown', onKey)
    }
  }, [active])

  useEffect(() => {
    if (!active) return
    const fine = window.matchMedia('(pointer: fine)').matches
    if (!fine) return

    const onMove = (event: PointerEvent) => {
      const nx = (event.clientX / window.innerWidth - 0.5) * 2
      const ny = (event.clientY / window.innerHeight - 0.5) * 2
      setTilt({ x: ny * -3.5, y: nx * 4.5 })
    }
    window.addEventListener('pointermove', onMove, { passive: true })
    return () => window.removeEventListener('pointermove', onMove)
  }, [active])

  const dismiss = () => {
    markSeen()
    setActive(false)
  }

  const current = SHOTS[shot] ?? SHOTS[0]

  return (
    <AnimatePresence>
      {active ? (
        <motion.div
          className="site-intro"
          role="dialog"
          aria-modal="true"
          aria-label="Introduzione BianconeriHub"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, filter: 'blur(14px)' }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="site-intro__letterbox site-intro__letterbox--top" aria-hidden="true" />
          <div className="site-intro__letterbox site-intro__letterbox--bottom" aria-hidden="true" />

          <div
            ref={stageRef}
            className="site-intro__world"
            aria-hidden="true"
            style={{
              transform: `perspective(1200px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`,
            }}
          >
            <AnimatePresence mode="sync">
              {SHOTS.map((item, index) =>
                index === shot ? (
                  <motion.div
                    key={item.src}
                    className="site-intro__shot"
                    initial={{ opacity: 0, filter: 'blur(16px)' }}
                    animate={{ opacity: 1, filter: 'blur(0px)' }}
                    exit={{ opacity: 0, filter: 'blur(12px)' }}
                    transition={{ duration: 1.05, ease: [0.22, 1, 0.36, 1] }}
                  >
                    <div className="site-intro__rig">
                      <motion.img
                        className="site-intro__plate site-intro__plate--far"
                        src={item.src}
                        alt=""
                        style={{ objectPosition: item.focus }}
                        initial={{
                          scale: item.cam.from.scale * 0.94,
                          x: item.cam.from.x,
                          y: item.cam.from.y,
                          rotateX: item.cam.from.rotateX * 0.6,
                          rotateY: item.cam.from.rotateY * 0.6,
                          rotateZ: item.cam.from.rotateZ,
                        }}
                        animate={{
                          scale: item.cam.to.scale * 0.94,
                          x: item.cam.to.x,
                          y: item.cam.to.y,
                          rotateX: item.cam.to.rotateX * 0.6,
                          rotateY: item.cam.to.rotateY * 0.6,
                          rotateZ: item.cam.to.rotateZ,
                        }}
                        transition={{ duration: SHOT_MS / 1000 + 0.35, ease: 'linear' }}
                        draggable={false}
                      />
                      <motion.img
                        className="site-intro__plate site-intro__plate--hero"
                        src={item.src}
                        alt=""
                        style={{ objectPosition: item.focus }}
                        initial={{
                          scale: item.cam.from.scale,
                          x: item.cam.from.x,
                          y: item.cam.from.y,
                          rotateX: item.cam.from.rotateX,
                          rotateY: item.cam.from.rotateY,
                          rotateZ: item.cam.from.rotateZ,
                        }}
                        animate={{
                          scale: item.cam.to.scale,
                          x: item.cam.to.x,
                          y: item.cam.to.y,
                          rotateX: item.cam.to.rotateX,
                          rotateY: item.cam.to.rotateY,
                          rotateZ: item.cam.to.rotateZ,
                        }}
                        transition={{ duration: SHOT_MS / 1000 + 0.35, ease: 'linear' }}
                        draggable={false}
                      />
                    </div>
                  </motion.div>
                ) : null,
              )}
            </AnimatePresence>

            <div className="site-intro__depth-fog" data-solid={solid ? '1' : '0'} />
            <div className="site-intro__bloom" />
            <div className="site-intro__sweep" key={current.src} />
            <div className="site-intro__grain" />
            <div className="site-intro__frame" />
          </div>

          {/* Knockout logo: stadium shows through the letters, then solidifies */}
          <div className={`site-intro__mask${solid ? ' is-solid' : ''}`} aria-hidden="true">
            <motion.p
              className="site-intro__logo"
              initial={{ opacity: 0, scale: 1.08 }}
              animate={{ opacity: 1, scale: solid ? 1.02 : 1 }}
              transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
            >
              BIANCONERI<span>HUB</span>
            </motion.p>
          </div>

          <motion.p
            className="site-intro__tag"
            initial={{ opacity: 0 }}
            animate={{ opacity: solid ? 1 : 0.55 }}
            transition={{ duration: 0.7 }}
          >
            {solid ? '#FINOALLAFINE' : 'Allianz Stadium · Torino'}
          </motion.p>

          <button className="site-intro__skip" type="button" onClick={dismiss}>
            Salta intro
          </button>

          <div className="site-intro__progress" aria-hidden="true">
            <motion.i
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ duration: DURATION_MS / 1000, ease: 'linear' }}
            />
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}
