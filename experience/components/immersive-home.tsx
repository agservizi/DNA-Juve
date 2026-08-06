'use client'

import { Link } from 'next-view-transitions'
import { useReducedMotion } from 'motion/react'
import { useEffect, useRef, useState } from 'react'
import type { Article,HomeCategory,HomeVideo } from '@/lib/content'

function formatDate(value: string) {
  return new Intl.DateTimeFormat('it-IT', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(value))
}

function ArticleMeta({ article }: { article: Article }) {
  return <p className="article-meta">{article.categories?.name || 'Magazine'} · {formatDate(article.published_at)}{article.profiles?.username ? ` · ${article.profiles.username}` : ''}</p>
}

function CinematicTitle({text}:{text:string}){
  const words=text.trim().split(/\s+/)
  return <>{words.map((word,index)=><span className="cinematic-word" key={`${word}-${index}`}><span>{word}</span></span>)}</>
}

function videoThumb(video:HomeVideo){return video.thumbnail||(video.platform==='youtube'&&video.video_id?`https://img.youtube.com/vi/${video.video_id}/maxresdefault.jpg`:null)}
function videoEmbed(video:HomeVideo){if(video.platform==='youtube'&&video.video_id)return `https://www.youtube.com/embed/${video.video_id}?rel=0`;if(video.platform==='vimeo'&&video.video_id)return `https://player.vimeo.com/video/${video.video_id}`;if(video.platform==='dailymotion'&&video.video_id)return `https://www.dailymotion.com/embed/video/${video.video_id}`;return null}
function HomeCinema({videos}:{videos:HomeVideo[]}){const[active,setActive]=useState(videos[0]?.id||'');const video=videos.find(v=>v.id===active)||videos[0];if(!video)return null;const embed=videoEmbed(video),thumb=videoThumb(video);return <section className="home-cinema" aria-labelledby="cinema-title"><div className="cinema-heading"><div><p className="eyebrow">BianconeriHub Cinema</p><h2 id="cinema-title">La Juve<br/><i>in movimento.</i></h2></div><p>Highlights, analisi e storie da guardare. Una sala editoriale costruita attorno ai video pubblicati.</p></div><div className="cinema-stage" data-reveal><div className="cinema-bezel"><div className="cinema-screen">{embed?<iframe key={video.id} src={embed} title={video.title} allow="autoplay; fullscreen; encrypted-media; picture-in-picture" allowFullScreen/>:video.video_url?<video key={video.id} src={video.video_url} poster={thumb||undefined} controls/>:thumb&&<img src={thumb} alt=""/>}</div></div><div className="cinema-copy"><span>{video.category||'Video'} · {(video.views||0).toLocaleString('it-IT')} visualizzazioni</span><h3>{video.title}</h3>{video.description&&<p>{video.description}</p>}<Link href={`/video?v=${video.id}`}>Apri la videoteca <i aria-hidden="true">↗︎</i></Link></div></div><div className="cinema-reel" aria-label="Scegli un video">{videos.map((item,index)=><button data-active={item.id===video.id} onClick={()=>setActive(item.id)} key={item.id} aria-label={`Riproduci ${item.title}`}><span>{videoThumb(item)&&<img src={videoThumb(item)!} alt=""/>}<i aria-hidden="true">▶︎</i></span><b>{String(index+1).padStart(2,'0')}</b><strong>{item.title}</strong></button>)}</div></section>}

const historyMilestones=[
  {year:'1897',label:'La nascita',title:'Tutto comincia da una panchina.',copy:'Il 1º novembre un gruppo di studenti del liceo Massimo d’Azeglio fonda a Torino una società sportiva. La chiamano Juventus: in latino, gioventù.',era:'Corso Re Umberto · Torino'},
  {year:'1903—05',label:'L’identità',title:'Il bianconero. Poi il primo titolo.',copy:'Nel 1903 arrivano da Nottingham le maglie a strisce bianche e nere. Due anni più tardi la Juventus conquista il primo campionato italiano della sua storia.',era:'Dalla maglia rosa alla leggenda'},
  {year:'1923—35',label:'La dinastia',title:'La famiglia Agnelli e il Quinquennio.',copy:'Edoardo Agnelli diventa presidente nel 1923. Tra il 1930 e il 1935 la squadra domina il calcio italiano conquistando cinque Scudetti consecutivi.',era:'Cinque volte di seguito'},
  {year:'1977—85',label:'L’Europa',title:'La Juventus conquista il continente.',copy:'La Coppa UEFA del 1977 è il primo trofeo europeo. Seguono la Coppa delle Coppe nel 1984 e la Coppa dei Campioni nel 1985, nella tragica notte dell’Heysel.',era:'Dalla prima coppa al tetto d’Europa'},
  {year:'1996',label:'Il mondo',title:'Roma, Tokyo: la Juve sul tetto del mondo.',copy:'Il 22 maggio la Juventus supera l’Ajax ai rigori e diventa campione d’Europa. Il 26 novembre batte il River Plate e conquista la Coppa Intercontinentale.',era:'Del Piero · Vialli · Lippi'},
  {year:'2011—17',label:'La nuova era',title:'Una nuova casa. Un ciclo irripetibile.',copy:'Il nuovo stadio inaugura nel 2011. La stagione seguente arriva lo Scudetto senza sconfitte; nel 2017 nasce Juventus Women, subito campione d’Italia.',era:'Stadium · Rinascita · Women'},
] as const

