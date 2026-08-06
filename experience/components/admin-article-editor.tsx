'use client'
/* eslint-disable react-hooks/set-state-in-effect, react-hooks/purity */

import type { SupabaseClient } from '@supabase/supabase-js'
import { useCallback, useEffect, useMemo, useRef, useState, type ClipboardEvent } from 'react'
import { useRouter } from 'next/navigation'
import { Bold, Code, Eye, ImagePlus, Italic, Link2, List, ListOrdered, Loader2, Redo2, RotateCcw, Save, Send, Sparkles, Upload, Undo2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'

type Db = SupabaseClient<any, 'public', any>
type Choice = { id: string; name: string }
type Revision = { id: string; title: string | null; excerpt: string | null; content: string | null; created_at: string }
type Article = {
  id?: string; title: string; slug: string; excerpt: string; content: string; cover_image: string
  category_id: string; author_id?: string; status: 'draft' | 'scheduled' | 'published'; featured: boolean
  scheduled_at: string; meta_title: string; meta_description: string; canonical_url: string
  og_image: string; noindex: boolean; source_url: string; internal_notes: string; gallery: string[]
  related_article_ids: string[]; co_author_ids: string[]; instagram_image: string
  instagram_caption_override: string; instagram_publish_enabled: boolean; instagram_post_status?: string
  instagram_post_error?: string; instagram_post_permalink?: string; published_at?: string | null
}

const empty: Article = { title:'',slug:'',excerpt:'',content:'',cover_image:'',category_id:'',status:'draft',featured:false,scheduled_at:'',meta_title:'',meta_description:'',canonical_url:'',og_image:'',noindex:false,source_url:'',internal_notes:'',gallery:[],related_article_ids:[],co_author_ids:[],instagram_image:'',instagram_caption_override:'',instagram_publish_enabled:true }
const slugify=(v:string)=>v.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')
const err=(e:unknown)=>e instanceof Error?e.message:String((e as any)?.message||e||'Operazione non riuscita')
const SITE_ORIGIN='https://bianconerihub.com'
const plainText=(value:string)=>value.replace(/<[^>]+>/g,' ').replace(/&nbsp;/gi,' ').replace(/&amp;/gi,'&').replace(/&quot;/gi,'"').replace(/&#39;/gi,"'").replace(/\s+/g,' ').trim()
function normalizeArticle(value:any):Article{
 const strings=['title','slug','excerpt','content','cover_image','category_id','scheduled_at','meta_title','meta_description','canonical_url','og_image','source_url','internal_notes','instagram_image','instagram_caption_override'] as const
 const normalized:any={...empty,...value}
 strings.forEach(key=>{normalized[key]=typeof normalized[key]==='string'?normalized[key]:''})
 normalized.gallery=Array.isArray(normalized.gallery)?normalized.gallery.filter((item:unknown):item is string=>typeof item==='string'):[]
 normalized.related_article_ids=Array.isArray(normalized.related_article_ids)?normalized.related_article_ids.filter((item:unknown):item is string=>typeof item==='string'):[]
 normalized.co_author_ids=Array.isArray(normalized.co_author_ids)?normalized.co_author_ids.filter((item:unknown):item is string=>typeof item==='string'):[]
 return normalized as Article
}
function fitMeta(value:string,max:number){
 const clean=plainText(value);if(clean.length<=max)return clean
 const clipped=clean.slice(0,max-1),boundary=clipped.lastIndexOf(' ')
 return `${clipped.slice(0,boundary>max*.65?boundary:max-1).replace(/[\s,;:.!?-]+$/,'')}…`
}

function safeHtml(html:string){
  if(typeof window==='undefined') return ''
  const doc=new DOMParser().parseFromString(html,'text/html')
  doc.querySelectorAll('script,style,object,embed,form,meta,link').forEach(n=>n.remove())
  doc.querySelectorAll('*').forEach(node=>[...node.attributes].forEach(a=>{
    const value=a.value.trim().toLowerCase()
    if(a.name.toLowerCase().startsWith('on')||(['href','src'].includes(a.name.toLowerCase())&&value.startsWith('javascript:')))node.removeAttribute(a.name)
  }))
  return doc.body.innerHTML
}

function Wysiwyg({value,onChange}:{value:string;onChange:(v:string)=>void}){
  const ref=useRef<HTMLDivElement>(null)
  useEffect(()=>{if(ref.current&&ref.current.innerHTML!==value)ref.current.innerHTML=value},[value])
  function command(name:string,arg?:string){ref.current?.focus();document.execCommand(name,false,arg);onChange(ref.current?.innerHTML||'')}
  const askLink=()=>{const url=window.prompt('URL del collegamento');if(url)command('createLink',url)}
  const paste=(event:ClipboardEvent<HTMLDivElement>)=>{if(event.clipboardData.getData('text/html'))return;const text=event.clipboardData.getData('text/plain');if(!text)return;event.preventDefault();const escape=(v:string)=>v.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');const html=text.trim().split(/\n\s*\n/).map(block=>`<p>${block.split('\n').map(escape).join('<br>')}</p>`).join('');document.execCommand('insertHTML',false,html);onChange(ref.current?.innerHTML||'')}
  return <div className="rounded-xl border border-[#383938] bg-[#0d0e0e]">
    <div role="toolbar" aria-label="Formattazione contenuto" className="flex flex-wrap gap-1 border-b border-[#383938] p-2">
      <Button type="button" size="icon" variant="ghost" aria-label="Annulla" onClick={()=>command('undo')}><Undo2/></Button>
      <Button type="button" size="icon" variant="ghost" aria-label="Ripeti" onClick={()=>command('redo')}><Redo2/></Button>
      <Button type="button" size="icon" variant="ghost" aria-label="Grassetto" onClick={()=>command('bold')}><Bold/></Button>
      <Button type="button" size="icon" variant="ghost" aria-label="Corsivo" onClick={()=>command('italic')}><Italic/></Button>
      <Button type="button" size="icon" variant="ghost" aria-label="Elenco puntato" onClick={()=>command('insertUnorderedList')}><List/></Button>
      <Button type="button" size="icon" variant="ghost" aria-label="Elenco numerato" onClick={()=>command('insertOrderedList')}><ListOrdered/></Button>
      <Button type="button" size="icon" variant="ghost" aria-label="Collegamento" onClick={askLink}><Link2/></Button>
      {([['P','Paragrafo'],['H2','Titolo 2'],['H3','Titolo 3'],['BLOCKQUOTE','Citazione']] as const).map(([tag,label])=><Button key={tag} type="button" variant="ghost" onClick={()=>command('formatBlock',tag)}>{label}</Button>)}
      <Button type="button" variant="ghost" onClick={()=>command('formatBlock','PRE')}><Code/>Codice</Button>
    </div>
    <div ref={ref} contentEditable suppressContentEditableWarning role="textbox" aria-multiline="true" aria-label="Contenuto dell'articolo" data-placeholder="Scrivi l'articolo…" className="admin-wysiwyg min-h-[420px] max-w-none p-5 outline-none empty:before:text-[#777] empty:before:content-[attr(data-placeholder)]" onPaste={paste} onInput={e=>onChange(e.currentTarget.innerHTML)} onBlur={e=>onChange(e.currentTarget.innerHTML)}/>
  </div>
}

function Multi({label,items,value,onChange}:{label:string;items:Choice[];value:string[];onChange:(v:string[])=>void}){
 return <fieldset className="grid gap-2"><legend className="text-sm font-medium">{label}</legend><div className="max-h-44 space-y-1 overflow-auto rounded-lg border border-[#383938] p-2">{items.map(x=><label className="flex items-center gap-2 text-sm" key={x.id}><input type="checkbox" checked={value.includes(x.id)} onChange={e=>onChange(e.target.checked?[...value,x.id]:value.filter(id=>id!==x.id))}/>{x.name}</label>)}</div></fieldset>
}

export function AdminArticleEditor({client,user,id}:{client:Db;user:{id:string};id:'new'|string}){
 const router=useRouter(),isNew=id==='new',draftKey=`admin-article-draft-v2-${id}`
 const [data,setData]=useState<Article>(empty),[categories,setCategories]=useState<Choice[]>([]),[authors,setAuthors]=useState<Choice[]>([]),[articles,setArticles]=useState<Choice[]>([]),[tags,setTags]=useState(''),[pollQuestion,setPollQuestion]=useState(''),[pollOptions,setPollOptions]=useState(['','']),[revisions,setRevisions]=useState<Revision[]>([]),[notice,setNotice]=useState(''),[seoNotice,setSeoNotice]=useState(''),[busy,setBusy]=useState(false),[preview,setPreview]=useState(false),[draftFound,setDraftFound]=useState(false),[draftReady,setDraftReady]=useState(false),[galleryUrl,setGalleryUrl]=useState('')
 const set=<K extends keyof Article>(key:K,value:Article[K])=>setData(v=>({...v,[key]:value}))

 const load=useCallback(async()=>{
  setBusy(true)
  try{
   const [cats,people,others]=await Promise.all([
    client.from('categories').select('id,name').order('name'),
    client.from('profiles').select('id,username').in('role',['author','admin']).order('username'),
    client.from('articles').select('id,title').neq('id',isNew?'00000000-0000-0000-0000-000000000000':id).order('updated_at',{ascending:false}).limit(100),
   ])
   setCategories((cats.data||[]) as Choice[]);setAuthors((people.data||[]).map((x:any)=>({id:x.id,name:x.username||'Autore'})));setArticles((others.data||[]).map((x:any)=>({id:x.id,name:x.title})))
   if(!isNew){
    const [article,tagRows,poll,rev]=await Promise.all([
     client.from('articles').select('*').eq('id',id).single(), client.from('article_tags').select('tags(name)').eq('article_id',id),
     client.from('article_polls').select('id,question,is_active,article_poll_options(label,position)').eq('article_id',id).maybeSingle(),
     client.from('article_revisions').select('id,title,excerpt,content,created_at').eq('article_id',id).order('created_at',{ascending:false}).limit(30),
    ])
    if(article.error)throw article.error
    const a=article.data as any;setData(normalizeArticle({...a,category_id:a.category_id||'',status:a.status==='draft'&&a.scheduled_at?'scheduled':a.status,scheduled_at:a.scheduled_at?.slice(0,16)||''}))
    setTags((tagRows.data||[]).map((x:any)=>x.tags?.name).filter(Boolean).join(', '));setRevisions((rev.data||[]) as Revision[])
    if(poll.data){setPollQuestion(poll.data.question);setPollOptions((poll.data.article_poll_options||[]).sort((a:any,b:any)=>a.position-b.position).map((x:any)=>x.label))}
   }else{const raw=localStorage.getItem(draftKey);if(raw){const draft=JSON.parse(raw);setData(normalizeArticle(draft.data));setTags(draft.tags||'');setPollQuestion(draft.pollQuestion||'');setPollOptions(Array.isArray(draft.pollOptions)?draft.pollOptions:['','']);setNotice('Bozza locale ripristinata automaticamente.')}}
   setDraftFound(Boolean(localStorage.getItem(draftKey)))
  }catch(e){setNotice(err(e))}finally{setBusy(false);setDraftReady(true)}
 },[client,draftKey,id,isNew])
 useEffect(()=>{void load()},[load])
 useEffect(()=>{if(!draftReady)return;const saveDraft=()=>localStorage.setItem(draftKey,JSON.stringify({data,tags,pollQuestion,pollOptions,savedAt:new Date().toISOString()}));const timer=setTimeout(saveDraft,700);const visibility=()=>{if(document.visibilityState==='hidden')saveDraft()};window.addEventListener('pagehide',saveDraft);document.addEventListener('visibilitychange',visibility);return()=>{clearTimeout(timer);window.removeEventListener('pagehide',saveDraft);document.removeEventListener('visibilitychange',visibility)}},[data,draftKey,draftReady,pollOptions,pollQuestion,tags])

 function restoreDraft(){try{const d=JSON.parse(localStorage.getItem(draftKey)||'null');if(d){setData(normalizeArticle(d.data));setTags(d.tags||'');setPollQuestion(d.pollQuestion||'');setPollOptions(Array.isArray(d.pollOptions)?d.pollOptions:['','']);setNotice('Bozza locale ripristinata.')}}catch(e){setNotice(err(e))}}
 const issues=useMemo(()=>{const plain=plainText(data.content);return [!data.title.trim()?'Titolo obbligatorio':'',data.title.length>90?'Titolo oltre 90 caratteri':'',!plain?'Contenuto obbligatorio':'',plain.length<450?'Contenuto breve':'',!data.meta_title.trim()?'Meta title mancante':'',data.meta_title.length>70?'Meta title oltre 70 caratteri':'',!data.meta_description.trim()?'Meta description mancante':'',data.meta_description.length>160?'Meta description oltre 160 caratteri':'',!data.canonical_url?'Canonical mancante':'',data.canonical_url&&!/^https?:\/\//i.test(data.canonical_url)?'Canonical non valido':'',!data.og_image?'OG image mancante':'',!data.source_url?'Fonte mancante':'',data.source_url&&!/^https?:\/\//i.test(data.source_url)?'Fonte non valida':'',data.status==='scheduled'&&!data.scheduled_at?'Data di programmazione obbligatoria':'',data.scheduled_at&&+new Date(data.scheduled_at)<=Date.now()?'Programmazione nel passato':''].filter(Boolean)},[data])
 const score=Math.max(0,100-issues.length*10)

 function generateSeo(){
  const current=normalizeArticle(data),title=current.title.trim(),slug=current.slug.trim()||slugify(title)
  if(!title||!slug){setSeoNotice('Inserisci prima il titolo dell’articolo: serve per generare slug, canonical e metadati.');return}
  const canonical=`${SITE_ORIGIN}/articolo/${slug}`
  const descriptionSource=current.excerpt.trim()||plainText(current.content)||title
  const generated:Partial<Article>={slug,meta_title:fitMeta(title,70),meta_description:fitMeta(descriptionSource,160),canonical_url:canonical,og_image:current.cover_image||current.gallery[0]||'',source_url:current.source_url.trim()||canonical}
  setData(current=>({...current,...generated}))
  setSeoNotice(generated.og_image?'SEO e fonti generate correttamente. Ora puoi controllare i conflitti e salvare.':'SEO e fonti generate. Per arrivare al 100% aggiungi una copertina: verrà usata come immagine OG.')
 }

 async function upload(file:File,target:'cover_image'|'gallery'){
  const allowed=['image/jpeg','image/png','image/webp','image/avif'];if(!allowed.includes(file.type))return setNotice('Formato non valido: usa JPG, PNG, WebP o AVIF.');if(file.size>8*1024*1024)return setNotice('File troppo grande: massimo 8 MB.')
  setBusy(true);try{const ext=file.name.split('.').pop()?.toLowerCase()||'bin',path=`admin/${new Date().toISOString().slice(0,10)}/${crypto.randomUUID()}.${ext}`;const {error}=await client.storage.from('article-images').upload(path,file,{contentType:file.type,upsert:false});if(error)throw error;const {data:url}=client.storage.from('article-images').getPublicUrl(path);target==='gallery'?set('gallery',[...data.gallery,url.publicUrl]):set('cover_image',url.publicUrl);setNotice('Media caricato.')}catch(e){setNotice(err(e))}finally{setBusy(false)}
 }

 async function checkConflicts(){const slug=data.slug||slugify(data.title);const q=client.from('articles').select('id,title,slug,meta_title,canonical_url').or(`slug.eq.${slug},meta_title.eq.${data.meta_title||'__none__'},canonical_url.eq.${data.canonical_url||'__none__'}`);if(!isNew)q.neq('id',id);const {data:rows,error}=await q;if(error)setNotice(err(error));else setNotice(rows?.length?`Conflitti SEO: ${rows.map((x:any)=>x.title).join(', ')}`:'Nessun conflitto SEO rilevato.')}

 async function persist(){
  if(issues.some(x=>x.includes('obbligatorio')||x.includes('non valido')||x.includes('passato')))throw new Error(`Correggi prima: ${issues.join('; ')}`)
  const payload:any={...data,slug:data.slug||slugify(data.title),category_id:data.category_id||null,author_id:data.author_id||user.id,scheduled_at:data.status==='scheduled'&&data.scheduled_at?new Date(data.scheduled_at).toISOString():null,canonical_url:data.canonical_url||null,source_url:data.source_url||null}
  delete payload.id;delete payload.instagram_post_error;delete payload.instagram_post_permalink
  if(payload.status==='scheduled'){payload.status='draft';payload.published_at=null}
  if(payload.status==='published'&&!payload.published_at)payload.published_at=new Date().toISOString()
  if(!isNew){const old=await client.from('articles').select('title,excerpt,content').eq('id',id).single();if(old.data)await client.from('article_revisions').insert({article_id:id,...old.data,saved_by:user.id})}
  const result=isNew?await client.from('articles').insert(payload).select('id').single():await client.from('articles').update(payload).eq('id',id).select('id').single();if(result.error)throw result.error
  const articleId=result.data.id
  const tagRows=tags.split(',').map(name=>name.trim()).filter(Boolean).map(name=>({name,slug:slugify(name)}));await client.from('article_tags').delete().eq('article_id',articleId)
  if(tagRows.length){const up=await client.from('tags').upsert(tagRows,{onConflict:'slug'});if(up.error)throw up.error;const found=await client.from('tags').select('id').in('slug',tagRows.map(x=>x.slug));if(found.error)throw found.error;if(found.data?.length){const links=await client.from('article_tags').insert(found.data.map((x:any)=>({article_id:articleId,tag_id:x.id})));if(links.error)throw links.error}}
  const opts=pollOptions.map(x=>x.trim()).filter(Boolean);if(pollQuestion.trim()&&opts.length>=2){const p=await client.from('article_polls').upsert({article_id:articleId,question:pollQuestion.trim(),is_active:true},{onConflict:'article_id'}).select('id').single();if(p.error)throw p.error;await client.from('article_poll_options').delete().eq('poll_id',p.data.id);const po=await client.from('article_poll_options').insert(opts.map((label,position)=>({poll_id:p.data.id,label,position})));if(po.error)throw po.error}else await client.from('article_polls').delete().eq('article_id',articleId)
  localStorage.removeItem(draftKey);return articleId
 }
 async function save(){setBusy(true);try{const articleId=await persist();setNotice('Articolo salvato.');if(isNew)router.replace(`/admin/articoli/${articleId}/modifica`);else await load()}catch(e){setNotice(err(e))}finally{setBusy(false)}}
 async function duplicate(){if(isNew)return;setBusy(true);try{const copy={...data,title:`${data.title} — Copia`,slug:`${data.slug}-copia-${Date.now().toString().slice(-5)}`,status:'draft' as const,published_at:null,scheduled_at:''};delete copy.id;const r=await client.from('articles').insert({...copy,author_id:user.id}).select('id').single();if(r.error)throw r.error;setNotice('Copia creata.');router.push(`/admin/articoli/${r.data.id}/modifica`)}catch(e){setNotice(err(e))}finally{setBusy(false)}}
 async function restore(revision:Revision){if(!window.confirm('Ripristinare questa revisione? Lo stato corrente verrà prima salvato nella cronologia.'))return;setData(v=>({...v,title:revision.title||v.title,excerpt:revision.excerpt||'',content:revision.content||''}));setNotice('Revisione caricata nell’editor: salva per confermare.')}
 async function retryInstagram(){if(isNew)return setNotice('Salva prima l’articolo.');setBusy(true);const {error}=await client.functions.invoke('instagram-publisher',{body:{articleId:id,force:true}});setNotice(error?err(error):'Pubblicazione Instagram accodata.');setBusy(false);if(!error)await load()}
 async function push(){if(isNew)return setNotice('Salva prima l’articolo.');setBusy(true);const {error}=await client.functions.invoke('push-notifications',{body:{action:'article-published',articleId:id,title:data.title,url:`/articolo/${data.slug}`}});setNotice(error?err(error):'Notifica articolo inviata.');setBusy(false)}

 return <div className="admin-article-editor grid gap-5 text-[#f4f2ec]">
  <div className="admin-editor-toolbar flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-serif text-3xl">{isNew?'Nuovo articolo':'Editor articolo'}</h2><p className="text-sm text-[#92938c]">SEO {score}/100 · {issues.length?issues.join(' · '):'pronto per la pubblicazione'}</p></div><div className="flex flex-wrap gap-2">{draftFound&&<Button variant="outline" onClick={restoreDraft}><RotateCcw/>Ripristina bozza</Button>}<Button variant="outline" onClick={()=>setPreview(true)}><Eye/>Anteprima</Button>{!isNew&&<Button variant="outline" onClick={duplicate}>Duplica</Button>}<Button disabled={busy} onClick={save}>{busy?<Loader2 className="animate-spin"/>:<Save/>}Salva</Button></div></div>
  {notice&&<p role="status" className="rounded-lg border border-[#6a5737] bg-[#af8f5c]/10 p-3 text-sm">{notice}</p>}
  <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]"><main className="grid content-start gap-5">
   <section className="grid gap-4 rounded-xl border border-[#303130] bg-[#101111] p-5"><Label>Titolo<Input value={data.title} onChange={e=>set('title',e.target.value)}/></Label><Label>Slug<Input value={data.slug} placeholder={slugify(data.title)} onChange={e=>set('slug',e.target.value)}/></Label><Label>Sommario<Textarea value={data.excerpt} onChange={e=>set('excerpt',e.target.value)}/></Label><Wysiwyg value={data.content} onChange={v=>set('content',v)}/><Label>Tag separati da virgola<Input value={tags} onChange={e=>setTags(e.target.value)}/></Label></section>
   <section className="grid gap-4 rounded-xl border border-[#303130] bg-[#101111] p-5"><div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="font-serif text-xl">SEO e fonti</h3><p className="mt-1 text-xs text-[#92938c]">Generazione basata sul contenuto reale, senza fonti inventate.</p></div><Button type="button" onClick={generateSeo}><Sparkles/>Genera SEO e fonti</Button></div>{seoNotice&&<p role="status" aria-live="polite" className="rounded-lg border border-[#6a5737] bg-[#af8f5c]/10 p-3 text-sm text-[#e4c58f]">{seoNotice}</p>}<div className="grid gap-3 md:grid-cols-2"><Label>Meta title ({data.meta_title.length}/70)<Input value={data.meta_title} onChange={e=>set('meta_title',e.target.value)}/></Label><Label>Canonical URL<Input type="url" value={data.canonical_url} onChange={e=>set('canonical_url',e.target.value)}/></Label><Label className="md:col-span-2">Meta description ({data.meta_description.length}/160)<Textarea value={data.meta_description} onChange={e=>set('meta_description',e.target.value)}/></Label><Label>OG image<Input value={data.og_image} onChange={e=>set('og_image',e.target.value)}/></Label><Label>Fonte originale<Input type="url" value={data.source_url} onChange={e=>set('source_url',e.target.value)}/></Label></div><Button type="button" variant="outline" onClick={checkConflicts}>Controlla conflitti SEO</Button></section>
   <section className="grid gap-4 rounded-xl border border-[#303130] bg-[#101111] p-5"><h3 className="font-serif text-xl">Sondaggio articolo</h3><Input placeholder="Domanda" value={pollQuestion} onChange={e=>setPollQuestion(e.target.value)}/>{pollOptions.map((x,i)=><Input key={i} placeholder={`Opzione ${i+1}`} value={x} onChange={e=>setPollOptions(pollOptions.map((o,n)=>n===i?e.target.value:o))}/>)}<Button type="button" variant="outline" onClick={()=>setPollOptions([...pollOptions,''])}>Aggiungi opzione</Button></section>
   <section className="grid gap-3 rounded-xl border border-[#303130] bg-[#101111] p-5"><h3 className="font-serif text-xl">Cronologia revisioni</h3>{revisions.length?revisions.map(r=><div key={r.id} className="flex items-center justify-between gap-3 border-t border-[#303130] pt-3"><span><b>{r.title||'Senza titolo'}</b><small className="block text-[#888]">{new Date(r.created_at).toLocaleString('it-IT')}</small></span><Button type="button" variant="outline" onClick={()=>restore(r)}>Ripristina</Button></div>):<p className="text-sm text-[#888]">Nessuna revisione salvata.</p>}</section>
  </main><aside className="grid content-start gap-5">
   <section className="grid gap-4 rounded-xl border border-[#303130] bg-[#101111] p-5"><h3 className="font-serif text-xl">Pubblicazione</h3><Label>Stato<select className="mt-2 h-9 w-full rounded-lg border border-[#444] bg-[#151616] px-3" value={data.status} onChange={e=>{const status=e.target.value as Article['status'];setData(v=>({...v,status,scheduled_at:status==='scheduled'?v.scheduled_at:'',published_at:status==='published'?v.published_at:null}))}}><option value="draft">Bozza</option><option value="scheduled">Programmato</option><option value="published">Pubblicato</option></select></Label><Label>Programma<Input type="datetime-local" disabled={data.status!=='scheduled'} value={data.scheduled_at} onChange={e=>set('scheduled_at',e.target.value)}/></Label>{data.status==='scheduled'&&<p className="text-xs leading-5 text-[#d2b27d]">L’articolo verrà pubblicato automaticamente alla data indicata.</p>}<Label>Categoria<select className="mt-2 h-9 w-full rounded-lg border border-[#444] bg-[#151616] px-3" value={data.category_id} onChange={e=>set('category_id',e.target.value)}><option value="">Nessuna</option>{categories.map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select></Label>{([['featured','In evidenza'],['noindex','No index'],['instagram_publish_enabled','Instagram attivo']] as const).map(([k,l])=><div className="flex items-center justify-between" key={k}><Label>{l}</Label><Switch checked={Boolean(data[k])} onCheckedChange={v=>set(k,v)}/></div>)}</section>
   <section className="grid gap-3 rounded-xl border border-[#303130] bg-[#101111] p-5"><h3 className="font-serif text-xl">Media</h3><Input value={data.cover_image} placeholder="URL copertina" onChange={e=>set('cover_image',e.target.value)}/><Label className="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-[#555] p-3"><Upload/>Carica copertina<Input className="sr-only" type="file" accept="image/jpeg,image/png,image/webp,image/avif" onChange={e=>e.target.files?.[0]&&upload(e.target.files[0],'cover_image')}/></Label><div className="flex gap-2"><Input value={galleryUrl} placeholder="URL galleria" onChange={e=>setGalleryUrl(e.target.value)}/><Button type="button" size="icon" variant="outline" aria-label="Aggiungi alla galleria" onClick={()=>{if(galleryUrl.trim()){set('gallery',[...data.gallery,galleryUrl.trim()]);setGalleryUrl('')}}}><ImagePlus/></Button></div><Label className="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-[#555] p-3"><Upload/>Carica in galleria<Input className="sr-only" type="file" accept="image/jpeg,image/png,image/webp,image/avif" onChange={e=>e.target.files?.[0]&&upload(e.target.files[0],'gallery')}/></Label>{data.gallery.map((url,i)=><div className="flex gap-2" key={`${url}-${i}`}><Input value={url} readOnly/><Button type="button" variant="destructive" onClick={()=>set('gallery',data.gallery.filter((_,n)=>n!==i))}>Rimuovi</Button></div>)}</section>
   <section className="grid gap-4 rounded-xl border border-[#303130] bg-[#101111] p-5"><Multi label="Coautori" items={authors.filter(x=>x.id!==data.author_id)} value={data.co_author_ids} onChange={v=>set('co_author_ids',v)}/><Multi label="Articoli correlati" items={articles} value={data.related_article_ids} onChange={v=>set('related_article_ids',v)}/><Label>Note interne<Textarea value={data.internal_notes} onChange={e=>set('internal_notes',e.target.value)}/></Label></section>
   <section className="grid gap-3 rounded-xl border border-[#303130] bg-[#101111] p-5"><h3 className="font-serif text-xl">Distribuzione</h3><p className="text-sm text-[#aaa]">Instagram: {data.instagram_post_status||'pending'}</p>{data.instagram_post_error&&<p role="alert" className="text-sm text-red-400">{data.instagram_post_error}</p>}{data.instagram_post_permalink&&<a className="text-sm underline" href={data.instagram_post_permalink} target="_blank" rel="noreferrer">Apri post Instagram</a>}<Input value={data.instagram_image} placeholder="Immagine Instagram" onChange={e=>set('instagram_image',e.target.value)}/><Textarea value={data.instagram_caption_override} placeholder="Caption Instagram" onChange={e=>set('instagram_caption_override',e.target.value)}/><Button type="button" variant="outline" disabled={busy||isNew} onClick={retryInstagram}><RotateCcw/>Riprova Instagram</Button><Button type="button" variant="outline" disabled={busy||isNew} onClick={push}><Send/>Invia push articolo</Button></section>
  </aside></div><div className="admin-mobile-publish" role="region" aria-label="Azioni rapide articolo"><Button variant="outline" disabled={busy} onClick={()=>setPreview(true)}><Eye/>Anteprima</Button><Button disabled={busy} onClick={save}>{busy?<Loader2 className="animate-spin"/>:<Save/>}Salva</Button></div>
  {preview&&<div role="dialog" aria-modal="true" aria-label="Anteprima articolo" className="fixed inset-0 z-[500] overflow-auto bg-black/90 p-4"><div className="mx-auto max-w-5xl"><Button className="mb-3" onClick={()=>setPreview(false)}>Chiudi anteprima</Button><iframe title="Anteprima sicura articolo" sandbox="" className="h-[82vh] w-full rounded-xl bg-white" srcDoc={`<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width"><style>body{max-width:760px;margin:0 auto;padding:48px 24px;font:18px/1.7 Georgia;color:#111}h1{font-size:52px;line-height:1}img,video{max-width:100%;height:auto}a{color:#604b27}</style><article><h1>${safeHtml(data.title)}</h1><p>${safeHtml(data.excerpt)}</p>${data.cover_image?`<img src="${data.cover_image.replaceAll('&','&amp;').replaceAll('"','&quot;')}" alt="">`:''}${safeHtml(data.content)}</article>`}/></div></div>}
 </div>
}
