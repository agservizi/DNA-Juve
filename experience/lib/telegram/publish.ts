import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'
import { slugify } from '@/lib/slugify'
import { plainTextToHtml } from '@/lib/plain-text-to-html'
import { galleryItemToArticleHtml, videoToArticleHtml } from '@/lib/article-video-embed'
import { announcePublishedArticle } from '@/lib/telegram/channel'

export { plainTextToHtml } from '@/lib/plain-text-to-html'

const bucket = 'article-images'
const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://bianconerihub.com').replace(/\/+$/, '')

async function ensureUniqueSlug(db: SupabaseClient, base: string) {
  const normalized = slugify(base) || 'articolo'
  const { data } = await db.from('articles').select('id').eq('slug', normalized).limit(1)
  if (!data?.length) return normalized
  return `${normalized}-${Date.now().toString().slice(-6)}`
}

async function resolveAuthorId(db: SupabaseClient) {
  if (process.env.TELEGRAM_DEFAULT_AUTHOR_ID) return process.env.TELEGRAM_DEFAULT_AUTHOR_ID
  const { data } = await db.from('profiles').select('id').eq('role', 'admin').limit(1)
  return data?.[0]?.id || null
}

export async function listCategories(db: SupabaseClient) {
  const { data, error } = await db.from('categories').select('id,name,slug').order('name')
  if (error) throw error
  return data || []
}

export async function listPublishedVideos(db: SupabaseClient, limit = 8) {
  const { data, error } = await db
    .from('videos')
    .select('id,title,platform,video_id,video_url,thumbnail')
    .eq('is_published', true)
    .order('updated_at', { ascending: false })
    .limit(limit)
  if (error) throw error
  return data || []
}

export async function listPublishedGalleryItems(db: SupabaseClient, limit = 8) {
  const { data, error } = await db
    .from('gallery_items')
    .select('id,title,alt_text,media_type,media_url')
    .eq('status', 'published')
    .order('captured_at', { ascending: false })
    .limit(limit)
  if (error) throw error
  return data || []
}

export async function uploadCoverBytes(
  db: SupabaseClient,
  bytes: Uint8Array,
  contentType: string,
  slugHint: string,
) {
  if (!contentType.startsWith('image/')) throw new Error('La copertina deve essere un’immagine')
  if (bytes.byteLength > 5 * 1024 * 1024) throw new Error('Immagine oltre 5MB')

  const ext = contentType.includes('png')
    ? 'png'
    : contentType.includes('webp')
      ? 'webp'
      : contentType.includes('gif')
        ? 'gif'
        : 'jpg'

  const path = `telegram/${new Date().toISOString().slice(0, 10)}/${slugify(slugHint) || 'cover'}-${Date.now()}.${ext}`
  const { data, error } = await db.storage.from(bucket).upload(path, bytes, {
    upsert: true,
    contentType,
    cacheControl: '31536000',
  })
  if (error) throw error
  return db.storage.from(bucket).getPublicUrl(data.path).data.publicUrl
}

export async function upsertTags(db: SupabaseClient, articleId: string, tagsCsv: string) {
  const tagRows = String(tagsCsv || '')
    .split(',')
    .map((name) => name.trim())
    .filter(Boolean)
    .map((name) => ({ name, slug: slugify(name) }))

  await db.from('article_tags').delete().eq('article_id', articleId)
  if (!tagRows.length) return

  const { error: upErr } = await db.from('tags').upsert(tagRows, { onConflict: 'slug' })
  if (upErr) throw upErr

  const { data: found, error } = await db.from('tags').select('id').in(
    'slug',
    tagRows.map((x) => x.slug),
  )
  if (error) throw error
  if (!found?.length) return

  const { error: linkErr } = await db.from('article_tags').insert(found.map((x) => ({ article_id: articleId, tag_id: x.id })))
  if (linkErr) throw linkErr
}

