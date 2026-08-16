import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import { slugify } from '@/lib/slugify'
import { galleryItemToArticleHtml, videoToArticleHtml } from '@/lib/article-video-embed'
import { announcePublishedArticle } from '@/lib/telegram/channel'

const bucket = 'article-images'
const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://bianconerihub.com').replace(/\/+$/, '')

function escapeHtml(value: string) {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

/** Short title-like lines from Telegram → h2 (admin-style section heads). */
function looksLikeHeading(line: string, next?: string, prev?: string) {
  const t = line.trim()
  if (t.length < 24 || t.length > 100) return false
  if (/[.!?…]$/.test(t)) return false
  if (/^(https?:|www\.)/i.test(t)) return false
  if (/^[-*•\d]+[.)]\s/.test(t)) return false
  const words = t.split(/\s+/).filter(Boolean).length
  if (words < 4 || words > 14) return false
  if (!next || next.length < 60) return false
  if (prev && prev.length < 40) return false
  return true
}

/**
 * Telegram → HTML close to admin paste:
 * each Enter starts a paragraph; blank lines are ignored as separators;
 * clear section-title lines become h2.
 */
export function plainTextToHtml(text: string) {
  const lines = String(text || '')
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map((line) => line.trim())

  const parts: string[] = []
  for (const line of lines) {
    if (!line) {
      if (parts.length && parts[parts.length - 1] !== '') parts.push('')
      continue
    }
    parts.push(line)
  }
  while (parts[0] === '') parts.shift()
  while (parts.length && parts[parts.length - 1] === '') parts.pop()

  if (!parts.length) return ''

  const out: string[] = []
  for (let i = 0; i < parts.length; i++) {
    if (parts[i] === '') continue
    const line = parts[i]
    const explicit = line.match(/^#{1,3}\s+(.+)$/)
    if (explicit) {
      const headingTag = line.startsWith('###') ? 'h3' : 'h2'
      out.push(`<${headingTag}>${escapeHtml(explicit[1].trim())}</${headingTag}>`)
      continue
    }
    const next = parts.slice(i + 1).find((p) => p !== '')
    const prev = [...parts.slice(0, i)].reverse().find((p) => p !== '')
    if (looksLikeHeading(line, next, prev)) out.push(`<h2>${escapeHtml(line)}</h2>`)
    else out.push(`<p>${escapeHtml(line)}</p>`)
  }
  return out.join('\n')
}

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
      .select('title,platform,video_id,video_url,thumbnail,is_published')
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

  const authorId = await resolveAuthorId(db)
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
    source_url: null,
    internal_notes: 'Creato da Telegram bot',
    gallery: [],
    related_article_ids: [],
    co_author_ids: [],
  }

  const { data, error } = await db.from('articles').insert(payload).select('id,slug,status').single()
  if (error) throw error

  await upsertTags(db, data.id, input.tags || '')

  const url = `${siteUrl}/articolo/${data.slug}`
  if (input.status === 'published') {
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
