import { useParams } from 'react-router-dom'
import { useQuery, useInfiniteQuery } from '@tanstack/react-query'
import { useInView } from 'react-intersection-observer'
import { motion } from 'framer-motion'
import { Loader2 } from 'lucide-react'
import { getPublishedArticles, getCategories } from '@/lib/supabase'
import ArticleGrid from '@/components/blog/ArticleGrid'
import Sidebar from '@/components/blog/Sidebar'
import SEO from '@/components/blog/SEO'

const PAGE_SIZE = 12

export default function Category() {
  const { slug } = useParams()

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const { data } = await getCategories()
      return data || []
    },
  })

  const category = categories.find(c => c.slug === slug)

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
  } = useInfiniteQuery({
    queryKey: ['articles-category-infinite', slug],
    queryFn: async ({ pageParam = 1 }) => {
      const { data } = await getPublishedArticles({ page: pageParam, limit: PAGE_SIZE, category: slug })
      return data || []
    },
    getNextPageParam: (lastPage, allPages) =>
      lastPage.length === PAGE_SIZE ? allPages.length + 1 : undefined,
    enabled: categories.length > 0,
  })

  const { ref: sentinelRef } = useInView({
    onChange: (inView) => {
      if (inView && hasNextPage && !isFetchingNextPage) fetchNextPage()
    },
    rootMargin: '300px',
  })

  const articles = data?.pages.flat() || []
  const categoryName = category?.name || slug
  const categoryDescription = articles.length > 0
    ? `${articles.length} articoli su ${categoryName}: notizie Juventus, analisi, approfondimenti e aggiornamenti editoriali di BianconeriHub.`
    : `Archivio ${categoryName} di BianconeriHub con notizie Juventus, analisi e approfondimenti della redazione.`

  return (
    <>
      <SEO
        title={`${categoryName} Juve: news, analisi e approfondimenti`}
        description={categoryDescription}
        url={`/categoria/${slug}`}
        categorySlug={slug}
        category={categoryName}
        pageType="collection"
        keywords={[categoryName, `${categoryName} Juventus`, 'notizie Juventus', 'analisi Juventus']}
        itemList={articles.slice(0, 12).map((article) => ({
          name: article.title,
          url: `/articolo/${article.slug}`,
        }))}
        breadcrumbs={[
          { name: 'Home', url: '/' },
          { name: categoryName, url: `/categoria/${slug}` },
        ]}
      />

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Category header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex flex-wrap items-center gap-3 sm:gap-4 pb-6 border-b-4 border-juve-black">
            <div className="w-2 h-10 sm:h-12" style={{ backgroundColor: category?.color || '#F5A623' }} />
            <div className="min-w-0">
              <p className="text-xs font-black uppercase tracking-widest text-gray-500 mb-1">Categoria</p>
              <h1 className="font-display text-3xl sm:text-4xl font-black text-juve-black">
                {category?.name || slug}
              </h1>
            </div>
            {articles.length > 0 && (
              <span className="w-full sm:w-auto sm:ml-auto text-sm text-gray-400">{articles.length} articoli</span>
            )}
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-8">
            <ArticleGrid articles={articles} loading={isLoading} />

            <div ref={sentinelRef} className="h-4 mt-8" />
            {isFetchingNextPage && (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-juve-gold" />
              </div>
            )}
            {!hasNextPage && articles.length > 0 && !isLoading && (
              <p className="text-center text-xs text-gray-400 uppercase tracking-widest py-8 border-t border-gray-100 mt-4">
                Fine degli articoli
              </p>
            )}
          </div>
          <div className="lg:col-span-4">
            <div className="sticky top-28">
              <Sidebar />
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
