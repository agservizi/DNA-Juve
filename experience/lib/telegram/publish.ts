import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import { slugify } from '@/lib/slugify'

const bucket = 'article-images'
const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://bianconerihub.com').replace(/\/+$/, '')

function escapeHtml(value: string) {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

export function plainTextToHtml(text: string) {
  const blocks = String(text || '')
    .replace(/\r\n/g, '\n')
    .trim()
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean)

  if (!blocks.length) return ''
  return blocks
    .map((block) => `<p>${escapeHtml(block).replace(/\n/g, '<br/>')}</p>`)
    .join('\n')
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
    category_id?: string
    status: 'draft' | 'published'
  },
) {
  const title = input.title.trim()
  const excerpt = input.excerpt.trim()
  const content = plainTextToHtml(input.content)
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
  const payload = {
    title,
    slug,
    excerpt,
    content,
    cover_image: input.cover_image || null,
    category_id: input.category_id || null,
    author_id: authorId,
    status: input.status,
    featured: false,
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

  return {
    id: data.id as string,
    slug: data.slug as string,
    status: data.status as string,
    url: `${siteUrl}/articolo/${data.slug}`,
    adminUrl: `${siteUrl}/admin/articoli/${data.id}/modifica`,
  }
}