export async function createArticleFromTelegram(
  db: SupabaseClient,
  input: {
    title: string
    excerpt: string
    content: string
    tags?: string
    cover_image?: string
    video_id?: string
    gallery_item_id?: string
    category_id?: string
    author_id?: string
    source_url?: string
    internal_notes?: string
    status: 'draft' | 'published'
    featured?: boolean
  },
) {
  const title = input.title.trim()
  const excerpt = input.excerpt.trim()
  let content = plainTextToHtml(input.content)

  if (input.video_id) {
    const { data: video, error } = await db
      .from('videos')
      .select('title,platform,video_id,video_url,thumbnail,orientation,is_published')
      .eq('id', input.video_id)
      .maybeSingle()
    if (error) throw error
    if (video?.is_published) {
      const embed = videoToArticleHtml(video)
      if (embed) content = content ? `${content}\n${embed}` : embed
    }
  }

  if (input.gallery_item_id) {
    const { data: item, error } = await db
      .from('gallery_items')
      .select('title,alt_text,media_type,media_url,status')
      .eq('id', input.gallery_item_id)
      .maybeSingle()
    if (error) throw error
    if (item?.status === 'published') {
      const embed = galleryItemToArticleHtml({
        title: item.title,
        alt_text: item.alt_text,
        media_type: item.media_type as 'image' | 'video',
        media_url: item.media_url,
      })
      if (embed) content = content ? `${content}\n${embed}` : embed
    }
  }

  const plain = content.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()

  if (title.length < 3) throw new Error('Titolo troppo corto')
  if (input.status === 'published') {
    if (!input.category_id) throw new Error('Categoria obbligatoria per pubblicare')
    if (excerpt.length < 20) throw new Error('Sommario troppo corto per pubblicare')
    if (plain.length < 80) throw new Error('Testo troppo corto per pubblicare')
  }

  const authorId = input.author_id || await resolveAuthorId(db)
  if (!authorId) throw new Error('Nessun autore admin trovato')

  const slug = await ensureUniqueSlug(db, title)
  const publishedAt = input.status === 'published' ? new Date().toISOString() : null
  const metaDescription = excerpt.slice(0, 160) || title
  const featured = input.featured ?? input.status === 'published'
  const payload = {
    title,
    slug,
    excerpt,
    content,
    cover_image: input.cover_image || null,
    category_id: input.category_id || null,
    author_id: authorId,
    status: input.status,
    featured,
    published_at: publishedAt,
    scheduled_at: null,
    meta_title: title.slice(0, 70),
    meta_description: metaDescription,
    canonical_url: `${siteUrl}/articolo/${slug}`,
    og_image: input.cover_image || null,
    source_url: input.source_url || null,
    internal_notes: input.internal_notes || 'Creato da Telegram bot',
    gallery: [],
    related_article_ids: [],
    co_author_ids: [],
  }

  const { data, error } = await db.from('articles').insert(payload).select('id,slug,status').single()
  if (error) throw error

  await upsertTags(db, data.id, input.tags || '')

  const url = `${siteUrl}/articolo/${data.slug}`
  if (input.status === 'published') {
    revalidatePath('/')
    revalidatePath('/calciomercato')
    revalidatePath(`/articolo/${data.slug}`)
    if (input.category_id) {
      const { data: category } = await db.from('categories').select('slug').eq('id', input.category_id).maybeSingle()
      if (category?.slug) revalidatePath(`/categoria/${category.slug}`)
    } else {
      revalidatePath('/categoria/mercato')
    }
    await announcePublishedArticle({
      title,
      excerpt,
      url,
      cover_image: input.cover_image,
    })
  }

  return {
    id: data.id as string,
    slug: data.slug as string,
    status: data.status as string,
    url,
    adminUrl: `${siteUrl}/admin/articoli/${data.id}/modifica`,
  }
}

export type EditableArticle = {
  id: string
  title: string
  slug: string
  excerpt: string | null
  content: string | null
  cover_image: string | null
  category_id: string | null
  status: string
  featured: boolean | null
  categories: { id: string; name: string; slug: string } | null
}

