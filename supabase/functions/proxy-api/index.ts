const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const ROUTES: Record<string, { target: string; headers?: Record<string, string>; queryParams?: Record<string, string> }> = {
  football: {
    target: 'https://api.football-data.org/v4',
    headers: { 'X-Auth-Token': Deno.env.get('FOOTBALL_API_KEY') || '' },
  },
  news: {
    target: 'https://newsapi.org/v2',
    queryParams: { apiKey: Deno.env.get('NEWS_API_KEY') || '' },
  },
  'rss/gazzetta': { target: 'https://www.gazzetta.it/rss/calcio.xml' },
  'rss/tuttosport': { target: 'https://www.tuttosport.com/rss/calcio/serie-a/juventus' },
  'rss/tuttojuve': { target: 'https://www.tuttojuve.com/rss/?section=6' },
  'rss/juventusnews24': { target: 'https://www.juventusnews24.com/feed/' },
  'rss/juvenews': { target: 'https://www.juvenews.eu/feed/' },
  brevo: {
    target: 'https://api.brevo.com/v3',
    headers: { 'api-key': Deno.env.get('BREVO_API_KEY') || '' },
  },
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const url = new URL(req.url)
    // Path format on Supabase Edge Functions: /functions/v1/proxy-api/{route}/{rest}
    // Local invocations may still hit /proxy-api/{route}/{rest}.
    const normalizedPath = url.pathname
      .replace(/^\/functions\/v1\/proxy-api\/?/, '')
      .replace(/^\/proxy-api\/?/, '')
    const pathParts = normalizedPath.split('/').filter(Boolean)

    // Match route (handle rss/xxx compound routes)
    let route = ''
    let restPath = ''

    if (pathParts[0] === 'rss' && pathParts[1]) {
      route = `rss/${pathParts[1]}`
      restPath = pathParts.slice(2).join('/')
    } else {
      route = pathParts[0]
      restPath = pathParts.slice(1).join('/')
    }

    const config = ROUTES[route]
    if (!config) {
      return new Response(JSON.stringify({ error: 'Unknown route' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Build target URL
    let targetUrl = config.target
    if (restPath) targetUrl += `/${restPath}`

    // Merge query params
    const targetUrlObj = new URL(targetUrl)
    const incomingParams = new URLSearchParams(url.search)
    for (const [k, v] of incomingParams) targetUrlObj.searchParams.set(k, v)
    if (config.queryParams) {
      for (const [k, v] of Object.entries(config.queryParams)) {
        targetUrlObj.searchParams.set(k, v)
      }
    }
    targetUrl = targetUrlObj.toString()

    // Forward request
    const headers = new Headers()
    if (config.headers) {
      for (const [k, v] of Object.entries(config.headers)) {
        headers.set(k, v)
      }
    }
    const contentType = req.headers.get('Content-Type')
    if (contentType) headers.set('Content-Type', contentType)

    const response = await fetch(targetUrl, {
      method: req.method,
      headers,
      body: req.method !== 'GET' && req.method !== 'HEAD' ? await req.text() : undefined,
    })

    const body = await response.text()
    return new Response(body, {
      status: response.status,
      headers: {
        ...corsHeaders,
        'Content-Type': response.headers.get('Content-Type') || 'application/json',
      },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
