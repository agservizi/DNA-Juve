let _cached = null

export function prefersReducedMotion() {
  if (typeof window === 'undefined') return true
  return window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ?? false
}

export async function loadGsap() {
  if (_cached) return _cached

  const [{ default: gsapDefault, gsap: gsapNamed }, { ScrollTrigger }] = await Promise.all([
    import('gsap'),
    import('gsap/ScrollTrigger'),
  ])

  const gsap = gsapNamed || gsapDefault
  if (!gsap) throw new Error('GSAP failed to load')

  // Idempotent across HMR/re-mounts.
  gsap.registerPlugin(ScrollTrigger)

  _cached = { gsap, ScrollTrigger }
  return _cached
}

