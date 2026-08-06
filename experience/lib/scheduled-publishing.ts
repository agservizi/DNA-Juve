import 'server-only'
import {createClient} from '@supabase/supabase-js'

export async function publishDueArticles(){
 const url=process.env.SUPABASE_URL||process.env.NEXT_PUBLIC_SUPABASE_URL
 const key=process.env.SUPABASE_SERVICE_ROLE_KEY
 if(!url||!key)return {published:0,configured:false}
 const db=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}})
 const result=await db.rpc('publish_due_articles',{batch_limit:100})
 if(result.error)throw result.error
 return {published:result.data?.length||0,configured:true}
}