function CinematicPulse(){
  return <section className="cinematic-pulse" aria-labelledby="pulse-title">
    <div className="cinematic-pulse__stage">
      <div className="cinematic-pulse__intro"><p className="eyebrow">Dal 1897, fino a oggi</p><h2 id="pulse-title">Dentro<br/><i>la storia.</i></h2><span>Scorri per attraversare oltre un secolo di Juventus</span></div>
      <div className="cinematic-pulse__deck">{historyMilestones.map((item,index)=><article className="cinematic-pulse__card" key={item.year} data-pulse-card>
        <div className="cinematic-pulse__year" aria-hidden="true">{item.year}</div>
        <span>{String(index+1).padStart(2,'0')} / {String(historyMilestones.length).padStart(2,'0')} · {item.label}</span>
        <small>{item.era}</small><h3>{item.title}</h3><p>{item.copy}</p>
      </article>)}</div>
      <div className="cinematic-pulse__meter"><span/><b>JUVENTUS HISTORY · OFFICIAL ARCHIVE</b></div>
      <a className="cinematic-pulse__source" href="https://www.juventus.com/it/club/la-storia" target="_blank" rel="noreferrer">Fonte ufficiale Juventus <i aria-hidden="true">↗︎</i></a>
    </div>
  </section>
}

