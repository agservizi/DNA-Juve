'use client'

import { usePathname } from 'next/navigation'
import { useEffect } from 'react'

export function GlobalPageChoreography(){
 const pathname=usePathname()
 useEffect(()=>{
  if(pathname.startsWith('/admin')||matchMedia('(prefers-reduced-motion: reduce)').matches)return
  const main=document.querySelector<HTMLElement>('main#contenuto')
  if(!main||main.dataset.localMotion==='true'||main.closest('[data-local-motion="true"]')||main.querySelector('[data-community-intro],[data-hero],[data-article-enter]'))return
  let context:{revert():void}|undefined,cancelled=false
  Promise.all([import('gsap'),import('gsap/ScrollTrigger')]).then(([g,t])=>{
   if(cancelled||!main)return
   const gsap=g.gsap,ScrollTrigger=t.ScrollTrigger;gsap.registerPlugin(ScrollTrigger)
   main.classList.add('global-motion-active')
   context=gsap.context(()=>{
    const title=main.querySelector('h1')
    if(title)gsap.fromTo(title,{clipPath:'inset(0 100% 0 0)',y:48},{clipPath:'inset(0 0% 0 0)',y:0,duration:1.25,ease:'power4.out'})
    const intro=[...main.querySelectorAll<HTMLElement>('h1 + p, header > p, [class*="eyebrow"], [class*="kicker"]')].slice(0,6)
    gsap.fromTo(intro,{y:28,opacity:0},{y:0,opacity:1,duration:.8,stagger:.07,ease:'power3.out'})
    const candidates=[...main.querySelectorAll<HTMLElement>(':scope > section, article, [class*="card"], [class*="panel"]')].slice(0,24)
    const reveals=candidates.filter(node=>!candidates.some(other=>other!==node&&other.contains(node)))
    ScrollTrigger.batch(reveals,{start:'top 90%',once:true,onEnter:batch=>gsap.fromTo(batch,{y:72,opacity:0,scale:.985},{y:0,opacity:1,scale:1,duration:.9,stagger:.055,ease:'power3.out',overwrite:'auto'})})
    ;[...main.querySelectorAll<HTMLElement>('figure img, article img')].slice(0,8).forEach(image=>gsap.fromTo(image,{scale:1.055},{scale:1,ease:'none',scrollTrigger:{trigger:image,start:'top bottom',end:'bottom top',scrub:.8}}))
    ;[...main.querySelectorAll<HTMLElement>('h2')].slice(0,12).forEach(heading=>gsap.fromTo(heading,{backgroundPosition:'100% 0%'},{backgroundPosition:'0% 0%',ease:'none',scrollTrigger:{trigger:heading,start:'top 92%',end:'bottom 35%',scrub:.8}}))
    ;[...main.querySelectorAll<HTMLElement>('section')].slice(0,12).forEach((section,index)=>gsap.to(section,{x:index%2?8:-8,ease:'none',scrollTrigger:{trigger:section,start:'top bottom',end:'bottom top',scrub:1.4}}))
   },main)
  }).catch(()=>{})
  return()=>{cancelled=true;context?.revert();main.classList.remove('global-motion-active')}
 },[pathname])
 return null
}
