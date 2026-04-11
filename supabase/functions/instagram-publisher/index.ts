import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
const cronSecret = Deno.env.get('CRON_SECRET') || ''
const siteUrl = (Deno.env.get('SITE_URL') || 'https://bianconerihub.com').replace(/\/+$/, '')
const instagramProviderPreference = (Deno.env.get('INSTAGRAM_PROVIDER') || 'meta').trim().toLowerCase()
const n8nInstagramWebhookUrl = Deno.env.get('N8N_INSTAGRAM_WEBHOOK_URL') || ''
const n8nInstagramWebhookSecret = Deno.env.get('N8N_INSTAGRAM_WEBHOOK_SECRET') || ''
const instagramAccessToken = Deno.env.get('INSTAGRAM_ACCESS_TOKEN') || ''
const instagramBusinessAccountId = Deno.env.get('INSTAGRAM_BUSINESS_ACCOUNT_ID') || ''
const bufferAccessToken = Deno.env.get('BUFFER_ACCESS_TOKEN') || ''
const bufferChannelId = Deno.env.get('BUFFER_CHANNEL_ID') || Deno.env.get('BUFFER_PROFILE_ID') || ''
const primaryAdminEmail = 'admin@bianconerihub.com'
const graphApiBase = 'https://graph.facebook.com/v23.0'
const bufferApiBase = 'https://api.buffer.com/'

type ArticleRow = {
  id: string
  title: string
  slug: string
  excerpt: string | null
  cover_image: string | null
  instagram_image: string | null
  instagram_caption_override: string | null
  instagram_publish_enabled: boolean | null
  instagram_post_status: string | null
  instagram_post_permalink: string | null
  instagram_post_error: string | null
  status: string | null
  published_at: string | null
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function getInstagramProvider() {
  const hasMeta = Boolean(instagramAccessToken && instagramBusinessAccountId)
  const hasN8n = Boolean(n8nInstagramWebhookUrl)
  const hasBuffer = Boolean(bufferAccessToken && bufferChannelId)

  if (instagramProviderPreference === 'n8n') {
    if (hasN8n) return 'n8n'
    if (hasMeta) return 'meta'
    if (hasBuffer) return 'buffer'
    return null
  }

  if (instagramProviderPreference === 'buffer') {
    if (hasBuffer) return 'buffer'
    if (hasMeta) return 'meta'
    if (hasN8n) return 'n8n'
    return null
  }

  if (hasMeta) return 'meta'
  if (hasBuffer) return 'buffer'
  if (hasN8n) return 'n8n'
  return null
}

function isConfigured() {
  return Boolean(getInstagramProvider())
}

function getArticleUrl(slug: string) {
  return `${siteUrl}/articolo/${slug}`
}

function truncateText(value: string, maxLength: number) {
  if (value.length <= maxLength) return value
  return `${value.slice(0, Math.max(0, maxLength - 1)).trim()}…`
}

function buildInstagramCaption(article: ArticleRow) {
  const intro = String(article.instagram_caption_override || '').trim()
  const title = String(article.title || '').trim()
  const excerpt = truncateText(String(article.excerpt || '').replace(/\s+/g, ' ').trim(), 260)
  const articleUrl = getArticleUrl(article.slug)
  const pieces = [intro || title]

  if (!intro && excerpt) {
    pieces.push(excerpt)
  }

  pieces.push('Segui @BianconeriHub.Magazine per restare aggiornato sul mondo bianconero.')
  pieces.push('Iscriviti a BianconeriHub per non perderti i nuovi contenuti e per scrivere articoli con la community.')
  pieces.push(`Leggi l\'articolo completo su ${articleUrl}`)

  return truncateText(pieces.filter(Boolean).join('\n\n'), 2200)
}

function buildInstagramAltText(article: ArticleRow) {
  const title = String(article.title || '').trim()
  const excerpt = String(article.excerpt || '').replace(/\s+/g, ' ').trim()
  return truncateText([title, excerpt].filter(Boolean).join(' - ') || 'Immagine articolo BianconeriHub', 1000)
}

async function getAuthenticatedAdmin(supabaseAdmin: ReturnType<typeof createClient>, authHeader: string | null) {
  if (!authHeader) throw new Error('Missing authorization header')

  const token = authHeader.replace('Bearer ', '')
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token)
  if (error || !user) throw new Error('Unauthorized')

  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()

  const isAdmin = profile?.role === 'admin' || user.email === primaryAdminEmail
  if (!isAdmin) throw new Error('Forbidden')

  return user
}