export function ImmersiveHome({ featured, latest, mostViewed, videos, categories, configured }: { featured: Article[]; latest: Article[]; mostViewed:Article[];videos:HomeVideo[];categories:HomeCategory[];configured: boolean }) {
  const root = useRef<HTMLElement>(null)
  const reduceMotion = useReducedMotion()
  const lead = featured[0] || latest[0]
  const titleSize=lead&&lead.title.length>82?'long':lead&&lead.title.length>52?'medium':'standard'
  const secondary = (featured.length ? featured : latest.filter((article)=>article.id!==lead?.id)).slice(0, 4)
  const latestUnique = latest.filter((article) => article.id!==lead?.id&&!featured.some((item) => item.id === article.id)&&!secondary.some((item)=>item.id===article.id)).slice(0, 9)

  useEffect(() => {
    if (reduceMotion || !root.current) return
    let context: { revert(): void } | undefined
    let cancelled = false
    Promise.all([import('gsap'), import('gsap/ScrollTrigger')]).then(([gsapModule, triggerModule]) => {
      if (cancelled || !root.current) return
      const gsap = gsapModule.gsap
      const ScrollTrigger = triggerModule.ScrollTrigger
      gsap.registerPlugin(ScrollTrigger)
      context = gsap.context(() => {
        const intro=gsap.timeline({defaults:{ease:'power4.out'}})
        intro.fromTo('[data-hero-image]',{clipPath:'inset(10% 10% 10% 42%)',scale:1.12},{clipPath:'inset(0% 0% 0% 0%)',scale:1,duration:1.65})
          .fromTo('.cinematic-word>span',{yPercent:120,rotate:3},{yPercent:0,rotate:0,duration:1.05,stagger:.035},.18)
          .fromTo('[data-hero-copy]:not(h1)', { y: 34, opacity: 0 }, { y: 0, opacity: 1, duration: .9, stagger: 0.07 },.42)
        gsap.to('[data-hero-image] img',{yPercent:10,scale:1.06,ease:'none',scrollTrigger:{trigger:'[data-hero]',start:'top top',end:'bottom top',scrub:.8}})
        gsap.to('.hero-copy',{yPercent:-9,opacity:.18,ease:'none',scrollTrigger:{trigger:'[data-hero]',start:'55% center',end:'bottom top',scrub:.65}})
        if(matchMedia('(min-width: 901px)').matches){
          const pulseCards=gsap.utils.toArray<HTMLElement>('[data-pulse-card]')
          if(pulseCards.length){
            gsap.set(pulseCards,{yPercent:14,rotateX:-5,scale:.94,autoAlpha:0})
            gsap.set(pulseCards[0],{yPercent:0,rotateX:0,scale:1,autoAlpha:1,zIndex:1})
            const pulse=gsap.timeline({scrollTrigger:{trigger:'.cinematic-pulse',start:'top top',end:'bottom bottom',scrub:1.1,invalidateOnRefresh:true}})
            pulseCards.forEach((card,index)=>{
              const at=index
              if(index>0)pulse.set(card,{zIndex:index+1},at)
                .to(card,{yPercent:0,rotateX:0,scale:1,autoAlpha:1,duration:.28,ease:'power3.out'},at)
              if(index<pulseCards.length-1){
                pulse.to(card,{yPercent:-5,scale:.96,autoAlpha:0,duration:.18,ease:'power2.in'},at+.82)
              }else{
                pulse.to(card,{scale:1,duration:.82,ease:'none'},at+.28)
              }
            })
            pulse.to('.cinematic-pulse__meter span',{scaleX:1,duration:pulseCards.length,ease:'none'},0)
          }
          const section=root.current?.querySelector<HTMLElement>('.featured-strip'),track=section?.querySelector<HTMLElement>('.featured-grid')
          if(section&&track){
            const distance=()=>Math.max(0,track.scrollWidth-section.clientWidth)
            const duration=()=>Math.max(innerWidth,distance()+innerWidth*.28)
            const horizontal=gsap.timeline({scrollTrigger:{trigger:section,start:'top top',end:()=>`+=${duration()}`,pin:true,pinSpacing:true,scrub:1.15,anticipatePin:0,invalidateOnRefresh:true}})
            horizontal.to({}, {duration:.015}).to(track,{x:()=>-distance(),duration:.865,ease:'none'}).to({}, {duration:.12})
            gsap.to(section.querySelectorAll('.feature-image img'),{scale:1.12,ease:'none',stagger:.08,scrollTrigger:{trigger:section,start:'top top',end:()=>`+=${duration()}`,scrub:1.2,invalidateOnRefresh:true}})
          }
          gsap.to('.cinema-heading h2',{xPercent:7,ease:'none',scrollTrigger:{trigger:'.home-cinema',start:'top bottom',end:'bottom top',scrub:1}})
          gsap.fromTo('.cinema-reel button',{y:50,opacity:0},{y:0,opacity:1,duration:.85,stagger:.06,ease:'power3.out',scrollTrigger:{trigger:'.cinema-reel',start:'top 88%',once:true}})
          gsap.to('.category-portals>div:last-child',{y:-45,ease:'none',scrollTrigger:{trigger:'.category-portals',start:'top bottom',end:'bottom top',scrub:1.2}})
        }
        gsap.utils.toArray<HTMLElement>('[data-reveal]').forEach((item) => gsap.fromTo(item, { y: 72, opacity: 0 }, { y: 0, opacity: 1, duration: .9, ease: 'power3.out', scrollTrigger: { trigger: item, start: 'top 86%', once: true } }))
      }, root)
    })
    return () => { cancelled = true; context?.revert() }
  }, [reduceMotion])

  return (
    <main ref={root} id="contenuto" className="immersive-home" data-local-motion="true">
      {lead ? (
        <section className="hero editorial-hero" data-hero aria-labelledby="hero-title">
          <div className="hero-media" data-hero-image aria-hidden="true" style={{viewTransitionName:`article-cover-${lead.slug}`}}>{lead.cover_image && <img src={lead.cover_image} alt="" />}</div>
          <div className="hero-architecture" aria-hidden="true"><i/><i/><i/><i/></div>
          <div className="hero-copy">
            <p className="eyebrow" data-hero-copy>{lead.categories?.name || 'In evidenza'}</p>
            <h1 id="hero-title" className="content-title" data-title-size={titleSize} data-hero-copy><CinematicTitle text={lead.title}/></h1>
            <div className="hero-foot" data-hero-copy>
              <div><p>{lead.excerpt}</p><ArticleMeta article={lead} /></div>
              <Link className="kinetic-cta" href={`/articolo/${lead.slug}`}><span>Leggi l’articolo</span><i aria-hidden="true">↗︎</i></Link>
            </div>
          </div>
          <span className="vertical-mark" aria-hidden="true">BIANCONERIHUB MAGAZINE</span>
        </section>
      ) : (
        <section className="hero empty-hero" aria-labelledby="hero-title">
          <div className="hero-scene" aria-hidden="true"><div className="scene-fallback" /></div>
          <div className="hero-copy"><p className="eyebrow">BianconeriHub</p><h1 id="hero-title">Il magazine<br />bianconero.</h1><p>{configured ? 'Non ci sono articoli pubblicati.' : 'Configura Supabase per visualizzare gli stessi contenuti del progetto.'}</p></div>
        </section>
      )}

      <CinematicPulse/>

      {secondary.length > 0 && <section className="featured-strip" aria-labelledby="evidenza-title">
        <div className="section-heading"><p className="eyebrow">Selezione editoriale</p><h2 id="evidenza-title">In evidenza</h2></div>
        <div className="featured-grid">{secondary.map((article, index) => <article className={index === 0 ? 'feature-card feature-card-wide' : 'feature-card'} data-reveal key={article.id}>
          <Link href={`/articolo/${article.slug}`}><div className="feature-image" style={{viewTransitionName:`article-cover-${article.slug}`}}>{article.cover_image && <img src={article.cover_image} alt="" />}</div><ArticleMeta article={article} /><h3>{article.title}</h3>{article.excerpt && <p>{article.excerpt}</p>}</Link>
        </article>)}</div>
      </section>}

      <HomeCinema videos={videos}/>

      {mostViewed.length>0&&<section className="ranking-section" aria-labelledby="ranking-title"><div className="ranking-intro"><p className="eyebrow">Scelti dai lettori</p><h2 id="ranking-title">Più letti.<br/><i>Adesso.</i></h2><p>Le storie che stanno attirando più attenzione nella community BianconeriHub.</p></div><div className="ranking-list">{mostViewed.map((article,index)=><Link data-reveal href={`/articolo/${article.slug}`} key={article.id}><b>{String(index+1).padStart(2,'0')}</b><span><small>{article.categories?.name||'Magazine'} · {(article.views||0).toLocaleString('it-IT')} letture</small><strong>{article.title}</strong></span><i aria-hidden="true">↗︎</i></Link>)}</div></section>}

      {latestUnique.length > 0 && <section className="latest-section" aria-labelledby="ultime-title">
        <div className="section-heading"><p className="eyebrow">Aggiornamento continuo</p><h2 id="ultime-title">Ultime notizie</h2></div>
        <div className="latest-grid">{latestUnique.map((article) => <article className="latest-card" data-reveal key={article.id}>
          <Link href={`/articolo/${article.slug}`}><div className="latest-image" style={{viewTransitionName:`article-cover-${article.slug}`}}>{article.cover_image && <img src={article.cover_image} alt="" />}</div><ArticleMeta article={article} /><h3>{article.title}</h3>{article.excerpt && <p>{article.excerpt}</p>}<span className="text-link">Leggi <i aria-hidden="true">↗︎</i></span></Link>
        </article>)}</div>
      </section>}

      {categories.length>0&&<section className="category-portals" aria-labelledby="portals-title"><div className="section-heading"><p className="eyebrow">Tutto BianconeriHub</p><h2 id="portals-title">Entra nella storia.</h2></div><div>{categories.map((category,index)=><Link data-reveal href={`/categoria/${category.slug}`} key={category.id} style={{'--portal-accent':category.color||'#af8f5c'} as React.CSSProperties}><span>{String(index+1).padStart(2,'0')}</span><h3>{category.name}</h3><p>{category.description||`Tutti gli articoli e gli approfondimenti dedicati a ${category.name}.`}</p><i aria-hidden="true">↗︎</i></Link>)}</div></section>}

      <section className="domain-rail" aria-label="Esplora BianconeriHub">
        {[['Notizie live','Aggiornamenti bianconeri in tempo reale.','/notizie-live'],['Calciomercato','Notizie, analisi e transfer tracker.','/calciomercato'],['Calendario','Partite, risultati e promemoria.','/calendario'],['Community','Forum, sondaggi e pagelle.','/community/forum'],['Area Bianconera','Il tuo profilo, i preferiti e la cronologia.','/area-bianconera']].map(([title,copy,href], index) => <Link data-reveal href={href} key={href}><span>0{index + 1}</span><h3>{title}</h3><p>{copy}</p><i aria-hidden="true">↗︎</i></Link>)}
      </section>

    </main>
  )
}