function stripHtmlToPlain(html: string) {
  return String(html || '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<\/h[1-6]>/gi, '\n\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim()
}

function parseArticleRef(raw: string) {
  const value = String(raw || '').trim()
  if (!value) return ''
  try {
    const url = new URL(value)
    const parts = url.pathname.split('/').filter(Boolean)
    const idx = parts.findIndex((p) => p === 'articolo')
    if (idx >= 0 && parts[idx + 1]) return parts[idx + 1]
  } catch {
    /* not a URL */
  }
  return value.replace(/^\/+/, '').replace(/^articolo\//, '')
}

export async function listRecentArticles(db: SupabaseClient, limit = 8) {
  const { data, error } = await db
    .from('articles')
    .select('id,title,slug,status,published_at,updated_at')
    .in('status', ['published', 'draft'])
    .order('updated_at', { ascending: false })
    .limit(limit)
  if (error) throw error
  return data || []
}

export async function findArticleForEdit(db: SupabaseClient, ref: string): Promise<EditableArticle | null> {
  const key = parseArticleRef(ref)
  if (!key) return null

  const select =
    'id,title,slug,excerpt,content,cover_image,category_id,status,featured,categories(id,name,slug)'

  const byId = await db.from('articles').select(select).eq('id', key).maybeSingle()
  if (!byId.error && byId.data) return byId.data as unknown as EditableArticle

  const bySlug = await db.from('articles').select(select).eq('slug', key).maybeSingle()
  if (bySlug.error) throw bySlug.error
  return (bySlug.data as unknown as EditableArticle) || null
}

export async function getArticleTagsCsv(db: SupabaseClient, articleId: string) {
  const { data, error } = await db.from('article_tags').select('tags(name)').eq('article_id', articleId)
  if (error) throw error
  return (data || [])
    .map((row: any) => row.tags?.name)
    .filter(Boolean)
    .join(', ')
}

async function revalidateArticlePaths(db: SupabaseClient, slug: string, categoryId?: string | null) {
  revalidatePath('/')
  revalidatePath('/calciomercato')
  revalidatePath(`/articolo/${slug}`)
  if (categoryId) {
    const { data: category } = await db.from('categories').select('slug').eq('id', categoryId).maybeSingle()
    if (category?.slug) revalidatePath(`/categoria/${category.slug}`)
  }
}

export async function updateArticleFromTelegram(
  db: SupabaseClient,
  articleId: string,
  patch: {
    title?: string
    excerpt?: string
    content?: string
    tags?: string
    cover_image?: string | null
    category_id?: string | null
    status?: 'draft' | 'published'
    featured?: boolean
  },
) {
  const current = await findArticleForEdit(db, articleId)
  if (!current) throw new Error('Articolo non trovato')

  const payload: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
    internal_notes: 'Aggiornato da Telegram bot',
  }

  if (patch.title !== undefined) {
    const title = patch.title.trim()
    if (title.length < 3) throw new Error('Titolo troppo corto')
    payload.title = title
    payload.meta_title = title.slice(0, 70)
  }

  if (patch.excerpt !== undefined) {
    const excerpt = patch.excerpt.trim()
    if (excerpt.length < 10) throw new Error('Sommario troppo corto')
    payload.excerpt = excerpt
    payload.meta_description = excerpt.slice(0, 160)
  }

  if (patch.content !== undefined) {
    const content = plainTextToHtml(patch.content)
    const plain = content.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
    if (plain.length < 40) throw new Error('Testo troppo corto')
    payload.content = content
  }

  if (patch.cover_image !== undefined) {
    payload.cover_image = patch.cover_image
    payload.og_image = patch.cover_image
  }

  if (patch.category_id !== undefined) {
    payload.category_id = patch.category_id
  }

  if (patch.status !== undefined) {
    payload.status = patch.status
    if (patch.status === 'published') {
      const { data: row } = await db.from('articles').select('published_at').eq('id', articleId).maybeSingle()
      if (!row?.published_at) payload.published_at = new Date().toISOString()
    }
  }

  if (patch.featured !== undefined) {
    payload.featured = patch.featured
  }

  const nextStatus = (payload.status as string) || current.status
  if (nextStatus === 'published') {
    const excerpt = String(payload.excerpt ?? current.excerpt ?? '')
    const contentHtml = String(payload.content ?? current.content ?? '')
    const plain = contentHtml.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
    const categoryId = (payload.category_id as string | null | undefined) ?? current.category_id
    if (!categoryId) throw new Error('Categoria obbligatoria per un articolo pubblicato')
    if (excerpt.trim().length < 20) throw new Error('Sommario troppo corto per un articolo pubblicato')
    if (plain.length < 80) throw new Error('Testo troppo corto per un articolo pubblicato')
  }

  const { data, error } = await db.from('articles').update(payload).eq('id', articleId).select('id,slug,status').single()
  if (error) throw error

  if (patch.tags !== undefined) {
    await upsertTags(db, articleId, patch.tags)
  }

  await revalidateArticlePaths(db, data.slug, (payload.category_id as string | null | undefined) ?? current.category_id)

  return {
    id: data.id as string,
    slug: data.slug as string,
    status: data.status as string,
    url: `${siteUrl}/articolo/${data.slug}`,
    adminUrl: `${siteUrl}/admin/articoli/${data.id}/modifica`,
    plainPreview: patch.content !== undefined ? stripHtmlToPlain(String(payload.content)) : undefined,
  }
}
