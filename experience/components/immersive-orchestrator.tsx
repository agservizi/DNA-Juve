'use client'

import { AnimatePresence, motion, useMotionValue, useReducedMotion, useScroll, useSpring } from 'motion/react'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'

export function ImmersiveOrchestrator() {
  const pathname=usePathname(),reduced=useReducedMotion(),{scrollYProgress}=useScroll()
  const progress=useSpring(scrollYProgress,{stiffness:115,damping:28,mass:.22})
  const pointerX=useMotionValue(-240),pointerY=useMotionValue(-240)
  const x=useSpring(pointerX,{stiffness:90,damping:24,mass:.35}),y=useSpring(pointerY,{stiffness:90,damping:24,mass:.35})
  const [finePointer,setFinePointer]=useState(false)

  useEffect(()=>{
    if(reduced||pathname.startsWith('/admin'))return
    const query=matchMedia('(pointer:fine) and (min-width:900px)')
    const update=()=>setFinePointer(query.matches)
    const move=(event:PointerEvent)=>{pointerX.set(event.clientX-190);pointerY.set(event.clientY-190)}
    update();query.addEventListener('change',update);window.addEventListener('pointermove',move,{passive:true})
    return()=>{query.removeEventListener('change',update);window.removeEventListener('pointermove',move)}
  },[pathname,pointerX,pointerY,reduced])

  if(pathname.startsWith('/admin'))return null
  return <><div className="immersive-background" aria-hidden="true">{!reduced&&<><div className="immersive-depth-grid"/><div className="immersive-lens"/></>}</div><div className="immersive-orchestrator" aria-hidden="true">
    {!reduced&&<motion.div className="immersive-progress" style={{scaleX:progress}}/>}
    {!reduced&&finePointer&&<motion.div className="immersive-pointer" style={{x,y}}/>}
    <AnimatePresence mode="popLayout" initial={false}>
      <motion.div key={pathname} className="route-curtain" initial={reduced?false:{scaleX:1}} animate={{scaleX:0}} exit={{scaleX:0}} transition={{duration:.82,ease:[.76,0,.24,1]}}/>
    </AnimatePresence>
  </div></>
}
