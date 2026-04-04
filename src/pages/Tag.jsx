import { useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import ArticleGrid from '@/components/blog/ArticleGrid'
import SEO from '@/components/blog/SEO'

async function getArticlesByTag(slug) {
  const { data, error } = await supabase
    .from('article_tags')
    .select(`
      articles(
        id, title, slug, excerpt, cover_image, published_at, views,
        categories(id, name, slug, color)
      ),
      tags!inner(id, name, slug)
    `)
    .eq('tags.slug', slug)
  if (error) throw error
  return (data || []).map(r => r.articles).filter(Boolean)
}

export default function Tag() {
  const { slug } = useParams()

  const { data: articles = [], isLoading } = useQuery({
    queryKey: ['tag-articles', slug],
    queryFn: () => getArticlesByTag(slug),
  })

  return (
    <>
      <SEO
        title={`#${slug}`}
        description={`Articoli con il tag #${slug} su BianconeriHub`}
        url={`/tag/${slug}`}
      />
      <div className="max-w-7xl mx-auto px-4 py-8">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-8">
          <div className="flex flex-wrap items-center gap-3 sm:gap-4 pb-6 border-b-4 border-juve-black">
            <div className="w-2 h-10 sm:h-12 bg-juve-gold" />
            <div className="min-w-0">
              <p className="text-xs font-black uppercase tracking-widest text-gray-500 mb-1">Tag</p>
              <h1 className="font-display text-3xl sm:text-4xl font-black text-juve-black break-words">#{slug}</h1>
            </div>
            {articles.length > 0 && (
              <span className="w-full sm:w-auto sm:ml-auto text-sm text-gray-400">{articles.length} articoli</span>
            )}
          </div>
        </motion.div>
        <ArticleGrid articles={articles} loading={isLoading} />
      </div>
    </>
  )
}
