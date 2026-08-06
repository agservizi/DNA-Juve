import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { S3Client, PutObjectCommand } from 'https://esm.sh/@aws-sdk/client-s3'
import { getSignedUrl } from 'https://esm.sh/@aws-sdk/s3-request-presigner'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') || '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
    )

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const token = authHeader.replace('Bearer ', '')
    const { data, error } = await supabase.auth.getUser(token)
    if (error || !data.user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if admin
    const { data: adminData, error: adminError } = await supabase.rpc('is_admin_user', {
      uid: data.user.id,
    })
    if (adminError || !adminData) {
      return new Response(
        JSON.stringify({ error: 'Forbidden' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { filename, contentType, size } = await req.json()

    if (!filename || !contentType || !size) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Validate file size (max 1 GB)
    if (size > 1_073_741_824) {
      return new Response(
        JSON.stringify({ error: 'File too large (max 1 GB)' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Validate content type
    const allowedTypes = [
      'application/pdf',
      'application/zip',
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/avif',
      'video/mp4',
      'video/webm',
    ]
    if (!allowedTypes.includes(contentType)) {
      return new Response(
        JSON.stringify({ error: 'File type not allowed' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const accountId = Deno.env.get('CLOUDFLARE_R2_ACCOUNT_ID')
    const accessKey = Deno.env.get('CLOUDFLARE_R2_ACCESS_KEY')
    const secretKey = Deno.env.get('CLOUDFLARE_R2_SECRET_KEY')
    const bucketName = Deno.env.get('CLOUDFLARE_R2_BUCKET_NAME') || 'gallery-media-r2'

    if (!accountId || !accessKey || !secretKey) {
      return new Response(
        JSON.stringify({ error: 'R2 configuration missing' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const s3Client = new S3Client({
      region: 'auto',
      credentials: {
        accessKeyId: accessKey,
        secretAccessKey: secretKey,
      },
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    })

    const ext = filename.split('.').pop()?.toLowerCase()
    const key = `live/${new Date().toISOString().slice(0, 10)}/${crypto.randomUUID()}.${ext}`

    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      ContentType: contentType,
    })

    const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 })

    return new Response(
      JSON.stringify({
        uploadUrl,
        expires: Date.now() + 3600000, // 1 hour
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('R2 signed URL error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
