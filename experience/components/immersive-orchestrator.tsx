'use client'

import { motion, useMotionValue, useReducedMotion, useScroll, useSpring } from 'motion/react'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'

/** Scroll progress + home pointer glow. Route changes use a light CSS crossfade only. */
export function ImmersiveOrchestrator() {
  const pathname = usePathname()
  const reduced = useReducedMotion()
  const { scrollYProgress } = useScroll()
  const progress = useSpring(scrollYProgress, { stiffness: 115, damping: 28, mass: 0.22 })
  const pointerX = useMotionValue(-240)
  const pointerY = useMotionValue(-240)
  const x = useSpring(pointerX, { stiffness: 90, damping: 24, mass: 0.35 })
  const y = useSpring(pointerY, { stiffness: 90, damping: 24, mass: 0.35 })
  const [finePointer, setFinePointer] = useState(false)

  useEffect(() => {
    if (reduced || pathname.startsWith('/admin')) return
    const query = matchMedia('(pointer:fine) and (min-width:900px)')
    const update = () => setFinePointer(query.matches)
    const move = (event: PointerEvent) => {
      pointerX.set(event.clientX - 190)
      pointerY.set(event.clientY - 190)
    }
    update()
    query.addEventListener('change', update)
    window.addEventListener('pointermove', move, { passive: true })
    return () => {
      query.removeEventListener('change', update)
      window.removeEventListener('pointermove', move)
    }
  }, [pathname, pointerX, pointerY, reduced])

  if (pathname.startsWith('/admin')) return null

  return (
    <>
      <div className="immersive-background" aria-hidden="true">
        {!reduced && pathname === '/' && <div className="immersive-depth-grid" />}
      </div>
      <div className="immersive-orchestrator" aria-hidden="true">
        {!reduced && <motion.div className="immersive-progress" style={{ scaleX: progress }} />}
        {!reduced && finePointer && pathname === '/' && <motion.div className="immersive-pointer" style={{ x, y }} />}
      </div>
    </>
  )
}
