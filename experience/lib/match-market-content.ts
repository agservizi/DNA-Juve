import { createClient } from '@supabase/supabase-js'

export type Player = { id: number; name: string; number: number|null; role: 'POR'|'DIF'|'CEN'|'ATT'; nat: string; img: string; rarity: string; newSigning?: boolean; officialUrl?: string }
export type TransferRumor = { id: string; player_name: string; player_image?: string; direction: 'in'|'out'; from_team?: string; to_team?: string; fee?: string; status: string; reliability?: number; notes?: string; source?: string; source_url?: string; updated_at?: string }
export type TransferUpdate = { id: string; new_status: string; note?: string; created_at: string }
export type Match = { id:number; home:string; away:string; homeScore:number; awayScore:number; competition:string; venue:string; date:string; played:boolean }

const IMG = 'https://r2.thesportsdb.com/images/media/player/cutout/'
const establishedSquad: Player[] = [
 [1,'Perin',1,'POR','🇮🇹','oo0l5m1759222361.png','silver'],[2,'Di Gregorio',16,'POR','🇮🇹','fgvi9t1759222392.png','gold'],[3,'Pinsoglio',23,'POR','🇮🇹','8s18041759222421.png','bronze'],
 [5,'Bremer',3,'DIF','🇧🇷','3qx4p71759224866.png','gold'],[6,'Gatti',4,'DIF','🇮🇹','z1jv3i1759224911.png','silver'],[7,'Kelly',6,'DIF','🇬🇧','asto6f1759224942.png','bronze'],[8,'Kalulu',15,'DIF','🇫🇷','bl8oj61759224970.png','silver'],[9,'Cambiaso',27,'DIF','🇮🇹','6r741t1759225481.png','gold'],[10,'Cabal',32,'DIF','🇨🇴','qbfpln1759225060.png','bronze'],
 [11,'Locatelli',5,'CEN','🇮🇹','/players/manuel-locatelli.png','silver'],[12,'Koopmeiners',8,'CEN','🇳🇱','pvqhh01759225850.png','legendary'],[15,'Thuram',19,'CEN','🇫🇷','z7zq751759225259.png','gold'],[16,'Miretti',21,'CEN','🇮🇹','cjhsf71759225300.png','silver'],[17,'McKennie',22,'CEN','🇺🇸','ct34v01759225325.png','gold'],
 [18,'Conceição',7,'ATT','🇵🇹','ekqivz1759225498.png','legendary'],[20,'Yıldız',10,'ATT','🇹🇷','zgep4d1759225554.png','legendary'],[21,'Zhegrova',11,'ATT','🇽🇰','0cl9vy1759225607.png','gold'],[22,'Boga',13,'ATT','🇨🇮','spr68z1766319612.png','silver'],[23,'Milik',14,'ATT','🇵🇱','3wwsgd1759225651.png','silver'],[25,'David',30,'ATT','🇨🇦','nyd9d91759225738.png','gold'],
].map(([id,name,number,role,nat,img,rarity]) => ({ id, name, number, role, nat, img: String(img).startsWith('/') ? String(img) : IMG + img, rarity })) as Player[]

export const squad: Player[] = [
 ...establishedSquad,
 {id:26,name:'Zeki Çelik',number:null,role:'DIF',nat:'🇹🇷',img:'/players/zeki-celik.jpg',rarity:'new signing',newSigning:true,officialUrl:'https://www.juventus.com/it/news/articoli/ufficiale-celik-e-un-nuovo-giocatore-della-juventus'},
 {id:27,name:'Jeff Ekhator',number:null,role:'ATT',nat:'🇮🇹',img:'/players/jeff-ekhator.jpg',rarity:'new signing',newSigning:true,officialUrl:'https://www.juventus.com/it/news/articoli/ufficiale-jeff-ekhator-e-un-nuovo-giocatore-della-juventus'},
 {id:28,name:'Kerim Alajbegović',number:null,role:'ATT',nat:'🇧🇦',img:'/players/kerim-alajbegovic.jpg',rarity:'new signing',newSigning:true,officialUrl:'https://www.juventus.com/it/news/articoli/kerim-alajbegovic-joins'},
 {id:29,name:'Randal Kolo Muani',number:null,role:'ATT',nat:'🇫🇷',img:'/players/randal-kolo-muani.jpg',rarity:'new signing',newSigning:true,officialUrl:'https://www.juventus.com/it/news/articoli/ufficiale-randal-kolo-muani-e-un-giocatore-della-juventus-x7120'},
]

type FootballApiMatch = {id?:number;utcDate?:string;status?:string;venue?:string|null;homeTeam?:{shortName?:string|null;name?:string|null};awayTeam?:{shortName?:string|null;name?:string|null};score?:{fullTime?:{home?:number|null;away?:number|null}};competition?:{name?:string|null}}

export function mapFootballApiMatches(value:unknown):Match[]{
 if(!value||typeof value!=='object'||!Array.isArray((value as {matches?:unknown}).matches))return []
 return ((value as {matches:FootballApiMatch[]}).matches).flatMap((m)=>{
  const home=m.homeTeam?.shortName||m.homeTeam?.name
  const away=m.awayTeam?.shortName||m.awayTeam?.name
  if(typeof m.id!=='number'||!home||!away||!m.utcDate||Number.isNaN(Date.parse(m.utcDate)))return []
  return [{id:m.id,home,away,homeScore:m.score?.fullTime?.home??0,awayScore:m.score?.fullTime?.away??0,competition:m.competition?.name||'Competizione',venue:m.venue||'',date:m.utcDate,played:m.status==='FINISHED'}]
 })
}

export async function getTeamMatches():Promise<Match[]> {
 const key=process.env.FOOTBALL_API_KEY
 if(!key){console.error('[football-api] FOOTBALL_API_KEY non configurata');return []}
 try{
  const res=await fetch('https://api.football-data.org/v4/teams/109/matches',{headers:{'X-Auth-Token':key},next:{revalidate:300}})
  if(!res.ok){console.error(`[football-api] risposta ${res.status}`);return []}
  return mapFootballApiMatches(await res.json())
 }catch(error){console.error('[football-api] richiesta non riuscita',error);return []}
}

function client() { const u=process.env.NEXT_PUBLIC_SUPABASE_URL; const k=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY; return u&&k ? createClient(u,k) : null }
export async function getRumors(): Promise<TransferRumor[]> { const c=client(); if(!c)return []; const {data}=await c.from('transfer_rumors').select('*').eq('is_active',true).order('updated_at',{ascending:false}); return (data||[]) as TransferRumor[] }
export async function getUpdates(id:string): Promise<TransferUpdate[]> { const c=client(); if(!c)return []; const {data}=await c.from('transfer_updates').select('*').eq('rumor_id',id).order('created_at',{ascending:true}); return (data||[]) as TransferUpdate[] }
export async function getMarketArticles() {
  const c = client()
  if (!c) return []
  const { data, error } = await c
    .from('articles')
    .select('id,title,slug,excerpt,cover_image,published_at,categories!inner(name,slug)')
    .eq('status', 'published')
    .eq('categories.slug', 'mercato')
    .order('published_at', { ascending: false })
    .limit(40)
  if (error) {
    console.error('[getMarketArticles]', error.message)
    return []
  }
  return (data || []).map((a: any) => {
    const categories = Array.isArray(a.categories) ? a.categories[0] || null : a.categories
    return { ...a, categories }
  })
}
