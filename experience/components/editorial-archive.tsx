import Link from 'next/link'
import type { EditorialArticle, AuthorProfile } from '@/lib/editorial-content'
import s from './editorial-archive.module.css'

const date=(v:string)=>new Intl.DateTimeFormat('it-IT',{day:'numeric',month:'long',year:'numeric'}).format(new Date(v))
function Meta({a}:{a:EditorialArticle}){return <p className={s.meta}>{a.categories?.name||'Magazine'} Â· {date(a.published_at)}{a.profiles?.username?` Â· ${a.profiles.username}`:''}</p>}
export function EditorialArchive({kind,title,articles,author,toolbar}:{kind:string;title:string;articles:EditorialArticle[];author?:AuthorProfile|null;toolbar?:React.ReactNode}){
 const [lead,...rest]=articles
 return <main id="contenuto" className={s.page}>
  <header className={s.mast}><div>{author?<div className={s.author}>{author.avatar_url?<img src={author.avatar_url} alt=""/>:<div className={s.avatar}/>}<div><p className={s.eyebrow}>Firma BianconeriHub</p><h1>{title}</h1>{author.author_signature&&<p>{author.author_signature}</p>}{author.bio&&<p>{author.bio}</p>}<div className={s.social}>{author.twitter_url&&<a href={author.twitter_url}>X</a>}{author.instagram_url&&<a href={author.instagram_url}>Instagram</a>}{author.linkedin_url&&<a href={author.linkedin_url}>LinkedIn</a>}</div></div></div>:<><p className={s.eyebrow}>{kind}</p><h1>{title}</h1></>}</div><p className={s.count}>{articles.length} articol{articles.length===1?'o':'i'}</p></header>{toolbar}
  {lead&&<article className={s.lead}>{lead.cover_image?<Link href={`/articolo/${lead.slug}`}><img src={lead.cover_image} alt=""/></Link>:<div className={s.placeholder}/>}<div className={s.leadCopy}><Meta a={lead}/><h2><Link href={`/articolo/${lead.slug}`}>{lead.title}</Link></h2>{lead.excerpt&&<p>{lead.excerpt}</p>}</div></article>}
  {rest.length?<div className={s.grid}>{rest.map(a=><article className={s.card} key={a.id}><Link href={`/articolo/${a.slug}`}>{a.cover_image?<img src={a.cover_image} alt=""/>:<div className={s.placeholder}/>}<Meta a={a}/><h2>{a.title}</h2>{a.excerpt&&<p>{a.excerpt}</p>}</Link></article>)}</div>:!lead&&<p className={s.empty}>Nessun contenuto pubblicato in questo archivio.</p>}
 </main>
}
