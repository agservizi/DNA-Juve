// This page is used as a React route at /feed.xml and /sitemap.xml
// It renders the XML to the DOM and sets the correct content-type via meta
// For production, use the Vite plugin in vite.config.js instead
import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { generateRSS, generateSitemap } from '@/lib/feeds'

async function fetchFeedData() {
  const [articlesRes, catsRes] = await Promise.all([
    supabase.from('articles').select('id, title, slug, excerpt, cover_image, published_at, updated_at, featured, categories(name, slug)').eq('status', 'published').order('published_at', { ascending: false }).limit(50),
    supabase.from('categories').select('slug'),
  ])
  return { articles: articlesRes.data || [], categories: catsRes.data || [] }
}

export function RssFeed() {
  const { data } = useQuery({ queryKey: ['rss-feed'], queryFn: fetchFeedData })

  useEffect(() => {
    if (!data) return
    const xml = generateRSS(data.articles)
    const blob = new Blob([xml], { type: 'application/rss+xml' })
    const url = URL.createObjectURL(blob)
    window.location.href = url
  }, [data])

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="flex items-baseline gap-1 justify-center mb-3">
          <span className="font-display text-2xl font-black">DNA</span>
          <span className="font-display text-2xl font-black text-juve-gold">JUVE</span>
        </div>
        <p className="text-sm text-gray-500">Generazione RSS Feed…</p>
      </div>
    </div>
  )
}

export function SitemapXML() {
  const { data } = useQuery({ queryKey: ['sitemap-data'], queryFn: fetchFeedData })

  useEffect(() => {
    if (!data) return
    const xml = generateSitemap(data.articles, data.categories)
    const blob = new Blob([xml], { type: 'application/xml' })
    const url = URL.createObjectURL(blob)
    window.location.href = url
  }, [data])

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="flex items-baseline gap-1 justify-center mb-3">
          <span className="font-display text-2xl font-black">DNA</span>
          <span className="font-display text-2xl font-black text-juve-gold">JUVE</span>
        </div>
        <p className="text-sm text-gray-500">Generazione Sitemap…</p>
      </div>
    </div>
  )
}
