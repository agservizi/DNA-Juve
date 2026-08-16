import 'server-only'
import {announcePublishedArticle} from '@/lib/telegram/channel'
import {createClient} from '@supabase/supabase-js'

export async function publishDueArticles(){
 const url=process.env.SUPABASE_URL||process.env.NEXT_PUBLIC_SUPABASE_URL
 const key=process.env.SUPABASE_SERVICE_ROLE_KEY
 if(!url||!key)return {published:0,configured:false}
 const db=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}})
 const result=await db.rpc('publish_due_articles',{batch_limit:100})
 if(result.error)throw result.error
 const rows=Array.isArray(result.data)?result.data:[]
 const site=(process.env.NEXT_PUBLIC_SITE_URL||'https://bianconerihub.com').replace(/\/+$/,'')
 for(const row of rows){
  const slug=typeof row?.slug==='string'?row.slug:''
  const title=typeof row?.title==='string'?row.title:''
  if(!slug||!title)continue
  await announcePublishedArticle({
   title,
   excerpt:typeof row?.excerpt==='string'?row.excerpt:null,
   url:`${site}/articolo/${slug}`,
   cover_image:typeof row?.cover_image==='string'?row.cover_image:null,
  })
 }
 return {published:rows.length||0,configured:true}
}
