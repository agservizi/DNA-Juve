import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { Save, Eye, ArrowLeft, Loader2, Star, Globe, FileText, Calendar, Copy, Link2, StickyNote, Image as ImageIcon, Users, Sparkles, History, Search, X, Plus, Trash2, ExternalLink, Clock, ChevronDown, Film } from 'lucide-react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  getArticleById, createArticle, updateArticle,
  getCategories, getArticleTags, upsertArticleTags, checkArticleSeoSupport, checkArticleExtraColumnsSupport,
  sendArticlePushNotification, getArticlePoll, upsertArticlePoll,
  duplicateArticle, searchArticlesForRelated, getProfiles,
  getArticleRevisions, getArticleRevisionById, createArticleRevision,
  getVideos,
} from '@/lib/supabase'
import { slugify, stripHtml, readingTime } from '@/lib/utils'
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
  source_url: z.string().optional(),
  internal_notes: z.string().optional(),
})

const SITE_URL = (import.meta.env.VITE_SITE_URL || 'https://bianconerihub.com').replace(/\/+$/, '')
const ARTICLE_DRAFT_STORAGE_PREFIX = 'admin-article-draft'
const EMPTY_ARRAY = []
const PRIMARY_ADMIN_EMAIL = 'admin@bianconerihub.com'

function getTimestamp(value) {
  if (!value) return 0
  const parsed = Date.parse(value)
  return Number.isNaN(parsed) ? 0 : parsed
}

function normalizeDraftValue(value) {
  if (typeof value === 'string') return value.trim()
  if (typeof value === 'boolean' || typeof value === 'number') return String(value)
  return value == null ? '' : JSON.stringify(value)
}

function hasMeaningfulDraftChanges(draft, existing) {
  if (!draft || !existing) return false

  const draftContent = typeof draft.content === 'string' ? draft.content.trim() : ''
  const existingContent = typeof existing.content === 'string' ? existing.content.trim() : ''
  if (draftContent && draftContent !== existingContent) return true

  const draftValues = draft.values || {}
  const comparableFields = [
    'title',
    'slug',
    'excerpt',
    'category_id',
    'status',
    'featured',
    'cover_image',
    'meta_title',
    'meta_description',
    'canonical_url',
    'og_image',
    'noindex',
    'scheduled_at',
    'source_url',
    'internal_notes',
  ]

  return comparableFields.some((field) => normalizeDraftValue(draftValues[field]) !== normalizeDraftValue(existing[field]))
}

function getArticleDraftStorageKey(articleId) {
  return `${ARTICLE_DRAFT_STORAGE_PREFIX}:${articleId || 'new'}`
}

