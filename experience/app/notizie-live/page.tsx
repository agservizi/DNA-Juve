import type { Metadata } from 'next'
import { EditorialPremiumShell } from '@/components/editorial-premium-shell'
import { getLiveNews, type LiveNews } from '@/lib/editorial-content'
import s from '@/components/editorial-premium.module.css'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = {
  title: 'Notizie Live',
  description: 'Notizie in tempo reale sulla Juventus: calciomercato, trasferimenti e ultime dal mondo bianconero.',
}

const time = (value: string) => new Intl.DateTimeFormat('it-IT', { hour: '2-digit', minute: '2-digit' }).format(new Date(value))
const day = (value: string) => new Intl.DateTimeFormat('it-IT', { day: '2-digit', month: 'short' }).format(new Date(value))

export default async function Page() {
  const news = await getLiveNews()
  return <EditorialPremiumShell>
    <main id="contenuto" className={`${s.premiumPage} ${s.livePage}`}>
      <header className={s.liveHero}>
        <div className={s.liveSignal} data-premium-intro><i aria-hidden="true" /><span>Flusso attivo</span></div>
        <p className={s.premiumKicker} data-premium-intro>Rassegna stampa / Juventus</p>
        <h1 data-premium-intro>Il presente<br /><em>in diretta.</em></h1>
        <div className={s.liveHeroFoot} data-premium-intro>
          <p>Notizie Juventus in tempo reale da Gazzetta, Sky Sport, Tuttosport e Calciomercato.com.</p>
          <span><b>{String(news.length).padStart(2, '0')}</b> aggiornamenti</span>
        </div>
      </header>
      {news.length ? <section className={s.premiumLiveList} aria-label="Aggiornamenti live">
        {news.map((item: LiveNews, index: number) => <article key={item.id} data-premium-reveal>
          <div className={s.liveTime}><time dateTime={item.date}>{time(item.date)}</time><span>{day(item.date)}</span></div>
          <div className={s.liveMedia}>{item.image && <img src={item.image} alt="" />}<span>{String(index + 1).padStart(2, '0')}</span></div>
          <div className={s.liveCopy}><p className={s.premiumMeta}>{item.source}{item.author ? ` / ${item.author}` : ''}</p><h2>{item.title}</h2>{item.description && <p>{item.description}</p>}</div>
          <a className={s.sourceCta} href={item.url} target="_blank" rel="noopener noreferrer"><span>Fonte</span><i aria-hidden="true">↗︎</i></a>
        </article>)}
      </section> : <p className={s.premiumEmpty}>Nessuna notizia disponibile al momento. Le fonti vengono controllate automaticamente ogni 15 minuti.</p>}
    </main>
  </EditorialPremiumShell>
}
