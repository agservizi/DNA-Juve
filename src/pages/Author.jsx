import { useMemo, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { ArrowUpRight, Bell, CalendarDays, FileText, Filter, Globe2, Instagram, Linkedin, Newspaper, Twitter, User, UserPlus, Eye } from 'lucide-react'
import { followAuthor, getAuthorFollowMeta, supabase, unfollowAuthor } from '@/lib/supabase'
import { formatDate, formatViews, readingTime, stripHtml } from '@/lib/utils'
import ArticleGrid from '@/components/blog/ArticleGrid'
import SEO from '@/components/blog/SEO'
import { useReader } from '@/hooks/useReader'
import { useToast } from '@/hooks/useToast'

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
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [sortMode, setSortMode] = useState('recent')
  const qc = useQueryClient()
  const { toast } = useToast()
  const { reader, openLogin } = useReader()

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

  const { data: followMeta } = useQuery({
    queryKey: ['author-follow-meta', author?.id, reader?.id],
    queryFn: async () => {
      const { data, error } = await getAuthorFollowMeta(author.id, reader?.id || null)
      if (error) throw error
      return data
    },
    enabled: !!author?.id,
  })

  const totalViews = articles.reduce((s, a) => s + (a.views || 0), 0)
  const totalReadingMinutes = articles.reduce((sum, article) => {
    const text = article.excerpt || ''
    return sum + readingTime(text)
  }, 0)

  const categories = useMemo(() => {
    const seen = new Map()
    for (const article of articles) {
      const category = article.categories
      if (category?.slug && !seen.has(category.slug)) {
        seen.set(category.slug, category)
      }
    }
    return Array.from(seen.values())
  }, [articles])

  const filteredArticles = useMemo(() => {
    const scoped = categoryFilter === 'all'
      ? articles
      : articles.filter((article) => article.categories?.slug === categoryFilter)

    const ordered = [...scoped]
    ordered.sort((a, b) => {
      if (sortMode === 'views') return (b.views || 0) - (a.views || 0)
      const aDate = new Date(a.published_at || 0).getTime()
      const bDate = new Date(b.published_at || 0).getTime()
      return bDate - aDate
    })

    return ordered
  }, [articles, categoryFilter, sortMode])

  const highlightedArticle = filteredArticles[0] || null
  const spotlightArticles = filteredArticles.slice(1, 3)

  const stats = useMemo(() => ({
    articles: articles.length,
    views: totalViews,
    categories: categories.length,
    readingMinutes: totalReadingMinutes,
  }), [articles.length, totalViews, categories.length, totalReadingMinutes])

  const followMutation = useMutation({
    mutationFn: async () => {
      if (!author?.id) throw new Error('Autore non disponibile.')
      if (!reader?.id) throw new Error('login-required')

      if (followMeta?.isFollowing) {
        const result = await unfollowAuthor(reader.id, author.id)
        if (result.error) throw result.error
        return { mode: 'unfollow' }
      }

      const result = await followAuthor(reader.id, author.id)
      if (result.error) throw result.error
      return { mode: 'follow' }
    },
    onSuccess: ({ mode }) => {
      qc.invalidateQueries(['author-follow-meta', author?.id, reader?.id])
      toast({
        title: mode === 'follow' ? 'Autore seguito' : 'Autore rimosso',
        description: mode === 'follow'
          ? `Riceverai notifiche quando ${author?.username} pubblica un nuovo articolo.`
          : `Non riceverai piu notifiche dedicate per ${author?.username}.`,
        variant: mode === 'follow' ? 'success' : 'default',
      })
    },
    onError: (err) => {
      if (String(err?.message || '') === 'login-required') {
        openLogin('login')
        return
      }

      toast({
        title: 'Operazione non riuscita',
        description: 'Non siamo riusciti ad aggiornare il follow autore.',
        variant: 'destructive',
      })
    },
  })

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
          className="relative overflow-hidden bg-juve-black text-white p-8 mb-10"
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(245,166,35,0.2),transparent_35%)]" />
          <div className="relative grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
              <div className="shrink-0 w-24 h-24 bg-juve-gold flex items-center justify-center overflow-hidden">
                {author?.avatar_url ? (
                  <img src={author.avatar_url} alt={author.username} className="w-full h-full object-cover" />
                ) : (
                  <User className="h-12 w-12 text-black" />
                )}
              </div>

              <div className="flex-1 text-center sm:text-left">
                <p className="text-[11px] font-black uppercase tracking-[0.28em] text-juve-gold">Firma BianconeriHub</p>
                {loadingAuthor ? (
                  <div className="mt-3 h-8 w-40 bg-gray-700 animate-pulse" />
                ) : (
                  <h1 className="mt-2 font-display text-4xl font-black leading-none">{author?.username}</h1>
                )}
                <p className="text-gray-400 text-sm mt-2 uppercase tracking-widest">Autore della redazione bianconera</p>
                {author?.author_signature && (
                  <p className="mt-3 text-sm font-semibold text-juve-gold">
                    {author.author_signature}
                  </p>
                )}
                {author?.bio && (
                  <p className="mt-4 max-w-3xl text-sm leading-relaxed text-gray-300">
                    {author.bio}
                  </p>
                )}

                {Array.isArray(author?.specialties) && author.specialties.length > 0 && (
                  <div className="mt-5 flex flex-wrap justify-center gap-2 sm:justify-start">
                    {author.specialties.map((item) => (
                      <span
                        key={item}
                        className="border border-white/15 bg-white/5 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-gray-100"
                      >
                        {item}
                      </span>
                    ))}
                  </div>
                )}

                {(author?.twitter_url || author?.instagram_url || author?.linkedin_url) && (
                  <div className="mt-5 flex flex-wrap justify-center gap-3 sm:justify-start">
                    {[
                      { href: author.twitter_url, icon: Twitter, label: 'X' },
                      { href: author.instagram_url, icon: Instagram, label: 'Instagram' },
                      { href: author.linkedin_url, icon: Linkedin, label: 'LinkedIn' },
                    ].filter((item) => item.href).map(({ href, icon: Icon, label }) => (
                      <a
                        key={label}
                        href={href}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-2 border border-white/15 px-3 py-2 text-xs font-bold uppercase tracking-wider text-gray-200 transition-colors hover:border-juve-gold hover:text-juve-gold"
                      >
                        <Icon className="h-3.5 w-3.5" />
                        {label}
                      </a>
                    ))}
                  </div>
                )}

                <div className="mt-6 flex flex-wrap items-center gap-3 justify-center sm:justify-start">
                  <button
                    type="button"
                    onClick={() => followMutation.mutate()}
                    disabled={followMutation.isLoading}
                    className={`inline-flex items-center gap-2 px-4 py-2 text-xs font-black uppercase tracking-[0.18em] transition-colors ${
                      followMeta?.isFollowing
                        ? 'border border-white/20 bg-white/10 text-white hover:border-juve-gold hover:text-juve-gold'
                        : 'bg-juve-gold text-black hover:bg-white'
                    } disabled:opacity-60`}
                  >
                    {followMeta?.isFollowing ? <Bell className="h-3.5 w-3.5" /> : <UserPlus className="h-3.5 w-3.5" />}
                    {followMeta?.isFollowing ? 'Seguito' : 'Segui autore'}
                  </button>
                  <p className="text-xs uppercase tracking-[0.18em] text-gray-400">
                    {followMeta?.followersCount || 0} follower
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-px bg-white/10 self-start">
              <StatBlock icon={FileText} label="Articoli" value={stats.articles} />
              <StatBlock icon={Eye} label="Visualizzazioni" value={formatViews(stats.views)} />
              <StatBlock icon={Newspaper} label="Temi seguiti" value={stats.categories} />
              <StatBlock icon={CalendarDays} label="Tempo letto" value={`${stats.readingMinutes} min`} />
            </div>
          </div>
        </motion.div>

        {highlightedArticle && (
          <section className="mb-12 grid gap-6 lg:grid-cols-[minmax(0,1.35fr)_320px]">
            <article className="border border-gray-200 bg-white">
              <div className="grid gap-0 md:grid-cols-[1.15fr_0.85fr]">
                <div className="relative min-h-[260px] bg-gray-100">
                  {highlightedArticle.cover_image ? (
                    <img
                      src={highlightedArticle.cover_image}
                      alt={highlightedArticle.title}
                      className="absolute inset-0 h-full w-full object-cover"
                    />
                  ) : (
                    <div className="absolute inset-0 bg-gradient-to-br from-gray-200 to-gray-100" />
                  )}
                </div>
                <div className="p-6 md:p-8">
                  <p className="text-[11px] font-black uppercase tracking-[0.28em] text-juve-gold">Cover story dell’autore</p>
                  <h2 className="mt-3 font-display text-3xl font-black leading-tight text-juve-black">
                    <Link to={`/articolo/${highlightedArticle.slug}`} className="hover:text-juve-gold transition-colors">
                      {highlightedArticle.title}
                    </Link>
                  </h2>
                  <p className="mt-4 text-sm leading-7 text-gray-600">
                    {stripHtml(highlightedArticle.excerpt || '').trim() || 'Approfondimento editoriale della redazione bianconera.'}
                  </p>
                  <div className="mt-5 flex flex-wrap gap-4 text-xs font-medium text-gray-500">
                    <span>{formatDate(highlightedArticle.published_at)}</span>
                    <span>{readingTime(highlightedArticle.excerpt || '')} min di lettura</span>
                    <span>{formatViews(highlightedArticle.views || 0)} letture</span>
                  </div>
                  <Link
                    to={`/articolo/${highlightedArticle.slug}`}
                    className="mt-6 inline-flex items-center gap-2 border border-juve-black px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-juve-black transition-colors hover:bg-juve-black hover:text-white"
                  >
                    Leggi l’articolo
                    <ArrowUpRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>
            </article>

            <aside className="border border-gray-200 bg-white p-5">
              <div className="flex items-center gap-3 mb-5">
                <div className="h-6 w-1.5 bg-juve-gold" />
                <h3 className="text-[11px] font-black uppercase tracking-[0.24em] text-gray-500">In evidenza</h3>
              </div>
              <div className="space-y-5">
                {spotlightArticles.length > 0 ? spotlightArticles.map((article) => (
                  <div key={article.id} className="border-b border-gray-100 pb-4 last:border-b-0 last:pb-0">
                    <p className="text-[11px] font-black uppercase tracking-[0.24em] text-juve-gold">
                      {article.categories?.name || 'BianconeriHub'}
                    </p>
                    <Link
                      to={`/articolo/${article.slug}`}
                      className="mt-2 block font-display text-xl font-black leading-tight text-juve-black transition-colors hover:text-juve-gold"
                    >
                      {article.title}
                    </Link>
                    <p className="mt-2 text-xs text-gray-500">
                      {formatDate(article.published_at)} · {formatViews(article.views || 0)} letture
                    </p>
                  </div>
                )) : (
                  <p className="text-sm text-gray-500">Altri articoli in arrivo.</p>
                )}
              </div>
            </aside>
        </section>
        )}

        <section className="mb-6 flex flex-col gap-4 border-y border-gray-200 py-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="h-6 w-1.5 bg-juve-gold" />
              <h2 className="text-xs font-black uppercase tracking-[0.2em] text-gray-500">
                Archivio di {author?.username}
              </h2>
            </div>
            <p className="text-sm text-gray-500">
              Filtra i pezzi dell’autore per tema oppure ordina per freschezza e impatto.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-gray-400" />
              <select
                value={categoryFilter}
                onChange={(event) => setCategoryFilter(event.target.value)}
                className="border border-gray-200 bg-white px-3 py-2 text-sm text-juve-black focus:outline-none focus:border-juve-black"
              >
                <option value="all">Tutte le categorie</option>
                {categories.map((category) => (
                  <option key={category.slug} value={category.slug}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>
            <select
              value={sortMode}
              onChange={(event) => setSortMode(event.target.value)}
              className="border border-gray-200 bg-white px-3 py-2 text-sm text-juve-black focus:outline-none focus:border-juve-black"
            >
              <option value="recent">Più recenti</option>
              <option value="views">Più letti</option>
            </select>
          </div>
        </section>

        <ArticleGrid
          articles={filteredArticles}
          loading={loadingArticles}
          title={`Archivio di ${author?.username || 'questo autore'}`}
          subtitle={`${filteredArticles.length} articoli disponibili${categoryFilter !== 'all' ? ' nella categoria selezionata' : ''}`}
        />
      </div>
    </>
  )
}

function StatBlock({ icon: Icon, label, value }) {
  return (
    <div className="bg-white/5 p-5">
      <div className="flex items-center gap-2 text-juve-gold">
        <Icon className="h-4 w-4" />
        <span className="text-[11px] font-black uppercase tracking-[0.22em] text-white/60">{label}</span>
      </div>
      <p className="mt-3 font-display text-3xl font-black text-white">{value}</p>
    </div>
  )
}
