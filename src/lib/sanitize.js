import DOMPurify from 'dompurify'

let hooksRegistered = false

function toYouTubeEmbedUrl(src) {
  try {
    const url = new URL(src)
    const host = url.hostname.replace(/^www\./i, '').toLowerCase()

    if (host === 'youtu.be') {
      const id = url.pathname.replace(/^\//, '').split('/')[0]
      if (id) return `https://www.youtube.com/embed/${id}?rel=0&modestbranding=1`
    }

    if (host.endsWith('youtube.com')) {
      // Already an embed URL — leave it alone
      if (url.pathname.startsWith('/embed/') || url.pathname.startsWith('/videoseries')) return src

      const id = url.searchParams.get('v')
      const list = url.searchParams.get('list')
      if (id && list) return `https://www.youtube.com/embed/${id}?list=${list}&rel=0&modestbranding=1`
      if (id) return `https://www.youtube.com/embed/${id}?rel=0&modestbranding=1`
      if (list) return `https://www.youtube.com/embed/videoseries?list=${list}&rel=0&modestbranding=1`
    }
  } catch {
    // Not a valid URL — leave as-is
  }
  return src
}

function normalizeEmbeddedMediaUrls(html) {
  if (!html || typeof html !== 'string') return ''

  return html.replace(/(<iframe\b[^>]*\bsrc=["'])([^"']+)(["'][^>]*>)/gi, (match, prefix, src, suffix) => {
    return `${prefix}${toYouTubeEmbedUrl(src)}${suffix}`
  })
}

// Rewrite YouTube watch/share URLs inside <iframe src> to /embed/ URLs before the
// browser sees them, preventing X-Frame-Options errors.
if (!hooksRegistered) {
  DOMPurify.addHook('afterSanitizeAttributes', (node) => {
    if (node.tagName === 'IFRAME' && node.hasAttribute('src')) {
      node.setAttribute('src', toYouTubeEmbedUrl(node.getAttribute('src')))
    }
  })
  hooksRegistered = true
}

export function sanitizeHtml(dirty) {
  if (!dirty) return ''
  return DOMPurify.sanitize(normalizeEmbeddedMediaUrls(dirty), {
    ADD_TAGS: ['iframe', 'video'],
    ADD_ATTR: ['allow', 'frameborder', 'scrolling', 'target', 'controls', 'playsinline', 'preload', 'class', 'src'],
  })
}
