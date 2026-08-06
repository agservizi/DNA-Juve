'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'

type Chapter={id:string;label:string}

export function CinematicChapterNav(){
 const pathname=usePathname(),reduced=useReducedMotion()
 const [chapters,setChapters]=useState<Chapter[]>([]),[active,setActive]=useState(0),[open,setOpen]=useState(false)
 useEffect(()=>{
  if(pathname.startsWith('/admin')||pathname.startsWith('/area-bianconera'))return
  let observer:IntersectionObserver|undefined,frame=requestAnimationFrame(()=>{
   const sections=[...document.querySelectorAll<HTMLElement>('main#contenuto > section')].filter(x=>x.offsetHeight>180)
   const next=sections.map((section,index)=>{
    if(!section.id)section.id=`chapter-${index+1}`
    const visibleTitle=section.querySelector<HTMLElement>('h1,h2')?.textContent?.replace(/\s+/g,' ').trim()
    const ownLabel=section.getAttribute('aria-label')?.trim()
    const nestedLabel=section.querySelector<HTMLElement>('[aria-label]')?.getAttribute('aria-label')?.trim()
    const title=visibleTitle||ownLabel||nestedLabel
    return{id:section.id,label:(title||`Capitolo ${index+1}`).slice(0,38)}
   })
   setChapters(next)
   observer=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting){const index=sections.indexOf(entry.target as HTMLElement);if(index>=0)setActive(index)}}),{rootMargin:'-38% 0px -52%',threshold:0})
   sections.forEach(section=>observer?.observe(section))
  })
  return()=>{cancelAnimationFrame(frame);observer?.disconnect()}
 },[pathname])
 if(chapters.length<2)return null
 const go=(id:string)=>{document.getElementById(id)?.scrollIntoView({behavior:reduced?'auto':'smooth',block:'start'});setOpen(false)}
 return <aside className="chapter-nav" data-open={open} aria-label="Navigazione capitoli">
  <button className="chapter-nav__toggle" type="button" onClick={()=>setOpen(value=>!value)} aria-expanded={open}><span>{String(active+1).padStart(2,'0')}</span><i/><b>{chapters[active]?.label}</b></button>
  <AnimatePresence>{open&&<motion.div className="chapter-nav__panel" initial={{opacity:0,x:24,scale:.96}} animate={{opacity:1,x:0,scale:1}} exit={{opacity:0,x:16,scale:.98}} transition={{duration:.55,ease:[.22,1,.36,1]}}>
   {chapters.map((chapter,index)=><button type="button" key={chapter.id} data-active={index===active} onClick={()=>go(chapter.id)}><span>{String(index+1).padStart(2,'0')}</span><b>{chapter.label}</b><i/></button>)}
  </motion.div>}</AnimatePresence>
 </aside>
}
