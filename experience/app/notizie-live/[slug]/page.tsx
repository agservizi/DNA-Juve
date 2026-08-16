import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { EditorialPremiumShell } from '@/components/editorial-premium-shell'
import { getLiveNewsBySlug, liveNewsParagraphs } from '@/lib/live-news'
import s from '@/components/editorial-premium.module.css'

export const dynamic = 'force-dynamic'

type Props = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const item = await getLiveNewsBySlug(slug)
  if (!item) return { title: 'Notizia non trovata' }
  return {
    title: item.title,
    description: item.description || undefined,
    openGraph: {
      title: item.title,
      description: item.description || undefined,
      images: item.image ? [{ url: item.image }] : undefined,
      type: 'article',
      publishedTime: item.date,
    },
  }
}

const when = (value: string) =>
  new Intl.DateTimeFormat('it-IT', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))

export default async function Page({ params }: Props) {
  const { slug } = await params
  const item = await getLiveNewsBySlug(slug)
  if (!item) notFound()
  const paragraphs = liveNewsParagraphs(item)

  return (
    <EditorialPremiumShell motion="reader">
      <main id="contenuto" className={`${s.premiumPage} ${s.liveReader}`}>
        <div className={s.liveReaderInner}>
          <nav className={s.liveReaderNav} data-premium-intro>
            <Link href="/notizie-live">← Notizie live</Link>
            <span>{item.source}</span>
          </nav>

          <header className={s.liveReaderHeader} data-premium-intro>
            <p className={s.premiumMeta}>
              Rassegna · {item.source}
              {item.author ? ` / ${item.author}` : ''} · <time dateTime={item.date}>{when(item.date)}</time>
            </p>
            <h1>{item.title}</h1>
          </header>

          {item.image ? (
            <figure className={s.liveReaderCover} data-premium-reveal>
              <img src={item.image} alt="" />
            </figure>
          ) : null}

          <article className={s.liveReaderBody} data-premium-reveal>
            {paragraphs.map((paragraph) => (
              <p key={paragraph.slice(0, 48)}>{paragraph}</p>
            ))}
          </article>

          <footer className={s.liveReaderFoot} data-premium-reveal>
            <p>
              Sintesi in rassegna stampa su BianconeriHub. Il pezzo originale resta di proprietà di{' '}
              <strong>{item.source}</strong>.
            </p>
            <div className={s.liveReaderActions}>
              <Link className={s.liveReaderPrimary} href="/notizie-live">
                Torna al flusso
              </Link>
              <a className={s.liveReaderSecondary} href={item.url} target="_blank" rel="noopener noreferrer">
                Fonte originale ↗
              </a>
            </div>
          </footer>
        </div>
      </main>
    </EditorialPremiumShell>
  )
}
