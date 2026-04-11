import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
const gscSiteUrl = Deno.env.get('GSC_SITE_URL') || Deno.env.get('SEARCH_CONSOLE_SITE_URL') || ''
const gscClientEmail = Deno.env.get('GSC_CLIENT_EMAIL') || Deno.env.get('GOOGLE_SERVICE_ACCOUNT_CLIENT_EMAIL') || ''
const gscPrivateKey = (Deno.env.get('GSC_PRIVATE_KEY') || Deno.env.get('GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY') || '').replace(/\\n/g, '\n')
const primaryAdminEmail = 'admin@bianconerihub.com'

type SiteVariant = {
  value: string
  label: 'configured' | 'url-prefix' | 'domain'
}

type SearchConsoleMetricRow = {
  clicks: number
  impressions: number
  ctr: number
  position: number
  keys?: string[]
}

type SearchConsoleResponse = {
  rows?: SearchConsoleMetricRow[]
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function hasPlaceholderSecrets() {
  const normalizedEmail = gscClientEmail.trim().toLowerCase()
  const normalizedKey = gscPrivateKey.trim()

  return (
    normalizedEmail.includes('service-account@project.iam.gserviceaccount.com')
    || normalizedEmail.includes('example')
    || normalizedKey.includes('...')
    || normalizedKey.length < 128
    || !normalizedKey.includes('BEGIN PRIVATE KEY')
    || !normalizedKey.includes('END PRIVATE KEY')
  )
}

function buildSiteVariants(siteUrl: string) {
  const trimmed = String(siteUrl || '').trim()
  if (!trimmed) return []

  const variants: SiteVariant[] = []
  const seen = new Set<string>()
  const pushVariant = (value: string, label: SiteVariant['label']) => {
    const normalized = String(value || '').trim()
    if (!normalized || seen.has(normalized)) return
    seen.add(normalized)
    variants.push({ value: normalized, label })
  }

  pushVariant(trimmed, 'configured')

  if (trimmed.startsWith('sc-domain:')) {
    const host = trimmed.replace(/^sc-domain:/, '').trim().toLowerCase()
    if (host) {
      pushVariant(`https://${host}`, 'url-prefix')
      pushVariant(`https://${host}/`, 'url-prefix')
      pushVariant(`https://www.${host}`, 'url-prefix')
      pushVariant(`https://www.${host}/`, 'url-prefix')
    }
    return variants
  }

  try {
    const url = new URL(trimmed.startsWith('http') ? trimmed : `https://${trimmed}`)
    const origin = `${url.protocol}//${url.host}`
    const host = url.hostname.replace(/^www\./, '')

    pushVariant(origin, 'url-prefix')
    pushVariant(`${origin}/`, 'url-prefix')
    pushVariant(`sc-domain:${host}`, 'domain')
  } catch {
    const host = trimmed.replace(/^https?:\/\//, '').replace(/\/+$/, '').replace(/^www\./, '')
    if (host) {
      pushVariant(`https://${host}`, 'url-prefix')
      pushVariant(`https://${host}/`, 'url-prefix')
      pushVariant(`sc-domain:${host}`, 'domain')
    }
  }

  return variants
}

function getPublicSiteBaseUrl(siteUrl: string) {
  const variants = buildSiteVariants(siteUrl)
  const urlVariant = variants.find((variant) => variant.value.startsWith('http'))
  if (urlVariant) return urlVariant.value.replace(/\/+$/, '')
  return 'https://bianconerihub.com'
}

function toBase64Url(input: Uint8Array | string) {
  const raw = typeof input === 'string'
    ? new TextEncoder().encode(input)
    : input
  const base64 = btoa(String.fromCharCode(...raw))
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

function pemToArrayBuffer(pem: string) {
  const sanitized = pem
    .replace('-----BEGIN PRIVATE KEY-----', '')
    .replace('-----END PRIVATE KEY-----', '')
    .replace(/\s+/g, '')
  const binary = atob(sanitized)
  const bytes = new Uint8Array(binary.length)

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index)
  }

  return bytes.buffer
}

async function createGoogleAccessToken() {
  if (!gscClientEmail || !gscPrivateKey) {
    throw new Error('Search Console secrets mancanti.')
  }

  const nowSeconds = Math.floor(Date.now() / 1000)
  const header = { alg: 'RS256', typ: 'JWT' }
  const payload = {
    iss: gscClientEmail,
    scope: 'https://www.googleapis.com/auth/webmasters',
    aud: 'https://oauth2.googleapis.com/token',
    exp: nowSeconds + 3600,
    iat: nowSeconds,
  }
  const unsignedToken = `${toBase64Url(JSON.stringify(header))}.${toBase64Url(JSON.stringify(payload))}`
  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8',
    pemToArrayBuffer(gscPrivateKey),
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const signatureBuffer = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', cryptoKey, new TextEncoder().encode(unsignedToken))
  const jwt = `${unsignedToken}.${toBase64Url(new Uint8Array(signatureBuffer))}`

  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  })

  const tokenData = await tokenResponse.json().catch(() => ({}))
  if (!tokenResponse.ok || !tokenData.access_token) {
    throw new Error(tokenData.error_description || tokenData.error || 'Autenticazione Google fallita.')
  }

  return String(tokenData.access_token)
}

