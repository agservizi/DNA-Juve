import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { MessageSquare, Clock, Eye, ArrowLeft, Send, Loader2, User, Pin, Lock, Search, Link2, Quote, Sparkles, ArrowRight, Bell, BellOff, ThumbsUp } from 'lucide-react'
import { createForumReply, followForumThread, getForumReplies, getForumThread, getForumThreadViewerState, incrementThreadViews, likeForumThread, unfollowForumThread, unlikeForumThread } from '@/lib/supabase'
import { useReader } from '@/hooks/useReader'
import { useToast } from '@/hooks/useToast'
import SEO from '@/components/blog/SEO'

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

function buildQuoteBlock(thread) {
  const compact = String(thread?.content || '').replace(/\s+/g, ' ').trim()
  const snippet = compact.length > 220 ? `${compact.slice(0, 220).trim()}...` : compact
  return compact ? `> ${snippet}\n\n` : ''
}

function ReplyCard({ reply, index }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03 }}
      className="bg-white border border-gray-200 p-4"
    >
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 bg-gray-100 flex items-center justify-center shrink-0">
          <User className="h-4 w-4 text-gray-400" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-bold text-juve-black">{reply.author_name}</span>
            <span className="text-[10px] text-gray-400 flex items-center gap-0.5">
              <Clock className="h-3 w-3" />{timeAgo(reply.created_at)}
            </span>
          </div>
          <p className="text-sm text-gray-700 whitespace-pre-wrap">{reply.content}</p>
        </div>
      </div>
    </motion.div>
  )
}

