import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { User, FileText, Eye } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { formatViews } from '@/lib/utils'
import ArticleGrid from '@/components/blog/ArticleGrid'
import SEO from '@/components/blog/SEO'

async function getAuthorByUsername(username) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('username', username)
    .single()
  if (error) throw error
  return data
}

async function getArticlesByAuthor(authorId) {
  const { data, error } = await supabase
    .from('articles')
    .select(`
      id, title, slug, excerpt, cover_image, published_at, views,
      categories(id, name, slug, color)
    `)
    .eq('author_id', authorId)
    .eq('status', 'published')
    .order('published_at', { ascending: false })
  if (error) throw error
  return data || []
}

export default function Author() {
  const { username } = useParams()

  const { data: author, isLoading: loadingAuthor, error } = useQuery({
    queryKey: ['author', username],
    queryFn: () => getAuthorByUsername(username),
    enabled: !!username,
  })

  const { data: articles = [], isLoading: loadingArticles } = useQuery({
    queryKey: ['author-articles', author?.id],
    queryFn: () => getArticlesByAuthor(author.id),
    enabled: !!author?.id,
  })

  const totalViews = articles.reduce((s, a) => s + (a.views || 0), 0)

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-24 text-center">
        <h1 className="font-display text-3xl font-black mb-3">Autore non trovato</h1>
        <Link to="/" className="text-juve-gold hover:underline text-sm">← Torna alla home</Link>
      </div>
    )
  }

  return (
    <>
      <SEO
        title={author?.username ? `${author.username} — Redazione` : 'Autore'}
        description={`Tutti gli articoli scritti da ${author?.username || username} per BianconeriHub`}
        image={author?.avatar_url}
        url={`/autore/${username}`}
        breadcrumbs={[
          { name: 'Home', url: '/' },
          { name: author?.username || username, url: `/autore/${username}` },
        ]}
      />

      <div className="max-w-7xl mx-auto px-4 py-10">
        {/* Author card */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-juve-black text-white p-8 mb-10 flex flex-col sm:flex-row items-center sm:items-start gap-6"
        >
          {/* Avatar */}
          <div className="shrink-0 w-20 h-20 bg-juve-gold flex items-center justify-center">
            {author?.avatar_url ? (
              <img src={author.avatar_url} alt={author.username} className="w-full h-full object-cover" />
            ) : (
              <User className="h-10 w-10 text-black" />
            )}
          </div>

          <div className="flex-1 text-center sm:text-left">
            {loadingAuthor ? (
              <div className="h-8 w-40 bg-gray-700 animate-pulse" />
            ) : (
              <h1 className="font-display text-3xl font-black">{author?.username}</h1>
            )}
            <p className="text-gray-400 text-sm mt-1 uppercase tracking-widest">Redattore BianconeriHub</p>
            {author?.bio && (
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-gray-300">
                {author.bio}
              </p>
            )}

            <div className="flex flex-wrap justify-center sm:justify-start gap-6 mt-4">
              <div className="flex items-center gap-2 text-sm">
                <FileText className="h-4 w-4 text-juve-gold" />
                <span className="text-gray-300">{articles.length} articoli</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Eye className="h-4 w-4 text-juve-gold" />
                <span className="text-gray-300">{formatViews(totalViews)} visualizzazioni totali</span>
              </div>
            </div>
          </div>

          <div className="shrink-0 self-start">
            <div className="h-1 w-8 bg-juve-gold" />
          </div>
        </motion.div>

        {/* Articles */}
        <div className="mb-4">
          <div className="flex items-center gap-3 mb-6">
            <div className="h-6 w-1.5 bg-juve-gold" />
            <h2 className="text-xs font-black uppercase tracking-[0.2em] text-gray-500">
              Articoli di {author?.username}
            </h2>
            <div className="flex-1 h-px bg-gray-200" />
          </div>
        </div>

        <ArticleGrid articles={articles} loading={loadingArticles} />
      </div>
    </>
  )
}
