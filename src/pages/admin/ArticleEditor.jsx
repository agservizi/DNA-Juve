import { useState, useEffect, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Save, Eye, ArrowLeft, Loader2, Star, Globe, FileText, Calendar } from 'lucide-react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  getArticleById, createArticle, updateArticle,
  getCategories, getArticleTags, upsertArticleTags, checkArticleSeoSupport, sendArticlePushNotification, getArticlePoll, upsertArticlePoll,
} from '@/lib/supabase'
import { slugify, stripHtml } from '@/lib/utils'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/hooks/useToast'
import RichEditor from '@/components/admin/RichEditor'
import ImageUpload from '@/components/admin/ImageUpload'
import TagInput from '@/components/admin/TagInput'
import ArticlePreviewModal from '@/components/admin/ArticlePreviewModal'

const schema = z.object({
  title: z.string().min(3, 'Titolo troppo breve'),
  slug: z.string().min(3, 'Slug non valido').regex(/^[a-z0-9-]+$/, 'Solo lettere minuscole, numeri e trattini'),
  excerpt: z.string().max(300, 'Max 300 caratteri').optional(),
  category_id: z.string().optional(),
  status: z.enum(['draft', 'published']),
  featured: z.boolean(),
  cover_image: z.string().optional(),
  meta_title: z.string().max(70, 'Max 70 caratteri').optional(),
  meta_description: z.string().max(170, 'Max 170 caratteri').optional(),
  canonical_url: z.string().optional(),
  og_image: z.string().optional(),
  noindex: z.boolean(),
  scheduled_at: z.string().optional(),
})

const SITE_URL = (import.meta.env.VITE_SITE_URL || 'https://bianconerihub.com').replace(/\/+$/, '')
const ARTICLE_DRAFT_STORAGE_PREFIX = 'admin-article-draft'

function getArticleDraftStorageKey(articleId) {
  return `${ARTICLE_DRAFT_STORAGE_PREFIX}:${articleId || 'new'}`
}

