import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-n8n-secret',
}

const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
const publishSecret = Deno.env.get('N8N_PUBLISH_SECRET') || Deno.env.get('CRON_SECRET') || ''
const siteUrl = (Deno.env.get('SITE_URL') || Deno.env.get('VITE_SITE_URL') || 'https://bianconerihub.com').replace(/\/+$/, '')
const defaultAuthorEmail = Deno.env.get('N8N_DEFAULT_AUTHOR_EMAIL') || 'admin@bianconerihub.com'
const storageBucket = 'article-images'

type PublishPayload = {
  title?: string
  slug?: string
  excerpt?: string
  content?: string
  cover_image?: string
  cover_image_url?: string
  category_slug?: string
  category_id?: string
  tags?: string[]
  status?: 'draft' | 'published'
  featured?: boolean
  source_url?: string
  meta_title?: string
  meta_description?: string
  og_image?: string
  author_id?: string
  scheduled_at?: string | null
  inline_image_urls?: string[]
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function slugify(value = '') {
  return String(value)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function stripHtml(value = '') {
  return String(value)
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function extensionFromContentType(contentType: string) {
  const normalized = contentType.toLowerCase()
  if (normalized.includes('webp')) return 'webp'
  if (normalized.includes('png')) return 'png'
  if (normalized.includes('gif')) return 'gif'
  if (normalized.includes('jpeg') || normalized.includes('jpg')) return 'jpg'
  return 'jpg'
}

function sanitizeFileName(value: string) {
  return slugify(value).slice(0, 80) || 'immagine'
}

async function ensureUniqueSlug(supabase: ReturnType<typeof createClient>, baseSlug: string) {
  const normalized = slugify(baseSlug) || 'articolo'
  const { data } = await supabase
    .from('articles')
    .select('id')
    .eq('slug', normalized)
    .limit(1)

  if (!data?.length) return normalized
  return `${normalized}-${Date.now().toString().slice(-6)}`
}

async function uploadImageFromUrl(
  supabase: ReturnType<typeof createClient>,
  imageUrl: string,
  pathPrefix: string,
) {
  const response = await fetch(imageUrl, {
    headers: { 'User-Agent': 'BianconeriHub-n8n/1.0' },
  })

  if (!response.ok) {
    throw new Error(`Image download failed (${response.status})`)
  }

  const contentType = response.headers.get('content-type') || 'image/jpeg'
  if (!contentType.startsWith('image/')) {
    throw new Error(`Unsupported image content-type: ${contentType}`)
  }

  const bytes = new Uint8Array(await response.arrayBuffer())
  if (bytes.byteLength > 5 * 1024 * 1024) {
    throw new Error('Image exceeds 5MB storage limit')
  }

  const extension = extensionFromContentType(contentType)
  const path = `${pathPrefix}.${extension}`

  const { data, error } = await supabase.storage
    .from(storageBucket)
    .upload(path, bytes, {
      upsert: true,
      contentType,
      cacheControl: '31536000',
    })

  if (error) throw error

  const { data: publicUrl } = supabase.storage.from(storageBucket).getPublicUrl(data.path)
  return publicUrl.publicUrl
}

async function resolveCategoryId(
  supabase: ReturnType<typeof createClient>,
  payload: PublishPayload,
) {
  if (payload.category_id) return payload.category_id

  const slug = payload.category_slug?.trim()
  if (!slug) return null

  const { data, error } = await supabase
    .from('categories')
    .select('id')
    .eq('slug', slug)
    .maybeSingle()

  if (error) throw error
  return data?.id || null
}

async function resolveAuthorId(
  supabase: ReturnType<typeof createClient>,
  payload: PublishPayload,
) {
  if (payload.author_id) return payload.author_id

  const { data, error } = await supabase
    .from('profiles')
    .select('id')
    .eq('role', 'admin')
    .limit(1)

  if (error) throw error
  if (data?.[0]?.id) return data[0].id

  const { data: byEmail } = await supabase
    .from('profiles')
    .select('id')
    .eq('username', defaultAuthorEmail.split('@')[0])
    .maybeSingle()

  return byEmail?.id || null
}

async function upsertTags(
  supabase: ReturnType<typeof createClient>,
  articleId: string,
  tags: string[] = [],
) {
  const normalizedTags = [...new Set(tags.map((tag) => slugify(tag)).filter(Boolean))]
  if (!normalizedTags.length) return

  await supabase.from('article_tags').delete().eq('article_id', articleId)

  const tagRows = normalizedTags.map((slug) => ({
    name: slug
      .split('-')
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' '),
    slug,
  }))

  await supabase.from('tags').upsert(tagRows, { onConflict: 'slug' })

  const { data: finalTags } = await supabase
    .from('tags')
    .select('id, slug')
    .in('slug', normalizedTags)

  if (!finalTags?.length) return

  await supabase.from('article_tags').insert(
    finalTags.map((tag) => ({ article_id: articleId, tag_id: tag.id })),
  )
}

function validatePublishPayload(payload: PublishPayload, status: 'draft' | 'published') {
  const title = String(payload.title || '').trim()
  const excerpt = String(payload.excerpt || '').trim()
  const content = String(payload.content || '').trim()
  const plainContent = stripHtml(content)

  if (title.length < 3) throw new Error('title must be at least 3 characters')
  if (status === 'published') {
    if (!payload.category_id && !payload.category_slug) {
      throw new Error('category_slug or category_id is required to publish')
    }
    if (excerpt.length < 20) throw new Error('excerpt must be at least 20 characters to publish')
    if (plainContent.length < 120) throw new Error('content must be at least 120 plain-text characters to publish')
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error('Supabase service configuration missing')
    }

    const secret = req.headers.get('x-n8n-secret') || req.headers.get('authorization')?.replace(/^Bearer\s+/i, '') || ''
    if (!publishSecret || secret !== publishSecret) {
      return jsonResponse({ error: 'Unauthorized' }, 401)
    }

    const payload = await req.json() as PublishPayload
    const status = payload.status === 'draft' ? 'draft' : 'published'

    validatePublishPayload(payload, status)

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    if (payload.source_url) {
      const { data: existing } = await supabase
        .from('articles')
        .select('id, slug, status')
        .eq('source_url', payload.source_url)
        .maybeSingle()

      if (existing?.id) {
        return jsonResponse({
          skipped: true,
          reason: 'duplicate_source_url',
          article: existing,
          url: `${siteUrl}/articolo/${existing.slug}`,
        })
      }
    }

    const categoryId = await resolveCategoryId(supabase, payload)
    if (status === 'published' && !categoryId) {
      throw new Error(`Unknown category_slug: ${payload.category_slug || '(missing)'}`)
    }

    const authorId = await resolveAuthorId(supabase, payload)
    const slug = await ensureUniqueSlug(supabase, payload.slug || payload.title || 'articolo')

    let coverImage = String(payload.cover_image || '').trim()
    const remoteCover = String(payload.cover_image_url || '').trim()

    if (!coverImage && remoteCover) {
      coverImage = await uploadImageFromUrl(
        supabase,
        remoteCover,
        `covers/${Date.now()}-${sanitizeFileName(slug)}`,
      )
    }

    let content = String(payload.content || '').trim()
    const inlineUrls = Array.isArray(payload.inline_image_urls) ? payload.inline_image_urls : []

    for (const [index, imageUrl] of inlineUrls.entries()) {
      if (!imageUrl || content.includes(imageUrl)) continue
      try {
        const uploaded = await uploadImageFromUrl(
          supabase,
          imageUrl,
          `content/${slug}/${Date.now()}-${index + 1}-${sanitizeFileName(slug)}`,
        )
        content += `\n<p><img src="${uploaded}" alt="${payload.title || 'Juventus'}" loading="lazy" /></p>`
      } catch {
        // Keep going if a secondary image fails.
      }
    }

    const now = new Date().toISOString()
    const articlePayload: Record<string, unknown> = {
      title: String(payload.title || '').trim(),
      slug,
      excerpt: String(payload.excerpt || '').trim(),
      content,
      cover_image: coverImage || null,
      category_id: categoryId,
      author_id: authorId,
      status,
      featured: Boolean(payload.featured),
      source_url: payload.source_url || null,
      meta_title: payload.meta_title || null,
      meta_description: payload.meta_description || null,
      og_image: payload.og_image || coverImage || null,
      updated_at: now,
      published_at: status === 'published' ? now : null,
      scheduled_at: payload.scheduled_at || null,
    }

    const { data: article, error } = await supabase
      .from('articles')
      .insert([articlePayload])
      .select('id, slug, title, status, cover_image, published_at')
      .single()

    if (error) throw error

    await upsertTags(supabase, article.id, payload.tags || [])

    return jsonResponse({
      success: true,
      article,
      url: `${siteUrl}/articolo/${article.slug}`,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Publish failed'
    return jsonResponse({ error: message }, 400)
  }
})