function getRangeWindow(rangeDays = 28) {
  const safeRange = Math.max(1, Math.min(90, Number(rangeDays) || 28))
  const end = new Date()
  end.setUTCDate(end.getUTCDate() - 2)
  end.setUTCHours(0, 0, 0, 0)

  const start = new Date(end)
  start.setUTCDate(start.getUTCDate() - (safeRange - 1))

  const previousEnd = new Date(start)
  previousEnd.setUTCDate(previousEnd.getUTCDate() - 1)
  const previousStart = new Date(previousEnd)
  previousStart.setUTCDate(previousStart.getUTCDate() - (safeRange - 1))

  const toDateString = (value: Date) => value.toISOString().slice(0, 10)

  return {
    rangeDays: safeRange,
    current: { startDate: toDateString(start), endDate: toDateString(end) },
    previous: { startDate: toDateString(previousStart), endDate: toDateString(previousEnd) },
  }
}

function pickTotals(rows?: SearchConsoleMetricRow[]) {
  const firstRow = rows?.[0]
  return {
    clicks: Number(firstRow?.clicks || 0),
    impressions: Number(firstRow?.impressions || 0),
    ctr: Number(firstRow?.ctr || 0),
    position: Number(firstRow?.position || 0),
  }
}

function normalizeRows(rows?: SearchConsoleMetricRow[], keyLabel = 'label') {
  return (rows || []).map((row) => ({
    [keyLabel]: row.keys?.[0] || 'n/a',
    clicks: Number(row.clicks || 0),
    impressions: Number(row.impressions || 0),
    ctr: Number(row.ctr || 0),
    position: Number(row.position || 0),
  }))
}

function computeDelta(currentValue: number, previousValue: number) {
  if (!previousValue) {
    return currentValue ? 100 : 0
  }

  return Number((((currentValue - previousValue) / previousValue) * 100).toFixed(1))
}

async function querySearchAnalytics(accessToken: string, siteUrl: string, payload: Record<string, unknown>) {
  const endpoint = `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  const data = await response.json().catch(() => ({})) as SearchConsoleResponse & { error?: { message?: string } }
  if (!response.ok) {
    throw new Error(data?.error?.message || 'Query Search Console fallita.')
  }

  return data
}

async function getSitemaps(accessToken: string, siteUrl: string) {
  const endpoint = `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/sitemaps`
  const response = await fetch(endpoint, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })

  if (!response.ok) return []

  const data = await response.json().catch(() => ({})) as { sitemap?: Array<Record<string, unknown>> }
  return data.sitemap || []
}

async function submitSitemap(accessToken: string, siteUrl: string, sitemapUrl: string) {
  const endpoint = `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/sitemaps/${encodeURIComponent(sitemapUrl)}`
  const response = await fetch(endpoint, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${accessToken}` },
  })

  if (!response.ok) {
    const data = await response.json().catch(() => ({})) as { error?: { message?: string } }
    throw new Error(data?.error?.message || 'Invio sitemap a Search Console fallito.')
  }

  return { submitted: true, sitemapUrl }
}

