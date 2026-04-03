import { useState, useCallback } from 'react'
import { useQuery, useInfiniteQuery } from '@tanstack/react-query'
import { useInView } from 'react-intersection-observer'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { getFeaturedArticles, getPublishedArticles } from '@/lib/supabase'
import FeaturedHero from '@/components/blog/FeaturedHero'
import ArticleGrid from '@/components/blog/ArticleGrid'
import Sidebar from '@/components/blog/Sidebar'
import SEO from '@/components/blog/SEO'
import Newsletter from '@/components/blog/Newsletter'

const PAGE_SIZE = 9

export default function Home() {
  const { data: featured = [], isLoading: loadingFeatured } = useQuery({
    queryKey: ['featured'],
    queryFn: async () => {
      const { data } = await getFeaturedArticles()
      return data || []
    },
  })

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading: loadingArticles,
  } = useInfiniteQuery({
    queryKey: ['articles-infinite'],
    queryFn: async ({ pageParam = 1 }) => {
      const { data } = await getPublishedArticles({ page: pageParam, limit: PAGE_SIZE })
      return data || []
    },
    getNextPageParam: (lastPage, allPages) =>
      lastPage.length === PAGE_SIZE ? allPages.length + 1 : undefined,
  })

  // Sentinel ref for auto-load on scroll
  const { ref: sentinelRef } = useInView({
    onChange: (inView) => {
      if (inView && hasNextPage && !isFetchingNextPage) fetchNextPage()
    },
    rootMargin: '300px',
  })

  const allArticles = data?.pages.flat() || []
  const featuredIds = new Set(featured.map(a => a.id))
  const gridArticles = allArticles.filter(a => !featuredIds.has(a.id))

  return (
    <>
      <SEO />

      {/* Featured Hero */}
      {!loadingFeatured && featured.length > 0 && (
        <FeaturedHero articles={featured} />
      )}

      {/* Main content + sidebar */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Main grid */}
          <div className="lg:col-span-8">
            <ArticleGrid
              articles={gridArticles}
              loading={loadingArticles}
              title="Ultime Notizie"
            />

            {/* Infinite scroll sentinel */}
            <div ref={sentinelRef} className="h-4 mt-8" />

            {/* Loading spinner */}
            {isFetchingNextPage && (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-juve-gold" />
              </div>
            )}

            {/* End of content */}
            {!hasNextPage && gridArticles.length > 0 && !loadingArticles && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center text-xs text-gray-400 uppercase tracking-widest py-8 border-t border-gray-100 mt-4"
              >
                Hai letto tutti gli articoli
              </motion.p>
            )}
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-4">
            <div className="sticky top-28">
              <Sidebar />
            </div>
          </div>
        </div>
      </div>

      {/* Newsletter banner */}
      <Newsletter />
    </>
  )
}
