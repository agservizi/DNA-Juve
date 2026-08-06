import { createClient } from '@supabase/supabase-js'
import { publishDueArticles } from './scheduled-publishing'

export type Article = {
  id: string
  title: string
  slug: string
  excerpt: string | null
  cover_image: string | null
  published_at: string
  views?: number
  featured?: boolean
  categories: { id?: string; name: string; slug: string; color?: string | null } | null
  profiles: { username: string; avatar_url?: string | null } | null
  content?: string | null
  updated_at?: string | null
  category_id?: string | null
  meta_title?: string | null
  meta_description?: string | null
  canonical_url?: string | null
  og_image?: string | null
  noindex?: boolean | null
}

export type ArticleTag = { id: string; name: string; slug: string }
export type ArticleSidebar = { latest: Article[]; mostViewed: Article[]; categories: Array<{id:string;name:string;slug:string}> }
export type HomeVideo = {id:string;title:string;description?:string|null;thumbnail?:string|null;platform?:string|null;video_id?:string|null;video_url?:string|null;category?:string|null;views?:number|null}
export type HomeCategory = {id:string;name:string;slug:string;description?:string|null;color?:string|null}

const select = 'id,title,slug,excerpt,cover_image,published_at,views,featured,categories(id,name,slug,color),profiles(username,avatar_url)'

export async function getHomeContent() {
  await publishDueArticles().catch(()=>null)
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) return { featured: [] as Article[], latest: [] as Article[], mostViewed:[] as Article[], videos:[] as HomeVideo[], categories:[] as HomeCategory[], configured: false }

  const client = createClient(url, key, { auth: { persistSession: false } })
  const [featuredResult, latestResult,mostViewedResult,videosResult,categoriesResult] = await Promise.all([
    client.from('articles').select(select).eq('status', 'published').eq('featured', true).order('published_at', { ascending: false }).limit(5),
    client.from('articles').select(select).eq('status', 'published').order('published_at', { ascending: false }).limit(12),
    client.from('articles').select(select).eq('status','published').order('views',{ascending:false}).limit(6),
    client.from('videos').select('id,title,description,thumbnail,platform,video_id,video_url,category,views').eq('is_published',true).order('published_at',{ascending:false}).limit(6),
    client.from('categories').select('id,name,slug,description,color').order('name').limit(8),
  ])

  const normalize = (rows: unknown): Article[] => (Array.isArray(rows) ? rows : []) as unknown as Article[]
  return {
    featured: normalize(featuredResult.data),
    latest: normalize(latestResult.data),
    mostViewed:normalize(mostViewedResult.data),
    videos:(Array.isArray(videosResult.data)?videosResult.data:[]) as HomeVideo[],
    categories:(Array.isArray(categoriesResult.data)?categoriesResult.data:[]) as HomeCategory[],
    configured: true,
  }
}

export async function getArticleBySlug(slug: string) {
  await publishDueArticles().catch(()=>null)
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) return { article: null, related: [] as Article[], tags: [] as ArticleTag[] }

  const client = createClient(url, key, { auth: { persistSession: false } })
  const { data } = await client
    .from('articles')
    .select('id,title,slug,excerpt,content,cover_image,published_at,updated_at,views,featured,category_id,meta_title,meta_description,canonical_url,og_image,noindex,categories(id,name,slug,color),profiles(username,avatar_url)')
    .eq('slug', slug)
    .eq('status', 'published')
    .single()

  if (!data) return { article: null, related: [] as Article[], tags: [] as ArticleTag[] }
  const article = data as unknown as Article & { category_id?: string }
  const { data: tagRows } = await client.from('article_tags').select('tags(id,name,slug)').eq('article_id', article.id)
  const tags = (tagRows || []).map((row: any) => row.tags).filter(Boolean) as ArticleTag[]
  const tagIds = tags.map((tag) => tag.id)
  let candidateIds: string[] = []
  if (tagIds.length) {
    const { data: matches } = await client.from('article_tags').select('article_id').in('tag_id', tagIds).neq('article_id', article.id)
    candidateIds = [...new Set((matches || []).map((row: any) => row.article_id))]
  }
  let relatedQuery = client.from('articles').select(select).eq('status', 'published').neq('id', article.id).order('published_at', { ascending: false }).limit(3)
  if (candidateIds.length) relatedQuery = relatedQuery.in('id', candidateIds)
  else if (article.category_id) relatedQuery = relatedQuery.eq('category_id', article.category_id)
  const { data: related } = await relatedQuery
  return { article, related: (related || []) as unknown as Article[], tags }
}

export async function getArticleSidebar(): Promise<ArticleSidebar> {
  await publishDueArticles().catch(()=>null)
  const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if(!url||!key)return {latest:[],mostViewed:[],categories:[]}
  const client=createClient(url,key,{auth:{persistSession:false}})
  const [latest,mostViewed,categories]=await Promise.all([
    client.from('articles').select(select).eq('status','published').order('published_at',{ascending:false}).limit(5),
    client.from('articles').select(select).eq('status','published').order('views',{ascending:false}).limit(5),
    client.from('categories').select('id,name,slug').order('name'),
  ])
  return {latest:(latest.data||[]) as unknown as Article[],mostViewed:(mostViewed.data||[]) as unknown as Article[],categories:(categories.data||[]) as Array<{id:string;name:string;slug:string}>}
}
