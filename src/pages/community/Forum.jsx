import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { MessageSquare, Pin, Eye, Clock, ChevronRight, Loader2, Plus, X, Send } from 'lucide-react'
import { getForumCategories, getForumThreads, createForumThread } from '@/lib/supabase'
import { useReader } from '@/hooks/useReader'
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

function ThreadCard({ thread }) {
  return (
    <Link
      to={`/community/forum/${thread.id}`}
      className="block bg-white border border-gray-200 p-4 hover:border-juve-gold transition-colors"
    >
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            {thread.is_pinned && <Pin className="h-3 w-3 text-juve-gold shrink-0" />}
            {thread.forum_categories && (
              <span
                className="text-[10px] font-bold uppercase tracking-widest"
                style={{ color: thread.forum_categories.color }}
              >
                {thread.forum_categories.name}
              </span>
            )}
          </div>
          <h3 className="font-display text-base font-black text-juve-black leading-tight line-clamp-2 mb-1">
            {thread.title}
          </h3>
          <p className="text-xs text-gray-500 line-clamp-1">{thread.content}</p>
          <div className="flex items-center gap-3 mt-2 text-[10px] text-gray-400 font-medium">
            <span>{thread.author_name}</span>
            <span className="flex items-center gap-0.5"><Clock className="h-3 w-3" />{timeAgo(thread.created_at)}</span>
            <span className="flex items-center gap-0.5"><MessageSquare className="h-3 w-3" />{thread.reply_count || 0}</span>
            <span className="flex items-center gap-0.5"><Eye className="h-3 w-3" />{thread.views || 0}</span>
          </div>
        </div>
        <ChevronRight className="h-5 w-5 text-gray-300 shrink-0 mt-1" />
      </div>
    </Link>
  )
}

export default function Forum() {
  const [searchParams, setSearchParams] = useSearchParams()
  const activeCat = searchParams.get('cat') || null
  const [showNewThread, setShowNewThread] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newContent, setNewContent] = useState('')
  const [newCat, setNewCat] = useState('')
  const { reader } = useReader()
  const queryClient = useQueryClient()

  const { data: categories } = useQuery({
    queryKey: ['forum-categories'],
    queryFn: async () => { const { data } = await getForumCategories(); return data || [] },
  })

  const activeCategoryObj = categories?.find(c => c.id === activeCat)

  const { data: threads, isLoading } = useQuery({
    queryKey: ['forum-threads', activeCat],
    queryFn: async () => {
      const { data } = await getForumThreads({ categoryId: activeCat || undefined })
      return data || []
    },
  })

  const createMutation = useMutation({
    mutationFn: () => createForumThread({
      categoryId: newCat || categories?.[0]?.id,
      title: newTitle,
      content: newContent,
      authorId: reader?.id,
      authorName: reader?.username || reader?.email?.split('@')[0] || 'Tifoso',
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['forum-threads'] })
      setShowNewThread(false)
      setNewTitle('')
      setNewContent('')
    },
  })

  return (
    <>
      <SEO title="Forum Bianconero" description="Entra nel forum della community bianconera. Discuti di Juventus: partite, mercato, tattiche e altro." url="/community/forum" />

      <section className="bg-juve-black text-white py-10 md:py-14">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <div className="flex items-center justify-center gap-2 mb-3">
              <MessageSquare className="h-4 w-4 text-juve-gold" />
              <span className="text-xs font-black uppercase tracking-widest text-juve-gold">Community</span>
            </div>
            <h1 className="font-display text-3xl sm:text-4xl md:text-5xl font-black leading-tight mb-2">FORUM</h1>
            <p className="text-sm text-gray-400 max-w-lg mx-auto">
              Discuti con altri tifosi bianconeri. Partite, mercato, tattiche e molto altro.
            </p>
          </motion.div>
        </div>
      </section>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Category filters */}
        <div className="flex flex-wrap gap-2 mb-6">
          <button
            onClick={() => setSearchParams({})}
            className={`px-3 py-1.5 text-xs font-bold uppercase tracking-widest border transition-colors ${
              !activeCat ? 'bg-juve-black text-white border-juve-black' : 'border-gray-300 text-gray-600 hover:border-juve-gold'
            }`}
          >
            Tutti
          </button>
          {(categories || []).map(cat => (
            <button
              key={cat.id}
              onClick={() => setSearchParams({ cat: cat.id })}
              className={`px-3 py-1.5 text-xs font-bold uppercase tracking-widest border transition-colors ${
                activeCat === cat.id ? 'text-white border-transparent' : 'border-gray-300 text-gray-600 hover:border-juve-gold'
              }`}
              style={activeCat === cat.id ? { backgroundColor: cat.color, borderColor: cat.color } : {}}
            >
              {cat.name}
            </button>
          ))}
        </div>

        {/* New thread button/form */}
        {!showNewThread ? (
          <button
            onClick={() => setShowNewThread(true)}
            className="w-full mb-6 flex items-center justify-center gap-2 bg-juve-gold text-juve-black px-4 py-3 text-xs font-black uppercase tracking-widest hover:bg-juve-gold-dark transition-colors"
          >
            <Plus className="h-4 w-4" /> Nuova Discussione
          </button>
        ) : (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="mb-6 bg-white border border-gray-200 p-4"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-black uppercase tracking-widest text-gray-500">Nuova discussione</span>
              <button onClick={() => setShowNewThread(false)}><X className="h-4 w-4 text-gray-400" /></button>
            </div>
            <select
              value={newCat}
              onChange={e => setNewCat(e.target.value)}
              className="w-full border border-gray-200 px-3 py-2 text-sm mb-3 focus:outline-none focus:border-juve-gold"
            >
              <option value="">Scegli categoria...</option>
              {(categories || []).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <input
              value={newTitle}
              onChange={e => setNewTitle(e.target.value)}
              placeholder="Titolo della discussione..."
              className="w-full border border-gray-200 px-3 py-2 text-sm mb-3 font-bold focus:outline-none focus:border-juve-gold"
            />
            <textarea
              value={newContent}
              onChange={e => setNewContent(e.target.value)}
              placeholder="Scrivi il tuo messaggio..."
              rows={4}
              className="w-full border border-gray-200 px-3 py-2 text-sm mb-3 resize-none focus:outline-none focus:border-juve-gold"
            />
            <button
              onClick={() => createMutation.mutate()}
              disabled={!newTitle.trim() || !newContent.trim() || createMutation.isPending}
              className="flex items-center gap-2 bg-juve-black text-white px-4 py-2 text-xs font-black uppercase tracking-widest hover:bg-juve-gold hover:text-juve-black transition-colors disabled:opacity-50"
            >
              <Send className="h-3.5 w-3.5" />
              {createMutation.isPending ? 'Invio...' : 'Pubblica'}
            </button>
          </motion.div>
        )}

        {/* Threads */}
        {isLoading && (
          <div className="text-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-juve-gold mx-auto mb-3" />
            <p className="text-sm text-gray-500">Caricamento discussioni...</p>
          </div>
        )}

        {!isLoading && (!threads || threads.length === 0) && (
          <div className="text-center py-16">
            <MessageSquare className="h-10 w-10 text-gray-300 mx-auto mb-4" />
            <p className="text-sm text-gray-500 mb-1">Nessuna discussione ancora.</p>
            <p className="text-[10px] text-gray-400">Sii il primo ad aprire un thread!</p>
          </div>
        )}

        {threads && threads.length > 0 && (
          <div className="space-y-3">
            {threads.map(thread => (
              <ThreadCard key={thread.id} thread={thread} />
            ))}
          </div>
        )}
      </div>
    </>
  )
}
