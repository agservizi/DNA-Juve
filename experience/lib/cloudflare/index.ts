/**
 * Cloudflare Stream & R2 integration utilities
 * Handles direct uploads to bypass Cloudflare Tunnel 100 MB limit
 */

export interface StreamUploadToken {
  uploadUrl: string
  tusToken: string
  expires: number
}

export interface R2SignedUrl {
  uploadUrl: string
  expires: number
}

/**
 * Get TUS upload URL and token from Cloudflare Stream API
 * Called server-side, returns token for client to use
 */
export async function getStreamUploadToken(authToken: string): Promise<StreamUploadToken> {
  const response = await fetch('/functions/v1/gallery-stream-token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authToken}`,
    },
  })
  if (!response.ok) throw new Error('Failed to get Stream token')
  return response.json()
}

/**
 * Get presigned URL for R2 upload
 * Called server-side, returns URL for client PUT upload
 */
export async function getR2SignedUrl(
  filename: string,
  contentType: string,
  size: number,
  authToken: string
): Promise<R2SignedUrl> {
  const response = await fetch('/functions/v1/gallery-r2-signed-url', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authToken}`,
    },
    body: JSON.stringify({ filename, contentType, size }),
  })
  if (!response.ok) throw new Error('Failed to get R2 signed URL')
  return response.json()
}

/**
 * Upload file to R2 using presigned URL
 * Client-side function that performs direct PUT to R2
 */
export async function uploadToR2(
  file: File,
  signedUrl: string,
  onProgress?: (progress: number) => void
): Promise<{ key: string; url: string }> {
  const xhr = new XMLHttpRequest()

  return new Promise((resolve, reject) => {
    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress((e.loaded / e.total) * 100)
      }
    })

    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        const urlObj = new URL(signedUrl)
        const key = urlObj.pathname.replace(/^\//, '')
        const publicUrl = `${urlObj.origin}/${key}`
        resolve({ key, url: publicUrl })
      } else {
        reject(new Error(`R2 upload failed: ${xhr.statusText}`))
      }
    })

    xhr.addEventListener('error', () => reject(new Error('R2 upload network error')))
    xhr.addEventListener('abort', () => reject(new Error('R2 upload aborted')))

    xhr.open('PUT', signedUrl, true)
    xhr.setRequestHeader('Content-Type', file.type)
    xhr.send(file)
  })
}

/**
 * Upload video to Cloudflare Stream using TUS protocol
 * Requires @tus/js-client library
 */
export async function uploadToStream(
  file: File,
  tusUploadUrl: string,
  tusToken: string,
  onProgress?: (progress: number) => void
): Promise<{ streamUid: string; url: string }> {
  const { Upload } = await import('@tus/js-client')

  return new Promise((resolve, reject) => {
    const upload = new Upload(file, {
      endpoint: tusUploadUrl,
      retryDelays: [0, 3000, 5000, 10000],
      headers: { 'Tus-Resumable': '1.0.0', Authorization: `Bearer ${tusToken}` },
      onError: (error) => reject(error),
      onProgress: (bytesSent, bytesTotal) => {
        if (onProgress) onProgress((bytesSent / bytesTotal) * 100)
      },
      onSuccess: () => {
        const streamUid = upload.url?.split('/').pop()
        if (!streamUid) return reject(new Error('Failed to get Stream UID'))

        const url = `https://customer-${process.env.NEXT_PUBLIC_CLOUDFLARE_ACCOUNT_ID}.cloudflarestream.com/${streamUid}/manifest/video.m3u8`
        resolve({ streamUid, url })
      },
    })

    upload.start()
  })
}

/**
 * Determine storage provider based on file type and size
 */
export function getStorageProvider(file: File): 'stream' | 'r2' | 'supabase' {
  if (file.type.startsWith('video/')) return 'stream'
  if (file.size > 500_000_000) return 'r2' // > 500 MB
  return 'supabase'
}
