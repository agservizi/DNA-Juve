'use client'

import { Link } from 'next-view-transitions'
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import s from './match-market.module.css'

type Article = {
  id: string
  slug: string
  title: string
  excerpt?: string | null
  published_at: string
  categories?: { name?: string; slug?: string } | { name?: string; slug?: string }[] | null
}

function marketDeadline(now: Date) {
  const year = now.getFullYear()
  const close = new Date(year, 8, 1, 20)
  const open = new Date(year, 0, 2)
  return now < open ? open : now < close ? close : new Date(year + 1, 0, 2)
}

function useCountdown(target: Date) {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000)
    return () => window.clearInterval(id)
  }, [])
  const ms = Math.max(0, +target - +now)
  return [
    Math.floor(ms / 864e5),
    Math.floor(ms / 36e5) % 24,
    Math.floor(ms / 6e4) % 60,
    Math.floor(ms / 1000) % 60,
  ] as const
}

function relativeTime(value: string) {
  const diff = Date.now() - +new Date(value)
  if (Number.isNaN(diff)) return ''
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Adesso'
  if (mins < 60) return `${mins} minut${mins === 1 ? 'o' : 'i'} fa`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours} or${hours === 1 ? 'a' : 'e'} fa`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days} giorn${days === 1 ? 'o' : 'i'} fa`
  return new Intl.DateTimeFormat('it-IT', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(value))
}

function clockTime(value: string) {
  return new Intl.DateTimeFormat('it-IT', { hour: '2-digit', minute: '2-digit' }).format(new Date(value))
}

function emphasize(text: string) {
  const parts = text.split(/(\b(?:Juventus|Juve|bianconer[ioa]?|Aston Villa|Tottenham|Atalanta|Inter|Milan|Napoli|Roma|Lazio|Bologna|Parma|Fiorentina|Torino)\b)/gi)
  return parts.map((part, i) =>
    /^(?:Juventus|Juve|bianconer[ioa]?|Aston Villa|Tottenham|Atalanta|Inter|Milan|Napoli|Roma|Lazio|Bologna|Parma|Fiorentina|Torino)$/i.test(part)
      ? <strong key={i}>{part}</strong>
      : part,
  )
}

export function MarketPage({ articles }: { articles: Article[] }) {
  const root = useRef<HTMLElement>(null)
  const target = useMemo(() => marketDeadline(new Date()), [])
  const units = useCountdown(target)
  const labels = ['Giorni', 'Ore', 'Min', 'Sec'] as const

  useLayoutEffect(() => {
    if (!root.current || matchMedia('(prefers-reduced-motion: reduce)').matches) return
    let ctx: { revert(): void } | undefined
    Promise.all([import('gsap'), import('gsap/ScrollTrigger')]).then(([g, t]) => {
      g.gsap.registerPlugin(t.ScrollTrigger)
      ctx = g.gsap.context(() => {
        g.gsap.from('[data-hero]', { y: 48, opacity: 0, duration: 1.05, stagger: 0.08, ease: 'power4.out' })
        g.gsap.from('[data-feed-item]', {
          y: 28,
          opacity: 0,
          duration: 0.75,
          stagger: 0.06,
          ease: 'power3.out',
          scrollTrigger: { trigger: '[data-feed]', start: 'top 90%', once: true },
        })
      }, root)
    })
    return () => ctx?.revert()
  }, [])

  return (
    <main id="contenuto" ref={root} className={`${s.page} ${s.market}`}>
      <section className={s.hero}>
        <div className={s.heroInner}>
          <span data-hero className={s.eyebrow}>Finestra di mercato</span>
          <h1 data-hero>Calciomercato</h1>
          <p data-hero>
            Notizie, rumors e trattative Juventus. Gli stessi contenuti editoriali, dentro la nuova esperienza.
          </p>
          <div data-hero className={s.countdown} aria-label="Conto alla rovescia finestra di mercato">
            {units.map((value, i) => (
              <span key={labels[i]}>
                <strong>{String(value).padStart(2, '0')}</strong>
                <small>{labels[i]}</small>
              </span>
            ))}
          </div>
        </div>
      </section>

      <section className={s.marketFeed} aria-labelledby="market-live" data-feed>
        <div className={s.feedToolbar}>
          <div className={s.liveBar} role="status">
            <i aria-hidden="true" />
            <span>Live</span>
          </div>
        </div>
        <h2 id="market-live" className={s.srOnly}>
          Aggiornamenti calciomercato
        </h2>

        {articles.length ? (
          <ol className={s.feedTimeline}>
            {articles.map((article, index) => (
              <li key={article.id} className={s.feedItem} data-feed-item data-latest={index === 0 || undefined}>
                <div className={s.feedRail} aria-hidden="true">
                  <span className={s.feedDot} />
                </div>
                <div className={s.feedBody}>
                  <time className={s.feedTime} dateTime={article.published_at} title={clockTime(article.published_at)}>
                    {relativeTime(article.published_at)}
                  </time>
                  <Link href={`/articolo/${article.slug}`} className={s.feedCard}>
                    <h3>{article.title}</h3>
                    {article.excerpt ? <p>{emphasize(article.excerpt)}</p> : null}
                  </Link>
                </div>
              </li>
            ))}
          </ol>
        ) : (
          <div className={s.empty}>
            Nessuna notizia di calciomercato disponibile.
            <br />
            La pagina mostra automaticamente i contenuti editoriali pubblicati.
          </div>
        )}

        <p className={s.feedDisclaimer}>Le notizie non costituiscono conferma ufficiale di trasferimento.</p>
      </section>
    </main>
  )
}
