import { useMemo, useState } from 'react'
import { useQuery, useInfiniteQuery } from '@tanstack/react-query'
import { useInView } from 'react-intersection-observer'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { Bell, Loader2, MessageSquare, Sparkles } from 'lucide-react'
import { getCommunityPolls, getFeaturedArticles, getForumThreads, getPublishedArticles, getReaderNotifications } from '@/lib/supabase'
import FeaturedHero from '@/components/blog/FeaturedHero'
import ArticleGrid from '@/components/blog/ArticleGrid'
import MatchdayPulse from '@/components/blog/MatchdayPulse'
import Sidebar from '@/components/blog/Sidebar'
import SEO from '@/components/blog/SEO'
import Newsletter from '@/components/blog/Newsletter'
import CommunityFeed from '@/components/blog/CommunityFeed'
import { useReader } from '@/hooks/useReader'
import { getClientLocaleContext, getSoftLocalizationSegment } from '@/lib/utils'

const PAGE_SIZE = 9

export default function Home() {
  const { reader, history, preferences } = useReader()
  const localeContext = useMemo(() => getClientLocaleContext(preferences?.timeZone, preferences?.cityLabel || ''), [preferences?.timeZone, preferences?.cityLabel])
  const softSegment = useMemo(() => getSoftLocalizationSegment(localeContext, preferences), [localeContext, preferences])
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
  const latestRead = history?.[0] || null

  const { data: readerNotifications = [] } = useQuery({
    queryKey: ['home-reader-notifications', reader?.id],
    queryFn: async () => {
      const { data } = await getReaderNotifications(reader?.id, { limit: 10, unreadOnly: true })
      return data || []
    },
    enabled: Boolean(reader?.id),
    staleTime: 15000,
  })

  const { data: homeHotThreads = [] } = useQuery({
    queryKey: ['home-hot-forum-thread'],
    queryFn: async () => {
      const { data } = await getForumThreads({ limit: 1, sortBy: 'popular' })
      return data || []
    },
    staleTime: 60000,
  })

  const { data: homePolls = [] } = useQuery({
    queryKey: ['home-community-poll'],
    queryFn: async () => {
      const { data } = await getCommunityPolls({ active: true, limit: 1 })
      return data || []
    },
    staleTime: 60000,
  })

  const unreadCount = readerNotifications.length
  const hotThread = homeHotThreads[0] || null
  const livePoll = homePolls[0] || null
  const contextualTitle = softSegment.bucket === 'morning'
    ? 'Finestra locale: digest e calendario'
    : softSegment.bucket === 'afternoon'
      ? 'Finestra locale: aggiornamenti rapidi'
      : softSegment.bucket === 'evening'
        ? 'Finestra locale: forum e live'
        : 'Finestra locale: modalita smart'
  const contextualDescription = softSegment.bucket === 'morning'
    ? 'Hai una fascia ideale per riprendere match in agenda, reminder e letture salvate.'
    : softSegment.bucket === 'afternoon'
      ? 'Questa e la fascia piu utile per live, mercato e appuntamenti a breve nel tuo fuso.'
      : softSegment.bucket === 'evening'
        ? 'La community pesa di piu la sera: forum, sondaggi e countdown vengono prima nel tuo mix.'
        : 'Quando la fascia e delicata, il sistema riduce il rumore e lascia spazio solo agli alert davvero utili.'

  return (
    <>
      <SEO />

      {/* Featured Hero */}
      {!loadingFeatured && featured.length > 0 && (
        <FeaturedHero articles={featured} />
      )}

      <MatchdayPulse readerId={reader?.id || null} />

      {reader && (
        <div className="max-w-7xl mx-auto px-4 pt-8">
          <div className="border border-gray-200 bg-white p-5">
            <div className="mb-4 flex items-center gap-2 border-b border-gray-100 pb-3">
              <Sparkles className="h-4 w-4 text-juve-gold" />
              <h2 className="text-xs font-black uppercase tracking-widest text-juve-black">Per te</h2>
            </div>
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              <div className="border border-gray-200 p-4">
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-gray-500">Riprendi</p>
                <h3 className="mt-2 font-display text-xl font-black text-juve-black">
                  {latestRead?.title || 'Riparti dal magazine'}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-gray-600">
                  {latestRead
                    ? `Ultima lettura in ${latestRead.categoryName || 'magazine'}. Ti basta un clic per rientrare nel flusso.`
                    : 'Sei dentro: ora il modo migliore per creare abitudine e ripartire da un articolo.'}
                </p>
                <div className="mt-4">
                  <Link to={latestRead?.slug ? `/articolo/${latestRead.slug}` : '/area-bianconera'}>
                    <button className="inline-flex items-center gap-2 border border-gray-200 px-3 py-2 text-xs font-black uppercase tracking-widest text-gray-600 transition-colors hover:border-juve-gold hover:text-juve-black">
                      Riprendi ora
                    </button>
                  </Link>
                </div>
              </div>

              <div className="border border-gray-200 p-4">
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-gray-500">Forum caldo</p>
                <h3 className="mt-2 font-display text-xl font-black text-juve-black">
                  {hotThread?.title || 'Entra nella discussione del momento'}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-gray-600">
                  {hotThread
                    ? `${hotThread.reply_count || 0} risposte e ${hotThread.views || 0} view. La community si sta muovendo qui.`
                    : 'Quando una discussione accelera, qui ti rimandiamo subito al thread giusto.'}
                </p>
                <div className="mt-4">
                  <Link to={hotThread ? `/community/forum/${hotThread.id}` : '/community/forum'}>
                    <button className="inline-flex items-center gap-2 border border-gray-200 px-3 py-2 text-xs font-black uppercase tracking-widest text-gray-600 transition-colors hover:border-juve-gold hover:text-juve-black">
                      <MessageSquare className="h-3.5 w-3.5" />
                      Vai al forum
                    </button>
                  </Link>
                </div>
              </div>

              <div className="border border-gray-200 p-4">
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-gray-500">{contextualTitle}</p>
                <h3 className="mt-2 font-display text-xl font-black text-juve-black">
                  {unreadCount > 0 ? `${unreadCount} notific${unreadCount === 1 ? 'a' : 'he'} da leggere` : livePoll?.question || 'Home locale attiva'}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-gray-600">
                  {unreadCount > 0
                    ? 'Hai segnali nuovi da controllare: risposte, reminder o aggiornamenti utili per farti rientrare.'
                    : livePoll
                    ? contextualDescription
                    : `Segmento attivo: ${softSegment.regionLabel} · ${localeContext.timeZoneLabel}. ${contextualDescription}`}
                </p>
                <div className="mt-4">
                  <Link to={unreadCount > 0 ? '/area-bianconera' : livePoll ? '/community/sondaggi' : '/area-bianconera'}>
                    <button className="inline-flex items-center gap-2 border border-gray-200 px-3 py-2 text-xs font-black uppercase tracking-widest text-gray-600 transition-colors hover:border-juve-gold hover:text-juve-black">
                      <Bell className="h-3.5 w-3.5" />
                      {unreadCount > 0 ? 'Apri area' : livePoll ? 'Apri sondaggio' : 'Scopri area'}
                    </button>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Community feed: diari e pronostici pubblici */}
      <CommunityFeed />

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
              <Sidebar showInstagramEmbed />
            </div>
          </div>
        </div>
      </div>

      {/* Newsletter banner */}
      <Newsletter />
    </>
  )
}
