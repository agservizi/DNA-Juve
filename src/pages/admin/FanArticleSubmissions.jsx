import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { CheckCircle2, Eye, FilePenLine, Mail, ShieldAlert, XCircle, StickyNote } from 'lucide-react'
import {
  approveFanArticleSubmission,
  getFanArticleSubmissions,
  sendReaderEventNotification,
  updateFanArticleSubmission,
} from '@/lib/supabase'
import { usePersistentAdminState } from '@/hooks/usePersistentAdminState'
import { stripHtml, truncate, readingTime, formatDate } from '@/lib/utils'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/hooks/useToast'
import { Toaster } from '@/components/ui/Toast'
import { Button } from '@/components/ui/Button'
import { Card, CardContent } from '@/components/ui/Card'
import { sendFanArticleStatusEmail } from '@/lib/fanArticles'

const FILTERS = [
  { id: 'all', label: 'Tutte' },
  { id: 'submitted', label: 'Nuove' },
  { id: 'reviewing', label: 'In revisione' },
  { id: 'approved', label: 'Approvate' },
  { id: 'rejected', label: 'Rifiutate' },
]

export default function FanArticleSubmissions() {
  const [filter, setFilter] = usePersistentAdminState('fan-submissions-filter', 'submitted')
  const [notesById, setNotesById] = usePersistentAdminState('fan-submissions-notes', {})
  const { user } = useAuth()
  const { toasts, toast, dismiss } = useToast()
  const qc = useQueryClient()

  const { data: submissions = [], isLoading } = useQuery({
    queryKey: ['fan-article-submissions', filter],
    queryFn: async () => {
      const { data, error } = await getFanArticleSubmissions({ status: filter === 'all' ? null : filter })
      if (error) throw error
      return data || []
    },
  })

  const { data: allSubmissions = [] } = useQuery({
    queryKey: ['fan-article-submissions', 'all-counts'],
    queryFn: async () => {
      const { data, error } = await getFanArticleSubmissions()
      if (error) throw error
      return data || []
    },
  })

  const groupedCounts = useMemo(() => ({
    all: allSubmissions.length,
    submitted: allSubmissions.filter((item) => item.status === 'submitted').length,
    reviewing: allSubmissions.filter((item) => item.status === 'reviewing').length,
    approved: allSubmissions.filter((item) => item.status === 'approved').length,
    rejected: allSubmissions.filter((item) => item.status === 'rejected').length,
  }), [allSubmissions])

  const refreshLists = () => {
    qc.invalidateQueries(['fan-article-submissions'])
    qc.invalidateQueries(['all-articles'])
    qc.invalidateQueries(['dashboard-stats'])
  }

  const getReviewNotes = (submission) => notesById[submission.id] ?? submission.review_notes ?? ''

  const setReviewNotes = (submissionId, value) => {
    setNotesById((prev) => ({ ...prev, [submissionId]: value }))
  }

  const notifySubmissionStatus = async (submission, status, article = null) => {
    try {
      await sendFanArticleStatusEmail({
        to: submission.author_email,
        name: submission.author_name,
        title: submission.title,
        status,
        notes: getReviewNotes(submission),
        articleEditUrl: article ? `${window.location.origin}/admin/articoli/${article.id}/modifica` : '',
      })
      toast({
        title: 'Email inviata al tifoso',
        description: `Notifica ${status} spedita a ${submission.author_email}`,
        variant: 'success',
      })
    } catch (error) {
      toast({
        title: 'Aggiornamento salvato, ma email non inviata',
        description: error.message,
        variant: 'destructive',
      })
    }
  }

  const notifyReaderInArea = async (submission, status, article = null) => {
    if (!submission?.author_email) return

    try {
      const copy = status === 'approved'
        ? {
            title: 'La tua proposta è stata approvata',
            body: `La redazione ha approvato "${submission.title}". È stata aperta una bozza editoriale per la pubblicazione.`,
          }
        : status === 'rejected'
          ? {
              title: 'La tua proposta non è stata approvata',
              body: `La redazione ha revisionato "${submission.title}". Controlla le note e riparti da una nuova idea.`,
            }
          : {
              title: 'La redazione sta valutando la tua proposta',
              body: `"${submission.title}" è passata in revisione interna.`,
            }

      await sendReaderEventNotification({
        userEmail: submission.author_email,
        type: `fan-article-${status}`,
        title: copy.title,
        body: copy.body,
        url: article ? `/admin/articoli/${article.id}/modifica` : '/area-bianconera',
        metadata: {
          submissionId: submission.id,
          status,
          linkedArticleId: article?.id || null,
        },
      })
    } catch {
      // Reader notification should not block the moderation workflow.
    }
  }

  const reviewMutation = useMutation({
    mutationFn: ({ id, status, reviewNotes }) => updateFanArticleSubmission(id, { status, review_notes: reviewNotes }),
    onSuccess: async (_, vars) => {
      refreshLists()
      toast({
        title: vars.status === 'reviewing' ? 'Proposta presa in carico' : 'Proposta aggiornata',
        variant: 'success',
      })
      if (vars.status === 'reviewing') {
        await notifyReaderInArea(vars.submission, 'reviewing')
      }
    },
    onError: (error) => {
      toast({ title: 'Errore', description: error.message, variant: 'destructive' })
    },
  })

  const rejectMutation = useMutation({
    mutationFn: ({ id, reviewNotes }) => updateFanArticleSubmission(id, { status: 'rejected', review_notes: reviewNotes }),
    onSuccess: async (_, vars) => {
      refreshLists()
      toast({ title: 'Proposta rifiutata', variant: 'success' })
      await notifySubmissionStatus(vars.submission, 'rejected')
      await notifyReaderInArea(vars.submission, 'rejected')
    },
    onError: (error) => toast({ title: 'Errore', description: error.message, variant: 'destructive' }),
  })

  const approveMutation = useMutation({
    mutationFn: async ({ submission, reviewNotes }) => {
      const { article, submission: updatedSubmission } = await approveFanArticleSubmission(submission, { authorId: user?.id || null })
      if (reviewNotes.trim()) {
        await updateFanArticleSubmission(submission.id, { review_notes: reviewNotes })
      }
      return { article, submission: updatedSubmission }
    },
    onSuccess: async ({ article }, vars) => {
      refreshLists()
      toast({
        title: 'Proposta approvata',
        description: `Creato articolo in bozza: ${article.title}`,
        variant: 'success',
      })
      await notifySubmissionStatus(vars.submission, 'approved', article)
      await notifyReaderInArea(vars.submission, 'approved', article)
    },
    onError: (error) => toast({ title: 'Errore in approvazione', description: error.message, variant: 'destructive' }),
  })

  return (
    <div>
      <div className="mb-8 flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <h1 className="font-display text-2xl font-black text-juve-black">Proposte Tifosi</h1>
          <p className="text-sm text-gray-500 mt-1">Moderazione degli articoli inviati da Area Bianconera</p>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
          {FILTERS.map((item) => (
            <button
              key={item.id}
              onClick={() => setFilter(item.id)}
              className={`px-3 py-2 text-xs font-black uppercase tracking-widest border transition-colors ${
                filter === item.id
                  ? 'bg-juve-gold text-black border-juve-gold'
                  : 'border-gray-300 text-gray-500 hover:border-juve-gold hover:text-juve-black'
              }`}
            >
              {item.label}
              <span className="ml-2 text-[10px] opacity-70">{groupedCounts[item.id] ?? 0}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="mb-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Nuove', value: groupedCounts.submitted, icon: Mail, color: '#F59E0B' },
          { label: 'In revisione', value: groupedCounts.reviewing, icon: ShieldAlert, color: '#3B82F6' },
          { label: 'Approvate', value: groupedCounts.approved, icon: CheckCircle2, color: '#10B981' },
          { label: 'Rifiutate', value: groupedCounts.rejected, icon: XCircle, color: '#EF4444' },
        ].map((stat) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white border border-gray-200 p-5"
          >
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-black uppercase tracking-widest text-gray-500">{stat.label}</p>
              <stat.icon className="h-4 w-4" style={{ color: stat.color }} />
            </div>
            <p className="font-display text-3xl font-black text-juve-black">{stat.value}</p>
          </motion.div>
        ))}
      </div>

      {isLoading ? (
        <div className="bg-white border border-gray-200 p-8 text-sm text-gray-500">Caricamento proposte…</div>
      ) : submissions.length === 0 ? (
        <div className="bg-white border border-dashed border-gray-300 p-12 text-center">
          <FilePenLine className="h-10 w-10 text-gray-300 mx-auto mb-3" />
          <p className="font-display text-xl font-bold text-gray-400 mb-2">Nessuna proposta in questa vista</p>
          <p className="text-sm text-gray-500">Quando un tifoso inviera un articolo, lo vedrai comparire qui.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {submissions.map((submission, index) => {
            const plainContent = stripHtml(submission.content || '')
            return (
              <motion.div
                key={submission.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.03 }}
              >
                <Card className="h-full shadow-none">
                  <CardContent className="pt-6">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`px-2.5 py-1 text-[10px] font-black uppercase tracking-widest ${
                            submission.status === 'submitted' ? 'bg-amber-100 text-amber-700'
                              : submission.status === 'reviewing' ? 'bg-blue-100 text-blue-700'
                              : submission.status === 'approved' ? 'bg-green-100 text-green-700'
                              : 'bg-red-100 text-red-700'
                          }`}>
                            {submission.status}
                          </span>
                          {submission.category_slug && (
                            <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
                              {submission.category_slug}
                            </span>
                          )}
                        </div>
                        <h3 className="mt-3 font-display text-2xl font-black leading-tight text-juve-black break-words">
                          {submission.title}
                        </h3>
                      </div>
                    </div>

                    {submission.excerpt && (
                      <p className="mt-3 text-sm text-gray-600 leading-relaxed">{submission.excerpt}</p>
                    )}

                    <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-gray-600">
                      <div className="border border-gray-200 p-3">
                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-1">Autore</p>
                        <p className="font-bold text-juve-black">{submission.author_name}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{submission.author_email}</p>
                      </div>
                      <div className="border border-gray-200 p-3">
                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-1">Inviata</p>
                        <p className="font-bold text-juve-black">{formatDate(submission.submitted_at || submission.created_at)}</p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {readingTime(submission.content)} min, {plainContent.trim().length} caratteri
                        </p>
                      </div>
                    </div>

                    {submission.pitch && (
                      <div className="mt-4 border-l-2 border-juve-gold pl-3">
                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">Idea del pezzo</p>
                        <p className="mt-1 text-sm text-gray-600">{submission.pitch}</p>
                      </div>
                    )}

                    <div className="mt-4 border border-gray-200 bg-gray-50 p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Eye className="h-4 w-4 text-gray-400" />
                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">Anteprima contenuto</p>
                      </div>
                      <p className="text-sm text-gray-600 leading-relaxed">
                        {truncate(plainContent, 320)}
                      </p>
                    </div>

                    <div className="mt-4">
                      <div className="flex items-center gap-2 mb-2">
                        <StickyNote className="h-4 w-4 text-gray-400" />
                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">Note interne redazione</p>
                      </div>
                      <textarea
                        rows={3}
                        value={getReviewNotes(submission)}
                        onChange={(e) => setReviewNotes(submission.id, e.target.value)}
                        placeholder="Annota correzioni, motivi del rifiuto o indicazioni per la revisione."
                        className="w-full border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:border-juve-gold resize-none"
                      />
                    </div>

                    <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                      {submission.status === 'submitted' && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full sm:w-auto"
                          onClick={() => reviewMutation.mutate({
                            id: submission.id,
                            status: 'reviewing',
                            reviewNotes: getReviewNotes(submission),
                            submission,
                          })}
                          disabled={reviewMutation.isPending}
                        >
                          Prendi in revisione
                        </Button>
                      )}

                      {(submission.status === 'submitted' || submission.status === 'reviewing') && (
                        <>
                          <Button
                            variant="gold"
                            size="sm"
                            className="w-full sm:w-auto"
                            onClick={() => approveMutation.mutate({
                              submission,
                              reviewNotes: getReviewNotes(submission),
                            })}
                            disabled={approveMutation.isPending}
                          >
                            Approva e crea bozza
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            className="w-full sm:w-auto"
                            onClick={() => rejectMutation.mutate({
                              id: submission.id,
                              reviewNotes: getReviewNotes(submission),
                              submission,
                            })}
                            disabled={rejectMutation.isPending}
                          >
                            Rifiuta
                          </Button>
                        </>
                      )}

                      {submission.linked_article_id && (
                        <span className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-green-700">
                          Articolo creato
                        </span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )
          })}
        </div>
      )}

      <Toaster toasts={toasts} dismiss={dismiss} />
    </div>
  )
}
