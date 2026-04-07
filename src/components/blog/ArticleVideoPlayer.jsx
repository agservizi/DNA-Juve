import { useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import VideoPlayer from '@/components/blog/VideoPlayer'

function getNodeVideo(node, index) {
  if (!node) return null

  if (node.matches('iframe[src]')) {
    return {
      id: `iframe-${index}`,
      title: node.getAttribute('title') || 'Video articolo',
      platform: 'embed',
      video_url: node.getAttribute('src') || '',
      thumbnail: '',
    }
  }

  if (node.matches('video[src]')) {
    return {
      id: `video-${index}`,
      title: node.getAttribute('title') || 'Video articolo',
      platform: 'native',
      video_url: node.getAttribute('src') || '',
      thumbnail: node.getAttribute('poster') || '',
    }
  }

  return {
    id: node.getAttribute('data-video-id') || `article-video-${index}`,
    title: node.getAttribute('data-video-title') || 'Video articolo',
    platform: node.getAttribute('data-video-platform') || 'custom',
    video_id: node.getAttribute('data-video-videoid') || '',
    video_url: node.getAttribute('data-video-url') || '',
    thumbnail: node.getAttribute('data-video-thumbnail') || '',
  }
}

function mountTargetFor(node) {
  if (node.matches('iframe[src], video[src]')) {
    const mountNode = document.createElement('div')
    mountNode.className = 'not-prose my-8'
    node.replaceWith(mountNode)
    return mountNode
  }

  node.className = 'not-prose my-8'
  node.innerHTML = ''
  return node
}

export default function ArticleVideoPlayer({ contentRef, contentHtml }) {
  useEffect(() => {
    const container = contentRef?.current
    if (!container) return undefined

    const nodes = Array.from(container.querySelectorAll('[data-video-id], [data-video-url], [data-video-videoid], iframe[src], video[src]'))
    if (nodes.length === 0) return undefined

    const roots = []

    nodes.forEach((node, index) => {
      const video = getNodeVideo(node, index)
      if (!video?.video_url && !video?.video_id) return

      const mountNode = mountTargetFor(node)
      const root = createRoot(mountNode)
      root.render(<VideoPlayer video={video} />)
      roots.push(root)
    })

    return () => {
      roots.forEach((root) => root.unmount())
    }
  }, [contentRef, contentHtml])

  return null
}
