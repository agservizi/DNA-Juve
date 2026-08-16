/** Shared HTML embeds for article body (admin + Telegram). No DB FK — lives in articles.content. */

export type ArticleVideoSource = {
  title?: string | null
  platform?: string | null
  video_id?: string | null
  video_url?: string | null
  thumbnail?: string | null
}

export type GalleryItemSource = {
  title?: string | null
  alt_text?: string | null
  media_type: 'image' | 'video'
  media_url: string
}

function escapeAttr(value: string) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

export function buildEmbedSrc(platform: string, videoId: string, videoUrl?: string | null) {
  const id = String(videoId || '').trim()
  const p = String(platform || '').toLowerCase()
  if (p === 'youtube' && id) return `https://www.youtube.com/embed/${encodeURIComponent(id)}`
  if (p === 'vimeo' && id) return `https://player.vimeo.com/video/${encodeURIComponent(id)}`
  if (p === 'dailymotion' && id) return `https://www.dailymotion.com/embed/video/${encodeURIComponent(id)}`
  if (videoUrl && /^https?:\/\//i.test(videoUrl)) {
    try {
      const u = new URL(videoUrl)
      if (u.hostname.includes('youtube.com') && u.pathname.includes('/embed/')) return videoUrl
      if (u.hostname.includes('player.vimeo.com')) return videoUrl
      if (u.hostname.includes('dailymotion.com') && u.pathname.includes('/embed/')) return videoUrl
    } catch {
      /* fall through */
    }
  }
  return ''
}

export function videoToArticleHtml(video: ArticleVideoSource) {
  const title = escapeAttr(video.title || 'Video')
  const platform = String(video.platform || 'custom').toLowerCase()
  const videoId = String(video.video_id || '').trim()
  const videoUrl = String(video.video_url || '').trim()
  const thumb = String(video.thumbnail || '').trim()

  if (platform !== 'custom') {
    const src = buildEmbedSrc(platform, videoId, videoUrl)
    if (src) {
      return `<iframe src="${escapeAttr(src)}" title="${title}" loading="lazy" allowfullscreen></iframe>`
    }
  }

  if (videoUrl && /^https?:\/\//i.test(videoUrl)) {
    const poster = thumb && /^https?:\/\//i.test(thumb) ? ` poster="${escapeAttr(thumb)}"` : ''
    return `<video src="${escapeAttr(videoUrl)}"${poster} controls preload="metadata"></video>`
  }

  return ''
}

export function galleryItemToArticleHtml(item: GalleryItemSource) {
  const url = String(item.media_url || '').trim()
  if (!url || !/^https?:\/\//i.test(url)) return ''

  const title = String(item.title || '').trim()
  const alt = escapeAttr(item.alt_text || title || 'Media gallery')

  if (item.media_type === 'video') {
    return `<video src="${escapeAttr(url)}" controls preload="metadata" title="${alt}"></video>`
  }

  const caption = title ? `<figcaption>${escapeAttr(title)}</figcaption>` : ''
  return `<figure><img src="${escapeAttr(url)}" alt="${alt}" loading="lazy"/>${caption}</figure>`
}
