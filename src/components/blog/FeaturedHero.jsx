import { Link } from 'react-router-dom'
import { useLayoutEffect, useMemo, useRef } from 'react'
import { motion } from 'framer-motion'
import { Clock, ChevronRight, User } from 'lucide-react'
import { formatDateLocalized, getClientLocaleContext, getRelativeDateLabel, readingTime } from '@/lib/utils'
import { useReader } from '@/hooks/useReader'
import LazyImage from './LazyImage'
import { loadGsap, prefersReducedMotion } from '@/lib/gsap'

export default function FeaturedHero({ articles = [] }) {
  if (!articles.length) return null
  const { preferences } = useReader()
  const rootRef = useRef(null)
  const localeContext = useMemo(() => getClientLocaleContext(preferences?.timeZone), [preferences?.timeZone])
  const [main, ...rest] = articles
  const mainTags = (main.article_tags || [])
    .map((entry) => entry?.tags)
    .filter((tag) => tag?.slug && tag?.name)
    .slice(0, 2)
  const formatPublishedDate = (value) => formatDateLocalized(value, {
    locale: localeContext.locale,
    timeZone: localeContext.timeZone,
    options: { day: 'numeric', month: 'long', year: 'numeric' },
  })
  const formatFreshness = (value) => getRelativeDateLabel(value)

  useLayoutEffect(() => {
    if (!rootRef.current) return
    if (prefersReducedMotion()) return

    let ctx = null
    let cancelled = false

    ;(async () => {
      const { gsap, ScrollTrigger } = await loadGsap()
      if (cancelled || !rootRef.current) return

      ctx = gsap.context(() => {
        const mainCard = rootRef.current.querySelector('[data-gsap="featured-main"]')
        const mainImage = rootRef.current.querySelector('[data-gsap="featured-main-image"]')
        const mainOverlay = rootRef.current.querySelector('[data-gsap="featured-main-overlay"]')
        const mainTitle = rootRef.current.querySelector('[data-gsap="featured-main-title"]')
        const mainMeta = rootRef.current.querySelector('[data-gsap="featured-main-meta"]')

        const secondaryItems = Array.from(rootRef.current.querySelectorAll('[data-gsap="featured-secondary-item"]'))

        if (mainCard) {
          const tl = gsap.timeline({
            defaults: { ease: 'power3.out' },
            scrollTrigger: {
              trigger: mainCard,
              start: 'top 85%',
              once: true,
            },
          })

          if (mainImage) tl.fromTo(mainImage, { scale: 1.08 }, { scale: 1, duration: 1.1 }, 0)
          if (mainOverlay) tl.fromTo(mainOverlay, { opacity: 0.55 }, { opacity: 1, duration: 0.8 }, 0)
          if (mainTitle) tl.fromTo(mainTitle, { y: 22, opacity: 0 }, { y: 0, opacity: 1, duration: 0.7 }, 0.05)
          if (mainMeta) tl.fromTo(mainMeta, { y: 10, opacity: 0 }, { y: 0, opacity: 1, duration: 0.55 }, 0.2)
        }

        if (secondaryItems.length) {
          gsap.fromTo(
            secondaryItems,
            { y: 16, opacity: 0 },
            {
              y: 0,
              opacity: 1,
              duration: 0.5,
              ease: 'power2.out',
              stagger: 0.08,
              scrollTrigger: {
                trigger: secondaryItems[0].parentElement,
                start: 'top 90%',
                once: true,
              },
            },
          )
        }

        // In case images load late and change layout.
        ScrollTrigger.refresh()
      }, rootRef)
    })()

    return () => {
      cancelled = true
      ctx?.revert()
    }
  }, [main?.id])

  return (
    <section ref={rootRef} className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="h-6 w-1.5 bg-juve-gold" />
        <h2 className="text-xs font-black uppercase tracking-[0.2em] text-gray-500">In Evidenza</h2>
        <div className="flex-1 h-px bg-gray-200" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-px bg-gray-200">
        {/* Main featured */}
        <motion.article
          data-gsap="featured-main"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6 }}
          className="lg:col-span-7 bg-white group"
        >
          <div className="relative overflow-hidden aspect-[16/10]">
            <Link to={`/articolo/${main.slug}`} className="block h-full w-full">
              <div data-gsap="featured-main-image" className="h-full w-full will-change-transform">
                <LazyImage
                  src={main.cover_image}
                  alt={main.title}
                  aspectRatio="aspect-[16/10]"
                  wrapperClassName="w-full"
                  className="group-hover:scale-105 transition-transform duration-700"
                />
              </div>
            </Link>
            {/* Gradient overlay */}
            <div
              data-gsap="featured-main-overlay"
              className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"
            />
            <div className="absolute bottom-0 left-0 right-0 p-6">
              {main.categories && (
                <Link
                  to={`/categoria/${main.categories.slug}`}
                  className="inline-block px-3 py-1 text-xs font-black uppercase tracking-widest mb-3 text-black hover:opacity-90 transition-opacity"
                  style={{ backgroundColor: main.categories.color || '#F5A623' }}
                >
                  {main.categories.name}
                </Link>
              )}
              <Link to={`/articolo/${main.slug}`} className="block">
                <h1
                  data-gsap="featured-main-title"
                  className="font-display text-2xl md:text-3xl font-black text-white leading-tight group-hover:text-juve-gold transition-colors"
                >
                  {main.title}
                </h1>
              </Link>
              {main.excerpt && (
                <p className="text-gray-300 text-sm mt-2 line-clamp-2 hidden md:block">{main.excerpt}</p>
              )}
              <div className="mt-3 flex flex-wrap items-center gap-3 text-[11px] text-gray-300">
                {main.profiles?.username && (
                  <Link to={`/autore/${main.profiles.username}`} className="inline-flex items-center gap-1 hover:text-juve-gold transition-colors">
                    <User className="h-3 w-3" />
                    {main.profiles.username}
                  </Link>
                )}
                {mainTags.map((tag) => (
                  <Link key={tag.slug} to={`/tag/${tag.slug}`} className="hover:text-juve-gold transition-colors">
                    #{tag.name}
                  </Link>
                ))}
              </div>
              <div data-gsap="featured-main-meta" className="flex items-center gap-4 mt-3 text-xs text-gray-400">
                <span>{formatPublishedDate(main.published_at)}{formatFreshness(main.published_at) ? ` · ${formatFreshness(main.published_at)}` : ''}</span>
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {readingTime(main.content || main.excerpt)} min
                </span>
              </div>
            </div>
          </div>
        </motion.article>

        {/* Secondary list */}
        <div className="lg:col-span-5 bg-white divide-y divide-gray-200">
          {rest.slice(0, 4).map((article, i) => (
            <motion.article
              key={article.id}
              data-gsap="featured-secondary-item"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 + i * 0.1 }}
              className="group"
            >
              <Link to={`/articolo/${article.slug}`} className="flex gap-4 p-4 hover:bg-gray-50 transition-colors w-full">
                <div className="shrink-0 w-24 h-16 overflow-hidden bg-gray-100">
                  <LazyImage
                    src={article.cover_image}
                    alt={article.title}
                    aspectRatio=""
                    wrapperClassName="w-full h-full"
                    className="group-hover:scale-105 transition-transform duration-500"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  {article.categories && (
                    <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: article.categories.color || '#F5A623' }}>
                      {article.categories.name}
                    </span>
                  )}
                  <h3 className="font-display text-sm font-bold leading-tight text-juve-black group-hover:text-juve-gold transition-colors mt-0.5 line-clamp-2">
                    {article.title}
                  </h3>
                  <p className="text-xs text-gray-500 mt-1">{formatPublishedDate(article.published_at)}{formatFreshness(article.published_at) ? ` · ${formatFreshness(article.published_at)}` : ''}</p>
                </div>
                <ChevronRight className="h-4 w-4 text-gray-300 group-hover:text-juve-gold shrink-0 self-center ml-2 transition-colors" />
              </Link>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  )
}
