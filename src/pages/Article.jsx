import { useParams, Link } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Clock, Eye, Calendar, User, ArrowLeft } from 'lucide-react'
import { getArticleBySlug, getRelatedArticles, getSmartRelatedArticles, incrementViews, getArticleTags } from '@/lib/supabase'
import { formatDateLocalized, formatTimeLocalized, getClientLocaleContext, getRelativeDateLabel, readingTime, formatViews, stripHtml } from '@/lib/utils'
import ArticleCard from '@/components/blog/ArticleCard'
import Sidebar from '@/components/blog/Sidebar'
import SEO from '@/components/blog/SEO'
import SocialShare from '@/components/blog/SocialShare'
import TagList from '@/components/blog/TagList'
import LazyImage from '@/components/blog/LazyImage'
import ReadingProgress from '@/components/blog/ReadingProgress'
import TableOfContents, { useHeadingIds } from '@/components/blog/TableOfContents'
import Comments from '@/components/blog/Comments'
import ArticleReactions from '@/components/blog/ArticleReactions'
import ArticleAnnotations from '@/components/blog/ArticleAnnotations'
import TldrSummary from '@/components/blog/TldrSummary'
import BookmarkButton from '@/components/blog/BookmarkButton'
import ArticlePoll from '@/components/blog/ArticlePoll'
import FaqSchema from '@/components/blog/FaqSchema'
import { sanitizeHtml } from '@/lib/sanitize'
import { useReader } from '@/hooks/useReader'
import { useEffect, useState, useRef, useMemo } from 'react'
import ArticleVideoPlayer from '@/components/blog/ArticleVideoPlayer'

const ARTICLE_VIEW_DELAY_MS = 12000
const ARTICLE_VIEW_SCROLL_THRESHOLD = 0.35

function getArticleScrollProgress(element) {
  if (!element || typeof window === 'undefined') return 0

  const rect = element.getBoundingClientRect()
  const totalHeight = Math.max(element.offsetHeight, 1)
  const viewportHeight = window.innerHeight || 0
  const viewedHeight = Math.min(totalHeight, Math.max(0, viewportHeight - rect.top))

  return viewedHeight / totalHeight
}

