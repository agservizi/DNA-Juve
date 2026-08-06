'use client'

import {useEffect} from 'react'
import {usePathname} from 'next/navigation'

const actionSelector='a[class*="action"],a[class*="button"],button,.kinetic-cta,.text-link'
const surfaceSelector='article,[class*="card"],[class*="panel"],[class*="story-shell"]'

export function GlobalKineticInteractions(){
 const pathname=usePathname()
 useEffect(()=>{
  if(pathname.startsWith('/admin')||matchMedia('(prefers-reduced-motion: reduce),(pointer: coarse)').matches)return
  let frame=0,last:PointerEvent|null=null
  const reset=(node:HTMLElement)=>{node.style.removeProperty('--kinetic-x');node.style.removeProperty('--kinetic-y')}
  const resetSurface=(node:HTMLElement)=>{node.classList.remove('kinetic-surface');node.style.removeProperty('--tilt-x');node.style.removeProperty('--tilt-y');node.style.removeProperty('--lift-z')}
  const move=(event:PointerEvent)=>{
   last=event;if(frame)return
   frame=requestAnimationFrame(()=>{
    frame=0;if(!last)return
    const target=last.target as Element|null
    const action=target?.closest<HTMLElement>(actionSelector)
    if(action){const r=action.getBoundingClientRect(),x=(last.clientX-r.left-r.width/2)*.075,y=(last.clientY-r.top-r.height/2)*.075;action.style.setProperty('--kinetic-x',`${x.toFixed(2)}px`);action.style.setProperty('--kinetic-y',`${y.toFixed(2)}px`)}
    const surface=target?.closest<HTMLElement>(surfaceSelector)
    if(surface){const r=surface.getBoundingClientRect(),px=(last.clientX-r.left)/r.width,py=(last.clientY-r.top)/r.height;surface.classList.add('kinetic-surface');surface.style.setProperty('--spot-x',`${(px*100).toFixed(1)}%`);surface.style.setProperty('--spot-y',`${(py*100).toFixed(1)}%`);surface.style.setProperty('--tilt-x',`${((.5-py)*3.2).toFixed(2)}deg`);surface.style.setProperty('--tilt-y',`${((px-.5)*4.2).toFixed(2)}deg`);surface.style.setProperty('--lift-z','12px')}
   })
  }
  const out=(event:PointerEvent)=>{const from=event.target as Element|null,to=event.relatedTarget as Node|null;const action=from?.closest<HTMLElement>(actionSelector);if(action&&!to?.parentElement?.closest?.(actionSelector)&&!action.contains(to))reset(action);const surface=from?.closest<HTMLElement>(surfaceSelector);if(surface&&!surface.contains(to))resetSurface(surface)}
  document.addEventListener('pointermove',move,{passive:true});document.addEventListener('pointerout',out,{passive:true})
  return()=>{cancelAnimationFrame(frame);document.removeEventListener('pointermove',move);document.removeEventListener('pointerout',out);document.querySelectorAll<HTMLElement>('.kinetic-surface').forEach(resetSurface)}
 },[pathname])
 return null
}
