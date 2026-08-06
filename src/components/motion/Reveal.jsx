import { useLayoutEffect, useRef } from 'react'
import { loadGsap, prefersReducedMotion } from '@/lib/gsap'

export default function Reveal({
  as: Component = 'div',
  children,
  className = '',
  fromY = 18,
  duration = 0.6,
  delay = 0,
  start = 'top 88%',
  once = true,
}) {
  const elRef = useRef(null)

  useLayoutEffect(() => {
    if (!elRef.current) return
    if (prefersReducedMotion()) return

    let ctx = null
    let cancelled = false

    ;(async () => {
      const { gsap } = await loadGsap()
      if (cancelled || !elRef.current) return

      ctx = gsap.context(() => {
        gsap.fromTo(
          elRef.current,
          { y: fromY, opacity: 0 },
          {
            y: 0,
            opacity: 1,
            duration,
            delay,
            ease: 'power3.out',
            scrollTrigger: {
              trigger: elRef.current,
              start,
              once,
            },
          },
        )
      }, elRef)
    })()

    return () => {
      cancelled = true
      ctx?.revert()
    }
  }, [fromY, duration, delay, start, once])

  return (
    <Component ref={elRef} className={className}>
      {children}
    </Component>
  )
}

