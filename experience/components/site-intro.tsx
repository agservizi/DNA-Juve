'use client'

import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'

const INTRO_KEY = 'bianconerihub:intro-seen'
const DURATION_MS = 10_000

const SHOTS = [
  {
    src: '/media/intro/05-alps-aerial.png',
    alt: 'Allianz Stadium dall’alto verso le Alpi',
    ken: { from: 1.08, to: 1.18, x: '2%', y: '0%' },
  },
  {
    src: '/media/intro/01-facade-sun.png',
    alt: 'Facciata Allianz Stadium contro sole',
    ken: { from: 1.12, to: 1.22, x: '-3%', y: '4%' },
  },
  {
    src: '/media/intro/02-interior-night.png',
    alt: 'Interno Allianz Stadium di notte',
    ken: { from: 1.06, to: 1.16, x: '0%', y: '-2%' },
  },
  {
    src: '/media/intro/03-roof-aerial.png',
    alt: 'Tetto e piloni Allianz Stadium',
    ken: { from: 1.1, to: 1.2, x: '4%', y: '2%' },
  },
  {
    src: '/media/intro/06-sunset.png',
    alt: 'Allianz Stadium al tramonto',
    ken: { from: 1.08, to: 1.16, x: '-2%', y: '3%' },
  },
] as const

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
  const [active, setActive] = useState(false)
  const [shot, setShot] = useState(0)
  const [brand, setBrand] = useState(false)

  useEffect(() => {
    if (reduced || !shouldPlayIntro(pathname)) return
    setActive(true)
  }, [pathname, reduced])

  useEffect(() => {
    if (!active) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const shotTimers = SHOTS.map((_, index) =>
      window.setTimeout(() => setShot(index), Math.round((index / SHOTS.length) * 7200)),
    )
    const brandTimer = window.setTimeout(() => setBrand(true), 7200)
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
      window.clearTimeout(brandTimer)
      window.clearTimeout(endTimer)
      window.removeEventListener('keydown', onKey)
    }
  }, [active])

  const dismiss = () => {
    markSeen()
    setActive(false)
  }

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
          exit={{ opacity: 0 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="site-intro__stage" aria-hidden="true">
            <AnimatePresence mode="sync">
              {SHOTS.map((item, index) =>
                index === shot ? (
                  <motion.div
                    key={item.src}
                    className="site-intro__shot"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.85, ease: [0.22, 1, 0.36, 1] }}
                  >
                    <motion.img
                      src={item.src}
                      alt=""
                      initial={{
                        scale: item.ken.from,
                        x: item.ken.x,
                        y: item.ken.y,
                      }}
                      animate={{ scale: item.ken.to, x: '0%', y: '0%' }}
                      transition={{ duration: 2.4, ease: 'linear' }}
                      draggable={false}
                    />
                  </motion.div>
                ) : null,
              )}
            </AnimatePresence>
            <div className="site-intro__veil" />
            <div className="site-intro__grain" />
            <div className="site-intro__frame" />
          </div>

          <AnimatePresence>
            {brand ? (
              <motion.div
                className="site-intro__brand"
                initial={{ opacity: 0, y: 28 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
              >
                <p>Allianz Stadium · Torino</p>
                <strong>
                  BIANCONERI<span>HUB</span>
                </strong>
                <span>#FINOALLAFINE</span>
              </motion.div>
            ) : (
              <motion.p
                className="site-intro__kicker"
                key="kicker"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                La casa bianconera
              </motion.p>
            )}
          </AnimatePresence>

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
