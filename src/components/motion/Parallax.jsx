import { useLayoutEffect, useRef } from 'react'
import { loadGsap, prefersReducedMotion } from '@/lib/gsap'

export default function Parallax({
  as: Component = 'div',
  children,
  className = '',
  y = 16,
  start = 'top bottom',
  end = 'bottom top',
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
          { y: -y },
          {
            y,
            ease: 'none',
            scrollTrigger: {
              trigger: elRef.current,
              start,
              end,
              scrub: true,
            },
          },
        )
      }, elRef)
    })()

    return () => {
      cancelled = true
      ctx?.revert()
    }
  }, [y, start, end])

  return (
    <Component ref={elRef} className={className}>
      {children}
    </Component>
  )
}