async function inspectUrl(accessToken: string, siteUrl: string, inspectionUrl: string) {
  const response = await fetch('https://searchconsole.googleapis.com/v1/urlInspection/index:inspect', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      inspectionUrl,
      siteUrl,
      languageCode: 'it-IT',
    }),
  })

  const data = await response.json().catch(() => ({})) as {
    error?: { message?: string }
    inspectionResult?: Record<string, unknown>
  }

  if (!response.ok) {
    throw new Error(data?.error?.message || 'URL Inspection fallita.')
  }

  return data.inspectionResult || null
}

async function requireAdmin(req: Request) {
  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  const authHeader = req.headers.get('Authorization')
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

async function resolveWorkingSite(accessToken: string) {
  const siteVariants = buildSiteVariants(gscSiteUrl)
  let lastError: Error | null = null

  for (const variant of siteVariants) {
    try {
      await querySearchAnalytics(accessToken, variant.value, {
        ...getRangeWindow(7).current,
        rowLimit: 1,
      })

      const sitemaps = await getSitemaps(accessToken, variant.value)
      return {
        configuredSiteUrl: gscSiteUrl,
        siteUrl: variant.value,
        siteVariant: variant.label,
        publicSiteBaseUrl: getPublicSiteBaseUrl(gscSiteUrl),
        sitemaps,
      }
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Property Search Console non accessibile.')
    }
  }

  throw lastError || new Error('Property Search Console non accessibile.')
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    await requireAdmin(req)

    const body = req.method === 'POST' ? await req.json().catch(() => ({})) : {}
    const action = String(body?.action || 'overview')
    const configured = Boolean(gscSiteUrl && gscClientEmail && gscPrivateKey)
    const placeholderSecrets = hasPlaceholderSecrets()

    if (!configured || placeholderSecrets) {
      return jsonResponse({
        configured: false,
        siteUrl: gscSiteUrl || null,
        message: !configured
          ? 'Search Console non configurato: mancano i secret GSC_SITE_URL, GSC_CLIENT_EMAIL o GSC_PRIVATE_KEY.'
          : 'Search Console non configurato correttamente: GSC_CLIENT_EMAIL o GSC_PRIVATE_KEY sembrano placeholder, non credenziali Google reali.',
      })
    }

    const accessToken = await createGoogleAccessToken()
    const resolvedSite = await resolveWorkingSite(accessToken)

    if (action === 'status') {
      return jsonResponse({
        configured: true,
        configuredSiteUrl: resolvedSite.configuredSiteUrl,
        siteUrl: resolvedSite.siteUrl,
        siteVariant: resolvedSite.siteVariant,
        publicSiteBaseUrl: resolvedSite.publicSiteBaseUrl,
        defaultSitemapUrl: `${resolvedSite.publicSiteBaseUrl}/sitemap.xml`,
        sitemapCount: resolvedSite.sitemaps.length,
        sitemaps: resolvedSite.sitemaps.map((item) => ({
          path: item.path || null,
          lastSubmitted: item.lastSubmitted || null,
          lastDownloaded: item.lastDownloaded || null,
          isPending: item.isPending || false,
          warnings: item.warnings || 0,
          errors: item.errors || 0,
        })),
      })
    }

    if (action === 'submit-sitemap') {
      const rawSitemapUrl = String(body?.sitemapUrl || '').trim()
      const sitemapUrl = rawSitemapUrl || `${resolvedSite.publicSiteBaseUrl}/sitemap.xml`
      const result = await submitSitemap(accessToken, resolvedSite.siteUrl, sitemapUrl)
      const sitemaps = await getSitemaps(accessToken, resolvedSite.siteUrl)

      return jsonResponse({
        configured: true,
        configuredSiteUrl: resolvedSite.configuredSiteUrl,
        siteUrl: resolvedSite.siteUrl,
        siteVariant: resolvedSite.siteVariant,
        publicSiteBaseUrl: resolvedSite.publicSiteBaseUrl,
        defaultSitemapUrl: `${resolvedSite.publicSiteBaseUrl}/sitemap.xml`,
        ...result,
        sitemapCount: sitemaps.length,
        sitemaps: sitemaps.map((item) => ({
          path: item.path || null,
          lastSubmitted: item.lastSubmitted || null,
          lastDownloaded: item.lastDownloaded || null,
          isPending: item.isPending || false,
          warnings: item.warnings || 0,
          errors: item.errors || 0,
        })),
      })
    }

    if (action === 'inspect-url') {
      const inspectionUrl = String(body?.inspectionUrl || '').trim()
      if (!inspectionUrl) {
        return jsonResponse({ error: 'Serve una URL da ispezionare.' }, 400)
      }

      const inspection = await inspectUrl(accessToken, resolvedSite.siteUrl, inspectionUrl)
      return jsonResponse({
        configured: true,
        configuredSiteUrl: resolvedSite.configuredSiteUrl,
        siteUrl: resolvedSite.siteUrl,
        siteVariant: resolvedSite.siteVariant,
        inspectionUrl,
        inspection,
      })
    }

    const window = getRangeWindow(body?.rangeDays)
    const rowLimit = Math.max(5, Math.min(25, Number(body?.rowLimit) || 10))
    const siteUrl = resolvedSite.siteUrl

    const [currentSummary, previousSummary, dailyRows, queryRows, pageRows, deviceRows, countryRows, sitemaps] = await Promise.all([
      querySearchAnalytics(accessToken, siteUrl, { ...window.current, rowLimit: 1 }),
      querySearchAnalytics(accessToken, siteUrl, { ...window.previous, rowLimit: 1 }),
      querySearchAnalytics(accessToken, siteUrl, { ...window.current, dimensions: ['date'], rowLimit: window.rangeDays }),
      querySearchAnalytics(accessToken, siteUrl, { ...window.current, dimensions: ['query'], rowLimit }),
      querySearchAnalytics(accessToken, siteUrl, { ...window.current, dimensions: ['page'], rowLimit }),
      querySearchAnalytics(accessToken, siteUrl, { ...window.current, dimensions: ['device'], rowLimit: 10 }),
      querySearchAnalytics(accessToken, siteUrl, { ...window.current, dimensions: ['country'], rowLimit: 10 }),
      getSitemaps(accessToken, siteUrl),
    ])

    const currentTotals = pickTotals(currentSummary.rows)
    const previousTotals = pickTotals(previousSummary.rows)

    return jsonResponse({
      configured: true,
      configuredSiteUrl: resolvedSite.configuredSiteUrl,
      siteUrl: resolvedSite.siteUrl,
      siteVariant: resolvedSite.siteVariant,
      publicSiteBaseUrl: resolvedSite.publicSiteBaseUrl,
      defaultSitemapUrl: `${resolvedSite.publicSiteBaseUrl}/sitemap.xml`,
      dateRange: window.current,
      previousDateRange: window.previous,
      summary: {
        ...currentTotals,
        clicksDelta: computeDelta(currentTotals.clicks, previousTotals.clicks),
        impressionsDelta: computeDelta(currentTotals.impressions, previousTotals.impressions),
        ctrDelta: computeDelta(currentTotals.ctr, previousTotals.ctr),
        positionDelta: Number((currentTotals.position - previousTotals.position).toFixed(1)),
      },
      previousSummary: previousTotals,
      daily: normalizeRows(dailyRows.rows, 'date'),
      topQueries: normalizeRows(queryRows.rows, 'query'),
      topPages: normalizeRows(pageRows.rows, 'page'),
      devices: normalizeRows(deviceRows.rows, 'device'),
      countries: normalizeRows(countryRows.rows, 'country'),
      sitemaps: sitemaps.map((item) => ({
        path: item.path || null,
        lastSubmitted: item.lastSubmitted || null,
        lastDownloaded: item.lastDownloaded || null,
        isPending: item.isPending || false,
        warnings: item.warnings || 0,
        errors: item.errors || 0,
      })),
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Search Console non disponibile.'
    const status = message === 'Unauthorized' ? 401 : message === 'Forbidden' ? 403 : 400
    return jsonResponse({ error: message }, status)
  }
})