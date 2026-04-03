import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { MessageCircle, Send, User, Loader2, ThumbsUp } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { formatDate, timeAgo } from '@/lib/utils'

async function getComments(articleId) {
  const { data } = await supabase
    .from('comments')
    .select('*')
    .eq('article_id', articleId)
    .eq('approved', true)
    .order('created_at', { ascending: true })
  return data || []
}

async function postComment({ articleId, authorName, authorEmail, content }) {
  const { data, error } = await supabase.from('comments').insert([{
    article_id: articleId,
    author_name: authorName,
    author_email: authorEmail,
    content,
    approved: false, // moderation required
  }]).select().single()
  if (error) throw error
  return data
}

function CommentItem({ comment, index }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="flex gap-4"
    >
      <div className="shrink-0 w-9 h-9 bg-gray-200 flex items-center justify-center font-bold text-sm text-gray-600">
        {comment.author_name?.[0]?.toUpperCase() || <User className="h-4 w-4" />}
      </div>
      <div className="flex-1">
        <div className="flex items-baseline gap-2 mb-1">
          <span className="font-bold text-sm text-juve-black">{comment.author_name}</span>
          <span className="text-xs text-gray-400">{timeAgo(comment.created_at)}</span>
        </div>
        <p className="text-sm text-gray-700 leading-relaxed">{comment.content}</p>
      </div>
    </motion.div>
  )
}

export default function Comments({ articleId }) {
  const qc = useQueryClient()
  const [form, setForm] = useState({ name: '', email: '', content: '' })
  const [submitted, setSubmitted] = useState(false)

  const { data: comments = [], isLoading } = useQuery({
    queryKey: ['comments', articleId],
    queryFn: () => getComments(articleId),
    enabled: !!articleId,
  })

  const submitMutation = useMutation({
    mutationFn: () => postComment({
      articleId,
      authorName: form.name,
      authorEmail: form.email,
      content: form.content,
    }),
    onSuccess: () => {
      setSubmitted(true)
      setForm({ name: '', email: '', content: '' })
      qc.invalidateQueries(['comments', articleId])
    },
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!form.name || !form.content) return
    submitMutation.mutate()
  }

  return (
    <section className="mt-12 pt-8 border-t-2 border-juve-black">
      <div className="flex items-center gap-3 mb-8">
        <MessageCircle className="h-5 w-5 text-juve-gold" />
        <h2 className="font-display text-xl font-black">
          Commenti {comments.length > 0 && <span className="text-gray-400">({comments.length})</span>}
        </h2>
      </div>

      {/* Comments list */}
      {isLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-juve-gold" />
        </div>
      ) : comments.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-8">
          Sii il primo a commentare questo articolo
        </p>
      ) : (
        <div className="space-y-6 mb-10">
          {comments.map((c, i) => <CommentItem key={c.id} comment={c} index={i} />)}
        </div>
      )}

      {/* Comment form */}
      <div className="bg-gray-50 border border-gray-200 p-6">
        <h3 className="font-display text-lg font-bold mb-4">Lascia un commento</h3>

        <AnimatePresence mode="wait">
          {submitted ? (
            <motion.div
              key="success"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center py-6"
            >
              <div className="w-12 h-12 bg-green-100 flex items-center justify-center mx-auto mb-3">
                <ThumbsUp className="h-6 w-6 text-green-600" />
              </div>
              <p className="font-bold text-juve-black">Commento inviato!</p>
              <p className="text-sm text-gray-500 mt-1">Il tuo commento è in attesa di approvazione.</p>
              <button
                onClick={() => setSubmitted(false)}
                className="mt-4 text-sm text-juve-gold hover:underline"
              >
                Scrivi un altro commento
              </button>
            </motion.div>
          ) : (
            <motion.form
              key="form"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              onSubmit={handleSubmit}
              className="space-y-3"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">
                    Nome *
                  </label>
                  <input
                    value={form.name}
                    onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                    required
                    placeholder="Il tuo nome"
                    className="w-full border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:border-juve-black"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">
                    Email <span className="font-normal normal-case tracking-normal text-gray-400">(non pubblicata)</span>
                  </label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                    placeholder="tua@email.it"
                    className="w-full border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:border-juve-black"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">
                  Commento *
                </label>
                <textarea
                  value={form.content}
                  onChange={e => setForm(p => ({ ...p, content: e.target.value }))}
                  required
                  rows={4}
                  placeholder="Scrivi il tuo commento…"
                  maxLength={1000}
                  className="w-full border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:border-juve-black resize-none"
                />
                <p className="text-xs text-gray-400 mt-1 text-right">{form.content.length}/1000</p>
              </div>

              {submitMutation.isError && (
                <p className="text-xs text-red-600">Errore nell'invio. Riprova.</p>
              )}

              <div className="flex items-center justify-between">
                <p className="text-xs text-gray-400">I commenti sono moderati prima della pubblicazione.</p>
                <button
                  type="submit"
                  disabled={submitMutation.isPending || !form.name || !form.content}
                  className="flex items-center gap-2 px-5 py-2 bg-juve-black text-white text-sm font-bold hover:bg-juve-gold hover:text-black transition-colors disabled:opacity-60"
                >
                  {submitMutation.isPending
                    ? <Loader2 className="h-4 w-4 animate-spin" />
                    : <Send className="h-4 w-4" />
                  }
                  Invia commento
                </button>
              </div>
            </motion.form>
          )}
        </AnimatePresence>
      </div>
    </section>
  )
}