async function getArticleById(supabaseAdmin: ReturnType<typeof createClient>, articleId: string) {
  const { data, error } = await supabaseAdmin
    .from('articles')
    .select('id, title, slug, excerpt, cover_image, instagram_image, instagram_caption_override, instagram_publish_enabled, instagram_post_status, instagram_post_permalink, instagram_post_error, status, published_at')
    .eq('id', articleId)
    .maybeSingle<ArticleRow>()

  if (error) throw error
  if (!data) throw new Error('Articolo non trovato.')
  return data
}

async function reserveArticle(supabaseAdmin: ReturnType<typeof createClient>, articleId: string, force = false) {
  const allowedStatuses = force ? ['pending', 'failed', 'disabled'] : ['pending', 'failed']
  const { data, error } = await supabaseAdmin
    .from('articles')
    .update({
      instagram_post_status: 'processing',
      instagram_post_error: null,
    })
    .eq('id', articleId)
    .in('instagram_post_status', allowedStatuses)
    .select('id, title, slug, excerpt, cover_image, instagram_image, instagram_caption_override, instagram_publish_enabled, instagram_post_status, instagram_post_permalink, instagram_post_error, status, published_at')
    .maybeSingle<ArticleRow>()

  if (error) throw error
  return data
}

async function createInstagramMedia(imageUrl: string, caption: string) {
  const response = await fetch(`${graphApiBase}/${instagramBusinessAccountId}/media`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      image_url: imageUrl,
      caption,
      access_token: instagramAccessToken,
    }),
  })

  const data = await response.json().catch(() => ({})) as { id?: string, error?: { message?: string } }
  if (!response.ok || !data.id) {
    throw new Error(data?.error?.message || 'Creazione media Instagram fallita.')
  }

  return data.id
}

async function publishInstagramViaN8n(article: ArticleRow) {
  const imageUrl = String(article.instagram_image || article.cover_image || '').trim()
  if (!imageUrl) {
    throw new Error('Immagine Instagram mancante: serve instagram_image o cover_image.')
  }

  const caption = buildInstagramCaption(article)
  const payload = {
    source: 'bianconerihub',
    action: 'publish-instagram-article',
    articleId: article.id,
    title: article.title,
    slug: article.slug,
    excerpt: article.excerpt,
    imageUrl,
    caption,
    articleUrl: getArticleUrl(article.slug),
    publishedAt: article.published_at,
    secret: n8nInstagramWebhookSecret || undefined,
  }

  const response = await fetch(n8nInstagramWebhookUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(n8nInstagramWebhookSecret ? { 'x-bianconerihub-secret': n8nInstagramWebhookSecret } : {}),
    },
    body: JSON.stringify(payload),
  })

  const data = await response.json().catch(() => ({})) as {
    ok?: boolean
    success?: boolean
    error?: string
    message?: string
    postId?: string
    mediaId?: string
    permalink?: string
    publishedAt?: string
    runId?: string
  }

  if (!response.ok || (data?.success === false) || (data?.ok === false)) {
    throw new Error(data?.error || data?.message || 'Webhook n8n Instagram non disponibile.')
  }

  return {
    caption,
    creationId: data?.mediaId || data?.runId || `n8n-${article.id}`,
    postId: data?.postId || data?.mediaId || `n8n-${article.id}`,
    permalink: data?.permalink || null,
    timestamp: data?.publishedAt || new Date().toISOString(),
  }
}

