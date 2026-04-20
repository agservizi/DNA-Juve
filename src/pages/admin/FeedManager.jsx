import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  Copy,
  ExternalLink,
  Globe,
  Loader2,
  Map,
  Radio,
  RefreshCw,
  Rss,
  ShieldAlert,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { apiHeaders, apiUrl } from '@/lib/apiProxy'
import { Button } from '@/components/ui/Button'
import { formatDateShort, timeAgo } from '@/lib/utils'

const SITE_URL = (import.meta.env.VITE_SITE_URL || 'https://bianconerihub.com').replace(/\/+$/, '')
const SITE_URL_CONFIGURED = Boolean(import.meta.env.VITE_SITE_URL)

const RSS_SOURCES = [
  { name: 'Gazzetta', route: 'rss/gazzetta', host: 'gazzetta.it' },
  { name: 'Tuttosport', route: 'rss/tuttosport', host: 'tuttosport.com' },
  { name: 'TuttoJuve', route: 'rss/tuttojuve', host: 'tuttojuve.com' },
  { name: 'JuventusNews24', route: 'rss/juventusnews24', host: 'juventusnews24.com' },
  { name: 'JuveNews', route: 'rss/juvenews', host: 'juvenews.eu' },
]

function countXmlNodes(xml = '', tagName) {
  const pattern = new RegExp(`<${tagName}\\b`, 'gi')
  return (xml.match(pattern) || []).length
}

async function fetchFeedSnapshot() {
  const [articlesRes, catsRes] = await Promise.all([
    supabase
      .from('articles')
      .select('id, title, slug, published_at, updated_at, featured')
      .eq('status', 'published')
      .order('published_at', { ascending: false })
      .limit(50),
    supabase.from('categories').select('id, slug'),
  ])

  if (articlesRes.error) throw articlesRes.error
  if (catsRes.error) throw catsRes.error

  const articles = articlesRes.data || []
  const categories = catsRes.data || []

  return {
    articles,
    categories,
    rssItems: articles.length,
    sitemapUrls: 2 + categories.length + articles.length,
    latestPublishedAt: articles[0]?.published_at || null,
  }
}

async function fetchExternalSourceHealth() {
  const results = await Promise.allSettled(
    RSS_SOURCES.map(async (source) => {
      const res = await fetch(apiUrl(source.route), { headers: apiHeaders() })
      const body = await res.text()

      if (!res.ok) {
        throw new Error(`${source.name}: ${res.status}`)
      }

      return {
        ...source,
        ok: true,
        status: res.status,
        items: countXmlNodes(body, 'item'),
        bytes: body.length,
      }
    })
  )

  return results.map((result, index) => {
    const source = RSS_SOURCES[index]
    if (result.status === 'fulfilled') return result.value

    return {
      ...source,
      ok: false,
      status: null,
      items: 0,
      bytes: 0,
      error: result.reason?.message || 'Sorgente non raggiungibile',
    }
  })
}

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false)

  const handle = async () => {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <button
      onClick={handle}
      className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-juve-black transition-colors"
    >
      {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
      {copied ? 'Copiato' : 'Copia'}
    </button>
  )
}

