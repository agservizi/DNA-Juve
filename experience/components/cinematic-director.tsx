'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'

const isExcluded = (pathname: string) => pathname.startsWith('/admin') || pathname.startsWith('/area-bianconera')

export function CinematicDirector() {
  const pathname = usePathname()

  useEffect(() => {
    if (isExcluded(pathname) || matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const root = document.documentElement
    const finePointer = matchMedia('(pointer: fine) and (min-width: 900px)').matches
    let disposed = false
    let context: { revert(): void } | undefined
    let removePointer = () => {}

    Promise.all([import('gsap'), import('gsap/ScrollTrigger'), import('@theatre/core')]).then(([g, trigger, theatre]) => {
      if (disposed) return
      const gsap = g.gsap
      const ScrollTrigger = trigger.ScrollTrigger
      gsap.registerPlugin(ScrollTrigger)
      const project = theatre.getProject('BianconeriHub Cinematic Director')
      const sheet = project.sheet('Public experience')
      sheet.object('Atmosphere', { depth: 1, glow: .55, grain: .035 })
      project.ready.then(() => { if (!disposed) root.dataset.cinematicDirector = 'ready' })

      context = gsap.context(() => {
        gsap.set(root, { '--cinema-route': Math.abs([...pathname].reduce((sum, char) => sum + char.charCodeAt(0), 0)) % 360 })
        const sections = gsap.utils.toArray<HTMLElement>('main#contenuto > section')
        sections.forEach((section, index) => {
          section.dataset.cinematicSection = String(index + 1).padStart(2, '0')
          gsap.fromTo(section,
            { '--section-depth': -1, '--section-light': 0 },
            { '--section-depth': 1, '--section-light': 1, ease: 'none', scrollTrigger: { trigger: section, start: 'top bottom', end: 'bottom top', scrub: 1.15 } }
          )
        })
        ScrollTrigger.create({
          start: 0,
          end: 'max',
          onUpdate: self => {
            root.style.setProperty('--cinema-progress', self.progress.toFixed(4))
            root.style.setProperty('--cinema-velocity', Math.min(1, Math.abs(self.getVelocity()) / 2200).toFixed(3))
          },
        })
      })

      if (finePointer) {
        const x = gsap.quickTo(root, '--cinema-x', { duration: .75, ease: 'power3.out' })
        const y = gsap.quickTo(root, '--cinema-y', { duration: .75, ease: 'power3.out' })
        const move = (event: PointerEvent) => { x(event.clientX / innerWidth); y(event.clientY / innerHeight) }
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
      root.style.removeProperty('--cinema-progress')
      root.style.removeProperty('--cinema-velocity')
      root.style.removeProperty('--cinema-x')
      root.style.removeProperty('--cinema-y')
    }
  }, [pathname])

  if (isExcluded(pathname)) return null
  return <div className="cinematic-director" aria-hidden="true">
    <div className="cinematic-director__aura" />
    <div className="cinematic-director__aperture" />
    <div className="cinematic-director__scan" />
    <div className="cinematic-director__grain" />
    <div className="cinematic-director__frame"><i/><i/><i/><i/></div>
    <div className="cinematic-director__hud cinematic-director__hud--left">BHH · EXPERIENCE / 2026</div>
    <div className="cinematic-director__hud cinematic-director__hud--right">SCROLL · DISCOVER · RETURN</div>
  </div>
}
