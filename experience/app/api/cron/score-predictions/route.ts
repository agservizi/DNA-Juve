import { createClient } from '@supabase/supabase-js'
import { getTeamMatches, type Match } from '@/lib/match-market-content'
import { mergeClub, type ClubPrediction } from '@/lib/reader-club'

export const dynamic='force-dynamic'

type ReaderStateRow={user_id:string;gamification:unknown}
type CommunityPredictionRow={id:string;match_id:string|null;home_score:number|null;away_score:number|null;scored:boolean|null}

function scoreValue(value:number|null|undefined){return typeof value==='number'&&Number.isFinite(value)?value:0}
function outcome(home:number,away:number){return home===away?'X':home>away?'1':'2'}
function scorePrediction(prediction:ClubPrediction,match:Match){if(prediction.homeScore===match.homeScore&&prediction.awayScore===match.awayScore)return 15;return outcome(prediction.homeScore,prediction.awayScore)===outcome(match.homeScore,match.awayScore)?5:0}

async function hasPublicPredictionScoringColumns(db:any){
 const probe=await db.from('community_predictions').select('id,match_id,scored,points').limit(1)
 if(!probe.error)return true
 if(probe.error.code==='42703')return false
 throw probe.error
}

export async function GET(request:Request){
 const secret=process.env.CRON_SECRET
 if(!secret)return Response.json({ok:false,error:'Cron non configurato'},{status:503})
 if(request.headers.get('authorization')!==`Bearer ${secret}`)return Response.json({ok:false,error:'Non autorizzato'},{status:401})

 const url=process.env.SUPABASE_URL||process.env.NEXT_PUBLIC_SUPABASE_URL
 const key=process.env.SUPABASE_SERVICE_ROLE_KEY
 if(!url||!key)return Response.json({ok:false,error:'Supabase service role non configurato'},{status:503})

 try{
  const db=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}})
  const playedMatches=(await getTeamMatches()).filter(match=>match.played)
  const playedById=new Map(playedMatches.map(match=>[String(match.id),match]))
  if(!playedById.size)return Response.json({ok:true,matchesChecked:0,readerStatesUpdated:0,predictionsScored:0,awardedXp:0,publicPredictionsUpdated:0,at:new Date().toISOString()})

  const {data:rows,error}=await db.from('reader_states').select('user_id,gamification')
  if(error)throw error

  let readerStatesUpdated=0
  let predictionsScored=0
  let awardedXp=0

  for(const row of (rows||[]) as ReaderStateRow[]){
    const club=mergeClub(row.gamification,{})
    let touched=false
    let gained=0
    let scoredCount=0
    const predictions=club.predictions.map(prediction=>{
      const matchId=prediction.matchId?String(prediction.matchId):''
      const match=matchId?playedById.get(matchId):undefined
      if(!match||prediction.scored)return prediction
      const points=scorePrediction(prediction,match)
      touched=true
      gained+=points
      scoredCount+=1
      return {...prediction,scored:true,points}
    })
    if(!touched)continue
    const nextClub={...club,xp:Number(club.xp||0)+gained,predictions}
    const update=await db.from('reader_states').update({gamification:nextClub,last_synced_at:new Date().toISOString()}).eq('user_id',row.user_id)
    if(update.error)throw update.error
    readerStatesUpdated+=1
    predictionsScored+=scoredCount
    awardedXp+=gained
  }

  let publicPredictionsUpdated=0
  if(await hasPublicPredictionScoringColumns(db)){
    const matchIds=[...playedById.keys()]
    const {data:publicRows,error:publicError}=await db.from('community_predictions').select('id,match_id,home_score,away_score,scored').in('match_id',matchIds)
    if(publicError)throw publicError
    for(const row of (publicRows||[]) as CommunityPredictionRow[]){
      if(row.scored||!row.match_id)continue
      const match=playedById.get(String(row.match_id))
      if(!match)continue
      const points=scorePrediction({id:row.id,matchId:row.match_id,match:`${match.home} — ${match.away}`,homeScore:scoreValue(row.home_score),awayScore:scoreValue(row.away_score),createdAt:match.date},match)
      const update=await db.from('community_predictions').update({scored:true,points}).eq('id',row.id)
      if(update.error)throw update.error
      publicPredictionsUpdated+=1
    }
  }

  return Response.json({ok:true,matchesChecked:playedById.size,readerStatesUpdated,predictionsScored,awardedXp,publicPredictionsUpdated,at:new Date().toISOString()})
 }catch(error){
  return Response.json({ok:false,error:error instanceof Error?error.message:'Scoring non riuscito'},{status:500})
 }
}
