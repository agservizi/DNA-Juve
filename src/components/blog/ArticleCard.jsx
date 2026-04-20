import { Link } from 'react-router-dom'
import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { Clock, Eye, User } from 'lucide-react'
import { formatDateLocalized, getClientLocaleContext, getRelativeDateLabel, readingTime, formatViews, truncate } from '@/lib/utils'
import { useReader } from '@/hooks/useReader'
import LazyImage from './LazyImage'
import BookmarkButton from './BookmarkButton'

export default function ArticleCard({ article, variant = 'default', index = 0 }) {
  const mins = readingTime(article.content || article.excerpt)
  const cat = article.categories
  const author = article.profiles?.username
  const topicTags = (article.article_tags || [])
    .map((entry) => entry?.tags)
    .filter((tag) => tag?.slug && tag?.name)
    .slice(0, variant === 'default' ? 2 : 1)
  const { preferences } = useReader()
  const localeContext = useMemo(() => getClientLocaleContext(preferences?.timeZone), [preferences?.timeZone])
  const publishedDate = formatDateLocalized(article.published_at, {
    locale: localeContext.locale,
    timeZone: localeContext.timeZone,
    options: { day: 'numeric', month: 'long', year: 'numeric' },
  })
  const freshness = getRelativeDateLabel(article.published_at)

  if (variant === 'horizontal') {
    return (
      <motion.article
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: index * 0.05 }}
        className="flex gap-4 group"
      >
        <Link to={`/articolo/${article.slug}`} className="shrink-0 w-28 h-20 overflow-hidden bg-gray-100">
          <LazyImage
            src={article.cover_image}
            alt={article.title}
            aspectRatio=""
            wrapperClassName="w-full h-full"
            className="group-hover:scale-105 transition-transform duration-500"
          />
        </Link>
        <div className="flex-1 min-w-0">
          {cat && (
            <Link
              to={`/categoria/${cat.slug}`}
              className="text-[10px] font-black uppercase tracking-widest hover:opacity-80 transition-opacity"
              style={{ color: cat.color || '#F5A623' }}
            >
              {cat.name}
            </Link>
          )}
          <Link to={`/articolo/${article.slug}`}>
            <h3 className="font-display text-sm font-bold leading-snug text-juve-black group-hover:text-juve-gold transition-colors mt-0.5 line-clamp-2">
              {article.title}
            </h3>
          </Link>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-gray-500">
            {author && (
              <Link to={`/autore/${author}`} className="inline-flex items-center gap-1 hover:text-juve-gold transition-colors">
                <User className="h-3 w-3" />
                {author}
              </Link>
            )}
            {topicTags[0] && (
              <Link to={`/tag/${topicTags[0].slug}`} className="hover:text-juve-gold transition-colors">
                #{topicTags[0].name}
              </Link>
            )}
          </div>
          <p className="text-xs text-gray-500 mt-1">{publishedDate}{freshness ? ` · ${freshness}` : ''}</p>
        </div>
      </motion.article>
    )
  }

  if (variant === 'compact') {
    return (
      <motion.article
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.05 }}
        className="group border-b border-gray-100 pb-4 last:border-0 last:pb-0"
      >
        {cat && (
          <Link
            to={`/categoria/${cat.slug}`}
            className="text-[10px] font-black uppercase tracking-widest hover:opacity-80 transition-opacity"
            style={{ color: cat.color || '#F5A623' }}
          >
            {cat.name}
          </Link>
        )}
        <Link to={`/articolo/${article.slug}`}>
          <h3 className="font-display text-base font-bold leading-snug text-juve-black group-hover:text-juve-gold transition-colors">
            {article.title}
          </h3>
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-gray-500">
          {author && (
            <Link to={`/autore/${author}`} className="inline-flex items-center gap-1 hover:text-juve-gold transition-colors">
              <User className="h-3 w-3" />
              {author}
            </Link>
          )}
          {topicTags[0] && (
            <Link to={`/tag/${topicTags[0].slug}`} className="hover:text-juve-gold transition-colors">
              #{topicTags[0].name}
            </Link>
          )}
        </div>
        <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
          <span>{publishedDate}{freshness ? ` · ${freshness}` : ''}</span>
          <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{mins} min</span>
        </div>
      </motion.article>
    )
  }

  // default card
  return (
    <motion.article
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.07, duration: 0.4 }}
      className="group bg-white overflow-hidden"
    >
      <Link to={`/articolo/${article.slug}`} className="block overflow-hidden">
        <LazyImage
          src={article.cover_image}
          alt={article.title}
          aspectRatio="aspect-[16/9]"
          className="group-hover:scale-105 transition-transform duration-700"
        />
      </Link>

      <div className="p-4">
        {cat && (
          <Link
            to={`/categoria/${cat.slug}`}
            className="text-[11px] font-black uppercase tracking-widest hover:opacity-80 transition-opacity"
            style={{ color: cat.color || '#F5A623' }}
          >
            {cat.name}
          </Link>
        )}
        <Link to={`/articolo/${article.slug}`}>
          <h2 className="font-display text-lg font-bold leading-snug text-juve-black group-hover:text-juve-gold transition-colors mt-1 line-clamp-2">
            {article.title}
          </h2>
        </Link>
        {article.excerpt && (
          <p className="text-sm text-gray-600 mt-2 line-clamp-2 leading-relaxed">
            {truncate(article.excerpt, 100)}
          </p>
        )}
        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 text-[11px] text-gray-500">
          {author && (
            <Link to={`/autore/${author}`} className="inline-flex items-center gap-1 hover:text-juve-gold transition-colors">
              <User className="h-3 w-3" />
              {author}
            </Link>
          )}
          {topicTags.map((tag) => (
            <Link key={tag.slug} to={`/tag/${tag.slug}`} className="hover:text-juve-gold transition-colors">
              #{tag.name}
            </Link>
          ))}
        </div>
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
          <div className="flex items-center gap-3 text-xs text-gray-500">
            <span>{publishedDate}{freshness ? ` · ${freshness}` : ''}</span>
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />{mins} min
            </span>
          </div>
          <div className="flex items-center gap-1">
            {article.views > 0 && (
              <span className="flex items-center gap-1 text-xs text-gray-400">
                <Eye className="h-3 w-3" />{formatViews(article.views)}
              </span>
            )}
            <BookmarkButton article={article} size="sm" />
          </div>
        </div>
      </div>
    </motion.article>
  )
}