async function publishInstagramViaBuffer(article: ArticleRow) {
  const imageUrl = String(article.instagram_image || article.cover_image || '').trim()
  if (!imageUrl) {
    throw new Error('Immagine Instagram mancante: serve instagram_image o cover_image.')
  }

  const caption = buildInstagramCaption(article)
  const altText = buildInstagramAltText(article)
  const query = `mutation CreatePost($input: CreatePostInput!) {
    createPost(input: $input) {
      __typename
      ... on UnexpectedError {
        message
      }
      ... on PostActionSuccess {
        post {
          id
          dueAt
          status
        }
      }
      ... on MutationError {
        message
      }
    }
  }`

  const response = await fetch(bufferApiBase, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${bufferAccessToken}`,
    },
    body: JSON.stringify({
      query,
      variables: {
        input: {
          channelId: bufferChannelId,
          text: caption,
          schedulingType: 'automatic',
          mode: 'shareNow',
          assets: {
            images: [{
              url: imageUrl,
              metadata: {
                altText,
              },
            }],
          },
          metadata: {
            instagram: {
              type: 'post',
              shouldShareToFeed: true,
            },
          },
        },
      },
    }),
  })

  const data = await response.json().catch(() => ({})) as {
    errors?: Array<{ message?: string }>
    data?: {
      createPost?: {
        __typename?: string
        message?: string
        post?: {
          id?: string
          dueAt?: string | null
          status?: string | null
        }
      }
    }
  }

  const createPost = data?.data?.createPost
  const post = createPost?.post
  if (!response.ok || data?.errors?.length || ['MutationError', 'UnexpectedError'].includes(String(createPost?.__typename || '')) || !post?.id) {
    throw new Error(data?.errors?.[0]?.message || createPost?.message || 'Invio Buffer fallito.')
  }

  return {
    caption,
    creationId: post.id,
    postId: post.id,
    permalink: null,
    timestamp: post.dueAt || new Date().toISOString(),
  }
}

async function publishInstagramMedia(creationId: string) {
  let lastMessage = 'Pubblicazione Instagram fallita.'

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const response = await fetch(`${graphApiBase}/${instagramBusinessAccountId}/media_publish`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        creation_id: creationId,
        access_token: instagramAccessToken,
      }),
    })

    const data = await response.json().catch(() => ({})) as { id?: string, error?: { message?: string } }
    if (response.ok && data.id) {
      return data.id
    }

    lastMessage = data?.error?.message || lastMessage
    if (!lastMessage.toLowerCase().includes('not ready')) break

    await new Promise((resolve) => setTimeout(resolve, 2000 * (attempt + 1)))
  }

  throw new Error(lastMessage)
}

async function getInstagramMediaDetails(mediaId: string) {
  const response = await fetch(`${graphApiBase}/${mediaId}?fields=id,permalink,timestamp&access_token=${encodeURIComponent(instagramAccessToken)}`)
  const data = await response.json().catch(() => ({})) as { id?: string, permalink?: string, timestamp?: string }

  if (!response.ok) return { id: mediaId, permalink: null, timestamp: null }
  return {
    id: data.id || mediaId,
    permalink: data.permalink || null,
    timestamp: data.timestamp || null,
  }
}

async function markArticleSuccess(
  supabaseAdmin: ReturnType<typeof createClient>,
  articleId: string,
  payload: { creationId?: string | null, postId?: string | null, permalink: string | null, timestamp: string | null },
) {
  const { error } = await supabaseAdmin
    .from('articles')
    .update({
      instagram_post_status: 'published',
      instagram_post_error: null,
      instagram_posted_at: payload.timestamp || new Date().toISOString(),
      instagram_media_id: payload.creationId || null,
      instagram_post_id: payload.postId || null,
      instagram_post_permalink: payload.permalink,
    })
    .eq('id', articleId)

  if (error) throw error
}

async function markArticleFailure(supabaseAdmin: ReturnType<typeof createClient>, articleId: string, message: string) {
  await supabaseAdmin
    .from('articles')
    .update({
      instagram_post_status: 'failed',
      instagram_post_error: truncateText(message, 500),
    })
    .eq('id', articleId)
}

async function publishArticleRecord(supabaseAdmin: ReturnType<typeof createClient>, article: ArticleRow) {
  const imageUrl = String(article.instagram_image || article.cover_image || '').trim()
  if (!imageUrl) {
    throw new Error('Immagine Instagram mancante: serve instagram_image o cover_image.')
  }

  const provider = getInstagramProvider()
  if (!provider) {
    throw new Error('Instagram non configurato: imposta Buffer, Meta diretta oppure un webhook n8n opzionale.')
  }

  const result = provider === 'n8n'
    ? await publishInstagramViaN8n(article)
    : provider === 'buffer'
      ? await publishInstagramViaBuffer(article)
    : await (async () => {
      const caption = buildInstagramCaption(article)
      const creationId = await createInstagramMedia(imageUrl, caption)
      const postId = await publishInstagramMedia(creationId)
      const details = await getInstagramMediaDetails(postId)

      return {
        caption,
        creationId,
        postId,
        permalink: details.permalink,
        timestamp: details.timestamp,
      }
    })()

  await markArticleSuccess(supabaseAdmin, article.id, {
    creationId: result.creationId,
    postId: result.postId,
    permalink: result.permalink,
    timestamp: result.timestamp,
  })

  return {
    articleId: article.id,
    provider,
    postId: result.postId,
    permalink: result.permalink,
    caption: result.caption,
  }
}

async function processPendingArticles(supabaseAdmin: ReturnType<typeof createClient>, limit = 10) {
  const { data, error } = await supabaseAdmin
    .from('articles')
    .select('id, title, slug, excerpt, cover_image, instagram_image, instagram_caption_override, instagram_publish_enabled, instagram_post_status, instagram_post_permalink, instagram_post_error, status, published_at')
    .eq('status', 'published')
    .neq('instagram_publish_enabled', false)
    .in('instagram_post_status', ['pending', 'failed'])
    .order('published_at', { ascending: true })
    .limit(limit)

  if (error) throw error

  const summary = {
    processed: 0,
    published: 0,
    failed: 0,
    items: [] as Array<Record<string, unknown>>,
  }

  for (const item of data || []) {
    const reserved = await reserveArticle(supabaseAdmin, item.id)
    if (!reserved) continue

    summary.processed += 1

    try {
      const result = await publishArticleRecord(supabaseAdmin, reserved)
      summary.published += 1
      summary.items.push({ articleId: result.articleId, status: 'published', permalink: result.permalink })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Pubblicazione Instagram fallita.'
      await markArticleFailure(supabaseAdmin, reserved.id, message)
      summary.failed += 1
      summary.items.push({ articleId: reserved.id, status: 'failed', error: message })
    }
  }

  return summary
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  if (!supabaseUrl || !serviceRoleKey) {
    return jsonResponse({ error: 'Supabase configuration missing.' }, 500)
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  try {
    const body = await req.json().catch(() => ({}))
    const action = String(body?.action || 'status')

    if (action === 'process-pending' && cronSecret && body?.cronSecret === cronSecret) {
      if (!isConfigured()) {
        return jsonResponse({ configured: false, error: 'Instagram non configurato.' }, 200)
      }

      const summary = await processPendingArticles(supabaseAdmin, Number(body?.limit) || 10)
      return jsonResponse({ configured: true, ...summary })
    }

    await getAuthenticatedAdmin(supabaseAdmin, req.headers.get('Authorization'))

    if (action === 'status') {
      const { count } = await supabaseAdmin
        .from('articles')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'published')
        .neq('instagram_publish_enabled', false)
        .in('instagram_post_status', ['pending', 'failed'])

      return jsonResponse({
        configured: isConfigured(),
        provider: getInstagramProvider(),
        providerPreference: instagramProviderPreference,
        usingN8nWebhook: Boolean(n8nInstagramWebhookUrl),
        usingBuffer: Boolean(bufferAccessToken && bufferChannelId),
        instagramBusinessAccountId: instagramBusinessAccountId || null,
        bufferChannelId: bufferChannelId || null,
        pendingCount: count || 0,
      })
    }

    if (!isConfigured()) {
      return jsonResponse({ error: 'Instagram non configurato: imposta BUFFER_ACCESS_TOKEN e BUFFER_CHANNEL_ID, oppure Meta diretta o un webhook n8n opzionale.' }, 400)
    }

    if (action === 'publish-article') {
      const articleId = String(body?.articleId || '').trim()
      const force = Boolean(body?.force)
      if (!articleId) {
        return jsonResponse({ error: 'Serve articleId.' }, 400)
      }

      const article = await getArticleById(supabaseAdmin, articleId)
      if (article.status !== 'published') {
        return jsonResponse({ error: 'Instagram parte solo per articoli gia pubblicati.' }, 400)
      }
      if (article.instagram_publish_enabled === false) {
        return jsonResponse({ error: 'La pubblicazione Instagram e disattivata per questo articolo.' }, 400)
      }

      const reserved = await reserveArticle(supabaseAdmin, articleId, force)
      if (!reserved) {
        if (article.instagram_post_status === 'published' && !force) {
          return jsonResponse({
            configured: true,
            alreadyPublished: true,
            permalink: article.instagram_post_permalink,
          })
        }

        return jsonResponse({ error: 'Articolo non in coda Instagram o gia in lavorazione.' }, 409)
      }

      try {
        const result = await publishArticleRecord(supabaseAdmin, reserved)
        return jsonResponse({ configured: true, ...result })
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Pubblicazione Instagram fallita.'
        await markArticleFailure(supabaseAdmin, reserved.id, message)
        return jsonResponse({ error: message }, 400)
      }
    }

    return jsonResponse({ error: 'Azione non supportata.' }, 400)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Instagram publisher non disponibile.'
    const status = message === 'Unauthorized' ? 401 : message === 'Forbidden' ? 403 : 400
    return jsonResponse({ error: message }, status)
  }
})