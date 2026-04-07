import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useInView } from 'react-intersection-observer'
import {
  ArrowRight,
  Bell,
  ChevronRight,
  Clock,
  Eye,
  Filter,
  Flame,
  Loader2,
  Lock,
  MessageSquare,
  Pin,
  Plus,
  Search,
  Send,
  Sparkles,
  ThumbsUp,
  X,
} from 'lucide-react'
import { createForumThread, followForumThread, getForumCategories, getForumThreads } from '@/lib/supabase'
import { useReader } from '@/hooks/useReader'
import SEO from '@/components/blog/SEO'

const PAGE_SIZE = 12

function timeAgo(dateStr) {
  if (!dateStr) return ''
  const diff = Date.now() - new Date(dateStr).getTime()
  const hours = Math.floor(diff / (1000 * 60 * 60))
  if (hours < 1) return 'Adesso'
  if (hours < 24) return `${hours}h fa`
  const days = Math.floor(hours / 24)
  if (days === 1) return 'Ieri'
  return `${days}g fa`
}

function getThreadActivityDate(thread) {
  return thread?.last_reply_at || thread?.created_at || null
}

function ThreadCard({ thread }) {
  return (
    <Link
      to={`/community/forum/${thread.id}`}
      className="block border border-gray-200 bg-white p-4 transition-colors hover:border-juve-gold"
    >
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex flex-wrap items-center gap-2">
            {thread.is_pinned && <Pin className="h-3 w-3 shrink-0 text-juve-gold" />}
            {thread.is_locked && <Lock className="h-3 w-3 shrink-0 text-gray-400" />}
            {thread.forum_categories && (
              <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: thread.forum_categories.color }}>
                {thread.forum_categories.name}
              </span>
            )}
          </div>

          <h3 className="mb-1 line-clamp-2 font-display text-base font-black leading-tight text-juve-black">
            {thread.title}
          </h3>
          <p className="line-clamp-2 text-xs text-gray-500">{thread.content}</p>

          <div className="mt-3 flex flex-wrap items-center gap-3 text-[10px] font-medium text-gray-400">
            <span>{thread.author_name}</span>
            <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{timeAgo(getThreadActivityDate(thread))}</span>
            <span className="flex items-center gap-1"><MessageSquare className="h-3 w-3" />{thread.reply_count || 0}</span>
            <span className="flex items-center gap-1"><Eye className="h-3 w-3" />{thread.views || 0}</span>
            <span className="flex items-center gap-1"><ThumbsUp className="h-3 w-3" />{thread.like_count || 0}</span>
            <span className="flex items-center gap-1"><Bell className="h-3 w-3" />{thread.follower_count || 0}</span>
          </div>
        </div>

        <ChevronRight className="mt-1 h-5 w-5 shrink-0 text-gray-300" />
      </div>
    </Link>
  )
}

function AccessGate({ openLogin }) {
  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <div className="border border-gray-200 bg-white p-8 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-juve-black text-white">
          <Lock className="h-6 w-6 text-juve-gold" />
        </div>
        <p className="text-xs font-black uppercase tracking-[0.24em] text-juve-gold">Accesso riservato</p>
        <h2 className="mt-3 font-display text-3xl font-black text-juve-black">Il forum e disponibile solo per gli iscritti all'Area Bianconera</h2>
        <p className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-gray-600 sm:text-base">
          Per leggere e partecipare alle discussioni devi avere un profilo attivo nell'Area Bianconera. L'accesso serve a tenere il forum piu ordinato, riconoscibile e davvero legato alla community del sito.
        </p>
        <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
          <button
            type="button"
            onClick={() => openLogin('register')}
            className="inline-flex items-center justify-center gap-2 bg-juve-black px-5 py-3 text-xs font-black uppercase tracking-widest text-white transition-colors hover:bg-juve-gold hover:text-black"
          >
            Iscriviti all'Area Bianconera
            <ArrowRight className="h-4 w-4" />
          </button>
          <Link
            to="/area-bianconera"
            className="inline-flex items-center justify-center gap-2 border border-juve-black px-5 py-3 text-xs font-black uppercase tracking-widest text-juve-black transition-colors hover:border-juve-gold hover:text-juve-gold"
          >
            Scopri l'Area Bianconera
          </Link>
        </div>
      </div>
    </div>
  )
}

