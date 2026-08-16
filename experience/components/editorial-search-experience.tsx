import Link from 'next/link'
import type { EditorialArticle } from '@/lib/editorial-content'
import { EditorialPremiumShell } from './editorial-premium-shell'
import { EditorialSearchForm } from './editorial-search-form'
import s from './editorial-premium.module.css'

const date = (v: string) => new Intl.DateTimeFormat('it-IT', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(v))
export function EditorialSearchExperience({ query, articles }: { query: string; articles: EditorialArticle[] }) {
  return <EditorialPremiumShell><main id="contenuto" className={`${s.premiumPage} ${s.searchPage}`}>
    <header className={s.searchHero}><p className={s.premiumKicker} data-premium-intro>Archivio Bianconero / Ricerca</p><h1 data-premium-intro>Trova la storia.<br/><em>Rivivila.</em></h1><p data-premium-intro>Articoli, analisi e notizie dal nostro archivio editoriale.</p></header>
    <EditorialSearchForm query={query}/>
    <section className={s.searchResults} aria-labelledby="results-title">
      <div className={s.resultsHead}><h2 id="results-title">{query ? `Risultati per “${query}”` : 'Inizia una ricerca'}</h2>{query && <span>{String(articles.length).padStart(2,'0')} risultat{articles.length===1?'o':'i'}</span>}</div>
      {query && articles.length === 0 && <p className={s.premiumEmpty}>Nessun articolo corrisponde alla ricerca. Prova con un giocatore, una competizione o un argomento diverso.</p>}
      <div className={s.searchRows}>{articles.map((a,index)=><article key={a.id} data-premium-reveal><Link href={`/articolo/${a.slug}`}><span className={s.rowIndex}>{String(index+1).padStart(2,'0')}</span><div className={s.searchImage}>{a.cover_image&&<img src={a.cover_image} alt=""/>}</div><div><p className={s.premiumMeta}>{a.categories?.name||'Magazine'} / {date(a.published_at)}</p><h3>{a.title}</h3>{a.excerpt&&<p>{a.excerpt}</p>}</div><i aria-hidden="true">↗︎</i></Link></article>)}</div>
    </section>
  </main></EditorialPremiumShell>
}