export default function Article() {
  const { slug } = useParams()
  const queryClient = useQueryClient()
  const pageUrl = typeof window !== 'undefined' ? window.location.href : ''
  const { reader, addToHistory, preferences } = useReader()
  const localeContext = useMemo(() => getClientLocaleContext(preferences?.timeZone), [preferences?.timeZone])
  const [displayViews, setDisplayViews] = useState(0)
  const contentRef = useRef(null)

  const { data: article, isLoading, error, refetch: refetchArticle } = useQuery({
    queryKey: ['article', slug],
    queryFn: async () => {
      const { data, error } = await getArticleBySlug(slug)
      if (error) throw error
      return data
    },
    enabled: !!slug,
  })

  const { data: tags = [] } = useQuery({
    queryKey: ['article-tags', article?.id],
    queryFn: () => getArticleTags(article.id),
    enabled: !!article?.id,
  })

  const { data: related = [] } = useQuery({
    queryKey: ['related', article?.id, tags.map(t => t.id).join(',')],
    queryFn: async () => {
      const tagIds = tags.map(t => t.id)
      const { data } = await getSmartRelatedArticles(article.id, article.category_id, tagIds)
      return data || []
    },
    enabled: !!article?.category_id && tags !== undefined,
  })

  useEffect(() => {
    setDisplayViews(Number(article?.views) || 0)
  }, [article?.id, article?.views])

  useEffect(() => {
    if (!article?.id) return
    if (typeof window === 'undefined') return

    const syncArticleViews = async () => {
      const { data: latestArticle } = await refetchArticle()
      const nextViews = Number(latestArticle?.views)

      if (Number.isFinite(nextViews)) {
        setDisplayViews(nextViews)
      }
    }

    let cancelled = false
    let triggered = false
    const storageKey = `article-view:${article.id}`

    if (window.sessionStorage.getItem(storageKey) === 'sent') {
      syncArticleViews()
      return
    }

    const commitView = async () => {
      if (cancelled || triggered) return

      triggered = true
      window.sessionStorage.setItem(storageKey, 'sent')

      try {
        const { data: counted } = await incrementViews(article.id)
        if (!cancelled && counted) {
          setDisplayViews((prev) => (Number.isFinite(prev) ? prev + 1 : 1))
        }

        if (!cancelled) {
          await syncArticleViews()
          queryClient.invalidateQueries({ queryKey: ['article', slug] })
        }
      } catch {
        if (cancelled) return
        triggered = false
        window.sessionStorage.removeItem(storageKey)
      }
    }

    const handleScroll = () => {
      if (getArticleScrollProgress(contentRef.current) >= ARTICLE_VIEW_SCROLL_THRESHOLD) {
        window.removeEventListener('scroll', handleScroll)
        commitView()
      }
    }

    const timerId = window.setTimeout(commitView, ARTICLE_VIEW_DELAY_MS)

    window.addEventListener('scroll', handleScroll, { passive: true })
    window.addEventListener('resize', handleScroll)
    handleScroll()

    return () => {
      cancelled = true
      window.clearTimeout(timerId)
      window.removeEventListener('scroll', handleScroll)
      window.removeEventListener('resize', handleScroll)
    }
  }, [article?.id, queryClient, refetchArticle, slug])

  useEffect(() => {
    if (article && reader) {
      addToHistory({
        articleId: article.id,
        slug: article.slug,
        title: article.title,
        categoryName: article.categories?.name || '',
        categorySlug: article.categories?.slug || '',
        readingMinutes: readingTime(article.content),
      })
    }
  }, [article?.id, reader?.email])

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16">
        <div className="animate-pulse space-y-6 max-w-3xl">
          <div className="h-4 bg-gray-200 w-24" />
          <div className="h-10 bg-gray-200 w-full" />
          <div className="h-72 bg-gray-200 w-full" />
          {[...Array(6)].map((_, i) => <div key={i} className="h-4 bg-gray-100 w-full" />)}
        </div>
      </div>
    )
  }

  if (error || !article) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-24 text-center">
        <h1 className="font-display text-4xl font-black mb-4">Articolo non trovato</h1>
        <Link to="/" className="text-juve-gold font-bold hover:underline flex items-center gap-2 justify-center">
          <ArrowLeft className="h-4 w-4" />
          Torna alla home
        </Link>
      </div>
    )
  }

  const mins = readingTime(article.content)
  const description = article.excerpt || stripHtml(article.content).slice(0, 160)
  const publishedDate = formatDateLocalized(article.published_at, {
    locale: localeContext.locale,
    timeZone: localeContext.timeZone,
    options: { day: 'numeric', month: 'long', year: 'numeric' },
  })
  const publishedTime = formatTimeLocalized(article.published_at, {
    locale: localeContext.locale,
    timeZone: localeContext.timeZone,
  })
  const publishedRelative = getRelativeDateLabel(article.published_at)
  const contentWithIds = useHeadingIds(article.content)

  return (
    <>
      <ReadingProgress />
      <FaqSchema content={article.content} />

      <SEO
        title={article.title}
        description={description}
        image={article.cover_image}
        url={`/articolo/${article.slug}`}
        metaTitle={article.meta_title}
        metaDescription={article.meta_description}
        canonical={article.canonical_url}
        ogImage={article.og_image}
        type="article"
        publishedAt={article.published_at}
        modifiedAt={article.updated_at}
        author={article.profiles?.username}
        authorUrl={article.profiles?.username ? `/autore/${article.profiles.username}` : undefined}
        authorImage={article.profiles?.avatar_url}
        category={article.categories?.name}
        tags={tags.map(t => t.name)}
        keywords={[article.title, article.categories?.name, ...tags.map((tag) => tag.name)]}
        noindex={article.noindex}
        categorySlug={article.categories?.slug}
        ogImageAlt={article.title}
        breadcrumbs={[
          { name: 'Home', url: '/' },
          ...(article.categories ? [{ name: article.categories.name, url: `/categoria/${article.categories.slug}` }] : []),
          { name: article.title, url: `/articolo/${article.slug}` },
        ]}
        articleData={article}
      />

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Article main */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="lg:col-span-8"
          >
            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-xs text-gray-500 mb-6 flex-wrap">
              <Link to="/" className="hover:text-juve-gold transition-colors">Home</Link>
              <span>/</span>
              {article.categories && (
                <>
                  <Link to={`/categoria/${article.categories.slug}`} className="hover:text-juve-gold transition-colors" style={{ color: article.categories.color }}>
                    {article.categories.name}
                  </Link>
                  <span>/</span>
                </>
              )}
              <span className="truncate max-w-[200px]">{article.title}</span>
            </div>

            {/* Category badge */}
            {article.categories && (
              <Link
                to={`/categoria/${article.categories.slug}`}
                className="inline-block px-3 py-1 text-xs font-black uppercase tracking-widest text-black mb-4"
                style={{ backgroundColor: article.categories.color || '#F5A623' }}
              >
                {article.categories.name}
              </Link>
            )}

            <h1 className="font-display text-3xl md:text-4xl lg:text-5xl font-black leading-tight text-juve-black mb-4">
              {article.title}
            </h1>

            {article.excerpt && (
              <p className="text-lg text-gray-600 leading-relaxed mb-6 font-light border-l-4 border-juve-gold pl-4">
                {article.excerpt}
              </p>
            )}

            {/* Meta bar */}
            <div className="flex flex-wrap items-center justify-between gap-4 py-4 border-y border-gray-200 mb-6">
              <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
                {article.profiles && (
                  <Link
                    to={`/autore/${article.profiles.username}`}
                    className="flex items-center gap-1.5 hover:text-juve-gold transition-colors font-medium"
                  >
                    <User className="h-4 w-4" />
                    {article.profiles.username}
                  </Link>
                )}
                <span className="flex items-center gap-1.5">
                  <Calendar className="h-4 w-4" />
                  {publishedDate}
                  {publishedTime ? ` • ${publishedTime}` : ''}
                  {publishedRelative ? ` • ${publishedRelative}` : ''}
                </span>
                <span className="flex items-center gap-1.5">
                  <Clock className="h-4 w-4" />
                  {mins} min di lettura
                </span>
                <span className="flex items-center gap-1.5 text-gray-400">
                  <Eye className="h-4 w-4" />
                  {formatViews(displayViews)}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <BookmarkButton article={article} showLabel />
                <SocialShare url={pageUrl} title={article.title} excerpt={description} />
              </div>
            </div>

            {/* Cover image */}
            {article.cover_image && (
              <figure className="mb-8">
                <LazyImage
                  src={article.cover_image}
                  alt={article.title}
                  aspectRatio="aspect-[16/9]"
                  wrapperClassName="w-full"
                />
              </figure>
            )}

            {/* TL;DR */}
            <TldrSummary content={article.content} />

            <ArticlePoll articleId={article.id} />

            {/* Table of Contents */}
            <TableOfContents content={article.content} />

            {/* Content */}
            <div
              ref={contentRef}
              className="prose prose-lg max-w-none
                prose-headings:font-display prose-headings:font-bold prose-headings:text-juve-black
                prose-a:text-juve-gold prose-a:no-underline hover:prose-a:underline
                prose-blockquote:border-juve-gold prose-blockquote:bg-gray-50 prose-blockquote:py-1
                prose-img:w-full prose-img:object-cover
                prose-strong:text-juve-black"
              dangerouslySetInnerHTML={{ __html: sanitizeHtml(contentWithIds) }}
            />
            <ArticleVideoPlayer contentRef={contentRef} contentHtml={contentWithIds} />

            {/* Reactions */}
            <div className="mt-8 pt-6 border-t border-gray-200">
              <p className="text-xs font-black uppercase tracking-widest text-gray-500 mb-3">Come ti sembra questo articolo?</p>
              <ArticleReactions articleId={article.id} />
            </div>

            {/* Tags */}
            {tags.length > 0 && (
              <div className="mt-8 pt-6 border-t border-gray-200">
                <TagList tags={tags} />
              </div>
            )}

            <div className="mt-8 border border-gray-200 bg-gray-50 p-5">
              <div className="mb-3 flex items-center gap-3">
                <div className="h-5 w-1.5 bg-juve-gold" />
                <h2 className="text-xs font-black uppercase tracking-[0.2em] text-gray-500">Continua l'esplorazione</h2>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {article.categories && (
                  <Link
                    to={`/categoria/${article.categories.slug}`}
                    className="inline-flex items-center border border-gray-300 bg-white px-3 py-2 text-xs font-bold uppercase tracking-wider text-gray-700 transition-colors hover:border-juve-black hover:text-juve-black"
                  >
                    Altre notizie in {article.categories.name}
                  </Link>
                )}
                {article.profiles?.username && (
                  <Link
                    to={`/autore/${article.profiles.username}`}
                    className="inline-flex items-center border border-gray-300 bg-white px-3 py-2 text-xs font-bold uppercase tracking-wider text-gray-700 transition-colors hover:border-juve-black hover:text-juve-black"
                  >
                    Profilo autore: {article.profiles.username}
                  </Link>
                )}
                {tags.slice(0, 3).map((tag) => (
                  <Link
                    key={tag.id || tag.slug}
                    to={`/tag/${tag.slug}`}
                    className="inline-flex items-center border border-gray-300 bg-white px-3 py-2 text-xs font-bold uppercase tracking-wider text-gray-700 transition-colors hover:border-juve-black hover:text-juve-black"
                  >
                    Topic: {tag.name}
                  </Link>
                ))}
              </div>
            </div>

            {/* Annotations */}
            <ArticleAnnotations articleId={article.id} articleTitle={article.title} />

            {/* Bottom share + back */}
            <div className="mt-8 pt-6 border-t border-gray-200 flex flex-wrap items-center justify-between gap-4">
              <Link to="/" className="flex items-center gap-2 text-sm text-gray-500 hover:text-juve-gold transition-colors">
                <ArrowLeft className="h-4 w-4" />
                Torna alla home
              </Link>
              <SocialShare url={pageUrl} title={article.title} excerpt={description} />
            </div>

            {/* Related articles */}
            {related.length > 0 && (
              <section className="mt-12">
                <div className="flex items-center gap-3 mb-6">
                  <div className="h-6 w-1.5 bg-juve-gold" />
                  <h2 className="text-xs font-black uppercase tracking-[0.2em] text-gray-500">Articoli Correlati</h2>
                  <div className="flex-1 h-px bg-gray-200" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-px bg-gray-200">
                  {related.map((rel, i) => (
                    <div key={rel.id} className="bg-white">
                      <ArticleCard article={rel} index={i} />
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Comments */}
            <Comments articleId={article.id} />
          </motion.div>

          {/* Sidebar */}
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
