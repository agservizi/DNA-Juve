'use client'

import { usePathname } from 'next/navigation'
import { useEffect } from 'react'

/** Fallback house motion for pages without data-local-motion — clip/wipe only, no fade-up. */
export function GlobalPageChoreography() {
  const pathname = usePathname()
  useEffect(() => {
    if (pathname.startsWith('/admin') || matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const main = document.querySelector<HTMLElement>('main#contenuto')
    if (
      !main ||
      main.dataset.localMotion === 'true' ||
      main.closest('[data-local-motion="true"]') ||
      main.querySelector('[data-community-intro],[data-hero],[data-article-enter]')
    )
      return
    let context: { revert(): void } | undefined
    let cancelled = false
    Promise.all([import('gsap'), import('gsap/ScrollTrigger')])
      .then(([g, t]) => {
        if (cancelled || !main) return
        const gsap = g.gsap
        const ScrollTrigger = t.ScrollTrigger
        gsap.registerPlugin(ScrollTrigger)
        main.classList.add('global-motion-active')
        context = gsap.context(() => {
          const title = main.querySelector('h1')
          if (title)
            gsap.fromTo(
              title,
              { clipPath: 'inset(0 100% 0 0)' },
              { clipPath: 'inset(0 0% 0 0)', duration: 1.25, ease: 'power4.out' },
            )
          const intro = [...main.querySelectorAll<HTMLElement>('h1 + p, header > p, [class*="eyebrow"], [class*="kicker"]')].slice(0, 6)
          gsap.fromTo(
            intro,
            { clipPath: 'inset(0 0 100% 0)' },
            { clipPath: 'inset(0 0 0% 0)', duration: 0.9, stagger: 0.07, ease: 'power3.out' },
          )
          const candidates = [...main.querySelectorAll<HTMLElement>(':scope > section, article, [class*="card"], [class*="panel"]')].slice(0, 24)
          const reveals = candidates.filter((node) => !candidates.some((other) => other !== node && other.contains(node)))
          ScrollTrigger.batch(reveals, {
            start: 'top 90%',
            once: true,
            onEnter: (batch) =>
              gsap.fromTo(
                batch,
                { clipPath: 'inset(10% 0 10% 0)' },
                { clipPath: 'inset(0% 0 0% 0)', duration: 0.95, stagger: 0.055, ease: 'power3.out', overwrite: 'auto' },
              ),
          })
          ;[...main.querySelectorAll<HTMLElement>('figure img, article img')].slice(0, 8).forEach((image) =>
            gsap.fromTo(
              image,
              { scale: 1.055 },
              { scale: 1, ease: 'none', scrollTrigger: { trigger: image, start: 'top bottom', end: 'bottom top', scrub: 0.8 } },
            ),
          )
        }, main)
      })
      .catch(() => {})
    return () => {
      cancelled = true
      context?.revert()
      main.classList.remove('global-motion-active')
    }
  }, [pathname])
  return null
}
