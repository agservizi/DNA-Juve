import { createServerClient } from '@supabase/ssr'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          },
        },
      }
    )

    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Check if user is admin
    const { data: adminData } = await supabase.rpc('is_admin_user', { uid: user.id })
    if (!adminData) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { filename, contentType, size } = await req.json()

    if (!filename || !contentType || !size) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Validate file size (max 1 GB)
    if (size > 1_073_741_824) {
      return NextResponse.json({ error: 'File too large (max 1 GB)' }, { status: 400 })
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
      return NextResponse.json({ error: 'File type not allowed' }, { status: 400 })
    }

    // Check R2 configuration
    const accountId = process.env.CLOUDFLARE_R2_ACCOUNT_ID
    const accessKey = process.env.CLOUDFLARE_R2_ACCESS_KEY
    const secretKey = process.env.CLOUDFLARE_R2_SECRET_KEY
    const bucketName = process.env.CLOUDFLARE_R2_BUCKET_NAME || 'gallery-media-r2'

    if (!accountId || !accessKey || !secretKey) {
      return NextResponse.json(
        { error: 'R2 configuration missing' },
        { status: 500 }
      )
    }

    // Create S3 client pointing to R2
    const s3Client = new S3Client({
      region: 'auto',
      credentials: {
        accessKeyId: accessKey,
        secretAccessKey: secretKey,
      },
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    })

    // Generate unique key
    const ext = filename.split('.').pop()?.toLowerCase()
    const key = `live/${new Date().toISOString().slice(0, 10)}/${crypto.randomUUID()}.${ext}`

    // Create presigned PUT URL (valid for 1 hour)
    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      ContentType: contentType,
    })

    const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 })

    return NextResponse.json({
      uploadUrl,
      expires: Date.now() + 3600000, // 1 hour
    })
  } catch (error) {
    console.error('R2 signed URL error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
