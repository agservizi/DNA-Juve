import { createClient } from '@/lib/supabase/client'
import { translateAuthError } from '@/lib/auth-errors'

export type Poll = { id:string; question:string; description?:string|null; category?:string|null; cover_image?:string|null; expires_at?:string|null; options:PollOption[]; totalVotes:number; currentVote?:string|null }
export type PollOption = { id:string; label:string; position:number; votes:number }
export type RatingMatch = { id:string; competition?:string; home_team:string; away_team:string; home_score?:number|null; away_score?:number|null; match_date:string }
export type PlayerRating = { id:string; player_name:string; player_number?:number|null; position?:string|null; is_starter:boolean; display_order:number; avgRating:number|null; totalVotes:number }
export type ForumCategory = { id:string; name:string; slug:string; color?:string|null }
export type ForumThread = { id:string; category_id:string; title:string; content:string; author_id?:string|null; author_name:string; is_pinned:boolean; is_locked:boolean; views:number; reply_count:number; like_count?:number; follower_count?:number; last_reply_at?:string|null; created_at:string; forum_categories?:{name:string;slug:string;color?:string|null}|null }
export type ForumReply = { id:string; thread_id:string; content:string; author_id?:string|null; author_name:string; created_at:string }

const db = () => createClient()
export async function getPolls(userId?:string) {
  const client = db()
  const { data, error } = await client.from('community_polls').select('id,question,description,category,cover_image,expires_at,community_poll_options(id,label,position)').eq('is_active',true).order('created_at',{ascending:false})
  if (error) throw error
  const polls = data || []
  const pollIds = polls.map((poll) => poll.id)
  const { data: votes, error: votesError } = pollIds.length
    ? await client.from('community_poll_votes').select('poll_id,option_id,user_id').in('poll_id', pollIds)
    : { data: [], error: null }
  if (votesError) throw votesError
  const allVotes = votes || []
  return polls.map((p) => {
    const pollVotes = allVotes.filter((vote) => vote.poll_id === p.id)
    const counts:Record<string,number>={}; pollVotes.forEach(v=>counts[v.option_id]=(counts[v.option_id]||0)+1)
    const rawOptions = (p.community_poll_options || []) as unknown as Array<{id:string;label:string;position:number}>
    return {...p,options:rawOptions.sort((a,b)=>a.position-b.position).map(o=>({...o,votes:counts[o.id]||0})),totalVotes:pollVotes.length,currentVote:userId?pollVotes.find(v=>v.user_id===userId)?.option_id:null} as Poll
  })
}
export async function votePoll(pollId:string,optionId:string,userId?:string,guestId?:string){ const payload:Record<string,string>={poll_id:pollId,option_id:optionId}; if(userId)payload.user_id=userId; else if(guestId)payload.guest_id=guestId; const {error}=await db().from('community_poll_votes').upsert([payload],userId?{onConflict:'poll_id,user_id'}:undefined); if(error)throw error }
export async function getMatches(){const {data,error}=await db().from('pagelle_matches').select('*').eq('is_active',true).order('match_date',{ascending:false});if(error)throw error;return (data||[]) as RatingMatch[]}
export async function getPlayers(matchId:string){const c=db();const {data:players,error}=await c.from('pagelle_players').select('id,player_name,player_number,position,is_starter,display_order').eq('match_id',matchId).order('display_order');if(error)throw error;const ids=(players||[]).map(p=>p.id);if(!ids.length)return [];const {data:ratings}=await c.from('pagelle_ratings').select('player_id,rating').in('player_id',ids);return (players||[]).map(p=>{const rs=(ratings||[]).filter(r=>r.player_id===p.id).map(r=>Number(r.rating));return {...p,avgRating:rs.length?Number((rs.reduce((a,b)=>a+b,0)/rs.length).toFixed(1)):null,totalVotes:rs.length} as PlayerRating})}
export async function ratePlayer(playerId:string,rating:number,userId?:string,guestId?:string){const payload:Record<string,string|number>={player_id:playerId,rating};if(userId)payload.user_id=userId;else if(guestId)payload.guest_id=guestId;const {error}=await db().from('pagelle_ratings').upsert([payload],userId?{onConflict:'player_id,user_id'}:undefined);if(error)throw error}
export async function getCategories(){const {data,error}=await db().from('forum_categories').select('*').order('display_order');if(error)throw error;return(data||[]) as ForumCategory[]}
export async function getThreads(categoryId?:string,search=''){let q=db().from('forum_threads').select('id,category_id,title,content,author_id,author_name,is_pinned,is_locked,views,reply_count,like_count,follower_count,last_reply_at,created_at,forum_categories:forum_categories!forum_threads_category_id_fkey(name,slug,color)').order('is_pinned',{ascending:false}).order('last_reply_at',{ascending:false,nullsFirst:false}).limit(50);if(categoryId)q=q.eq('category_id',categoryId);if(search.trim())q=q.or(`title.ilike.%${search.trim().replace(/,/g,' ')}%,content.ilike.%${search.trim().replace(/,/g,' ')}%`);let {data,error}:any=await q;if(error){let fallback=db().from('forum_threads').select('id,category_id,title,content,author_id,author_name,is_pinned,is_locked,views,reply_count,last_reply_at,created_at,forum_categories:forum_categories!forum_threads_category_id_fkey(name,slug,color)').order('is_pinned',{ascending:false}).order('last_reply_at',{ascending:false,nullsFirst:false}).limit(50);if(categoryId)fallback=fallback.eq('category_id',categoryId);({data,error}=await fallback)}if(error)throw error;return(data||[]).map((t:any)=>({...t,like_count:t.like_count??0,follower_count:t.follower_count??0})) as unknown as ForumThread[]}
export async function getThread(id:string){const {data,error}=await db().from('forum_threads').select('id,category_id,title,content,author_id,author_name,is_pinned,is_locked,views,reply_count,like_count,follower_count,last_reply_at,created_at,forum_categories:forum_categories!forum_threads_category_id_fkey(name,slug,color)').eq('id',id).maybeSingle();if(error)throw error;return data as unknown as ForumThread|null}
export async function getReplies(id:string){const {data,error}=await db().from('forum_replies').select('*').eq('thread_id',id).order('created_at');if(error)throw error;return(data||[]) as ForumReply[]}
export async function createThread(input:{categoryId:string;title:string;content:string;authorId:string;authorName:string}){const {data,error}=await db().from('forum_threads').insert([{category_id:input.categoryId,title:input.title,content:input.content,author_id:input.authorId,author_name:input.authorName,last_reply_at:new Date().toISOString()}]).select().single();if(error)throw error;return data}
export async function createReply(input:{threadId:string;content:string;authorId:string;authorName:string}){const {error}=await db().from('forum_replies').insert([{thread_id:input.threadId,content:input.content,author_id:input.authorId,author_name:input.authorName}]);if(error)throw error}
export async function getThreadViewerState(threadId:string,userId:string){const client=db();const[like,follow]=await Promise.all([client.from('forum_thread_likes').select('thread_id').eq('thread_id',threadId).eq('user_id',userId).maybeSingle(),client.from('forum_thread_follows').select('thread_id').eq('thread_id',threadId).eq('user_id',userId).maybeSingle()]);if(like.error)throw like.error;if(follow.error)throw follow.error;return{isLiked:Boolean(like.data),isFollowing:Boolean(follow.data)}}
export async function setThreadLike(threadId:string,userId:string,active:boolean){const query=active?db().from('forum_thread_likes').upsert([{thread_id:threadId,user_id:userId}],{onConflict:'thread_id,user_id'}):db().from('forum_thread_likes').delete().eq('thread_id',threadId).eq('user_id',userId);const{error}=await query;if(error)throw error}
export async function setThreadFollow(threadId:string,userId:string,active:boolean){const query=active?db().from('forum_thread_follows').upsert([{thread_id:threadId,user_id:userId}],{onConflict:'thread_id,user_id'}):db().from('forum_thread_follows').delete().eq('thread_id',threadId).eq('user_id',userId);const{error}=await query;if(error)throw error}
export async function incrementThreadViews(threadId:string){const{error}=await db().rpc('increment_thread_views',{thread_id:threadId});if(error)throw error}
export async function getReader(){const c=db();const {data:{user}}=await c.auth.getUser();if(!user)return null;const {data:p}=await c.from('profiles').select('username,avatar_url,bio,role,created_at').eq('id',user.id).maybeSingle();return{id:user.id,email:user.email||'',name:p?.username||user.user_metadata?.display_name||user.email?.split('@')[0]||'Tifoso',...p}}
export async function signIn(email:string,password:string){
  const {error}=await db().auth.signInWithPassword({email,password})
  if(error) throw new Error(translateAuthError(error,'Accesso non riuscito. Riprova.'))
}
export async function signUp(name:string,email:string,password:string):Promise<{needsEmailConfirmation:boolean}>{
  const c=db()
  const {data:auth,error:authError}=await c.auth.signUp({
    email,
    password,
    options:{data:{display_name:name.trim()}},
  })
  if(authError){
    throw new Error(translateAuthError(authError,'Registrazione non riuscita. Riprova.'))
  }
  // Profile row is created by public.handle_new_user trigger; sync display name if session exists.
  if(auth.user){
    const {error:profileError}=await c.from('profiles').upsert(
      [{id:auth.user.id,username:name.trim(),role:'reader',email}],
      {onConflict:'id'},
    )
    if(profileError&&profileError.code!=='23505'&&profileError.code!=='42501'){
      throw new Error(translateAuthError(profileError,'Profilo non salvato. Riprova tra poco.'))
    }
  }
  return {needsEmailConfirmation:!auth.session}
}
export async function signOut(){await db().auth.signOut()}