function buildSeoHints({ title, excerpt, content, categoryName, coverImage, metaTitle, metaDescription, canonicalUrl, ogImage, noindex }) {
  const plainContent = stripHtml(content || '').replace(/\s+/g, ' ').trim()
  const suggestedTitle = metaTitle?.trim() || title?.trim() || ''
  const suggestedDescription = metaDescription?.trim() || excerpt?.trim() || plainContent.slice(0, 155)
  const suggestedOgImage = ogImage?.trim() || coverImage?.trim() || ''
  const suggestedCanonical = canonicalUrl?.trim() || ''

  let score = 0
  if (suggestedTitle.length >= 35 && suggestedTitle.length <= 60) score += 30
  else if (suggestedTitle.length >= 25) score += 18
  else if (suggestedTitle.length > 0) score += 8

  if (suggestedDescription.length >= 120 && suggestedDescription.length <= 160) score += 30
  else if (suggestedDescription.length >= 80) score += 18
  else if (suggestedDescription.length > 0) score += 8

  if (title?.trim() && slugify(title) !== '') score += 10
  if (categoryName) score += 10
  if (suggestedOgImage) score += 10
  if (plainContent.length >= 600) score += 10

  const issues = []
  if (!title?.trim()) issues.push('Titolo assente.')
  if (suggestedTitle.length < 35 || suggestedTitle.length > 60) issues.push('Meta title da tenere idealmente tra 35 e 60 caratteri.')
  if (suggestedDescription.length < 120 || suggestedDescription.length > 160) issues.push('Meta description da tenere idealmente tra 120 e 160 caratteri.')
  if (!categoryName) issues.push('Categoria mancante.')
  if (!suggestedOgImage) issues.push('Immagine social/OG mancante.')
  if (plainContent.length < 600) issues.push('Contenuto un po\' corto per un articolo SEO forte.')
  if (suggestedCanonical && !/^https?:\/\//i.test(suggestedCanonical)) issues.push('Canonical da inserire come URL assoluto.')
  if (noindex) issues.push('Noindex attivo: la pagina non sara spinta sui motori di ricerca.')

  return {
    score,
    label: score >= 80 ? 'SEO forte' : score >= 55 ? 'Buona base SEO' : 'Da migliorare',
    suggestedTitle,
    suggestedDescription,
    suggestedCanonical,
    suggestedOgImage,
    issues,
  }
}

export default function ArticleEditor() {
  const { id } = useParams()
  const isEdit = !!id
  const navigate = useNavigate()
  const { user, profile } = useAuth()
  const { toast } = useToast()
  const qc = useQueryClient()
  const [content, setContent] = useState('')
  const [tags, setTags] = useState([])
  const [previewOpen, setPreviewOpen] = useState(false)
  const [showSchedule, setShowSchedule] = useState(false)
  const [pollQuestion, setPollQuestion] = useState('')
  const [pollOptions, setPollOptions] = useState(['', ''])
  const [pollEnabled, setPollEnabled] = useState(false)
  const [draftSaving, setDraftSaving] = useState(false)
  const [lastDraftSavedAt, setLastDraftSavedAt] = useState(null)
  const draftHydratedRef = useRef(false)
  const draftStorageKey = getArticleDraftStorageKey(id)

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => { const { data } = await getCategories(); return data || [] },
  })

  const { data: existing, isLoading: loadingArticle } = useQuery({
    queryKey: ['article-edit', id],
    queryFn: async () => { const { data } = await getArticleById(id); return data },
    enabled: isEdit,
  })

  const { data: existingTags = [] } = useQuery({
    queryKey: ['article-tags-edit', id],
    queryFn: () => getArticleTags(id),
    enabled: isEdit,
  })
  const { data: existingPoll = null } = useQuery({
    queryKey: ['article-poll-edit', id],
    queryFn: async () => {
      const { data, error } = await getArticlePoll(id)
      if (error) throw error
      return data
    },
    enabled: isEdit,
  })
  const { data: seoColumnsSupported = false } = useQuery({
    queryKey: ['article-seo-columns-support'],
    queryFn: checkArticleSeoSupport,
    staleTime: 60 * 60 * 1000,
  })

  const {
    register, control, handleSubmit, watch, setValue, reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      title: '',
      slug: '',
      excerpt: '',
      category_id: '',
      status: 'draft',
      featured: false,
      cover_image: '',
      meta_title: '',
      meta_description: '',
      canonical_url: '',
      og_image: '',
      noindex: false,
      scheduled_at: '',
    },
  })
  const formValues = watch()

  useEffect(() => {
    draftHydratedRef.current = false

    if (isEdit) return

    reset({
      title: '',
      slug: '',
      excerpt: '',
      category_id: '',
      status: 'draft',
      featured: false,
      cover_image: '',
      meta_title: '',
      meta_description: '',
      canonical_url: '',
      og_image: '',
      noindex: false,
      scheduled_at: '',
    })
    setContent('')
    setTags([])
    setShowSchedule(false)
    setPollQuestion('')
    setPollOptions(['', ''])
    setPollEnabled(false)
    setLastDraftSavedAt(null)
  }, [id, isEdit, reset])

  useEffect(() => {
    if (existing) {
      setValue('title', existing.title)
      setValue('slug', existing.slug)
      setValue('excerpt', existing.excerpt || '')
      setValue('category_id', existing.category_id || '')
      setValue('status', existing.status)
      setValue('featured', existing.featured || false)
      setValue('cover_image', existing.cover_image || '')
      setValue('meta_title', existing.meta_title || '')
      setValue('meta_description', existing.meta_description || '')
      setValue('canonical_url', existing.canonical_url || '')
      setValue('og_image', existing.og_image || '')
      setValue('noindex', existing.noindex || false)
      if (existing.scheduled_at) {
        setValue('scheduled_at', existing.scheduled_at.slice(0, 16))
        setShowSchedule(true)
      }
      setContent(existing.content || '')
    } else if (isEdit) {
      reset({
        title: '',
        slug: '',
        excerpt: '',
        category_id: '',
        status: 'draft',
        featured: false,
        cover_image: '',
        meta_title: '',
        meta_description: '',
        canonical_url: '',
        og_image: '',
        noindex: false,
        scheduled_at: '',
      })
      setContent('')
    }
  }, [existing, isEdit, reset, setValue])

  useEffect(() => {
    if (existingTags.length) setTags(existingTags)
    else if (isEdit) setTags([])
  }, [existingTags, isEdit])

  useEffect(() => {
    if (!existingPoll) {
      if (isEdit) {
        setPollQuestion('')
        setPollOptions(['', ''])
        setPollEnabled(false)
      }
      return
    }
    setPollQuestion(existingPoll.question || '')
    setPollOptions(existingPoll.options?.map((option) => option.label) || ['', ''])
    setPollEnabled(Boolean(existingPoll.is_active))
  }, [existingPoll, isEdit])

  useEffect(() => {
    if (draftHydratedRef.current) return
    if (isEdit && loadingArticle) return

    draftHydratedRef.current = true

    if (typeof window === 'undefined') return

    try {
      const raw = window.localStorage.getItem(draftStorageKey)
      if (!raw) return

      const draft = JSON.parse(raw)
      if (!draft || typeof draft !== 'object') return

      const values = draft.values || {}
      Object.entries(values).forEach(([field, value]) => {
        setValue(field, value)
      })

      if (typeof draft.content === 'string') setContent(draft.content)
      if (Array.isArray(draft.tags)) setTags(draft.tags)
      if (typeof draft.showSchedule === 'boolean') setShowSchedule(draft.showSchedule)
      if (typeof draft.pollQuestion === 'string') setPollQuestion(draft.pollQuestion)
      if (Array.isArray(draft.pollOptions) && draft.pollOptions.length) setPollOptions(draft.pollOptions)
      if (typeof draft.pollEnabled === 'boolean') setPollEnabled(draft.pollEnabled)
      if (draft.savedAt) setLastDraftSavedAt(draft.savedAt)

      toast({
        title: 'Bozza recuperata',
        description: 'Abbiamo ripristinato il testo non ancora salvato dell’editor.',
        variant: 'success',
      })
    } catch {
      // Ignore malformed local drafts and continue with server data/defaults.
    }
  }, [draftStorageKey, isEdit, loadingArticle, setValue, toast])

  useEffect(() => {
    if (!draftHydratedRef.current || typeof window === 'undefined') return

    const draftPayload = {
      savedAt: new Date().toISOString(),
      values: formValues,
      content,
      tags,
      showSchedule,
      pollQuestion,
      pollOptions,
      pollEnabled,
    }

    const timeoutId = window.setTimeout(() => {
      setDraftSaving(true)
      try {
        window.localStorage.setItem(draftStorageKey, JSON.stringify(draftPayload))
        setLastDraftSavedAt(draftPayload.savedAt)
      } catch {
        // Ignore localStorage quota errors silently.
      } finally {
        setDraftSaving(false)
      }
    }, 250)

    return () => window.clearTimeout(timeoutId)
  }, [draftStorageKey, formValues, content, tags, showSchedule, pollQuestion, pollOptions, pollEnabled])

  useEffect(() => {
    if (typeof document === 'undefined' || typeof window === 'undefined') return

    const persistDraftNow = () => {
      if (document.visibilityState !== 'hidden') return

      try {
        const draftPayload = {
          savedAt: new Date().toISOString(),
          values: formValues,
          content,
          tags,
          showSchedule,
          pollQuestion,
          pollOptions,
          pollEnabled,
        }
        window.localStorage.setItem(draftStorageKey, JSON.stringify(draftPayload))
        setLastDraftSavedAt(draftPayload.savedAt)
      } catch {
        // Ignore localStorage quota errors silently.
      }
    }

    document.addEventListener('visibilitychange', persistDraftNow)
    return () => document.removeEventListener('visibilitychange', persistDraftNow)
  }, [draftStorageKey, formValues, content, tags, showSchedule, pollQuestion, pollOptions, pollEnabled])

  const titleValue = watch('title')
  const slugValue = watch('slug')
  useEffect(() => {
    if (!isEdit && titleValue && !slugValue) setValue('slug', slugify(titleValue))
  }, [titleValue, isEdit])

  const saveMutation = useMutation({
    mutationFn: async ({ formData, status }) => {
      const payload = {
        ...formData,
        status,
        content,
        author_id: user?.id,
        updated_at: new Date().toISOString(),
        published_at: status === 'published' ? (existing?.published_at || new Date().toISOString()) : null,
        scheduled_at: showSchedule && formData.scheduled_at ? new Date(formData.scheduled_at).toISOString() : null,
      }
      if (!seoColumnsSupported) {
        delete payload.meta_title
        delete payload.meta_description
        delete payload.canonical_url
        delete payload.og_image
        delete payload.noindex
      }
      let articleResult
      if (isEdit) {
        articleResult = await updateArticle(id, payload)
      } else {
        articleResult = await createArticle(payload)
      }
      if (articleResult.error) throw articleResult.error
      const articleId = articleResult.data?.id || id
      if (articleId && tags.length >= 0) {
        await upsertArticleTags(articleId, tags)
      }
      if (articleId) {
        await upsertArticlePoll(articleId, {
          question: pollQuestion,
          options: pollOptions,
          is_active: pollEnabled,
        })
      }
      return articleResult
    },
    onSuccess: (result, { status }) => {
      if (typeof window !== 'undefined') {
        try {
          window.localStorage.removeItem(draftStorageKey)
          setLastDraftSavedAt(null)
        } catch {
          // Ignore storage cleanup failures.
        }
      }

      qc.invalidateQueries(['all-articles'])
      qc.invalidateQueries(['dashboard-stats'])
      qc.invalidateQueries(['article-tags-edit', id])

      const shouldSendPush =
        status === 'published' &&
        result?.data?.slug &&
        (!isEdit || existing?.status !== 'published')

      if (shouldSendPush) {
        const category = categories.find((item) => item.id === result.data.category_id)
        sendArticlePushNotification({
          article: {
            title: result.data.title,
            slug: result.data.slug,
            excerpt: result.data.excerpt,
            categoryId: result.data.category_id,
            categoryName: category?.name || null,
            authorId: result.data.author_id || user?.id || null,
            authorName: profile?.username || null,
          },
        }).catch(() => {
          // Publishing should succeed even if push delivery fails.
        })
      }

      toast({
        title: isEdit ? 'Articolo aggiornato!' : 'Articolo creato!',
        description: status === 'published' ? 'Visibile sul sito.' : showSchedule ? 'Pubblicazione programmata.' : 'Salvato come bozza.',
        variant: 'success',
      })
      if (!isEdit && result.data?.id) navigate(`/admin/articoli/${result.data.id}/modifica`)
    },
    onError: (err) => toast({ title: 'Errore', description: err.message, variant: 'destructive' }),
  })

  const onSubmit = (formData, status) => {
    if (status === 'published') {
      const plainContent = stripHtml(content || '').replace(/\s+/g, ' ').trim()
      const excerpt = (formData.excerpt || '').trim()

      if (!formData.category_id) {
        toast({
          title: 'Categoria obbligatoria',
          description: 'Seleziona una categoria prima di pubblicare.',
          variant: 'destructive',
        })
        return
      }

      if (plainContent.length < 120) {
        toast({
          title: 'Contenuto insufficiente',
          description: 'Per pubblicare serve un articolo con almeno 120 caratteri reali di contenuto.',
          variant: 'destructive',
        })
        return
      }

      if (excerpt.length < 20) {
        toast({
          title: 'Occhiello troppo breve',
          description: "Aggiungi un sommario piu chiaro prima di pubblicare l'articolo.",
          variant: 'destructive',
        })
        return
      }
    }

    saveMutation.mutate({ formData, status })
  }

  if (loadingArticle) return (
    <div className="flex items-center justify-center py-24">
      <Loader2 className="h-8 w-8 animate-spin text-juve-gold" />
    </div>
  )

  const coverImage = watch('cover_image')
  const currentStatus = watch('status')
  const selectedCategoryId = watch('category_id')
  const metaTitle = watch('meta_title')
  const metaDescription = watch('meta_description')
  const canonicalUrl = watch('canonical_url')
  const ogImage = watch('og_image')
  const noindex = watch('noindex')
  const selectedCategory = categories.find(c => c.id === selectedCategoryId)
  const draftStatusLabel = draftSaving
    ? 'Salvataggio bozza...'
    : lastDraftSavedAt
      ? `Bozza salvata alle ${new Date(lastDraftSavedAt).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}`
      : 'Bozza locale attiva'
  const seoHints = buildSeoHints({
    title: titleValue,
    excerpt: watch('excerpt'),
    content,
    categoryName: selectedCategory?.name,
    coverImage,
    metaTitle,
    metaDescription,
    canonicalUrl,
    ogImage,
    noindex,
  })

  const updatePollOption = (index, value) => {
    setPollOptions((prev) => prev.map((option, currentIndex) => (currentIndex === index ? value : option)))
  }

  const addPollOption = () => {
    if (pollOptions.length >= 5) return
    setPollOptions((prev) => [...prev, ''])
  }

  const removePollOption = (index) => {
    if (pollOptions.length <= 2) return
    setPollOptions((prev) => prev.filter((_, currentIndex) => currentIndex !== index))
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/admin/articoli')} className="p-2 hover:bg-gray-100 transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="font-display text-2xl font-black">
              {isEdit ? 'Modifica Articolo' : 'Nuovo Articolo'}
            </h1>
            <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1.5">
              <span className={`inline-block w-2 h-2 rounded-full ${currentStatus === 'published' ? 'bg-green-500' : 'bg-amber-400'}`} />
              {currentStatus === 'published' ? 'Pubblicato' : showSchedule ? 'Programmato' : 'Bozza'}
            </p>
            <p className="text-[11px] text-gray-400 mt-1">
              {draftStatusLabel}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => setPreviewOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 border border-gray-300 text-sm font-medium hover:border-juve-black transition-colors"
          >
            <Eye className="h-4 w-4" />
            Anteprima
          </button>
          {isEdit && existing?.status === 'published' && (
            <a href={`/articolo/${existing.slug}`} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-4 py-2 border border-gray-300 text-sm font-medium hover:border-juve-black transition-colors">
              <Globe className="h-4 w-4" />
              Visualizza
            </a>
          )}
          <button type="button" onClick={handleSubmit(d => onSubmit(d, 'draft'))} disabled={saveMutation.isPending}
            className="flex items-center gap-1.5 px-4 py-2 border-2 border-juve-black text-sm font-bold hover:bg-juve-black hover:text-white transition-colors disabled:opacity-60">
            <FileText className="h-4 w-4" />
            Bozza
          </button>
          <button type="button" onClick={handleSubmit(d => onSubmit(d, 'published'))} disabled={saveMutation.isPending}
            className="flex items-center gap-2 px-5 py-2 bg-juve-gold text-black text-sm font-black uppercase tracking-wider hover:bg-juve-gold-dark transition-colors disabled:opacity-60">
            {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Globe className="h-4 w-4" />}
            Pubblica
          </button>
        </div>
      </div>

      <form className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        {/* Editor */}
        <div className="xl:col-span-8 space-y-5">
          <div>
            <input
              {...register('title')}
              placeholder="Titolo dell'articolo..."
              className={`w-full font-display text-3xl font-black border-0 border-b-2 border-gray-200 px-0 py-3 focus:outline-none focus:border-juve-gold placeholder-gray-300 bg-transparent ${errors.title ? 'border-red-400' : ''}`}
            />
            {errors.title && <p className="text-xs text-red-500 mt-1">{errors.title.message}</p>}
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">Sommario / Occhiello</label>
            <textarea {...register('excerpt')} rows={2} placeholder="Breve introduzione (max 300 caratteri)..."
              className="w-full border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:border-juve-black resize-none" />
            {errors.excerpt && <p className="text-xs text-red-500 mt-1">{errors.excerpt.message}</p>}
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">Contenuto</label>
            <RichEditor content={content} onChange={setContent} />
          </div>
        </div>

        {/* Sidebar settings */}
        <div className="xl:col-span-4 space-y-5">
          {/* Cover image */}
          <div className="bg-white border border-gray-200 p-5">
            <h3 className="text-xs font-black uppercase tracking-wider mb-3">Copertina</h3>
            <Controller name="cover_image" control={control}
              render={({ field }) => <ImageUpload value={field.value} onChange={field.onChange} />} />
          </div>

          {/* Settings */}
          <div className="bg-white border border-gray-200 p-5 space-y-4">
            <h3 className="text-xs font-black uppercase tracking-wider">Impostazioni</h3>

            {/* Slug */}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Slug URL</label>
              <div className="flex">
                <span className="bg-gray-100 border border-r-0 border-gray-300 px-2 py-2 text-xs text-gray-400 whitespace-nowrap">/articolo/</span>
                <input {...register('slug')} className="flex-1 border border-gray-300 px-2 py-2 text-xs focus:outline-none focus:border-juve-black" />
              </div>
              {errors.slug && <p className="text-xs text-red-500 mt-1">{errors.slug.message}</p>}
            </div>

            {/* Category */}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Categoria</label>
              <select {...register('category_id')}
                className="w-full border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:border-juve-black appearance-none">
                <option value="">— Nessuna categoria —</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>

            {/* Featured toggle */}
            <div className="flex items-center justify-between py-2 border-t border-gray-100">
              <div className="flex items-center gap-2">
                <Star className="h-4 w-4 text-juve-gold" />
                <span className="text-sm font-medium">In evidenza</span>
              </div>
              <Controller name="featured" control={control}
                render={({ field }) => (
                  <button type="button" onClick={() => field.onChange(!field.value)}
                    className={`relative w-10 h-5 transition-colors ${field.value ? 'bg-juve-gold' : 'bg-gray-300'}`}>
                    <span className={`absolute top-0.5 w-4 h-4 bg-white transition-transform ${field.value ? 'translate-x-5' : 'translate-x-0.5'}`} />
                  </button>
                )} />
            </div>

            {/* Scheduled publish */}
            <div className="py-2 border-t border-gray-100">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-gray-500" />
                  <span className="text-sm font-medium">Programma</span>
                </div>
                <button type="button" onClick={() => setShowSchedule(!showSchedule)}
                  className={`relative w-10 h-5 transition-colors ${showSchedule ? 'bg-juve-gold' : 'bg-gray-300'}`}>
                  <span className={`absolute top-0.5 w-4 h-4 bg-white transition-transform ${showSchedule ? 'translate-x-5' : 'translate-x-0.5'}`} />
                </button>
              </div>
              {showSchedule && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}>
                  <input type="datetime-local" {...register('scheduled_at')}
                    className="w-full border border-gray-300 px-2 py-1.5 text-xs focus:outline-none focus:border-juve-black" />
                  <p className="text-xs text-gray-400 mt-1">L'articolo sarà pubblicato in automatico alla data indicata</p>
                </motion.div>
              )}
            </div>
          </div>

          <div className="bg-white border border-gray-200 p-5 space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h3 className="text-xs font-black uppercase tracking-wider">Sondaggio articolo</h3>
                <p className="mt-1 text-xs text-gray-500">Coinvolgi i lettori con una domanda editoriale legata al pezzo.</p>
              </div>
              <button
                type="button"
                onClick={() => setPollEnabled(!pollEnabled)}
                className={`relative w-10 h-5 transition-colors ${pollEnabled ? 'bg-juve-gold' : 'bg-gray-300'}`}
              >
                <span className={`absolute top-0.5 w-4 h-4 bg-white transition-transform ${pollEnabled ? 'translate-x-5' : 'translate-x-0.5'}`} />
              </button>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Domanda</label>
              <input
                value={pollQuestion}
                onChange={(event) => setPollQuestion(event.target.value)}
                placeholder="Es. Bernardo Silva sarebbe il colpo giusto per la Juve?"
                className="w-full border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:border-juve-black"
              />
            </div>

            <div className="space-y-2">
              <p className="text-xs font-medium text-gray-500">Opzioni</p>
              {pollOptions.map((option, index) => (
                <div key={`poll-option-${index}`} className="flex items-center gap-2">
                  <input
                    value={option}
                    onChange={(event) => updatePollOption(index, event.target.value)}
                    placeholder={`Opzione ${index + 1}`}
                    className="w-full border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:border-juve-black"
                  />
                  {pollOptions.length > 2 && (
                    <button
                      type="button"
                      onClick={() => removePollOption(index)}
                      className="px-2 py-2 text-xs font-bold text-gray-500 hover:text-red-600"
                    >
                      Rimuovi
                    </button>
                  )}
                </div>
              ))}
              {pollOptions.length < 5 && (
                <button
                  type="button"
                  onClick={addPollOption}
                  className="text-xs font-bold uppercase tracking-wider text-juve-gold hover:underline"
                >
                  Aggiungi opzione
                </button>
              )}
            </div>

            <p className="text-[11px] text-gray-400">
              Il sondaggio viene pubblicato se inserisci una domanda e almeno 2 opzioni valide. Se lasci vuoto, verrà rimosso.
            </p>
          </div>

          <div className="bg-white border border-gray-200 p-5 space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-xs font-black uppercase tracking-wider">SEO</h3>
                <p className="mt-1 text-xs text-gray-500">Titolo, descrizione e segnali social del singolo articolo.</p>
              </div>
              <div className="text-right">
                <p className="font-display text-2xl font-black text-juve-black">{seoHints.score}/100</p>
                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500">{seoHints.label}</p>
              </div>
            </div>

            {!seoColumnsSupported && (
              <div className="rounded-sm border border-amber-200 bg-amber-50 px-3 py-2">
                <p className="text-xs text-amber-800">
                  I campi SEO sono pronti lato UI, ma il database remoto non risulta ancora aggiornato.
                  Finche lo schema non viene allineato, i suggerimenti SEO restano visibili ma non vengono salvati.
                </p>
              </div>
            )}

            <div className="rounded-sm border border-gray-200 bg-gray-50 p-3">
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Anteprima SERP</p>
              <p className="mt-2 text-base font-medium text-blue-700 line-clamp-2">
                {seoHints.suggestedTitle || 'Titolo SEO dell\'articolo'}
              </p>
              <p className="mt-1 text-xs text-green-700 break-all">
                {seoHints.suggestedCanonical || `${SITE_URL}/articolo/${slugValue || 'slug-articolo'}`}
              </p>
              <p className="mt-2 text-sm text-gray-600 line-clamp-3">
                {seoHints.suggestedDescription || 'La descrizione comparira qui appena aggiungi occhiello o meta description.'}
              </p>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Meta title</label>
              <input
                {...register('meta_title')}
                placeholder="Lascia vuoto per usare il titolo articolo"
                className="w-full border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:border-juve-black"
              />
              <p className="mt-1 text-[11px] text-gray-400">{(metaTitle || titleValue || '').length}/60 consigliati</p>
              {errors.meta_title && <p className="text-xs text-red-500 mt-1">{errors.meta_title.message}</p>}
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Meta description</label>
              <textarea
                {...register('meta_description')}
                rows={3}
                placeholder="Lascia vuoto per usare occhiello o estratto automatico"
                className="w-full border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:border-juve-black resize-none"
              />
              <p className="mt-1 text-[11px] text-gray-400">{(metaDescription || watch('excerpt') || '').length}/160 consigliati</p>
              {errors.meta_description && <p className="text-xs text-red-500 mt-1">{errors.meta_description.message}</p>}
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Canonical URL</label>
              <input
                {...register('canonical_url')}
                placeholder="https://bianconerihub.com/articolo/slug o URL canonica esterna"
                className="w-full border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:border-juve-black"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Immagine OG social</label>
              <input
                {...register('og_image')}
                placeholder="Lascia vuoto per usare la cover"
                className="w-full border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:border-juve-black"
              />
            </div>

            <div className="flex items-center justify-between py-2 border-t border-gray-100">
              <div>
                <p className="text-sm font-medium">Noindex</p>
                <p className="text-[11px] text-gray-400">Utile solo per contenuti che non vuoi indicizzare.</p>
              </div>
              <Controller
                name="noindex"
                control={control}
                render={({ field }) => (
                  <button
                    type="button"
                    onClick={() => field.onChange(!field.value)}
                    className={`relative w-10 h-5 transition-colors ${field.value ? 'bg-red-500' : 'bg-gray-300'}`}
                  >
                    <span className={`absolute top-0.5 w-4 h-4 bg-white transition-transform ${field.value ? 'translate-x-5' : 'translate-x-0.5'}`} />
                  </button>
                )}
              />
            </div>

            <div className="rounded-sm border border-gray-100 bg-gray-50 p-3">
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Check rapido</p>
              <div className="mt-2 space-y-1.5">
                {seoHints.issues.length ? (
                  seoHints.issues.map((issue) => (
                    <p key={issue} className="text-xs text-gray-600">• {issue}</p>
                  ))
                ) : (
                  <p className="text-xs text-gray-600">• Ottima base: i segnali principali sono tutti coperti.</p>
                )}
              </div>
            </div>
          </div>

          {/* Tags */}
          <div className="bg-white border border-gray-200 p-5">
            <h3 className="text-xs font-black uppercase tracking-wider mb-3">Tag</h3>
            <TagInput tags={tags} onChange={setTags} />
            <p className="text-xs text-gray-400 mt-2">Premi Invio o virgola per aggiungere un tag</p>
          </div>

          {/* Card preview */}
          {coverImage && (
            <div className="bg-white border border-gray-200 p-5">
              <h3 className="text-xs font-black uppercase tracking-wider mb-3">Anteprima card</h3>
              <div className="border border-gray-100">
                <div className="aspect-[16/9] overflow-hidden">
                  <img src={coverImage} alt="" className="w-full h-full object-cover" />
                </div>
                <div className="p-3">
                  {selectedCategory && (
                    <span className="text-[10px] font-black uppercase tracking-wider" style={{ color: selectedCategory.color }}>
                      {selectedCategory.name}
                    </span>
                  )}
                  <p className="font-display text-sm font-bold line-clamp-2 mt-0.5">
                    {watch('title') || 'Titolo articolo…'}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </form>

      {/* Preview modal */}
      <ArticlePreviewModal
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        article={{
          title: watch('title'),
          excerpt: watch('excerpt'),
          cover_image: watch('cover_image'),
          content,
          categoryName: selectedCategory?.name,
          categoryColor: selectedCategory?.color,
        }}
      />
    </div>
  )
}