function StatusPill({ ok, label }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider ${
      ok ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'
    }`}>
      {ok ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AlertTriangle className="h-3.5 w-3.5" />}
      {label}
    </span>
  )
}

function UrlCard({ icon: Icon, title, subtitle, url, accent, copyText, children }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white border border-gray-200 p-6"
    >
      <div className="flex items-center gap-3 mb-4">
        <div className={`w-10 h-10 flex items-center justify-center ${accent}`}>
          <Icon className="h-5 w-5 text-white" />
        </div>
        <div>
          <h2 className="font-bold">{title}</h2>
          <p className="text-xs text-gray-500">{subtitle}</p>
        </div>
      </div>

      <div className="bg-gray-50 border border-gray-200 px-3 py-2 flex items-center justify-between gap-2 mb-4">
        <code className="text-xs text-gray-600 truncate">{url}</code>
        <CopyButton text={copyText || url} />
      </div>

      {children}
    </motion.div>
  )
}

export default function FeedManager() {
  const {
    data: snapshot,
    isLoading: loadingSnapshot,
    refetch: refetchSnapshot,
    isFetching: fetchingSnapshot,
  } = useQuery({
    queryKey: ['feed-snapshot'],
    queryFn: fetchFeedSnapshot,
  })

  const {
    data: sourceHealth = [],
    isLoading: loadingSources,
    refetch: refetchSources,
    isFetching: fetchingSources,
  } = useQuery({
    queryKey: ['feed-source-health'],
    queryFn: fetchExternalSourceHealth,
    staleTime: 1000 * 60 * 5,
  })

  const healthySources = sourceHealth.filter(source => source.ok).length

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="font-display text-2xl font-black">RSS Feed & Sitemap</h1>
          <p className="text-sm text-gray-500 mt-1">
            Stato del feed del sito, sitemap e fonti RSS usate dalle sezioni editoriali.
          </p>
        </div>

        <Button
          type="button"
          variant="outline"
          onClick={() => {
            refetchSnapshot()
            refetchSources()
          }}
          disabled={fetchingSnapshot || fetchingSources}
          className="self-start"
        >
          {fetchingSnapshot || fetchingSources ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
          Aggiorna controlli
        </Button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white border border-gray-200 p-6"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-juve-black flex items-center justify-center">
              <Globe className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="font-bold">Dominio Canonico</h2>
              <p className="text-xs text-gray-500">Configurazione usata da RSS, sitemap e SEO</p>
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 mb-3">
            <StatusPill
              ok={SITE_URL_CONFIGURED}
              label={SITE_URL_CONFIGURED ? 'Configurato' : 'Fallback attivo'}
            />
            {!SITE_URL_CONFIGURED && <ShieldAlert className="h-4 w-4 text-amber-600" />}
          </div>

          <div className="bg-gray-50 border border-gray-200 px-3 py-2 flex items-center justify-between gap-2">
            <code className="text-xs text-gray-600 truncate">{SITE_URL}</code>
            <CopyButton text={SITE_URL} />
          </div>

          <p className="mt-3 text-xs text-gray-500">
            {!SITE_URL_CONFIGURED
              ? 'VITE_SITE_URL non e impostata: oggi stai usando il fallback hardcoded.'
              : 'VITE_SITE_URL e presente e viene usata per link canonici e XML.'}
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="bg-white border border-gray-200 p-6"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-green-700 flex items-center justify-center">
              <Radio className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="font-bold">Snapshot Editoriale</h2>
              <p className="text-xs text-gray-500">Dati pubblicati oggi usati per feed e sitemap</p>
            </div>
          </div>

          {loadingSnapshot ? (
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Loader2 className="h-4 w-4 animate-spin" />
              Caricamento dati pubblicati…
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <div className="border border-gray-200 p-3">
                <p className="text-[11px] uppercase tracking-widest text-gray-500">Articoli nel feed</p>
                <p className="mt-1 text-2xl font-black">{snapshot?.rssItems || 0}</p>
              </div>
              <div className="border border-gray-200 p-3">
                <p className="text-[11px] uppercase tracking-widest text-gray-500">URL in sitemap</p>
                <p className="mt-1 text-2xl font-black">{snapshot?.sitemapUrls || 0}</p>
              </div>
              <div className="border border-gray-200 p-3">
                <p className="text-[11px] uppercase tracking-widest text-gray-500">Categorie</p>
                <p className="mt-1 text-2xl font-black">{snapshot?.categories?.length || 0}</p>
              </div>
              <div className="border border-gray-200 p-3">
                <p className="text-[11px] uppercase tracking-widest text-gray-500">Ultima pubblicazione</p>
                <p className="mt-1 text-sm font-bold">
                  {snapshot?.latestPublishedAt ? timeAgo(snapshot.latestPublishedAt) : 'Nessuna'}
                </p>
                {snapshot?.latestPublishedAt && (
                  <p className="text-[11px] text-gray-500 mt-1">{formatDateShort(snapshot.latestPublishedAt)}</p>
                )}
              </div>
            </div>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white border border-gray-200 p-6"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-blue-700 flex items-center justify-center">
              <Rss className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="font-bold">Fonti Esterne</h2>
              <p className="text-xs text-gray-500">Stato dei feed RSS usati da live e mercato</p>
            </div>
          </div>

          {loadingSources ? (
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Loader2 className="h-4 w-4 animate-spin" />
              Verifica sorgenti in corso…
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between gap-3 mb-4">
                <StatusPill
                  ok={healthySources === RSS_SOURCES.length}
                  label={`${healthySources}/${RSS_SOURCES.length} ok`}
                />
                <p className="text-xs text-gray-500">via proxy API</p>
              </div>

              <div className="space-y-2">
                {sourceHealth.map((source) => (
                  <div key={source.route} className="flex items-center justify-between gap-3 border border-gray-200 px-3 py-2">
                    <div className="min-w-0">
                      <p className="text-sm font-bold truncate">{source.name}</p>
                      <p className="text-[11px] text-gray-500 truncate">
                        {source.ok
                          ? `${source.items} item letti`
                          : source.error || 'Sorgente non disponibile'}
                      </p>
                    </div>
                    <StatusPill ok={source.ok} label={source.ok ? 'ok' : 'errore'} />
                  </div>
                ))}
              </div>
            </>
          )}
        </motion.div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        <UrlCard
          icon={Rss}
          title="RSS Feed"
          subtitle="Endpoint per lettori e aggregatori RSS"
          url={`${SITE_URL}/feed.xml`}
          accent="bg-orange-500"
        >
          <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
            <span>{snapshot?.rssItems || 0} articoli pubblicati inclusi</span>
            <a
              href="/feed.xml"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-juve-gold hover:underline"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Visualizza feed
            </a>
          </div>
        </UrlCard>

        <UrlCard
          icon={Map}
          title="Sitemap XML"
          subtitle="Endpoint da inviare ai motori di ricerca"
          url={`${SITE_URL}/sitemap.xml`}
          accent="bg-blue-600"
        >
          <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
            <span>{snapshot?.sitemapUrls || 0} URL attualmente mappati</span>
            <a
              href="/sitemap.xml"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-juve-gold hover:underline"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Visualizza sitemap
            </a>
          </div>
        </UrlCard>

        <UrlCard
          icon={Map}
          title="News Sitemap"
          subtitle="Endpoint dedicato ai contenuti editoriali più recenti"
          url={`${SITE_URL}/news-sitemap.xml`}
          accent="bg-emerald-600"
        >
          <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
            <span>Utile per segnalare i contenuti freschi ai crawler news-oriented</span>
            <a
              href="/news-sitemap.xml"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-juve-gold hover:underline"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Visualizza news sitemap
            </a>
          </div>
        </UrlCard>

        <UrlCard
          icon={Globe}
          title="Robots.txt"
          subtitle="Direttive crawler e riferimento alla sitemap"
          url={`${SITE_URL}/robots.txt`}
          accent="bg-juve-black"
        >
          <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
            <span>Consente crawling generale e dichiara la sitemap pubblica</span>
            <a
              href="/robots.txt"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-juve-gold hover:underline"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Visualizza robots.txt
            </a>
          </div>
        </UrlCard>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="bg-white border border-gray-200 p-6"
      >
        <h2 className="font-bold mb-4 flex items-center gap-2">
          <span className="w-2 h-2 bg-juve-gold" />
          Check Operativi Prima del Go-Live
        </h2>

        <ul className="space-y-2 text-sm text-gray-600">
          <li className="flex items-start gap-2">
            <span className="w-1.5 h-1.5 bg-juve-gold rounded-full mt-2 shrink-0" />
            Invia <code className="text-xs bg-gray-100 px-1">{SITE_URL}/sitemap.xml</code> a{' '}
            <a
              href="https://search.google.com/search-console"
              target="_blank"
              rel="noopener noreferrer"
              className="text-juve-gold hover:underline"
            >
              Google Search Console
            </a>
            .
          </li>
          <li className="flex items-start gap-2">
            <span className="w-1.5 h-1.5 bg-juve-gold rounded-full mt-2 shrink-0" />
            Verifica che <code className="text-xs bg-gray-100 px-1">{SITE_URL}/robots.txt</code> sia pubblico e contenga il riferimento corretto alla sitemap.
          </li>
          <li className="flex items-start gap-2">
            <span className="w-1.5 h-1.5 bg-juve-gold rounded-full mt-2 shrink-0" />
            Se vuoi spingere i contenuti più freschi, aggiungi anche <code className="text-xs bg-gray-100 px-1">{SITE_URL}/news-sitemap.xml</code> negli strumenti webmaster.
          </li>
          <li className="flex items-start gap-2">
            <span className="w-1.5 h-1.5 bg-juve-gold rounded-full mt-2 shrink-0" />
            Verifica che il dominio canonico sia corretto: oggi risulta{' '}
            <code className="text-xs bg-gray-100 px-1">{SITE_URL}</code>.
          </li>
          <li className="flex items-start gap-2">
            <span className="w-1.5 h-1.5 bg-juve-gold rounded-full mt-2 shrink-0" />
            Se una sorgente RSS esterna e in errore, le pagine news e mercato continuano a funzionare ma con copertura ridotta.
          </li>
          <li className="flex items-start gap-2">
            <span className="w-1.5 h-1.5 bg-juve-gold rounded-full mt-2 shrink-0" />
            La build di produzione ora genera file reali <code className="text-xs bg-gray-100 px-1">dist/feed.xml</code> e{' '}
            <code className="text-xs bg-gray-100 px-1">dist/sitemap.xml</code>; in sviluppo restano disponibili anche come route React.
          </li>
        </ul>
      </motion.div>
    </div>
  )
}
