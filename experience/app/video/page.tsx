import type { Metadata } from 'next'
import { Suspense } from 'react'
import { EditorialPremiumShell } from '@/components/editorial-premium-shell'
import { EditorialVideoIsland } from '@/components/editorial-video-island'
import { getEditorialVideos } from '@/lib/editorial-content'
import s from '@/components/editorial-premium.module.css'
export const dynamic='force-dynamic';export const metadata:Metadata={title:'Video',description:'Guarda gli highlights, le interviste e le analisi video della Juventus.'}
export default async function Page(){const videos=await getEditorialVideos();return <EditorialPremiumShell tone="dark"><main id="contenuto" className={`${s.premiumPage} ${s.videoPage}`}><header className={s.videoHero}><div><p className={s.premiumKicker} data-premium-intro>BianconeriHub / Visioni</p><h1 data-premium-intro>Dentro il gioco.<br/><em>Oltre il risultato.</em></h1></div><div className={s.videoHeroSide} data-premium-intro><span>PLAY / {String(videos.length).padStart(2,'0')}</span><p>Highlights, interviste, analisi tattiche e tanto altro in formato video.</p></div></header><Suspense><EditorialVideoIsland videos={videos}/></Suspense></main></EditorialPremiumShell>}
