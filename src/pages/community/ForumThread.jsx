import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { MessageSquare, Clock, Eye, ArrowLeft, Send, Loader2, User } from 'lucide-react'
import { getForumThread, getForumReplies, createForumReply, incrementThreadViews } from '@/lib/supabase'
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
  const { reader } = useReader()
  const queryClient = useQueryClient()
  const [replyContent, setReplyContent] = useState('')

  const { data: thread, isLoading } = useQuery({
    queryKey: ['forum-thread', id],
    queryFn: async () => {
      const { data } = await getForumThread(id)
      if (data) incrementThreadViews(id).catch(() => {})
      return data
    },
    enabled: Boolean(id),
  })

  const { data: replies } = useQuery({
    queryKey: ['forum-replies', id],
    queryFn: async () => { const { data } = await getForumReplies(id); return data || [] },
    enabled: Boolean(id),
  })

  const replyMutation = useMutation({
    mutationFn: () => createForumReply({
      threadId: id,
      content: replyContent,
      authorId: reader?.id,
      authorName: reader?.username || reader?.email?.split('@')[0] || 'Tifoso',
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['forum-replies', id] })
      queryClient.invalidateQueries({ queryKey: ['forum-thread', id] })
      setReplyContent('')
    },
  })

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <Loader2 className="h-6 w-6 animate-spin text-juve-gold mx-auto" />
      </div>
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

        {/* Thread header */}
        <div className="bg-white border border-gray-200 p-5 mb-4">
          {thread.forum_categories && (
            <span
              className="text-[10px] font-bold uppercase tracking-widest mb-2 inline-block"
              style={{ color: thread.forum_categories.color }}
            >
              {thread.forum_categories.name}
            </span>
          )}
          <h1 className="font-display text-xl sm:text-2xl font-black text-juve-black leading-tight mb-3">
            {thread.title}
          </h1>
          <p className="text-sm text-gray-700 whitespace-pre-wrap mb-4">{thread.content}</p>
          <div className="flex items-center gap-3 text-[10px] text-gray-400 font-medium border-t border-gray-100 pt-3">
            <span className="flex items-center gap-1"><User className="h-3 w-3" />{thread.author_name}</span>
            <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{timeAgo(thread.created_at)}</span>
            <span className="flex items-center gap-1"><Eye className="h-3 w-3" />{thread.views || 0} visualizzazioni</span>
            <span className="flex items-center gap-1"><MessageSquare className="h-3 w-3" />{thread.reply_count || 0} risposte</span>
          </div>
        </div>

        {/* Replies */}
        <div className="flex items-center gap-2 mb-3">
          <div className="h-5 w-1 bg-juve-gold" />
          <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">
            Risposte ({replies?.length || 0})
          </span>
        </div>

        <div className="space-y-3 mb-6">
          {(replies || []).map((reply, i) => (
            <ReplyCard key={reply.id} reply={reply} index={i} />
          ))}
          {replies?.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-8">Nessuna risposta ancora. Sii il primo!</p>
          )}
        </div>

        {/* Reply form */}
        {!thread.is_locked && (
          <div className="bg-white border border-gray-200 p-4">
            <span className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2 block">Rispondi</span>
            <textarea
              value={replyContent}
              onChange={e => setReplyContent(e.target.value)}
              placeholder="Scrivi la tua risposta..."
              rows={3}
              className="w-full border border-gray-200 px-3 py-2 text-sm mb-3 resize-none focus:outline-none focus:border-juve-gold"
            />
            <button
              onClick={() => replyMutation.mutate()}
              disabled={!replyContent.trim() || replyMutation.isPending}
              className="flex items-center gap-2 bg-juve-black text-white px-4 py-2 text-xs font-black uppercase tracking-widest hover:bg-juve-gold hover:text-juve-black transition-colors disabled:opacity-50"
            >
              <Send className="h-3.5 w-3.5" />
              {replyMutation.isPending ? 'Invio...' : 'Rispondi'}
            </button>
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