export default function ForumThread() {
  const { id } = useParams()
  const { reader, openLogin, isAuthenticated, authReady } = useReader()
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [replyContent, setReplyContent] = useState('')
  const [replySearch, setReplySearch] = useState('')
  const [replySort, setReplySort] = useState('oldest')
  const [copied, setCopied] = useState(false)
  const replyBoxRef = useRef(null)
  const hasForumAccess = Boolean(isAuthenticated)
  const canParticipate = Boolean(hasForumAccess && reader?.id)

  const { data: thread, isLoading } = useQuery({
    queryKey: ['forum-thread', id],
    queryFn: async () => {
      const { data } = await getForumThread(id)
      if (data) incrementThreadViews(id).catch(() => {})
      return data
    },
    enabled: Boolean(id && hasForumAccess),
  })

  const { data: replies } = useQuery({
    queryKey: ['forum-replies', id],
    queryFn: async () => { const { data } = await getForumReplies(id); return data || [] },
    enabled: Boolean(id && hasForumAccess),
  })

  const { data: viewerState } = useQuery({
    queryKey: ['forum-thread-viewer-state', id, reader?.id],
    queryFn: async () => {
      const { data } = await getForumThreadViewerState(id, reader?.id)
      return data || { isLiked: false, isFollowing: false }
    },
    enabled: Boolean(id && canParticipate),
  })

  const visibleReplies = useMemo(() => {
    const normalizedSearch = replySearch.trim().toLowerCase()
    let list = (replies || []).filter((reply) => {
      if (!normalizedSearch) return true
      return [reply.author_name, reply.content].filter(Boolean).join(' ').toLowerCase().includes(normalizedSearch)
    })

    list = list.slice().sort((a, b) => {
      const diff = new Date(a.created_at || 0) - new Date(b.created_at || 0)
      return replySort === 'newest' ? -diff : diff
    })

    return list
  }, [replies, replySearch, replySort])

  useEffect(() => {
    if (!copied) return undefined
    const timeoutId = window.setTimeout(() => setCopied(false), 1800)
    return () => window.clearTimeout(timeoutId)
  }, [copied])

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
      setCopied(true)
    } catch {
      setCopied(false)
    }
  }

  const handleQuoteThread = () => {
    if (!thread) return
    if (!canParticipate) {
      openLogin('login')
      return
    }
    setReplyContent((current) => `${buildQuoteBlock(thread)}${current}`)
    replyBoxRef.current?.focus()
    replyBoxRef.current?.scrollIntoView({ block: 'center' })
  }

  const handleReplyAction = () => {
    if (!canParticipate) {
      openLogin('login')
      return
    }
    replyBoxRef.current?.focus()
    replyBoxRef.current?.scrollIntoView({ block: 'center' })
  }

  const replyMutation = useMutation({
    mutationFn: async () => {
      const result = await createForumReply({
        threadId: id,
        content: replyContent,
        authorId: reader?.id,
        authorName: reader?.username || reader?.email?.split('@')[0] || 'Tifoso',
      })

      if (reader?.id) {
        await followForumThread(id, reader.id).catch(() => null)
      }

      return result
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['forum-replies', id] })
      queryClient.invalidateQueries({ queryKey: ['forum-thread', id] })
      queryClient.invalidateQueries({ queryKey: ['forum-thread-viewer-state', id, reader?.id] })
      queryClient.invalidateQueries({ queryKey: ['forum-threads'] })
      queryClient.invalidateQueries({ queryKey: ['forum-threads-overview'] })
      setReplyContent('')
    },
  })

  const likeMutation = useMutation({
    mutationFn: async () => {
      if (!reader?.id) return null
      return viewerState?.isLiked ? unlikeForumThread(id, reader.id) : likeForumThread(id, reader.id)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['forum-thread', id] })
      queryClient.invalidateQueries({ queryKey: ['forum-thread-viewer-state', id, reader?.id] })
      queryClient.invalidateQueries({ queryKey: ['forum-threads'] })
      queryClient.invalidateQueries({ queryKey: ['forum-threads-overview'] })
    },
    onError: () => {
      toast({ title: 'Operazione non riuscita', description: 'Non sono riuscito ad aggiornare il like del thread.', variant: 'destructive' })
    },
  })

  const followMutation = useMutation({
    mutationFn: async () => {
      if (!reader?.id) return null
      return viewerState?.isFollowing ? unfollowForumThread(id, reader.id) : followForumThread(id, reader.id)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['forum-thread', id] })
      queryClient.invalidateQueries({ queryKey: ['forum-thread-viewer-state', id, reader?.id] })
      queryClient.invalidateQueries({ queryKey: ['forum-threads'] })
      queryClient.invalidateQueries({ queryKey: ['forum-threads-overview'] })
    },
    onError: () => {
      toast({ title: 'Operazione non riuscita', description: 'Non sono riuscito ad aggiornare il follow del thread.', variant: 'destructive' })
    },
  })

  const isLiked = Boolean(viewerState?.isLiked)
  const isFollowing = Boolean(viewerState?.isFollowing)

  if (!authReady || isLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <Loader2 className="h-6 w-6 animate-spin text-juve-gold mx-auto" />
      </div>
    )
  }

  if (!hasForumAccess) {
    return (
      <>
        <SEO title="Forum riservato" description="Il forum della community è accessibile solo agli iscritti all'Area Bianconera." url="/community/forum" />

        <div className="max-w-4xl mx-auto px-4 py-12">
          <div className="border border-gray-200 bg-white p-8 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-juve-black text-white">
              <Lock className="h-6 w-6 text-juve-gold" />
            </div>
            <p className="text-xs font-black uppercase tracking-[0.24em] text-juve-gold">Accesso riservato</p>
            <h1 className="mt-3 font-display text-3xl font-black text-juve-black">Per aprire il forum devi iscriverti all'Area Bianconera</h1>
            <p className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-gray-600 sm:text-base">
              Le discussioni del forum sono riservate agli utenti registrati della community. Iscriviti o accedi per entrare nelle conversazioni e leggere i thread.
            </p>
            <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
              <button
                type="button"
                onClick={() => openLogin('register')}
                className="inline-flex items-center justify-center gap-2 bg-juve-black px-5 py-3 text-xs font-black uppercase tracking-widest text-white transition-colors hover:bg-juve-gold hover:text-black"
              >
                Iscriviti ora
                <ArrowRight className="h-4 w-4" />
              </button>
              <Link
                to="/area-bianconera"
                className="inline-flex items-center justify-center gap-2 border border-juve-black px-5 py-3 text-xs font-black uppercase tracking-widest text-juve-black transition-colors hover:border-juve-gold hover:text-juve-gold"
              >
                Vai all'Area Bianconera
              </Link>
            </div>
          </div>
        </div>
      </>
    )
  }

  if (!thread) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <MessageSquare className="h-10 w-10 text-gray-300 mx-auto mb-4" />
        <p className="text-sm text-gray-500">Discussione non trovata.</p>
        <Link to="/community/forum" className="text-xs font-bold text-juve-gold mt-2 inline-block">← Torna al forum</Link>
      </div>
    )
  }

  return (
    <>
      <SEO title={thread.title} description={thread.content?.slice(0, 160)} url={`/community/forum/${id}`} />

      <div className="max-w-4xl mx-auto px-4 py-6">
        <Link
          to="/community/forum"
          className="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-widest text-juve-gold hover:text-juve-gold-dark mb-4"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Forum
        </Link>

        <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr] mb-4">
          <div className="bg-white border border-gray-200 p-5">
            <div className="flex flex-wrap items-center gap-2 mb-3">
              {thread.is_pinned && (
                <span className="inline-flex items-center gap-1 bg-juve-gold/15 px-2 py-1 text-[10px] font-black uppercase tracking-widest text-juve-black">
                  <Pin className="h-3 w-3" /> In evidenza
                </span>
              )}
              {thread.is_locked && (
                <span className="inline-flex items-center gap-1 bg-gray-100 px-2 py-1 text-[10px] font-black uppercase tracking-widest text-gray-500">
                  <Lock className="h-3 w-3" /> Chiusa
                </span>
              )}
              {thread.forum_categories && (
                <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: thread.forum_categories.color }}>
                  {thread.forum_categories.name}
                </span>
              )}
            </div>

            <h1 className="font-display text-xl sm:text-2xl font-black text-juve-black leading-tight mb-3">
              {thread.title}
            </h1>
            <p className="text-sm text-gray-700 whitespace-pre-wrap mb-4">{thread.content}</p>
            <div className="flex flex-wrap items-center gap-3 text-[10px] text-gray-400 font-medium border-t border-gray-100 pt-3">
              <span className="flex items-center gap-1"><User className="h-3 w-3" />{thread.author_name}</span>
              <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{timeAgo(thread.created_at)}</span>
              <span className="flex items-center gap-1"><Eye className="h-3 w-3" />{thread.views || 0} visualizzazioni</span>
              <span className="flex items-center gap-1"><MessageSquare className="h-3 w-3" />{thread.reply_count || 0} risposte</span>
              <span className="flex items-center gap-1"><ThumbsUp className="h-3 w-3" />{thread.like_count || 0} like</span>
              <span className="flex items-center gap-1"><Bell className="h-3 w-3" />{thread.follower_count || 0} follower</span>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  if (!canParticipate) {
                    openLogin('login')
                    return
                  }
                  likeMutation.mutate()
                }}
                disabled={likeMutation.isPending}
                className={`inline-flex items-center gap-2 px-3 py-2 text-xs font-black uppercase tracking-widest transition-colors ${isLiked ? 'bg-juve-black text-white' : 'border border-gray-200 text-gray-600 hover:border-juve-gold hover:text-juve-black'} disabled:opacity-50`}
              >
                <ThumbsUp className="h-3.5 w-3.5" />
                {isLiked ? 'Ti piace' : 'Metti like'}
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!canParticipate) {
                    openLogin('login')
                    return
                  }
                  followMutation.mutate()
                }}
                disabled={followMutation.isPending}
                className={`inline-flex items-center gap-2 px-3 py-2 text-xs font-black uppercase tracking-widest transition-colors ${isFollowing ? 'bg-juve-gold text-black' : 'border border-gray-200 text-gray-600 hover:border-juve-gold hover:text-juve-black'} disabled:opacity-50`}
              >
                {isFollowing ? <BellOff className="h-3.5 w-3.5" /> : <Bell className="h-3.5 w-3.5" />}
                {isFollowing ? 'Seguito' : 'Segui thread'}
              </button>
            </div>
          </div>

          <div className="space-y-4">
            <div className="border border-gray-200 bg-gray-50 p-4">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="h-4 w-4 text-juve-gold" />
                <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">Strumenti thread</span>
              </div>
              <div className="grid gap-2">
                <button type="button" onClick={handleReplyAction} className="flex items-center justify-between border border-gray-200 bg-white px-3 py-2 text-xs font-bold uppercase tracking-widest text-juve-black hover:border-juve-gold">
                  Vai alla risposta
                  <Send className="h-3.5 w-3.5 text-juve-gold" />
                </button>
                <button type="button" onClick={handleQuoteThread} className="flex items-center justify-between border border-gray-200 bg-white px-3 py-2 text-xs font-bold uppercase tracking-widest text-juve-black hover:border-juve-gold">
                  Cita il messaggio iniziale
                  <Quote className="h-3.5 w-3.5 text-juve-gold" />
                </button>
                <button type="button" onClick={handleCopyLink} className="flex items-center justify-between border border-gray-200 bg-white px-3 py-2 text-xs font-bold uppercase tracking-widest text-juve-black hover:border-juve-gold">
                  {copied ? 'Link copiato' : 'Copia link thread'}
                  <Link2 className="h-3.5 w-3.5 text-juve-gold" />
                </button>
              </div>
            </div>

            <div className="border border-gray-200 bg-white p-4">
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">Prima di rispondere</p>
              <div className="mt-3 space-y-2 text-sm text-gray-600">
                <p>Resta sul tema del thread e prova ad aggiungere un argomento, non solo una reazione secca.</p>
                <p>Se vuoi contestare un punto, cita il passaggio e spiega il perche. Il confronto migliora molto cosi.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Replies */}
        <div className="flex flex-col gap-3 mb-3 md:flex-row md:items-end md:justify-between">
          <div className="flex items-center gap-2">
            <div className="h-5 w-1 bg-juve-gold" />
            <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">
              Risposte ({visibleReplies.length})
            </span>
          </div>

          <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
            <label className="relative block">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                value={replySearch}
                onChange={(event) => setReplySearch(event.target.value)}
                placeholder="Cerca nelle risposte..."
                className="w-full border border-gray-200 py-2 pl-10 pr-3 text-sm focus:border-juve-gold focus:outline-none"
              />
            </label>
            <select value={replySort} onChange={(event) => setReplySort(event.target.value)} className="border border-gray-200 px-3 py-2 text-sm focus:border-juve-gold focus:outline-none">
              <option value="oldest">Prima le piu vecchie</option>
              <option value="newest">Prima le piu recenti</option>
            </select>
          </div>
        </div>

        <div className="space-y-3 mb-6">
          {visibleReplies.map((reply, i) => (
            <ReplyCard key={reply.id} reply={reply} index={i} />
          ))}
          {visibleReplies.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-8">
              {replies?.length ? 'Nessuna risposta corrisponde alla ricerca.' : 'Nessuna risposta ancora. Sii il primo!'}
            </p>
          )}
        </div>

        {/* Reply form */}
        {!thread.is_locked && (
          <div className="bg-white border border-gray-200 p-4">
            <span className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2 block">Rispondi</span>
            {!canParticipate ? (
              <div className="border border-dashed border-gray-300 bg-gray-50 p-4 text-sm text-gray-500">
                Per rispondere nel forum serve un profilo lettore attivo.
                <button type="button" onClick={() => openLogin('login')} className="ml-2 font-bold text-juve-gold hover:underline">
                  Accedi ora
                </button>
              </div>
            ) : (
              <>
                <textarea
                  ref={replyBoxRef}
                  value={replyContent}
                  onChange={e => setReplyContent(e.target.value)}
                  placeholder="Scrivi la tua risposta..."
                  rows={4}
                  maxLength={1500}
                  className="w-full border border-gray-200 px-3 py-2 text-sm mb-2 resize-none focus:outline-none focus:border-juve-gold"
                />
                <div className="mb-3 flex items-center justify-between text-[11px] text-gray-400">
                  <span>Stai rispondendo come {reader?.username || reader?.email?.split('@')[0] || 'Tifoso'}.</span>
                  <span>{replyContent.length}/1500</span>
                </div>
                <button
                  onClick={() => replyMutation.mutate()}
                  disabled={!replyContent.trim() || replyMutation.isPending}
                  className="flex items-center gap-2 bg-juve-black text-white px-4 py-2 text-xs font-black uppercase tracking-widest hover:bg-juve-gold hover:text-juve-black transition-colors disabled:opacity-50"
                >
                  <Send className="h-3.5 w-3.5" />
                  {replyMutation.isPending ? 'Invio...' : 'Rispondi'}
                </button>
              </>
            )}
          </div>
        )}
        {thread.is_locked && (
          <div className="text-center py-4 text-sm text-gray-400 italic">
            Questa discussione è stata chiusa.
          </div>
        )}
      </div>
    </>
  )
}
