import { createServerClient } from '@supabase/ssr'
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

    // Get Cloudflare Stream token from API
    const accountId = process.env.NEXT_PUBLIC_CLOUDFLARE_ACCOUNT_ID
    const tokenId = process.env.NEXT_PUBLIC_CLOUDFLARE_STREAM_TOKEN_ID
    const authToken = process.env.NEXT_PUBLIC_CLOUDFLARE_STREAM_AUTH_TOKEN

    if (!accountId || !tokenId || !authToken) {
      return NextResponse.json(
        { error: 'Stream configuration missing' },
        { status: 500 }
      )
    }

    const streamResponse = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${accountId}/stream?direct_user_upload=true`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
      }
    )

    if (!streamResponse.ok) {
      console.error('Stream API error:', await streamResponse.text())
      return NextResponse.json(
        { error: 'Failed to get Stream token' },
        { status: 500 }
      )
    }

    const streamData = await streamResponse.json() as {
      result?: {
        uploadURL: string
        uid: string
      }
      success: boolean
    }

    if (!streamData.success || !streamData.result) {
      return NextResponse.json(
        { error: 'Invalid Stream response' },
        { status: 500 }
      )
    }

    // Return TUS upload URL and token
    return NextResponse.json({
      uploadUrl: streamData.result.uploadURL,
      tusToken: authToken, // Stream auth token used as Bearer for TUS
      expires: Date.now() + 86400000, // 24 hours
    })
  } catch (error) {
    console.error('Stream token error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
