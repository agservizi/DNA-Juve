'use client'

import { useEffect, useRef } from 'react'
import Lenis from 'lenis'
import { usePathname } from 'next/navigation'
import { MotionConfig } from 'motion/react'
import { ImmersiveOrchestrator } from '@/components/immersive-orchestrator'
import { GlobalPageChoreography } from '@/components/global-page-choreography'
import { AmbientWebGLGate } from '@/components/ambient-webgl-gate'
import { GlobalKineticInteractions } from '@/components/global-kinetic-interactions'
import { CinematicMediaLayer } from '@/components/cinematic-media-layer'
import { CinematicDirector } from '@/components/cinematic-director'
import { CinematicChapterNav } from '@/components/cinematic-chapter-nav'

export function ExperienceProviders({ children }: { children: React.ReactNode }) {
  const lenisRef = useRef<Lenis | null>(null)
  const pathname = usePathname()
  const isAppShell=pathname.startsWith('/admin')||pathname.startsWith('/area-bianconera')

  useEffect(() => {
    if (isAppShell) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    let disposed = false
    let cleanup = () => {}

    Promise.all([import('gsap'), import('gsap/ScrollTrigger')]).then(([gsapModule, triggerModule]) => {
      if (disposed) return
      const gsap = gsapModule.gsap
      const ScrollTrigger = triggerModule.ScrollTrigger
      gsap.registerPlugin(ScrollTrigger)

      const lenis = new Lenis({ lerp: .085, smoothWheel: true, syncTouch: false, wheelMultiplier: .9 })
      lenisRef.current = lenis
      const update = (time: number) => lenis.raf(time * 1000)
      lenis.on('scroll', ScrollTrigger.update)
      gsap.ticker.add(update)
      gsap.ticker.lagSmoothing(0)
      const visibility=()=>document.hidden?lenis.stop():lenis.start()
      document.addEventListener('visibilitychange',visibility)

      cleanup = () => {
        document.removeEventListener('visibilitychange',visibility)
        gsap.ticker.remove(update)
        lenis.destroy()
        lenisRef.current = null
      }
    })

    return () => { disposed = true; cleanup() }
  }, [isAppShell])

  useEffect(()=>{
    if(isAppShell)return
    let second=0
    const first=requestAnimationFrame(()=>{second=requestAnimationFrame(()=>{
      lenisRef.current?.resize()
      import('gsap/ScrollTrigger').then(({ScrollTrigger})=>ScrollTrigger.refresh()).catch(()=>{})
    })})
    return()=>{cancelAnimationFrame(first);cancelAnimationFrame(second)}
  },[isAppShell,pathname])

  return <MotionConfig reducedMotion="user">{!isAppShell&&<><CinematicDirector/><AmbientWebGLGate/><CinematicMediaLayer/><ImmersiveOrchestrator/><GlobalPageChoreography/><GlobalKineticInteractions/><CinematicChapterNav/></>}{children}</MotionConfig>
}
