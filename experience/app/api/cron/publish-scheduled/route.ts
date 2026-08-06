import {publishDueArticles} from '@/lib/scheduled-publishing'

export const dynamic='force-dynamic'

export async function GET(request:Request){
 const secret=process.env.CRON_SECRET
 if(!secret)return Response.json({ok:false,error:'Cron non configurato'},{status:503})
 if(request.headers.get('authorization')!==`Bearer ${secret}`)return Response.json({ok:false,error:'Non autorizzato'},{status:401})
 try{return Response.json({ok:true,...await publishDueArticles(),at:new Date().toISOString()})}
 catch(error){return Response.json({ok:false,error:error instanceof Error?error.message:'Pubblicazione non riuscita'},{status:500})}
}