export type ReaderState = { bookmarks:any[]; history:any[]; preferences:Record<string,any>; gamification:Record<string,any>; notifications_enabled:boolean }
export async function getReaderState(userId:string){const {data,error}=await db().from('reader_states').select('bookmarks,history,preferences,gamification,notifications_enabled').eq('user_id',userId).maybeSingle();if(error)throw error;return {bookmarks:Array.isArray(data?.bookmarks)?data.bookmarks:[],history:Array.isArray(data?.history)?data.history:[],preferences:data?.preferences&&typeof data.preferences==='object'?data.preferences:{},gamification:data?.gamification&&typeof data.gamification==='object'?data.gamification:{},notifications_enabled:!!data?.notifications_enabled} as ReaderState}
export async function saveReaderState(userId:string,state:Partial<ReaderState>){const {error}=await db().from('reader_states').upsert([{user_id:userId,...state,last_synced_at:new Date().toISOString()}],{onConflict:'user_id'});if(error)throw error}
export async function getReaderNotifications(userId:string){const {data,error}=await db().from('reader_notifications').select('*').eq('user_id',userId).order('created_at',{ascending:false}).limit(100);if(error)throw error;return data||[]}
export async function markNotification(userId:string,id?:string){let q=db().from('reader_notifications').update({is_read:true,read_at:new Date().toISOString()}).eq('user_id',userId).eq('is_read',false);if(id)q=q.eq('id',id);const {error}=await q;if(error)throw error}
export async function getReaderReminders(userId:string){const {data,error}=await db().from('reader_match_reminders').select('*').eq('user_id',userId).in('status',['scheduled','queued']).order('scheduled_for');if(error)throw error;return data||[]}
export async function deleteReaderReminder(userId:string,id:string){const {error}=await db().from('reader_match_reminders').delete().eq('id',id).eq('user_id',userId);if(error)throw error}
export async function getReaderSubmissions(email:string){const {data,error}=await db().from('fan_article_submissions').select('*').eq('author_email',email).order('updated_at',{ascending:false});if(error&&error.code!=='42501')throw error;return data||[]}
export async function createReaderSubmission(input:{title:string;excerpt:string;content:string;pitch:string;category_slug:string;author_name:string;author_email:string}){const {data,error}=await db().from('fan_article_submissions').insert([{...input,status:'submitted'}]).select().single();if(error)throw error;return data}
export async function getReaderCategories(){const {data,error}=await db().from('categories').select('id,name,slug').order('name');if(error)throw error;return data||[]}
export async function updateReaderProfile(userId:string,input:{username:string;bio:string;avatar_url?:string}){const {error}=await db().from('profiles').update(input).eq('id',userId);if(error)throw error}
export async function getReaderLeaderboard(limit=20){const client=db();const {data:{session}}=await client.auth.getSession();const url=process.env.NEXT_PUBLIC_SUPABASE_URL;const key=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;if(!url||!key)return[];const response=await fetch(`${url}/functions/v1/reader-leaderboard?limit=${limit}`,{headers:{apikey:key,...(session?.access_token?{Authorization:`Bearer ${session.access_token}`}:{})}});if(response.status===401)return[];const payload=await response.json().catch(()=>({}));if(!response.ok)throw new Error(payload?.error||'Classifica non disponibile');return payload.entries||[]}
export async function savePublicDiary(input:any){const {error}=await db().from('community_diary_entries').insert([{reader_id:input.readerId,username:input.username,match:input.match,note:input.note,mood:input.mood||null,rating:input.rating||null}]);if(error)throw error}
export async function savePublicPrediction(input:any){const {error}=await db().from('community_predictions').insert([{reader_id:input.readerId,username:input.username,match:input.match,home_score:input.homeScore,away_score:input.awayScore,motm:input.motm||null}]);if(error)throw error}
export async function upsertPush(userId:string,subscription:PushSubscription){const {error}=await db().functions.invoke('push-notifications',{body:{action:'upsert-subscription',userId,subscription:subscription.toJSON(),userAgent:navigator.userAgent}});if(error)throw error}
export async function removePush(userId:string,endpoint:string){const {error}=await db().functions.invoke('push-notifications',{body:{action:'delete-subscription',userId,endpoint}});if(error)throw error}



