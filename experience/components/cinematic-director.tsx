'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { setCinemaProgress } from '@/lib/cinema-spine'

const isExcluded = (pathname: string) => pathname.startsWith('/admin') || pathname.startsWith('/area-bianconera')

/** Global scroll → CSS cinema bus. No Theatre stubs. HUD only on homepage pulse via CSS. */
export function CinematicDirector() {
  const pathname = usePathname()

  useEffect(() => {
    if (isExcluded(pathname) || matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const root = document.documentElement
    const finePointer = matchMedia('(pointer: fine) and (min-width: 900px)').matches
    let disposed = false
    let context: { revert(): void } | undefined
    let removePointer = () => {}

    Promise.all([import('gsap'), import('gsap/ScrollTrigger')]).then(([g, trigger]) => {
      if (disposed) return
      const gsap = g.gsap
      const ScrollTrigger = trigger.ScrollTrigger
      gsap.registerPlugin(ScrollTrigger)

      context = gsap.context(() => {
        gsap.set(root, { '--cinema-route': Math.abs([...pathname].reduce((sum, char) => sum + char.charCodeAt(0), 0)) % 360 })
        const sections = gsap.utils.toArray<HTMLElement>('main#contenuto > section')
        sections.forEach((section, index) => {
          section.dataset.cinematicSection = String(index + 1).padStart(2, '0')
          gsap.fromTo(
            section,
            { '--section-depth': -1, '--section-light': 0 },
            {
              '--section-depth': 1,
              '--section-light': 1,
              ease: 'none',
              scrollTrigger: { trigger: section, start: 'top bottom', end: 'bottom top', scrub: 1.15 },
            },
          )
        })
        ScrollTrigger.create({
          start: 0,
          end: 'max',
          onUpdate: (self) => setCinemaProgress(root, self.progress, self.getVelocity()),
        })
      })

      if (finePointer) {
        const x = gsap.quickTo(root, '--cinema-x', { duration: 0.75, ease: 'power3.out' })
        const y = gsap.quickTo(root, '--cinema-y', { duration: 0.75, ease: 'power3.out' })
        const move = (event: PointerEvent) => {
          x(event.clientX / innerWidth)
          y(event.clientY / innerHeight)
        }
        window.addEventListener('pointermove', move, { passive: true })
        removePointer = () => window.removeEventListener('pointermove', move)
      }
      ScrollTrigger.refresh()
    }).catch(() => {})

    return () => {
      disposed = true
      removePointer()
      context?.revert()
      delete root.dataset.cinematicDirector
      delete root.dataset.cinemaEra
      root.style.removeProperty('--cinema-progress')
      root.style.removeProperty('--cinema-velocity')
      root.style.removeProperty('--cinema-spine')
      root.style.removeProperty('--cinema-era')
      root.style.removeProperty('--cinema-era-grade')
      root.style.removeProperty('--cinema-x')
      root.style.removeProperty('--cinema-y')
    }
  }, [pathname])

  if (isExcluded(pathname)) return null
  const isHome = pathname === '/'
  return (
    <div className="cinematic-director" data-home={isHome || undefined} aria-hidden="true">
      <div className="cinematic-director__aura" />
      {isHome && <div className="cinematic-director__aperture" />}
      {isHome && <div className="cinematic-director__frame"><i /><i /><i /><i /></div>}
    </div>
  )
}
