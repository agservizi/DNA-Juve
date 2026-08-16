import type { Metadata } from 'next'
import Link from 'next/link'
import { EditorialPremiumShell } from '@/components/editorial-premium-shell'
import { getLiveNews, liveNewsHref, type LiveNews } from '@/lib/live-news'
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
  return (
    <EditorialPremiumShell>
      <main id="contenuto" className={`${s.premiumPage} ${s.livePage}`}>
        <header className={s.liveHero}>
          <div className={s.liveSignal} data-premium-intro>
            <i aria-hidden="true" />
            <span>Flusso attivo</span>
          </div>
          <p className={s.premiumKicker} data-premium-intro>
            Rassegna stampa / Juventus
          </p>
          <h1 data-premium-intro>
            Il presente
            <br />
            <em>in diretta.</em>
          </h1>
          <div className={s.liveHeroFoot} data-premium-intro>
            <p>Notizie Juventus in tempo reale da Gazzetta, Sky Sport, Tuttosport e Calciomercato.com.</p>
            <span>
              <b>{String(news.length).padStart(2, '0')}</b> aggiornamenti
            </span>
          </div>
        </header>

        {news.length ? (
          <section className={s.premiumLiveList} aria-label="Aggiornamenti live">
            {news.map((item: LiveNews, index: number) => (
              <article key={item.id} data-premium-reveal>
                <div className={s.liveTime}>
                  <time dateTime={item.date}>{time(item.date)}</time>
                  <span>{day(item.date)}</span>
                </div>
                <Link href={liveNewsHref(item)} className={s.liveMedia}>
                  {item.image ? <img src={item.image} alt="" /> : null}
                  <span>{String(index + 1).padStart(2, '0')}</span>
                </Link>
                <div className={s.liveCopy}>
                  <p className={s.premiumMeta}>
                    {item.source}
                    {item.author ? ` / ${item.author}` : ''}
                  </p>
                  <h2>
                    <Link href={liveNewsHref(item)}>{item.title}</Link>
                  </h2>
                  {item.description ? <p>{item.description}</p> : null}
                </div>
                <Link className={s.sourceCta} href={liveNewsHref(item)}>
                  <span>Leggi</span>
                  <i aria-hidden="true">→</i>
                </Link>
              </article>
            ))}
          </section>
        ) : (
          <p className={s.premiumEmpty}>
            Nessuna notizia disponibile al momento. Le fonti vengono controllate automaticamente ogni 15 minuti.
          </p>
        )}
      </main>
    </EditorialPremiumShell>
  )
}