function SidebarAccordion({ id, title, icon, badge, openSections, toggleSection, children }) {
  const isOpen = openSections.has(id)
  return (
    <div className="bg-white border border-gray-200">
      <button
        type="button"
        onClick={() => toggleSection(id)}
        className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-gray-50 transition-colors"
      >
        <h3 className="text-xs font-black uppercase tracking-wider flex items-center gap-1.5">
          {icon}
          {title}
          {badge != null && <span className="ml-1 text-[10px] font-bold text-gray-400">({badge})</span>}
        </h3>
        <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5 pt-0 space-y-4">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
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
  const [editorBootstrapped, setEditorBootstrapped] = useState(false)
  const draftHydratedRef = useRef(false)
  const draftStorageKey = getArticleDraftStorageKey(id)

  // New feature states
  const [gallery, setGallery] = useState([])
  const [relatedArticleIds, setRelatedArticleIds] = useState([])
  const [coAuthorIds, setCoAuthorIds] = useState([])
  const [relatedSearch, setRelatedSearch] = useState('')
  const [relatedResults, setRelatedResults] = useState([])
  const [relatedSearching, setRelatedSearching] = useState(false)
  const [galleryInput, setGalleryInput] = useState('')
  const [showRevisions, setShowRevisions] = useState(false)
  const [importUrl, setImportUrl] = useState('')
  const [importLoading, setImportLoading] = useState(false)
  const [videoPickerOpen, setVideoPickerOpen] = useState(false)
  const [videoSearch, setVideoSearch] = useState('')
  const [openSections, setOpenSections] = useState(() => new Set(['cover', 'settings']))
  const toggleSection = useCallback((key) => {
    setOpenSections(prev => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })
  }, [])

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => { const { data } = await getCategories(); return data || [] },
  })

  const { data: existing, isLoading: loadingArticle } = useQuery({
    queryKey: ['article-edit', id],
    queryFn: async () => { const { data } = await getArticleById(id); return data },
    enabled: isEdit,
  })

  const { data: existingTags = EMPTY_ARRAY } = useQuery({
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
  const { data: extraColumnsSupported = false } = useQuery({
    queryKey: ['article-extra-columns-support'],
    queryFn: checkArticleExtraColumnsSupport,
    staleTime: 60 * 60 * 1000,
  })
  const { data: revisions = [] } = useQuery({
    queryKey: ['article-revisions', id],
    queryFn: async () => {
      const { data } = await getArticleRevisions(id)
      return data || []
    },
    enabled: isEdit,
  })
  const { data: allProfiles = [] } = useQuery({
    queryKey: ['all-profiles'],
    queryFn: async () => {
      const { data } = await getProfiles()
      return data || []
    },
  })

  const { data: libraryVideos = [] } = useQuery({
    queryKey: ['library-videos-picker'],
    queryFn: async () => {
      const { data } = await getVideos({ limit: 100 })
      return data || []
    },
  })

  const filteredVideos = useMemo(() => {
    if (!videoSearch.trim()) return libraryVideos
    const q = videoSearch.toLowerCase()
    return libraryVideos.filter(v => v.title?.toLowerCase().includes(q))
  }, [libraryVideos, videoSearch])

  const insertVideoInContent = useCallback((video) => {
    const thumbnail = video.thumbnail || (video.platform === 'youtube' && video.video_id
      ? `https://img.youtube.com/vi/${video.video_id}/hqdefault.jpg` : '')
    const embedHtml = `<div data-video-id="${video.id}" data-video-title="${(video.title || '').replace(/"/g, '&quot;')}" data-video-platform="${video.platform || 'custom'}" data-video-videoid="${video.video_id || ''}" data-video-thumbnail="${thumbnail}" data-video-url="${video.video_url || ''}"><img src="${thumbnail}" alt="${(video.title || '').replace(/"/g, '&quot;')}" style="width:100%;aspect-ratio:16/9;object-fit:cover;" /><p style="text-align:center;font-size:14px;font-weight:bold;margin-top:8px;">▶ ${video.title}</p></div>`
    setContent(prev => prev + '\n' + embedHtml + '\n')
    setVideoPickerOpen(false)
    setVideoSearch('')
    toast({ title: 'Video inserito', description: `"${video.title}" aggiunto nel contenuto.`, variant: 'success' })
  }, [toast])

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
      source_url: '',
      internal_notes: '',
    },
  })
  const formValues = watch()

  // Word count and reading time (memoized)
  const wordStats = useMemo(() => {
    const plain = stripHtml(content || '').replace(/\s+/g, ' ').trim()
    const words = plain ? plain.split(/\s+/).length : 0
    const time = readingTime(content)
    const chars = plain.length
    return { words, time, chars }
  }, [content])

  useEffect(() => {
    draftHydratedRef.current = false
    setEditorBootstrapped(false)

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
      source_url: '',
      internal_notes: '',
    })
    setContent('')
    setTags([])
    setShowSchedule(false)
    setPollQuestion('')
    setPollOptions(['', ''])
    setPollEnabled(false)
    setLastDraftSavedAt(null)
    setGallery([])
    setRelatedArticleIds([])
    setCoAuthorIds([])
    setEditorBootstrapped(true)
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
      setValue('source_url', existing.source_url || '')
      setValue('internal_notes', existing.internal_notes || '')
      if (existing.scheduled_at) {
        setValue('scheduled_at', existing.scheduled_at.slice(0, 16))
        setShowSchedule(true)
      }
      setContent(existing.content || '')
      if (Array.isArray(existing.gallery)) setGallery(existing.gallery)
      if (Array.isArray(existing.related_article_ids)) setRelatedArticleIds(existing.related_article_ids)
      if (Array.isArray(existing.co_author_ids)) setCoAuthorIds(existing.co_author_ids)
      setEditorBootstrapped(true)
    } else if (isEdit && !loadingArticle) {
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
        source_url: '',
        internal_notes: '',
      })
      setContent('')
      setEditorBootstrapped(true)
    }
  }, [existing, isEdit, loadingArticle, reset, setValue])

  useEffect(() => {
    if (existingTags.length) {
      setTags((prev) => (prev === existingTags ? prev : existingTags))
      return
    }

    if (isEdit) {
      setTags((prev) => (prev.length === 0 ? prev : EMPTY_ARRAY))
    }
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

      if (isEdit && existing) {
        const draftSavedAt = getTimestamp(draft.savedAt)
        const articleUpdatedAt = Math.max(getTimestamp(existing.updated_at), getTimestamp(existing.created_at))
        const shouldRestoreDraft = hasMeaningfulDraftChanges(draft, existing)

        if (!shouldRestoreDraft || draftSavedAt <= articleUpdatedAt) {
          try {
            window.localStorage.removeItem(draftStorageKey)
          } catch {
            // Ignore storage cleanup failures.
          }
          return
        }
      }

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
      if (Array.isArray(draft.gallery)) setGallery(draft.gallery)
      if (Array.isArray(draft.relatedArticleIds)) setRelatedArticleIds(draft.relatedArticleIds)
      if (Array.isArray(draft.coAuthorIds)) setCoAuthorIds(draft.coAuthorIds)
      if (draft.savedAt) setLastDraftSavedAt(draft.savedAt)
      setEditorBootstrapped(true)

      toast({
        title: 'Bozza recuperata',
        description: 'Abbiamo ripristinato il testo non ancora salvato dell’editor.',
        variant: 'success',
      })
    } catch {
      // Ignore malformed local drafts and continue with server data/defaults.
    } finally {
      setEditorBootstrapped(true)
    }
  }, [draftStorageKey, existing, isEdit, loadingArticle, setValue, toast])

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
      gallery,
      relatedArticleIds,
      coAuthorIds,
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
  }, [draftStorageKey, formValues, content, tags, showSchedule, pollQuestion, pollOptions, pollEnabled, gallery, relatedArticleIds, coAuthorIds])

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
          gallery,
          relatedArticleIds,
          coAuthorIds,
        }
        window.localStorage.setItem(draftStorageKey, JSON.stringify(draftPayload))
        setLastDraftSavedAt(draftPayload.savedAt)
      } catch {
        // Ignore localStorage quota errors silently.
      }
    }

    document.addEventListener('visibilitychange', persistDraftNow)
    return () => document.removeEventListener('visibilitychange', persistDraftNow)
  }, [draftStorageKey, formValues, content, tags, showSchedule, pollQuestion, pollOptions, pollEnabled, gallery, relatedArticleIds, coAuthorIds])

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
      if (extraColumnsSupported) {
        payload.gallery = gallery
        payload.related_article_ids = relatedArticleIds
        payload.co_author_ids = coAuthorIds
      } else {
        delete payload.source_url
        delete payload.internal_notes
      }

      // Create revision before saving (only on edit)
      if (isEdit && existing) {
        createArticleRevision(id, {
          title: existing.title,
          content: existing.content,
          excerpt: existing.excerpt,
          savedBy: user?.id,
        }).catch(() => {})
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
      qc.invalidateQueries(['article-revisions', id])

      const shouldSendPush =
        status === 'published' &&
        result?.data?.slug &&
        (!isEdit || existing?.status !== 'published')

      const canSendPush = profile?.role === 'admin' || user?.email === PRIMARY_ADMIN_EMAIL

      if (shouldSendPush && canSendPush) {
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

  // ─── Duplicate article ────────────────────────────────────────
  const duplicateMutation = useMutation({
    mutationFn: () => duplicateArticle(id),
    onSuccess: (result) => {
      if (result.data?.id) {
        toast({ title: 'Articolo duplicato', description: 'Apro la copia in bozza.', variant: 'success' })
        navigate(`/admin/articoli/${result.data.id}/modifica`)
      }
    },
    onError: (err) => toast({ title: 'Errore duplicazione', description: err.message, variant: 'destructive' }),
  })

  // ─── Copy URL ─────────────────────────────────────────────────
  const copyArticleUrl = useCallback(() => {
    const slug = existing?.slug || watch('slug')
    if (!slug) return
    const url = `${SITE_URL}/articolo/${slug}`
    navigator.clipboard.writeText(url).then(
      () => toast({ title: 'URL copiato', description: url, variant: 'success' }),
      () => toast({ title: 'Errore', description: 'Impossibile copiare.', variant: 'destructive' })
    )
  }, [existing, watch, toast])

  // ─── Related articles search ──────────────────────────────────
  const searchRelated = useCallback(async (query) => {
    if (!query || query.length < 2) { setRelatedResults([]); return }
    setRelatedSearching(true)
    try {
      const { data } = await searchArticlesForRelated(query, id)
      setRelatedResults(data || [])
    } catch { setRelatedResults([]) }
    finally { setRelatedSearching(false) }
  }, [id])

  useEffect(() => {
    const timeout = setTimeout(() => searchRelated(relatedSearch), 300)
    return () => clearTimeout(timeout)
  }, [relatedSearch, searchRelated])

  // ─── Gallery management ───────────────────────────────────────
  const addGalleryImage = useCallback(() => {
    const url = galleryInput.trim()
    if (!url) return
    setGallery(prev => [...prev, { url, caption: '' }])
    setGalleryInput('')
  }, [galleryInput])

  const removeGalleryImage = useCallback((index) => {
    setGallery(prev => prev.filter((_, i) => i !== index))
  }, [])

  const updateGalleryCaption = useCallback((index, caption) => {
    setGallery(prev => prev.map((item, i) => i === index ? { ...item, caption } : item))
  }, [])

  // ─── Restore revision ────────────────────────────────────────
  const restoreRevision = useCallback(async (revisionId) => {
    const { data: rev } = await getArticleRevisionById(revisionId)
    if (!rev) return
    if (rev.title) setValue('title', rev.title)
    if (rev.content) setContent(rev.content)
    if (rev.excerpt) setValue('excerpt', rev.excerpt)
    setShowRevisions(false)
    toast({ title: 'Revisione ripristinata', description: 'I campi sono stati aggiornati. Salva per confermare.', variant: 'success' })
  }, [setValue, toast])

  // ─── Import from URL ─────────────────────────────────────────
  const handleImportFromUrl = useCallback(async () => {
    const url = importUrl.trim()
    if (!url) return
    setImportLoading(true)
    try {
      const res = await fetch(url)
      const html = await res.text()
      const parser = new DOMParser()
      const doc = parser.parseFromString(html, 'text/html')
      const importedTitle = doc.querySelector('h1')?.textContent?.trim() || doc.title || ''
      const metaDesc = doc.querySelector('meta[name="description"]')?.content || ''
      const ogImg = doc.querySelector('meta[property="og:image"]')?.content || ''
      const bodyContent = doc.querySelector('article')?.innerHTML || doc.querySelector('.post-content, .article-content, .entry-content, main')?.innerHTML || ''

      if (importedTitle) setValue('title', importedTitle)
      if (!watch('slug') && importedTitle) setValue('slug', slugify(importedTitle))
      if (metaDesc) setValue('excerpt', metaDesc.slice(0, 300))
      if (ogImg) setValue('cover_image', ogImg)
      if (bodyContent) setContent(bodyContent)
      setValue('source_url', url)

      toast({ title: 'Contenuto importato', description: 'Rivedi e modifica prima di salvare.', variant: 'success' })
    } catch {
      toast({ title: 'Importazione fallita', description: 'Non è stato possibile recuperare il contenuto.', variant: 'destructive' })
    } finally {
      setImportLoading(false)
      setImportUrl('')
    }
  }, [importUrl, setValue, watch, toast])

  // ─── AI SEO suggestions ──────────────────────────────────────
  const generateSeoSuggestions = useCallback(() => {
    const title = watch('title') || ''
    const excerpt = watch('excerpt') || ''
    const plain = stripHtml(content || '').replace(/\s+/g, ' ').trim()

    if (!title) {
      toast({ title: 'Titolo mancante', description: 'Inserisci un titolo prima di generare i suggerimenti SEO.', variant: 'destructive' })
      return
    }

    // Generate meta title: optimize for 50-60 chars
    const suggestedMeta = title.length > 55
      ? title.slice(0, 55).trim() + '...'
      : title
    setValue('meta_title', suggestedMeta)

    // Generate meta description from excerpt or content
    const descSource = excerpt || plain
    const suggestedDesc = descSource.length > 155
      ? descSource.slice(0, 155).trim() + '...'
      : descSource
    setValue('meta_description', suggestedDesc)

    toast({ title: 'SEO aggiornato', description: 'Meta title e description generati dal contenuto.', variant: 'success' })
  }, [watch, content, setValue, toast])

  if (loadingArticle) return (
    <div className="flex items-center justify-center py-24">
      <Loader2 className="h-8 w-8 animate-spin text-juve-gold" />
    </div>
  )

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
          {/* Import from URL */}
          <div className="flex items-center gap-1">
            <input
              type="url"
              value={importUrl}
              onChange={(e) => setImportUrl(e.target.value)}
              placeholder="Importa da URL..."
              className="w-40 border border-gray-300 px-2 py-2 text-xs focus:outline-none focus:border-juve-black"
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleImportFromUrl())}
            />
            <button type="button" onClick={handleImportFromUrl} disabled={importLoading || !importUrl.trim()}
              className="flex items-center gap-1 px-2 py-2 border border-gray-300 text-xs font-medium hover:border-juve-black transition-colors disabled:opacity-50">
              {importLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ExternalLink className="h-3.5 w-3.5" />}
            </button>
          </div>

          <button
            type="button"
            onClick={() => setPreviewOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 border border-gray-300 text-sm font-medium hover:border-juve-black transition-colors"
          >
            <Eye className="h-4 w-4" />
            Anteprima
          </button>

          {/* Copy URL */}
          {isEdit && (
            <button type="button" onClick={copyArticleUrl}
              className="flex items-center gap-1.5 px-3 py-2 border border-gray-300 text-sm font-medium hover:border-juve-black transition-colors"
              title="Copia URL articolo">
              <Copy className="h-4 w-4" />
            </button>
          )}

          {/* Duplicate */}
          {isEdit && (
            <button type="button" onClick={() => duplicateMutation.mutate()} disabled={duplicateMutation.isPending}
              className="flex items-center gap-1.5 px-3 py-2 border border-gray-300 text-sm font-medium hover:border-juve-black transition-colors disabled:opacity-50"
              title="Duplica articolo">
              {duplicateMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            </button>
          )}

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
            {editorBootstrapped ? (
              <RichEditor key={isEdit ? `${id}:${existing?.updated_at || 'loading'}` : 'new-article'} content={content} onChange={setContent} />
            ) : (
              <div className="flex min-h-[450px] items-center justify-center border border-gray-300 bg-white">
                <Loader2 className="h-6 w-6 animate-spin text-juve-gold" />
              </div>
            )}
            {/* Word counter bar */}
            <div className="flex items-center gap-4 mt-2 px-1 text-[11px] text-gray-500">
              <span className="flex items-center gap-1">
                <FileText className="h-3 w-3" />
                {wordStats.words} parole
              </span>
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {wordStats.time} min lettura
              </span>
              <span>{wordStats.chars} caratteri</span>
            </div>
          </div>

          {/* Source URL */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">
              <span className="flex items-center gap-1"><Link2 className="h-3 w-3" /> Fonte / Crediti</span>
            </label>
            <input {...register('source_url')} placeholder="URL della fonte originale..."
              className="w-full border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-juve-black" />
          </div>

          {/* Internal notes */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">
              <span className="flex items-center gap-1"><StickyNote className="h-3 w-3" /> Note interne</span>
            </label>
            <textarea {...register('internal_notes')} rows={2} placeholder="Note per la redazione (non visibili ai lettori)..."
              className="w-full border border-dashed border-amber-300 bg-amber-50/50 px-3 py-2 text-sm focus:outline-none focus:border-amber-500 resize-none" />
          </div>
        </div>

        {/* Sidebar settings */}
        <div className="xl:col-span-4 space-y-3">
          {/* Cover image */}
          <SidebarAccordion id="cover" title="Copertina" openSections={openSections} toggleSection={toggleSection}>
            <Controller name="cover_image" control={control}
              render={({ field }) => <ImageUpload value={field.value} onChange={field.onChange} />} />
          </SidebarAccordion>

          {/* Settings */}
          <SidebarAccordion id="settings" title="Impostazioni" openSections={openSections} toggleSection={toggleSection}>
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
          </SidebarAccordion>

          {/* Poll */}
          <SidebarAccordion id="poll" title="Sondaggio" icon={<Star className="h-3.5 w-3.5" />} openSections={openSections} toggleSection={toggleSection}>
            <div className="flex items-center justify-between gap-4">
              <p className="text-xs text-gray-500">Coinvolgi i lettori con una domanda editoriale.</p>
              <button
                type="button"
                onClick={() => setPollEnabled(!pollEnabled)}
                className={`relative w-10 h-5 transition-colors flex-shrink-0 ${pollEnabled ? 'bg-juve-gold' : 'bg-gray-300'}`}
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
          </SidebarAccordion>

          {/* SEO */}
          <SidebarAccordion id="seo" title="SEO" badge={`${seoHints.score}/100`} icon={<Sparkles className="h-3.5 w-3.5" />} openSections={openSections} toggleSection={toggleSection}>
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

            <button type="button" onClick={generateSeoSuggestions}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 border border-gray-300 text-xs font-bold uppercase tracking-wider hover:border-juve-gold hover:text-juve-gold transition-colors">
              <Sparkles className="h-3.5 w-3.5" />
              Genera meta SEO dal contenuto
            </button>
          </SidebarAccordion>

          {/* Tags */}
          <SidebarAccordion id="tags" title="Tag" badge={tags.length || null} openSections={openSections} toggleSection={toggleSection}>
            <TagInput tags={tags} onChange={setTags} />
            <p className="text-xs text-gray-400">Premi Invio o virgola per aggiungere un tag</p>
          </SidebarAccordion>

          {/* Video from library */}
          <SidebarAccordion id="video" title="Video" icon={<Film className="h-3.5 w-3.5" />} openSections={openSections} toggleSection={toggleSection}>
            <p className="text-xs text-gray-500 mb-2">Inserisci un video dalla libreria direttamente nel contenuto dell'articolo.</p>
            <div className="relative mb-2">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
              <input
                value={videoSearch}
                onChange={(e) => { setVideoSearch(e.target.value); setVideoPickerOpen(true) }}
                onFocus={() => setVideoPickerOpen(true)}
                placeholder="Cerca video..."
                className="w-full border border-gray-300 pl-7 pr-2 py-1.5 text-xs focus:outline-none focus:border-juve-black"
              />
            </div>
            {videoPickerOpen && (
              <div className="border border-gray-200 max-h-48 overflow-y-auto">
                {filteredVideos.length === 0 && (
                  <p className="text-xs text-gray-400 px-2 py-3 text-center">Nessun video trovato</p>
                )}
                {filteredVideos.map(v => {
                  const thumb = v.thumbnail || (v.platform === 'youtube' && v.video_id
                    ? `https://img.youtube.com/vi/${v.video_id}/hqdefault.jpg` : null)
                  return (
                    <button key={v.id} type="button"
                      onClick={() => insertVideoInContent(v)}
                      className="w-full text-left px-2 py-2 text-xs hover:bg-gray-50 border-b border-gray-100 last:border-0 flex items-center gap-2">
                      {thumb ? (
                        <img src={thumb} alt="" className="w-14 h-8 object-cover flex-shrink-0" />
                      ) : (
                        <div className="w-14 h-8 bg-gray-100 flex items-center justify-center flex-shrink-0">
                          <Film className="h-3.5 w-3.5 text-gray-300" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="font-medium text-gray-700 truncate">{v.title}</p>
                        <p className="text-[10px] text-gray-400">{v.category} • {v.platform}</p>
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </SidebarAccordion>

          {/* Gallery */}
          <SidebarAccordion id="gallery" title="Galleria" icon={<ImageIcon className="h-3.5 w-3.5" />} badge={gallery.length || null} openSections={openSections} toggleSection={toggleSection}>
            <div className="flex gap-2">
              <input
                type="url"
                value={galleryInput}
                onChange={(e) => setGalleryInput(e.target.value)}
                placeholder="URL immagine..."
                className="flex-1 border border-gray-300 px-2 py-1.5 text-xs focus:outline-none focus:border-juve-black"
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addGalleryImage())}
              />
              <button type="button" onClick={addGalleryImage} disabled={!galleryInput.trim()}
                className="px-2 py-1.5 border border-gray-300 text-xs font-bold hover:border-juve-black disabled:opacity-50">
                <Plus className="h-3.5 w-3.5" />
              </button>
            </div>
            {gallery.length > 0 && (
              <div className="space-y-2">
                {gallery.map((img, idx) => (
                  <div key={idx} className="flex items-start gap-2 border border-gray-100 p-2">
                    <img src={img.url} alt="" className="w-16 h-12 object-cover flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] text-gray-400 truncate">{img.url}</p>
                      <input
                        value={img.caption || ''}
                        onChange={(e) => updateGalleryCaption(idx, e.target.value)}
                        placeholder="Didascalia..."
                        className="w-full border-b border-gray-200 px-0 py-0.5 text-xs focus:outline-none focus:border-juve-black bg-transparent mt-1"
                      />
                    </div>
                    <button type="button" onClick={() => removeGalleryImage(idx)}
                      className="p-1 text-gray-400 hover:text-red-500">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </SidebarAccordion>

          {/* Related articles */}
          <SidebarAccordion id="related" title="Correlati" icon={<Link2 className="h-3.5 w-3.5" />} badge={relatedArticleIds.length || null} openSections={openSections} toggleSection={toggleSection}>

            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
              <input
                value={relatedSearch}
                onChange={(e) => setRelatedSearch(e.target.value)}
                placeholder="Cerca articoli..."
                className="w-full border border-gray-300 pl-7 pr-2 py-1.5 text-xs focus:outline-none focus:border-juve-black"
              />
              {relatedSearching && <Loader2 className="absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 animate-spin text-gray-400" />}
            </div>
            {relatedResults.length > 0 && relatedSearch && (
              <div className="border border-gray-200 max-h-32 overflow-y-auto">
                {relatedResults
                  .filter(a => !relatedArticleIds.includes(a.id))
                  .map(a => (
                    <button key={a.id} type="button"
                      onClick={() => { setRelatedArticleIds(prev => [...prev, a.id]); setRelatedSearch(''); setRelatedResults([]) }}
                      className="w-full text-left px-2 py-1.5 text-xs hover:bg-gray-50 border-b border-gray-100 last:border-0">
                      {a.title}
                    </button>
                  ))}
              </div>
            )}
            {relatedArticleIds.length > 0 && (
              <div className="space-y-1">
                {relatedArticleIds.map((relId, idx) => (
                  <div key={relId} className="flex items-center justify-between gap-2 bg-gray-50 px-2 py-1">
                    <span className="text-xs text-gray-600 truncate">{relId.slice(0, 8)}...</span>
                    <button type="button" onClick={() => setRelatedArticleIds(prev => prev.filter((_, i) => i !== idx))}
                      className="text-gray-400 hover:text-red-500">
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </SidebarAccordion>

          {/* Co-authors */}
          <SidebarAccordion id="coauthors" title="Co-autori" icon={<Users className="h-3.5 w-3.5" />} badge={coAuthorIds.length || null} openSections={openSections} toggleSection={toggleSection}>
            <select
              onChange={(e) => {
                const val = e.target.value
                if (val && !coAuthorIds.includes(val)) setCoAuthorIds(prev => [...prev, val])
                e.target.value = ''
              }}
              className="w-full border border-gray-300 px-2 py-1.5 text-xs focus:outline-none focus:border-juve-black appearance-none"
            >
              <option value="">— Aggiungi co-autore —</option>
              {allProfiles.filter(p => p.id !== user?.id && !coAuthorIds.includes(p.id)).map(p => (
                <option key={p.id} value={p.id}>{p.username}</option>
              ))}
            </select>
            {coAuthorIds.length > 0 && (
              <div className="space-y-1">
                {coAuthorIds.map((coId) => {
                  const coProfile = allProfiles.find(p => p.id === coId)
                  return (
                    <div key={coId} className="flex items-center justify-between gap-2 bg-gray-50 px-2 py-1">
                      <span className="text-xs text-gray-600">{coProfile?.username || coId.slice(0, 8)}</span>
                      <button type="button" onClick={() => setCoAuthorIds(prev => prev.filter(x => x !== coId))}
                        className="text-gray-400 hover:text-red-500">
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </SidebarAccordion>

          {/* Revision history */}
          {isEdit && (
            <SidebarAccordion id="revisions" title="Revisioni" icon={<History className="h-3.5 w-3.5" />} badge={revisions.length || null} openSections={openSections} toggleSection={toggleSection}>
              {revisions.length === 0 && (
                <p className="text-xs text-gray-400">Nessuna revisione salvata.</p>
              )}
              {revisions.map((rev) => (
                <div key={rev.id} className="flex items-center justify-between gap-2 bg-gray-50 px-2 py-1.5 text-xs">
                  <div className="min-w-0">
                    <p className="font-medium text-gray-700 truncate">{rev.title || 'Senza titolo'}</p>
                    <p className="text-[10px] text-gray-400">
                      {new Date(rev.created_at).toLocaleString('it-IT', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })}
                      {rev.profiles?.username ? ` — ${rev.profiles.username}` : ''}
                    </p>
                  </div>
                  <button type="button" onClick={() => restoreRevision(rev.id)}
                    className="text-xs font-bold text-juve-gold hover:underline flex-shrink-0">
                    Ripristina
                  </button>
                </div>
              ))}
            </SidebarAccordion>
          )}

          {/* Card preview */}
          {coverImage && (
            <SidebarAccordion id="preview" title="Anteprima card" openSections={openSections} toggleSection={toggleSection}>
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
            </SidebarAccordion>
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
