import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  ResponsiveContainer,
  CartesianGrid,
  Tooltip,
  XAxis,
  YAxis,
  Legend,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  ComposedChart,
  Line,
} from 'recharts'
import {
  BadgeCheck,
  FileWarning,
  Globe2,
  Image as ImageIcon,
  Loader2,
  Search,
  ShieldAlert,
  TrendingUp,
  Eye,
  Pencil,
  Download,
  Filter,
  X,
} from 'lucide-react'
import { getSeoDashboardArticles, getSearchConsoleOverview } from '@/lib/supabase'
import { generateSitemap } from '@/lib/feeds'
import { formatDate, formatViews, stripHtml } from '@/lib/utils'

const SCORE_BUCKET_COLORS = ['#16A34A', '#D97706', '#DC2626', '#475569']
const ISSUE_BAR_COLOR = '#111111'

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max)
}

function formatPercent(value) {
  return `${Math.round(value)}%`
}

function escapeCsv(value) {
  const normalized = String(value ?? '').replace(/"/g, '""')
  return `"${normalized}"`
}

function formatMetricNumber(value) {
  return new Intl.NumberFormat('it-IT').format(Math.round(Number(value || 0)))
}

function formatCtrValue(value) {
  return `${(Number(value || 0) * 100).toFixed(2)}%`
}

function formatSignedDelta(value, suffix = '%') {
  const numeric = Number(value || 0)
  const sign = numeric > 0 ? '+' : ''
  return `${sign}${numeric.toFixed(1)}${suffix}`
}

function formatMonthKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

function getLastSixMonths() {
  const months = []
  const cursor = new Date()
  cursor.setDate(1)
  cursor.setHours(0, 0, 0, 0)

  for (let index = 5; index >= 0; index -= 1) {
    const current = new Date(cursor.getFullYear(), cursor.getMonth() - index, 1)
    months.push({
      key: formatMonthKey(current),
      label: current.toLocaleDateString('it-IT', { month: 'short', year: '2-digit' }),
    })
  }

  return months
}

function getResolvedTitle(article) {
  return String(article.meta_title || article.title || '').trim()
}

function getResolvedDescription(article) {
  return String(article.meta_description || article.excerpt || '').trim()
}

function getResolvedImage(article) {
  return String(article.og_image || article.cover_image || '').trim()
}

async function getSitemapSnapshot() {
  if (typeof window === 'undefined') {
    return {
      available: false,
      totalUrls: 0,
      articleUrls: 0,
      articleSlugs: [],
      latestLastmod: null,
    }
  }

  if (['localhost', '127.0.0.1'].includes(window.location.hostname)) {
    return {
      available: false,
      totalUrls: 0,
      articleUrls: 0,
      articleSlugs: [],
      latestLastmod: null,
    }
  }

  try {
    const response = await fetch('/sitemap.xml', { cache: 'no-store' })
    if (!response.ok) throw new Error(`HTTP ${response.status}`)

    const xml = await response.text()
    const doc = new DOMParser().parseFromString(xml, 'application/xml')
    if (doc.querySelector('parsererror')) throw new Error('Invalid XML')

    const urls = Array.from(doc.querySelectorAll('url')).map((node) => ({
      loc: node.querySelector('loc')?.textContent?.trim() || '',
      lastmod: node.querySelector('lastmod')?.textContent?.trim() || '',
    }))

    const articleSlugs = urls
      .map(({ loc }) => {
        try {
          const pathname = new URL(loc).pathname
          const match = pathname.match(/^\/articolo\/([^/]+)$/)
          return match?.[1] || null
        } catch {
          return null
        }
      })
      .filter(Boolean)

    const latestLastmod = urls
      .map((item) => item.lastmod)
      .filter(Boolean)
      .sort((left, right) => new Date(right).getTime() - new Date(left).getTime())[0] || null

    return {
      available: true,
      totalUrls: urls.length,
      articleUrls: articleSlugs.length,
      articleSlugs,
      latestLastmod,
    }
  } catch {
    return {
      available: false,
      totalUrls: 0,
      articleUrls: 0,
      articleSlugs: [],
      latestLastmod: null,
    }
  }
}

function SummaryCard({ icon: Icon, label, value, helper, tone = 'default', delay = 0 }) {
  const toneClasses = {
    default: 'border-gray-200 bg-white text-gray-900',
    success: 'border-emerald-200 bg-emerald-50 text-emerald-900',
    warn: 'border-amber-200 bg-amber-50 text-amber-900',
    danger: 'border-red-200 bg-red-50 text-red-900',
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className={`border p-5 ${toneClasses[tone] || toneClasses.default}`}
    >
      <div className="mb-3 flex items-center justify-between gap-3">
        <span className="text-[11px] font-black uppercase tracking-[0.18em] text-gray-500">{label}</span>
        <Icon className="h-4 w-4 text-juve-gold" />
      </div>
      <p className="font-display text-3xl font-black">{value}</p>
      {helper && <p className="mt-2 text-xs text-gray-500">{helper}</p>}
    </motion.div>
  )
}

function SectionLabel({ icon: Icon, title, subtitle }) {
  return (
    <div className="mb-4 flex items-start justify-between gap-4">
      <div>
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-juve-gold" />
          <h2 className="text-sm font-black uppercase tracking-wider">{title}</h2>
        </div>
        {subtitle && <p className="mt-1 text-xs text-gray-500">{subtitle}</p>}
      </div>
    </div>
  )
}

export default function SeoDashboard() {
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [categoryFilter, setCategoryFilter] = useState('all')

  const { data: articles = [], isLoading: articlesLoading } = useQuery({
    queryKey: ['seo-dashboard-articles'],
    queryFn: async () => {
      const { data, error } = await getSeoDashboardArticles()
      if (error) throw error
      return data || []
    },
  })

  const { data: sitemap, isLoading: sitemapLoading } = useQuery({
    queryKey: ['seo-dashboard-sitemap'],
    queryFn: getSitemapSnapshot,
    staleTime: 300000,
  })
  const {
    data: searchConsole,
    isLoading: searchConsoleLoading,
    error: searchConsoleError,
  } = useQuery({
    queryKey: ['search-console-overview', 28],
    queryFn: async () => {
      const { data, error } = await getSearchConsoleOverview({ rangeDays: 28, rowLimit: 10 })
      if (error) throw error
      return data
    },
    retry: false,
    staleTime: 15 * 60 * 1000,
  })

  const effectiveSitemap = useMemo(() => {
    if (sitemap?.available) return sitemap

    const publishedArticles = (articles || []).filter((article) => article.status === 'published')
    const categoryRows = Array.from(new Map(
      publishedArticles
        .filter((article) => article.categories?.slug)
        .map((article) => [article.categories.slug, { slug: article.categories.slug }])
    ).values())

    const xml = generateSitemap(publishedArticles, categoryRows)
    const doc = new DOMParser().parseFromString(xml, 'application/xml')
    const urls = Array.from(doc.querySelectorAll('url')).map((node) => ({
      loc: node.querySelector('loc')?.textContent?.trim() || '',
      lastmod: node.querySelector('lastmod')?.textContent?.trim() || '',
    }))

    const articleSlugs = urls
      .map(({ loc }) => {
        try {
          const pathname = new URL(loc).pathname
          const match = pathname.match(/^\/articolo\/([^/]+)$/)
          return match?.[1] || null
        } catch {
          return null
        }
      })
      .filter(Boolean)

    const latestLastmod = urls
      .map((item) => item.lastmod)
      .filter(Boolean)
      .sort((left, right) => new Date(right).getTime() - new Date(left).getTime())[0] || null

    return {
      available: true,
      totalUrls: urls.length,
      articleUrls: articleSlugs.length,
      articleSlugs,
      latestLastmod,
      source: 'local-fallback',
    }
  }, [articles, sitemap])

  const model = useMemo(() => {
    const allArticles = articles || []
    const publishedArticles = allArticles.filter((article) => article.status === 'published')
    const scheduledArticles = allArticles.filter((article) => (
      article.status === 'draft'
      && article.scheduled_at
      && new Date(article.scheduled_at).getTime() > Date.now()
    ))
    const draftArticles = allArticles.filter((article) => article.status === 'draft' && !scheduledArticles.includes(article))
    const sitemapSlugSet = new Set((effectiveSitemap?.articleSlugs || []).filter(Boolean))

    const titleOccurrences = publishedArticles.reduce((acc, article) => {
      const key = getResolvedTitle(article).toLowerCase()
      if (!key) return acc
      acc.set(key, (acc.get(key) || 0) + 1)
      return acc
    }, new Map())

    const entries = publishedArticles.map((article) => {
      const resolvedTitle = getResolvedTitle(article)
      const resolvedDescription = getResolvedDescription(article)
      const resolvedImage = getResolvedImage(article)
      const plainContent = stripHtml(article.content || '').replace(/\s+/g, ' ').trim()
      const titleLength = resolvedTitle.length
      const descriptionLength = resolvedDescription.length
      const contentLength = plainContent.length
      const inSitemap = sitemapSlugSet.size > 0 ? sitemapSlugSet.has(article.slug) : true
      const duplicateTitle = titleOccurrences.get(resolvedTitle.toLowerCase()) > 1
      const issues = []

      if (article.noindex) issues.push('Noindex attivo')
      if (!inSitemap) issues.push('URL articolo assente dalla sitemap')
      if (titleLength < 35 || titleLength > 70) issues.push('Titolo SEO fuori range')
      if (!resolvedDescription) {
        issues.push('Descrizione assente')
      } else if (descriptionLength < 110 || descriptionLength > 170) {
        issues.push('Descrizione SEO fuori range')
      }
      if (!resolvedImage) issues.push('Immagine social assente')
      if (!article.categories?.name) issues.push('Categoria mancante')
      if (contentLength < 450) issues.push('Contenuto troppo corto')
      if (duplicateTitle) issues.push('Titolo duplicato')

      let score = 100
      if (article.noindex) score -= 30
      if (!inSitemap) score -= 25
      if (titleLength < 35 || titleLength > 70) score -= 10
      if (!resolvedDescription) score -= 15
      else if (descriptionLength < 110 || descriptionLength > 170) score -= 10
      if (!resolvedImage) score -= 10
      if (!article.categories?.name) score -= 5
      if (contentLength < 450) score -= 10
      if (duplicateTitle) score -= 10

      return {
        ...article,
        resolvedTitle,
        resolvedDescription,
        titleLength,
        descriptionLength,
        contentLength,
        inSitemap,
        duplicateTitle,
        issues,
        issueCount: issues.length,
        score: clamp(score, 0, 100),
      }
    })

    const summary = {
      publishedCount: publishedArticles.length,
      scheduledCount: scheduledArticles.length,
      draftCount: draftArticles.length,
      avgScore: entries.length
        ? Math.round(entries.reduce((sum, entry) => sum + entry.score, 0) / entries.length)
        : 0,
      optimizedCount: entries.filter((entry) => entry.score >= 85).length,
      indexableCount: entries.filter((entry) => !entry.noindex).length,
      noindexCount: entries.filter((entry) => entry.noindex).length,
      customMetaCoverage: entries.length
        ? Math.round((entries.filter((entry) => entry.meta_title && entry.meta_description).length / entries.length) * 100)
        : 0,
      sitemapCoverage: entries.length
        ? Math.round((entries.filter((entry) => entry.inSitemap).length / entries.length) * 100)
        : 100,
      criticalCount: entries.filter((entry) => entry.score < 60 || entry.issueCount >= 3).length,
    }

    const monthlySeed = getLastSixMonths().map((month) => ({
      month: month.label,
      key: month.key,
      published: 0,
      avgScore: 0,
      totalScore: 0,
      totalViews: 0,
    }))
    const monthlyMap = new Map(monthlySeed.map((month) => [month.key, month]))

    entries.forEach((entry) => {
      if (!entry.published_at) return
      const key = entry.published_at.slice(0, 7)
      const bucket = monthlyMap.get(key)
      if (!bucket) return
      bucket.published += 1
      bucket.totalScore += entry.score
      bucket.totalViews += entry.views || 0
    })

    const monthlyTrend = Array.from(monthlyMap.values()).map((bucket) => ({
      month: bucket.month,
      published: bucket.published,
      avgScore: bucket.published ? Math.round(bucket.totalScore / bucket.published) : 0,
      avgViews: bucket.published ? Math.round(bucket.totalViews / bucket.published) : 0,
    }))

    const issueCounts = [
      { name: 'Titolo fuori range', count: entries.filter((entry) => entry.titleLength < 35 || entry.titleLength > 70).length },
      { name: 'Descrizione debole', count: entries.filter((entry) => !entry.resolvedDescription || entry.descriptionLength < 110 || entry.descriptionLength > 170).length },
      { name: 'Immagine assente', count: entries.filter((entry) => !getResolvedImage(entry)).length },
      { name: 'Noindex', count: entries.filter((entry) => entry.noindex).length },
      { name: 'Fuori sitemap', count: entries.filter((entry) => !entry.inSitemap).length },
      { name: 'Contenuto corto', count: entries.filter((entry) => entry.contentLength < 450).length },
      { name: 'Titolo duplicato', count: entries.filter((entry) => entry.duplicateTitle).length },
    ]

    const scoreBuckets = [
      { name: '90-100', value: entries.filter((entry) => entry.score >= 90).length },
      { name: '75-89', value: entries.filter((entry) => entry.score >= 75 && entry.score < 90).length },
      { name: '60-74', value: entries.filter((entry) => entry.score >= 60 && entry.score < 75).length },
      { name: '<60', value: entries.filter((entry) => entry.score < 60).length },
    ]

    const categoryMap = new Map()
    entries.forEach((entry) => {
      const key = entry.categories?.name || 'Senza categoria'
      const current = categoryMap.get(key) || {
        name: key,
        articles: 0,
        totalScore: 0,
        totalViews: 0,
      }
      current.articles += 1
      current.totalScore += entry.score
      current.totalViews += entry.views || 0
      categoryMap.set(key, current)
    })

    const categoryPerformance = Array.from(categoryMap.values())
      .map((entry) => ({
        name: entry.name,
        articles: entry.articles,
        avgScore: Math.round(entry.totalScore / entry.articles),
        avgViews: Math.round(entry.totalViews / entry.articles),
      }))
      .sort((left, right) => right.articles - left.articles)
      .slice(0, 6)

    const criticalPages = entries
      .filter((entry) => entry.issueCount > 0)
      .sort((left, right) => left.score - right.score || right.issueCount - left.issueCount)
      .slice(0, 8)

    const bestPages = entries
      .slice()
      .sort((left, right) => (right.views || 0) - (left.views || 0) || right.score - left.score)
      .slice(0, 8)

    return {
      entries,
      summary,
      monthlyTrend,
      issueCounts,
      scoreBuckets,
      categoryPerformance,
      criticalPages,
      bestPages,
    }
  }, [articles, effectiveSitemap])

  const loading = articlesLoading || sitemapLoading

  const categoryOptions = useMemo(() => {
    const values = Array.from(new Set(model.entries.map((entry) => entry.categories?.name || 'Senza categoria')))
      .sort((left, right) => left.localeCompare(right, 'it'))
    return ['all', ...values]
  }, [model.entries])

  const filteredEntries = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase()

    return model.entries.filter((entry) => {
      const matchesSearch = !normalizedSearch
        || entry.title.toLowerCase().includes(normalizedSearch)
        || entry.slug.toLowerCase().includes(normalizedSearch)
      const categoryName = entry.categories?.name || 'Senza categoria'
      const matchesCategory = categoryFilter === 'all' || categoryName === categoryFilter

      let matchesStatus = true
      if (statusFilter === 'critical') matchesStatus = entry.score < 60 || entry.issueCount >= 3
      if (statusFilter === 'warnings') matchesStatus = entry.issueCount > 0
      if (statusFilter === 'optimized') matchesStatus = entry.score >= 85
      if (statusFilter === 'noindex') matchesStatus = entry.noindex
      if (statusFilter === 'missing-meta') matchesStatus = !entry.meta_title || !entry.meta_description
      if (statusFilter === 'out-of-sitemap') matchesStatus = !entry.inSitemap

      return matchesSearch && matchesCategory && matchesStatus
    })
  }, [categoryFilter, model.entries, searchTerm, statusFilter])

  const exportFilteredEntries = () => {
    const header = ['Titolo', 'Slug', 'Categoria', 'SEO Score', 'Views', 'Noindex', 'In Sitemap', 'Meta Title', 'Meta Description', 'Issue', 'Pubblicato']
    const rows = filteredEntries.map((entry) => [
      entry.title,
      entry.slug,
      entry.categories?.name || 'Senza categoria',
      entry.score,
      entry.views || 0,
      entry.noindex ? 'Si' : 'No',
      entry.inSitemap ? 'Si' : 'No',
      entry.meta_title || '',
      entry.meta_description || '',
      entry.issues.join(' | '),
      entry.published_at ? formatDate(entry.published_at) : '',
    ])
    const csv = [header, ...rows].map((row) => row.map(escapeCsv).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const objectUrl = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = objectUrl
    link.download = 'seo-dashboard-export.csv'
    link.click()
    URL.revokeObjectURL(objectUrl)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-juve-gold" />
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="font-display text-2xl font-black text-juve-black">SEO Dashboard</h1>
          <p className="mt-1 text-sm text-gray-500">
            Dati reali da articoli pubblicati, views editoriali e sitemap.xml attiva.
          </p>
          <p className="mt-2 text-xs text-gray-400">
            Analizzati {model.summary.publishedCount} articoli pubblicati, {model.summary.scheduledCount} programmati e {model.summary.draftCount} bozze.
          </p>
        </div>
      </div>

      {searchConsoleLoading ? (
        <div className="border border-gray-200 bg-white p-6">
          <div className="flex items-center gap-3 text-sm text-gray-500">
            <Loader2 className="h-4 w-4 animate-spin text-juve-gold" />
            Recupero metriche Google Search Console...
          </div>
        </div>
      ) : searchConsoleError ? (
        <div className="border border-red-200 bg-red-50 p-6 text-sm text-red-800">
          <p className="font-bold uppercase tracking-wider">Search Console non disponibile</p>
          <p className="mt-2">{searchConsoleError.message}</p>
        </div>
      ) : searchConsole?.configured ? (
        <section className="space-y-6 border border-gray-200 bg-white p-6">
          <SectionLabel icon={Globe2} title="Google Search Console" subtitle={`Property: ${searchConsole.siteUrl}`} />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <SummaryCard
              icon={Eye}
              label="Click organici"
              value={formatMetricNumber(searchConsole.summary?.clicks)}
              helper={`${formatSignedDelta(searchConsole.summary?.clicksDelta)} vs periodo precedente`}
              tone={Number(searchConsole.summary?.clicksDelta || 0) >= 0 ? 'success' : 'warn'}
            />
            <SummaryCard
              icon={TrendingUp}
              label="Impression"
              value={formatMetricNumber(searchConsole.summary?.impressions)}
              helper={`${formatSignedDelta(searchConsole.summary?.impressionsDelta)} vs periodo precedente`}
              tone={Number(searchConsole.summary?.impressionsDelta || 0) >= 0 ? 'success' : 'warn'}
            />
            <SummaryCard
              icon={BadgeCheck}
              label="CTR medio"
              value={formatCtrValue(searchConsole.summary?.ctr)}
              helper={`${formatSignedDelta((searchConsole.summary?.ctrDelta || 0) * 100)} vs periodo precedente`}
              tone={Number(searchConsole.summary?.ctrDelta || 0) >= 0 ? 'success' : 'warn'}
            />
            <SummaryCard
              icon={Search}
              label="Posizione media"
              value={Number(searchConsole.summary?.position || 0).toFixed(1)}
              helper={`${formatSignedDelta(searchConsole.summary?.positionDelta || 0, '')} punti vs periodo precedente`}
              tone={Number(searchConsole.summary?.positionDelta || 0) <= 0 ? 'success' : 'warn'}
            />
          </div>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <div className="border border-gray-200 p-5">
              <SectionLabel icon={TrendingUp} title="Trend organico giornaliero" subtitle="Click e impression degli ultimi 28 giorni" />
              <ResponsiveContainer width="100%" height={280}>
                <ComposedChart data={searchConsole.daily || []} margin={{ top: 8, right: 0, left: -20, bottom: 0 }}>
                  <CartesianGrid stroke="#f3f4f6" strokeDasharray="3 3" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis yAxisId="left" tick={{ fontSize: 11 }} allowDecimals={false} />
                  <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ fontSize: 12, border: '1px solid #e5e7eb' }}
                    formatter={(value, name) => [formatMetricNumber(value), name]}
                  />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar yAxisId="left" dataKey="clicks" name="Click" fill="#111111" maxBarSize={28} radius={[2, 2, 0, 0]} />
                  <Line yAxisId="right" type="monotone" dataKey="impressions" name="Impression" stroke="#F5A623" strokeWidth={2.5} dot={false} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>

            <div className="border border-gray-200 p-5">
              <SectionLabel icon={Globe2} title="Sitemap registrate" subtitle="Stato letto da Search Console sulla property reale" />
              <div className="space-y-3">
                {(searchConsole.sitemaps || []).map((item) => (
                  <div key={item.path || Math.random()} className="border border-gray-100 bg-gray-50 p-3">
                    <p className="break-all text-sm font-bold text-juve-black">{item.path || 'Sitemap senza path'}</p>
                    <p className="mt-1 text-xs text-gray-500">Ultimo submit: {item.lastSubmitted ? formatDate(item.lastSubmitted) : '—'}</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <span className="bg-white px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-gray-700">Errori: {item.errors || 0}</span>
                      <span className="bg-white px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-gray-700">Warning: {item.warnings || 0}</span>
                      {item.isPending && <span className="bg-amber-100 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-amber-700">Pending</span>}
                    </div>
                  </div>
                ))}
                {(!searchConsole.sitemaps || searchConsole.sitemaps.length === 0) && <p className="text-sm text-gray-400">Nessuna sitemap rilevata nella property.</p>}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <div className="border border-gray-200 p-5">
              <SectionLabel icon={Search} title="Top query" subtitle="Query organiche più forti del periodo" />
              <div className="space-y-3">
                {(searchConsole.topQueries || []).slice(0, 8).map((row, index) => (
                  <div key={`${row.query}-${index}`} className="flex items-center gap-3 border-b border-gray-100 pb-3 last:border-b-0 last:pb-0">
                    <span className="w-5 shrink-0 text-xs font-bold text-gray-400">{index + 1}</span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-juve-black">{row.query}</p>
                      <p className="mt-1 text-xs text-gray-500">{formatMetricNumber(row.impressions)} impression · CTR {formatCtrValue(row.ctr)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-bold uppercase tracking-wider text-gray-500">Click</p>
                      <p className="font-display text-xl font-black text-juve-black">{formatMetricNumber(row.clicks)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="border border-gray-200 p-5">
              <SectionLabel icon={Globe2} title="Top pagine organiche" subtitle="URL più performanti lette da Search Console" />
              <div className="space-y-3">
                {(searchConsole.topPages || []).slice(0, 8).map((row, index) => (
                  <div key={`${row.page}-${index}`} className="flex items-center gap-3 border-b border-gray-100 pb-3 last:border-b-0 last:pb-0">
                    <span className="w-5 shrink-0 text-xs font-bold text-gray-400">{index + 1}</span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-juve-black">{row.page}</p>
                      <p className="mt-1 text-xs text-gray-500">Posizione {Number(row.position || 0).toFixed(1)} · CTR {formatCtrValue(row.ctr)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-bold uppercase tracking-wider text-gray-500">Click</p>
                      <p className="font-display text-xl font-black text-juve-black">{formatMetricNumber(row.clicks)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      ) : (
        <div className="border border-amber-200 bg-amber-50 p-6 text-sm text-amber-900">
          <p className="font-bold uppercase tracking-wider">Search Console da configurare</p>
          <p className="mt-2">Per attivare click, impression, CTR e query reali aggiungi i secret GSC_SITE_URL, GSC_CLIENT_EMAIL e GSC_PRIVATE_KEY alla tua project configuration Supabase e assegna il service account alla property.</p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <SummaryCard icon={Search} label="SEO medio" value={model.summary.avgScore} helper="Punteggio medio sugli articoli pubblicati" tone={model.summary.avgScore >= 80 ? 'success' : model.summary.avgScore >= 65 ? 'warn' : 'danger'} delay={0.05} />
        <SummaryCard icon={Globe2} label="Copertura sitemap" value={formatPercent(model.summary.sitemapCoverage)} helper={`${effectiveSitemap?.articleUrls || 0} URL articolo trovate nella sitemap${effectiveSitemap?.source === 'local-fallback' ? ' (fallback locale)' : ''}`} tone={model.summary.sitemapCoverage >= 95 ? 'success' : 'warn'} delay={0.1} />
        <SummaryCard icon={BadgeCheck} label="Meta complete" value={formatPercent(model.summary.customMetaCoverage)} helper="Articoli con meta title e meta description custom" tone={model.summary.customMetaCoverage >= 60 ? 'success' : 'warn'} delay={0.15} />
        <SummaryCard icon={ShieldAlert} label="Pagine critiche" value={model.summary.criticalCount} helper="Score sotto 60 o almeno 3 issue aperte" tone={model.summary.criticalCount === 0 ? 'success' : 'danger'} delay={0.2} />
        <SummaryCard icon={TrendingUp} label="Articoli ottimizzati" value={model.summary.optimizedCount} helper="Score pari o superiore a 85" tone="success" delay={0.25} />
        <SummaryCard icon={FileWarning} label="Noindex attivi" value={model.summary.noindexCount} helper={`${model.summary.indexableCount} articoli restano indicizzabili`} tone={model.summary.noindexCount === 0 ? 'success' : 'warn'} delay={0.3} />
      </div>

      <section className="border border-gray-200 bg-white p-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <SectionLabel icon={Filter} title="Filtro operativo" subtitle="Segmenta gli articoli e porta fuori il dataset corrente in CSV" />
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={exportFilteredEntries} className="inline-flex items-center gap-2 border border-gray-300 px-4 py-2 text-xs font-bold uppercase tracking-wider text-gray-700 transition-colors hover:border-juve-black hover:text-juve-black">
              <Download className="h-3.5 w-3.5" />
              Export CSV
            </button>
            <button type="button" onClick={() => { setSearchTerm(''); setStatusFilter('all'); setCategoryFilter('all') }} className="inline-flex items-center gap-2 border border-gray-300 px-4 py-2 text-xs font-bold uppercase tracking-wider text-gray-700 transition-colors hover:border-juve-black hover:text-juve-black">
              <X className="h-3.5 w-3.5" />
              Reset
            </button>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-3">
          <input value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder="Cerca titolo o slug..." className="w-full border border-gray-300 px-3 py-2 text-sm focus:border-juve-black focus:outline-none" />
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="w-full border border-gray-300 px-3 py-2 text-sm focus:border-juve-black focus:outline-none">
            <option value="all">Tutti gli articoli</option>
            <option value="critical">Critici</option>
            <option value="warnings">Con warning</option>
            <option value="optimized">Ottimizzati</option>
            <option value="noindex">Noindex</option>
            <option value="missing-meta">Meta incomplete</option>
            <option value="out-of-sitemap">Fuori sitemap</option>
          </select>
          <select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)} className="w-full border border-gray-300 px-3 py-2 text-sm focus:border-juve-black focus:outline-none">
            {categoryOptions.map((option) => (
              <option key={option} value={option}>{option === 'all' ? 'Tutte le categorie' : option}</option>
            ))}
          </select>
        </div>

        <p className="mt-3 text-xs text-gray-500">{filteredEntries.length} articoli nel filtro corrente.</p>
      </section>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <motion.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }} className="border border-gray-200 bg-white p-6">
          <SectionLabel icon={TrendingUp} title="Trend SEO mensile" subtitle="Articoli pubblicati per mese e score medio degli ultimi 6 mesi" />
          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart data={model.monthlyTrend} margin={{ top: 8, right: 0, left: -20, bottom: 0 }}>
              <CartesianGrid stroke="#f3f4f6" strokeDasharray="3 3" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis yAxisId="left" allowDecimals={false} tick={{ fontSize: 11 }} />
              <YAxis yAxisId="right" orientation="right" domain={[0, 100]} tick={{ fontSize: 11 }} />
              <Tooltip
                contentStyle={{ fontSize: 12, border: '1px solid #e5e7eb' }}
                formatter={(value, name) => {
                  if (name === 'SEO medio') return [`${value}/100`, name]
                  return [value, name]
                }}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar yAxisId="left" dataKey="published" name="Articoli" fill="#F5A623" radius={[2, 2, 0, 0]} maxBarSize={42} />
              <Line yAxisId="right" type="monotone" dataKey="avgScore" name="SEO medio" stroke="#111111" strokeWidth={2.5} dot={{ r: 3 }} />
            </ComposedChart>
          </ResponsiveContainer>
        </motion.section>

        <motion.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="border border-gray-200 bg-white p-6">
          <SectionLabel icon={BadgeCheck} title="Distribuzione punteggio" subtitle="Come si distribuiscono gli articoli pubblicati per fascia SEO" />
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={model.scoreBuckets}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="48%"
                outerRadius={92}
                innerRadius={50}
                paddingAngle={2}
                label={({ name, percent }) => `${name} ${Math.round(percent * 100)}%`}
                labelLine={false}
                fontSize={11}
              >
                {model.scoreBuckets.map((entry, index) => (
                  <Cell key={entry.name} fill={SCORE_BUCKET_COLORS[index % SCORE_BUCKET_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => [`${value} articoli`, 'Cluster']} />
            </PieChart>
          </ResponsiveContainer>
        </motion.section>
      </div>

      <motion.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.65 }} className="border border-gray-200 bg-white p-6">
        <SectionLabel icon={Search} title="Lista operativa filtrata" subtitle="Vista tabellare pronta per interventi editoriali e cleanup SEO" />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-left text-[11px] font-black uppercase tracking-[0.16em] text-gray-500">
                <th className="px-3 py-3">Articolo</th>
                <th className="px-3 py-3">Categoria</th>
                <th className="px-3 py-3">SEO</th>
                <th className="px-3 py-3">Views</th>
                <th className="px-3 py-3">Stato</th>
                <th className="px-3 py-3">Issue</th>
                <th className="px-3 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {filteredEntries.slice(0, 50).map((entry) => (
                <tr key={entry.id} className="border-b border-gray-100 align-top last:border-b-0">
                  <td className="px-3 py-3">
                    <p className="font-bold text-juve-black">{entry.title}</p>
                    <p className="mt-1 text-xs text-gray-500">/{entry.slug} · {formatDate(entry.published_at)}</p>
                  </td>
                  <td className="px-3 py-3 text-xs text-gray-600">{entry.categories?.name || 'Senza categoria'}</td>
                  <td className="px-3 py-3">
                    <span className={`inline-flex px-2 py-1 text-xs font-bold uppercase tracking-wider ${entry.score >= 85 ? 'bg-emerald-100 text-emerald-700' : entry.score >= 70 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>
                      {entry.score}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-xs text-gray-600">{formatViews(entry.views || 0)}</td>
                  <td className="px-3 py-3">
                    <div className="flex flex-wrap gap-1.5">
                      {entry.noindex && <span className="bg-red-100 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-red-700">Noindex</span>}
                      {!entry.inSitemap && <span className="bg-amber-100 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-amber-700">Fuori sitemap</span>}
                      {!entry.noindex && entry.inSitemap && <span className="bg-emerald-100 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-700">Indicizzabile</span>}
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex flex-wrap gap-1.5">
                      {entry.issues.length ? entry.issues.slice(0, 3).map((issue) => (
                        <span key={issue} className="bg-gray-100 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-gray-700">{issue}</span>
                      )) : <span className="text-xs text-gray-400">Nessuna</span>}
                    </div>
                  </td>
                  <td className="px-3 py-3 text-right">
                    <Link to={`/admin/articoli/${entry.id}/modifica`} className="inline-flex items-center gap-1.5 border border-gray-300 px-3 py-2 text-xs font-bold uppercase tracking-wider text-gray-700 transition-colors hover:border-juve-black hover:text-juve-black">
                      <Pencil className="h-3.5 w-3.5" />
                      Modifica
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredEntries.length === 0 && <p className="py-10 text-center text-sm text-gray-400">Nessun articolo corrisponde ai filtri selezionati.</p>}
        </div>
      </motion.section>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <motion.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }} className="border border-gray-200 bg-white p-6">
          <SectionLabel icon={FileWarning} title="Problemi rilevati" subtitle="Issue reali sugli articoli pubblicati secondo i meta effettivamente generati" />
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={model.issueCounts} layout="vertical" margin={{ top: 0, right: 10, left: 40, bottom: 0 }}>
              <CartesianGrid stroke="#f3f4f6" strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 11 }} />
              <Tooltip formatter={(value) => [`${value} articoli`, 'Issue']} contentStyle={{ fontSize: 12, border: '1px solid #e5e7eb' }} />
              <Bar dataKey="count" fill={ISSUE_BAR_COLOR} radius={[0, 2, 2, 0]} maxBarSize={24} />
            </BarChart>
          </ResponsiveContainer>
        </motion.section>

        <motion.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="border border-gray-200 bg-white p-6">
          <SectionLabel icon={Globe2} title="Categorie più solide" subtitle="Le 6 categorie con maggiore volume e miglior tenuta SEO" />
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={model.categoryPerformance} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <CartesianGrid stroke="#f3f4f6" strokeDasharray="3 3" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} angle={-15} textAnchor="end" height={60} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
              <Tooltip
                contentStyle={{ fontSize: 12, border: '1px solid #e5e7eb' }}
                formatter={(value, name, payload) => {
                  if (name === 'SEO medio') return [`${value}/100`, name]
                  return [value, name]
                }}
                labelFormatter={(label, payload) => {
                  const articleCount = payload?.[0]?.payload?.articles || 0
                  const avgViews = payload?.[0]?.payload?.avgViews || 0
                  return `${label} · ${articleCount} articoli · ${formatViews(avgViews)} views medie`
                }}
              />
              <Bar dataKey="avgScore" name="SEO medio" fill="#F5A623" radius={[2, 2, 0, 0]} maxBarSize={42} />
            </BarChart>
          </ResponsiveContainer>
        </motion.section>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <motion.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.55 }} className="border border-gray-200 bg-white p-6">
          <SectionLabel icon={FileWarning} title="Priorità operative" subtitle="Articoli da correggere prima perché combinano score basso e più warning" />
          <div className="space-y-3">
            {model.criticalPages.map((entry) => (
              <div key={entry.id} className="border border-gray-100 bg-gray-50 p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-juve-black">{entry.title}</p>
                    <p className="mt-1 text-xs text-gray-500">
                      Pubblicato il {formatDate(entry.published_at)} · {formatViews(entry.views || 0)} views
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {entry.issues.map((issue) => (
                        <span key={issue} className="bg-red-100 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-red-700">
                          {issue}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 sm:shrink-0">
                    <div className="border border-red-200 bg-white px-2 py-1 text-center">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-red-600">SEO</p>
                      <p className="font-display text-xl font-black text-red-700">{entry.score}</p>
                    </div>
                    <Link
                      to={`/admin/articoli/${entry.id}/modifica`}
                      className="inline-flex items-center gap-1.5 border border-gray-300 bg-white px-3 py-2 text-xs font-bold uppercase tracking-wider text-gray-700 transition-colors hover:border-juve-black hover:text-juve-black"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      Apri
                    </Link>
                  </div>
                </div>
              </div>
            ))}
            {model.criticalPages.length === 0 && <p className="py-8 text-center text-sm text-gray-400">Nessuna criticità aperta.</p>}
          </div>
        </motion.section>

        <motion.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }} className="border border-gray-200 bg-white p-6">
          <SectionLabel icon={Eye} title="Pagine più forti" subtitle="Top contenuti per views con score SEO associato" />
          <div className="space-y-3">
            {model.bestPages.map((entry, index) => (
              <div key={entry.id} className="flex items-center gap-3 border-b border-gray-100 pb-3 last:border-b-0 last:pb-0">
                <div className="w-6 shrink-0 text-xs font-black text-gray-400">{index + 1}</div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-juve-black">{entry.title}</p>
                  <p className="mt-1 text-xs text-gray-500">
                    {formatViews(entry.views || 0)} views · {entry.categories?.name || 'Senza categoria'}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-xs font-bold uppercase tracking-wider text-gray-500">SEO</p>
                  <p className={`font-display text-xl font-black ${entry.score >= 85 ? 'text-emerald-600' : entry.score >= 70 ? 'text-amber-600' : 'text-red-600'}`}>
                    {entry.score}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </motion.section>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="border border-gray-200 bg-white p-5">
          <div className="flex items-center gap-2">
            <Globe2 className="h-4 w-4 text-juve-gold" />
            <p className="text-xs font-black uppercase tracking-wider text-gray-500">Sitemap</p>
          </div>
          <p className="mt-3 font-display text-2xl font-black text-juve-black">{effectiveSitemap?.totalUrls || 0}</p>
          <p className="mt-1 text-xs text-gray-500">URL totali pubblicate in sitemap.xml</p>
        </div>
        <div className="border border-gray-200 bg-white p-5">
          <div className="flex items-center gap-2">
            <ImageIcon className="h-4 w-4 text-juve-gold" />
            <p className="text-xs font-black uppercase tracking-wider text-gray-500">Ultimo lastmod</p>
          </div>
          <p className="mt-3 font-display text-2xl font-black text-juve-black">{effectiveSitemap?.latestLastmod ? formatDate(effectiveSitemap.latestLastmod) : '—'}</p>
          <p className="mt-1 text-xs text-gray-500">Ultima data letta direttamente dalla sitemap reale</p>
        </div>
        <div className="border border-gray-200 bg-white p-5">
          <div className="flex items-center gap-2">
            <Globe2 className="h-4 w-4 text-juve-gold" />
            <p className="text-xs font-black uppercase tracking-wider text-gray-500">Indicizzazione stimata</p>
          </div>
          <p className="mt-3 font-display text-2xl font-black text-juve-black">{formatPercent(model.summary.publishedCount ? (model.summary.indexableCount / model.summary.publishedCount) * 100 : 100)}</p>
          <p className="mt-1 text-xs text-gray-500">Articoli pubblicati senza noindex</p>
        </div>
      </div>
    </div>
  )
}