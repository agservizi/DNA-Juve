'use client'
import { useEffect, useRef, type ReactNode } from 'react'
import { useReducedMotion } from 'motion/react'

export function EditorialPremiumShell({ children, tone = 'light' }: { children: ReactNode; tone?: 'light' | 'dark' }) {
  const root = useRef<HTMLDivElement>(null)
  const reduced = useReducedMotion()
  useEffect(() => {
    if (reduced || !root.current) return
    let ctx: { revert(): void } | undefined
    let cancelled = false
    Promise.all([import('gsap'), import('gsap/ScrollTrigger')]).then(([g, st]) => {
      if (cancelled || !root.current) return
      g.gsap.registerPlugin(st.ScrollTrigger)
      ctx = g.gsap.context(() => {
        const intro=g.gsap.timeline({defaults:{ease:'power4.out'}})
        intro.fromTo('h1',{clipPath:'inset(0 100% 0 0)',x:-42},{clipPath:'inset(0 0% 0 0)',x:0,duration:1.35})
          .fromTo('[data-premium-intro]:not(h1)', { y: 48, opacity: 0 }, { y: 0, opacity: 1, duration: .95, stagger: .09 },.28)
        g.gsap.to('h1',{yPercent:-12,ease:'none',scrollTrigger:{trigger:'h1',start:'top 28%',end:'bottom top',scrub:.65}})
        g.gsap.utils.toArray<HTMLElement>('[data-premium-reveal]').forEach((el,index) => g.gsap.fromTo(el, { y: 80,opacity:0,rotateX:4,scale:.975 }, { y:0,opacity:1,rotateX:0,scale:1,duration:1,ease:'power3.out',delay:index%3*.035,scrollTrigger:{trigger:el,start:'top 90%',once:true} }))
      }, root)
    })
    return () => { cancelled = true; ctx?.revert() }
  }, [reduced])
  return <div ref={root} data-tone={tone} data-local-motion="true">{children}</div>
}