export default function Forum() {
  const [searchParams, setSearchParams] = useSearchParams()
  const activeCat = searchParams.get('cat') || null
  const [showNewThread, setShowNewThread] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newContent, setNewContent] = useState('')
  const [newCat, setNewCat] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState('active')
  const [viewMode, setViewMode] = useState('all')
  const { reader, openLogin, isAuthenticated, authReady } = useReader()
  const queryClient = useQueryClient()
  const hasForumAccess = Boolean(isAuthenticated)
  const canParticipate = Boolean(hasForumAccess && reader?.id)
  const { ref: loadMoreRef, inView } = useInView({ rootMargin: '320px 0px' })

  const { data: categories } = useQuery({
    queryKey: ['forum-categories'],
    queryFn: async () => {
      const { data } = await getForumCategories()
      return data || []
    },
    enabled: hasForumAccess,
  })

  const { data: overviewData } = useQuery({
    queryKey: ['forum-threads-overview'],
    queryFn: async () => {
      const { data, count } = await getForumThreads({ limit: 60, sortBy: 'active' })
      return { threads: data || [], count: count || 0 }
    },
    enabled: hasForumAccess,
  })

  const {
    data: threadsPages,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
  } = useInfiniteQuery({
    queryKey: ['forum-threads', activeCat, searchQuery, sortBy, viewMode],
    queryFn: async ({ pageParam = 1 }) => {
      const result = await getForumThreads({
        categoryId: activeCat || undefined,
        search: searchQuery,
        sortBy,
        viewMode,
        page: pageParam,
        limit: PAGE_SIZE,
      })

      return {
        threads: result.data || [],
        count: result.count || 0,
        page: pageParam,
      }
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage, allPages) => {
      const loadedCount = allPages.reduce((sum, currentPage) => sum + currentPage.threads.length, 0)
      return loadedCount < (lastPage.count || 0) ? allPages.length + 1 : undefined
    },
    enabled: hasForumAccess,
  })

  const categoriesList = categories || []
  const overviewThreads = overviewData?.threads || []
  const visibleThreads = useMemo(() => {
    const pages = threadsPages?.pages || []
    const seenThreadIds = new Set()

    return pages
      .flatMap((page) => page.threads || [])
      .filter((thread) => {
        if (!thread?.id || seenThreadIds.has(thread.id)) return false
        seenThreadIds.add(thread.id)
        return true
      })
  }, [threadsPages])
  const totalCount = threadsPages?.pages?.[0]?.count || 0
  const loadedCount = visibleThreads.length
  const activeCategoryObj = categoriesList.find((category) => category.id === activeCat)

  useEffect(() => {
    if (!inView || !hasNextPage || isFetchingNextPage) return
    fetchNextPage()
  }, [fetchNextPage, hasNextPage, inView, isFetchingNextPage])

  const forumStats = useMemo(() => {
    const totalReplies = overviewThreads.reduce((sum, thread) => sum + (thread.reply_count || 0), 0)
    const pinned = overviewThreads.filter((thread) => thread.is_pinned).length
    const activeToday = overviewThreads.filter((thread) => {
      const lastActivity = getThreadActivityDate(thread)
      if (!lastActivity) return false
      return Date.now() - new Date(lastActivity).getTime() <= 24 * 60 * 60 * 1000
    }).length

    return {
      threads: overviewData?.count || 0,
      replies: totalReplies,
      pinned,
      activeToday,
    }
  }, [overviewData?.count, overviewThreads])

  const categoryCounts = useMemo(() => {
    return overviewThreads.reduce((acc, thread) => {
      if (!thread.category_id) return acc
      acc[thread.category_id] = (acc[thread.category_id] || 0) + 1
      return acc
    }, {})
  }, [overviewThreads])

  const pinnedThreads = useMemo(
    () => overviewThreads.filter((thread) => thread.is_pinned).slice(0, 3),
    [overviewThreads],
  )

  const hotThreads = useMemo(
    () => overviewThreads
      .slice()
      .sort((a, b) => ((b.views || 0) + ((b.reply_count || 0) * 18) + ((b.like_count || 0) * 10)) - ((a.views || 0) + ((a.reply_count || 0) * 18) + ((a.like_count || 0) * 10)))
      .slice(0, 4),
    [overviewThreads],
  )

  const createMutation = useMutation({
    mutationFn: async () => {
      const result = await createForumThread({
        categoryId: newCat || categoriesList[0]?.id,
        title: newTitle,
        content: newContent,
        authorId: reader?.id,
        authorName: reader?.username || reader?.email?.split('@')[0] || 'Tifoso',
      })

      if (result?.data?.id && reader?.id) {
        await followForumThread(result.data.id, reader.id).catch(() => null)
      }

      return result
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['forum-threads'] })
      queryClient.invalidateQueries({ queryKey: ['forum-threads-overview'] })
      setShowNewThread(false)
      setNewTitle('')
      setNewContent('')
      setNewCat('')
    },
  })

  const quickFilters = [
    { key: 'all', label: 'Tutte' },
    { key: 'pinned', label: 'In evidenza' },
    { key: 'unanswered', label: 'Senza risposte' },
    { key: 'hot', label: 'Calde' },
  ]

  return (
    <>
      <SEO title="Forum Bianconero" description="Entra nel forum della community bianconera. Discuti di Juventus: partite, mercato, tattiche e altro." url="/community/forum" />

      <section className="bg-juve-black py-10 text-white md:py-14">
        <div className="mx-auto max-w-4xl px-4 text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <div className="mb-3 flex items-center justify-center gap-2">
              <MessageSquare className="h-4 w-4 text-juve-gold" />
              <span className="text-xs font-black uppercase tracking-widest text-juve-gold">Community</span>
            </div>
            <h1 className="mb-2 font-display text-3xl font-black leading-tight sm:text-4xl md:text-5xl">FORUM</h1>
            <p className="mx-auto max-w-lg text-sm text-gray-400">
              Un posto ordinato dove discutere tra tifosi: partite, mercato, tattica, opinioni forti e thread da seguire.
            </p>
          </motion.div>
        </div>
      </section>

      {!authReady ? (
        <div className="mx-auto max-w-4xl px-4 py-16 text-center">
          <Loader2 className="mx-auto mb-3 h-6 w-6 animate-spin text-juve-gold" />
          <p className="text-sm text-gray-500">Verifica accesso Area Bianconera...</p>
        </div>
      ) : !hasForumAccess ? (
        <AccessGate openLogin={openLogin} />
      ) : (
        <div className="mx-auto max-w-4xl px-4 py-8">
          <div className="mb-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {[
              { label: 'Discussioni', value: forumStats.threads },
              { label: 'Risposte', value: forumStats.replies },
              { label: 'In evidenza', value: forumStats.pinned },
              { label: 'Attive oggi', value: forumStats.activeToday },
            ].map((item) => (
              <div key={item.label} className="border border-gray-200 bg-white p-4">
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-gray-400">{item.label}</p>
                <p className="mt-2 font-display text-3xl font-black text-juve-black">{item.value}</p>
              </div>
            ))}
          </div>

          {categoriesList.length > 0 && (
            <section className="mb-8">
              <div className="mb-4 flex items-center gap-3">
                <div className="h-5 w-1 bg-juve-gold" />
                <h2 className="text-[10px] font-black uppercase tracking-widest text-gray-500">Aree del forum</h2>
              </div>
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                {categoriesList.map((category) => {
                  const isActive = activeCat === category.id
                  return (
                    <button
                      key={category.id}
                      type="button"
                      onClick={() => setSearchParams(isActive ? {} : { cat: category.id })}
                      className={`border p-4 text-left transition-colors ${
                        isActive ? 'border-transparent bg-juve-black text-white' : 'border-gray-200 bg-white hover:border-juve-gold'
                      }`}
                      style={isActive ? {} : { borderLeftColor: category.color, borderLeftWidth: '4px' }}
                    >
                      <p className="text-[10px] font-black uppercase tracking-[0.2em]" style={isActive ? { color: '#C7A14A' } : { color: category.color }}>{category.name}</p>
                      <p className={`mt-2 text-xs leading-relaxed ${isActive ? 'text-gray-300' : 'text-gray-500'}`}>{category.description || 'Discussioni della community bianconera.'}</p>
                      <p className={`mt-3 text-[11px] font-bold ${isActive ? 'text-white' : 'text-juve-black'}`}>{categoryCounts[category.id] || 0} thread</p>
                    </button>
                  )
                })}
              </div>
            </section>
          )}

          <div className="mb-8 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="border border-gray-200 bg-white p-4">
              <div className="mb-3 flex items-center gap-2">
                <Search className="h-4 w-4 text-juve-gold" />
                <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">Strumenti forum</span>
              </div>
              <div className="grid gap-3 md:grid-cols-[1fr_auto_auto]">
                <label className="relative block">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <input
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    placeholder="Cerca titolo, autore, contenuto o categoria..."
                    className="w-full border border-gray-200 py-2.5 pl-10 pr-3 text-sm focus:border-juve-gold focus:outline-none"
                  />
                </label>

                <label className="flex items-center gap-2 border border-gray-200 px-3 py-2.5 text-xs font-bold uppercase tracking-wider text-gray-500">
                  <Filter className="h-4 w-4 text-juve-gold" />
                  <select value={sortBy} onChange={(event) => setSortBy(event.target.value)} className="bg-transparent text-juve-black focus:outline-none">
                    <option value="active">Piu attive</option>
                    <option value="recent">Piu recenti</option>
                    <option value="popular">Piu viste</option>
                    <option value="replies">Piu risposte</option>
                  </select>
                </label>

                {activeCat ? (
                  <button
                    type="button"
                    onClick={() => setSearchParams({})}
                    className="border border-gray-200 px-3 py-2.5 text-xs font-bold uppercase tracking-widest text-gray-500 hover:border-juve-gold hover:text-juve-black"
                  >
                    Reset categoria
                  </button>
                ) : (
                  <div className="hidden md:block" />
                )}
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {quickFilters.map((filter) => (
                  <button
                    key={filter.key}
                    type="button"
                    onClick={() => setViewMode(filter.key)}
                    className={`px-3 py-1.5 text-[11px] font-bold uppercase tracking-widest transition-colors ${
                      viewMode === filter.key ? 'bg-juve-black text-white' : 'border border-gray-200 text-gray-500 hover:border-juve-gold hover:text-juve-black'
                    }`}
                  >
                    {filter.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="border border-gray-200 bg-gray-50 p-4">
              <div className="mb-3 flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-juve-gold" />
                <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">Come usarlo bene</span>
              </div>
              <div className="space-y-3 text-sm text-gray-600">
                <p>Apri thread con un titolo chiaro e una domanda precisa: il forum rende meglio quando il tema e immediato.</p>
                <p>Usa le categorie per separare mercato, partite e tattica. I thread senza categoria chiara si perdono subito.</p>
                <p>Se una discussione e gia calda, entra li invece di aprirne una identica. Mantiene il confronto piu leggibile.</p>
              </div>
            </div>
          </div>

          {(pinnedThreads.length > 0 || hotThreads.length > 0) && (
            <div className="mb-8 grid gap-4 lg:grid-cols-2">
              <section className="border border-gray-200 bg-white p-4">
                <div className="mb-4 flex items-center gap-2">
                  <Pin className="h-4 w-4 text-juve-gold" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">Thread in evidenza</span>
                </div>
                <div className="space-y-3">
                  {pinnedThreads.length > 0
                    ? pinnedThreads.map((thread) => <ThreadCard key={thread.id} thread={thread} />)
                    : <p className="text-sm text-gray-400">Nessun thread fissato in alto.</p>}
                </div>
              </section>

              <section className="border border-gray-200 bg-white p-4">
                <div className="mb-4 flex items-center gap-2">
                  <Flame className="h-4 w-4 text-juve-gold" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">Discussioni calde</span>
                </div>
                <div className="space-y-3">
                  {hotThreads.length > 0
                    ? hotThreads.map((thread) => <ThreadCard key={thread.id} thread={thread} />)
                    : <p className="text-sm text-gray-400">Ancora nessuna discussione con trazione.</p>}
                </div>
              </section>
            </div>
          )}

          {!showNewThread ? (
            <button
              onClick={() => {
                if (!canParticipate) {
                  openLogin('login')
                  return
                }
                setShowNewThread(true)
                if (activeCat && !newCat) setNewCat(activeCat)
              }}
              className="mb-6 flex w-full items-center justify-center gap-2 bg-juve-gold px-4 py-3 text-xs font-black uppercase tracking-widest text-juve-black transition-colors hover:bg-juve-gold-dark"
            >
              <Plus className="h-4 w-4" /> {canParticipate ? 'Nuova Discussione' : 'Accedi per partecipare'}
            </button>
          ) : (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="mb-6 border border-gray-200 bg-white p-4">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-widest text-gray-500">Nuova discussione</span>
                <button type="button" onClick={() => setShowNewThread(false)}><X className="h-4 w-4 text-gray-400" /></button>
              </div>
              <select
                value={newCat}
                onChange={(event) => setNewCat(event.target.value)}
                className="mb-3 w-full border border-gray-200 px-3 py-2 text-sm focus:border-juve-gold focus:outline-none"
              >
                <option value="">Scegli categoria...</option>
                {categoriesList.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
              </select>
              <input
                value={newTitle}
                onChange={(event) => setNewTitle(event.target.value)}
                placeholder="Titolo della discussione..."
                className="mb-3 w-full border border-gray-200 px-3 py-2 text-sm font-bold focus:border-juve-gold focus:outline-none"
              />
              <textarea
                value={newContent}
                onChange={(event) => setNewContent(event.target.value)}
                placeholder="Scrivi il tuo messaggio..."
                rows={4}
                className="mb-3 w-full resize-none border border-gray-200 px-3 py-2 text-sm focus:border-juve-gold focus:outline-none"
              />
              <button
                onClick={() => createMutation.mutate()}
                disabled={!newTitle.trim() || !newContent.trim() || createMutation.isPending}
                className="flex items-center gap-2 bg-juve-black px-4 py-2 text-xs font-black uppercase tracking-widest text-white transition-colors hover:bg-juve-gold hover:text-juve-black disabled:opacity-50"
              >
                <Send className="h-3.5 w-3.5" />
                {createMutation.isPending ? 'Invio...' : 'Pubblica'}
              </button>
            </motion.div>
          )}

          {!canParticipate && (
            <div className="mb-6 border border-dashed border-gray-300 bg-gray-50 px-4 py-3 text-sm text-gray-500">
              Per aprire un thread o rispondere serve un profilo lettore attivo. Puoi entrare dall'Area Bianconera in pochi passaggi.
            </div>
          )}

          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">Risultati</p>
              <h2 className="mt-1 font-display text-2xl font-black text-juve-black">
                {activeCategoryObj ? activeCategoryObj.name : 'Tutte le discussioni'}
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                {totalCount} thread trovati{searchQuery.trim() ? ` per “${searchQuery.trim()}”` : ''}. {loadedCount} gia caricati nello scroll.
              </p>
            </div>
            <div className="text-xs text-gray-400">
              Ordinamento attivo: <span className="font-bold text-gray-600">{sortBy === 'active' ? 'piu attive' : sortBy === 'recent' ? 'piu recenti' : sortBy === 'popular' ? 'piu viste' : 'piu risposte'}</span>
            </div>
          </div>

          {isLoading ? (
            <div className="py-16 text-center">
              <Loader2 className="mx-auto mb-3 h-6 w-6 animate-spin text-juve-gold" />
              <p className="text-sm text-gray-500">Caricamento discussioni...</p>
            </div>
          ) : visibleThreads.length === 0 ? (
            <div className="py-16 text-center">
              <MessageSquare className="mx-auto mb-4 h-10 w-10 text-gray-300" />
              <p className="mb-1 text-sm text-gray-500">Nessuna discussione trovata.</p>
              <p className="text-[10px] text-gray-400">Prova a cambiare filtro oppure apri un nuovo thread.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {visibleThreads.map((thread) => (
                <ThreadCard key={thread.id} thread={thread} />
              ))}
            </div>
          )}

          {visibleThreads.length > 0 && (
            <div className="mt-8 border-t border-gray-200 pt-6">
              <div ref={loadMoreRef} className="flex min-h-[4rem] flex-col items-center justify-center gap-3 text-center">
                {hasNextPage ? (
                  <>
                    {isFetchingNextPage ? (
                      <>
                        <Loader2 className="h-5 w-5 animate-spin text-juve-gold" />
                        <p className="text-sm text-gray-500">Caricamento di altre discussioni...</p>
                      </>
                    ) : (
                      <>
                        <p className="text-sm text-gray-500">Scorri ancora per caricare altri thread.</p>
                        <button
                          type="button"
                          onClick={() => fetchNextPage()}
                          className="inline-flex items-center gap-2 border border-gray-200 px-4 py-2 text-xs font-bold uppercase tracking-widest text-gray-600 transition-colors hover:border-juve-gold hover:text-juve-black"
                        >
                          Carica altri
                          <ChevronRight className="h-4 w-4" />
                        </button>
                      </>
                    )}
                  </>
                ) : totalCount > PAGE_SIZE ? (
                  <p className="text-sm text-gray-400">Hai raggiunto la fine delle discussioni disponibili.</p>
                ) : null}
              </div>
            </div>
          )}
        </div>
      )}
    </>
  )
}