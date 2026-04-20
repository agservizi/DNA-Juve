import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import {
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  FileText,
  Globe,
  LifeBuoy,
  Mail,
  MessageSquare,
  Radio,
  Settings as SettingsIcon,
  ShieldCheck,
  UserCircle,
  Users,
} from 'lucide-react'
import { getInstagramPublisherStatus, getSearchConsoleStatus, supabase } from '@/lib/supabase'

const SITE_URL = (import.meta.env.VITE_SITE_URL || 'https://bianconerihub.com').replace(/\/+$/, '')
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || ''
const HAS_SITE_URL = Boolean(import.meta.env.VITE_SITE_URL)
const HAS_SUPABASE = Boolean(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY)
const HAS_NEWS_API = Boolean(import.meta.env.NEWS_API_KEY)
const HAS_FOOTBALL_API = Boolean(import.meta.env.FOOTBALL_API_KEY)

async function getOperationalSnapshot() {
  const [
    sessionRes,
    articleCountRes,
    categoryCountRes,
    commentsProbe,
    fanSubmissionsProbe,
  ] = await Promise.all([
    supabase.auth.getSession(),
    supabase.from('articles').select('id', { count: 'exact' }),
    supabase.from('categories').select('id', { count: 'exact' }),
    supabase.from('comments').select('id').limit(1),
    supabase.from('fan_article_submissions').select('id').limit(1),
  ])

  return {
    adminEmail: sessionRes.data?.session?.user?.email || null,
    articleCount: articleCountRes.count || articleCountRes.data?.length || 0,
    categoryCount: categoryCountRes.count || categoryCountRes.data?.length || 0,
    commentsReady: !commentsProbe.error,
    fanSubmissionsReady: !fanSubmissionsProbe.error,
  }
}

function StatusBadge({ ok, readyLabel = 'Attivo', fallbackLabel = 'Da verificare' }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider ${
      ok ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'
    }`}>
      {ok ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AlertTriangle className="h-3.5 w-3.5" />}
      {ok ? readyLabel : fallbackLabel}
    </span>
  )
}

function InfoCard({ icon: Icon, title, subtitle, children, delay = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="bg-white border border-gray-200 p-6"
    >
      <div className="flex items-start gap-3 mb-4">
        <div className="w-10 h-10 bg-gray-100 flex items-center justify-center shrink-0">
          <Icon className="h-5 w-5 text-juve-gold" />
        </div>
        <div>
          <h2 className="font-bold">{title}</h2>
          <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>
        </div>
      </div>
      {children}
    </motion.div>
  )
}

function QuickLink({ to, icon: Icon, label, hint }) {
  const external = to.startsWith('http')

  const className = 'flex items-center justify-between gap-3 border border-gray-200 px-4 py-3 text-sm hover:border-juve-gold hover:bg-gray-50 transition-colors'

  if (external) {
    return (
      <a href={to} target="_blank" rel="noopener noreferrer" className={className}>
        <div className="flex items-center gap-3">
          <Icon className="h-4 w-4 text-juve-gold" />
          <div>
            <p className="font-bold">{label}</p>
            <p className="text-xs text-gray-500">{hint}</p>
          </div>
        </div>
        <ExternalLink className="h-4 w-4 text-gray-400" />
      </a>
    )
  }

  return (
    <Link to={to} className={className}>
      <div className="flex items-center gap-3">
        <Icon className="h-4 w-4 text-juve-gold" />
        <div>
          <p className="font-bold">{label}</p>
          <p className="text-xs text-gray-500">{hint}</p>
        </div>
      </div>
      <span className="text-xs font-bold uppercase tracking-wider text-gray-400">Apri</span>
    </Link>
  )
}

export default function Settings() {
  const { data: snapshot, isLoading } = useQuery({
    queryKey: ['admin-operational-snapshot'],
    queryFn: getOperationalSnapshot,
  })
  const { data: searchConsoleStatus } = useQuery({
    queryKey: ['search-console-status'],
    queryFn: async () => {
      const { data, error } = await getSearchConsoleStatus()
      if (error) throw error
      return data
    },
    retry: false,
    staleTime: 15 * 60 * 1000,
  })
  const { data: instagramStatus } = useQuery({
    queryKey: ['instagram-publisher-status'],
    queryFn: async () => {
      const { data, error } = await getInstagramPublisherStatus()
      if (error) throw error
      return data
    },
    retry: false,
    staleTime: 5 * 60 * 1000,
  })

  return (
    <div className="space-y-8">
      <div className="mb-2">
        <h1 className="font-display text-2xl font-black">Centro Operativo</h1>
        <p className="text-sm text-gray-500 mt-1">Panoramica tecnica ed editoriale del magazine.</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        <InfoCard
          icon={ShieldCheck}
          title="Autenticazione Admin"
          subtitle="Sessione redazione e accesso pannello"
        >
          <div className="flex items-center justify-between gap-3 mb-3">
            <StatusBadge ok={Boolean(snapshot?.adminEmail)} readyLabel="Connesso" fallbackLabel="Non rilevato" />
          </div>
          <p className="text-sm text-gray-700">
            {isLoading ? 'Controllo sessione in corso…' : (snapshot?.adminEmail || 'Nessuna sessione admin attiva')}
          </p>
        </InfoCard>

        <InfoCard
          icon={Globe}
          title="Dominio Canonico"
          subtitle="URL usata per SEO, feed e sitemap"
          delay={0.05}
        >
          <div className="flex items-center justify-between gap-3 mb-3">
            <StatusBadge ok={HAS_SITE_URL} readyLabel="Configurato" fallbackLabel="Fallback" />
          </div>
          <p className="text-sm text-gray-700 break-all">{SITE_URL}</p>
        </InfoCard>

        <InfoCard
          icon={Radio}
          title="Supabase"
          subtitle="Connessione principale del progetto"
          delay={0.1}
        >
          <div className="flex items-center justify-between gap-3 mb-3">
            <StatusBadge ok={HAS_SUPABASE} readyLabel="Configurato" fallbackLabel="Manca env" />
          </div>
          <p className="text-sm text-gray-700 break-all">{SUPABASE_URL || 'VITE_SUPABASE_URL non presente'}</p>
        </InfoCard>

        <InfoCard
          icon={FileText}
          title="Contenuti"
          subtitle="Base minima del magazine"
          delay={0.15}
        >
          <div className="grid grid-cols-2 gap-3">
            <div className="border border-gray-200 p-3">
              <p className="text-[11px] uppercase tracking-wider text-gray-500">Articoli</p>
              <p className="mt-1 text-2xl font-black">{snapshot?.articleCount ?? '—'}</p>
            </div>
            <div className="border border-gray-200 p-3">
              <p className="text-[11px] uppercase tracking-wider text-gray-500">Categorie</p>
              <p className="mt-1 text-2xl font-black">{snapshot?.categoryCount ?? '—'}</p>
            </div>
          </div>
        </InfoCard>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <InfoCard
          icon={SettingsIcon}
          title="Moduli Critici"
          subtitle="Funzioni che devono essere operative per il sito"
        >
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3 border border-gray-200 px-4 py-3">
              <div>
                <p className="font-bold text-sm">Commenti</p>
                <p className="text-xs text-gray-500">Tabella e query base disponibili</p>
              </div>
              <StatusBadge ok={Boolean(snapshot?.commentsReady)} readyLabel="Pronti" fallbackLabel="Problema" />
            </div>

            <div className="flex items-center justify-between gap-3 border border-gray-200 px-4 py-3">
              <div>
                <p className="font-bold text-sm">Proposte tifosi</p>
                <p className="text-xs text-gray-500">Area Bianconera verso redazione</p>
              </div>
              <StatusBadge ok={Boolean(snapshot?.fanSubmissionsReady)} readyLabel="Pronte" fallbackLabel="Problema" />
            </div>

            <div className="flex items-center justify-between gap-3 border border-gray-200 px-4 py-3">
              <div>
                <p className="font-bold text-sm">News API</p>
                <p className="text-xs text-gray-500">Base per notizie live e fallback editoriali</p>
              </div>
              <StatusBadge ok={HAS_NEWS_API} readyLabel="Chiave ok" fallbackLabel="Da verificare" />
            </div>

            <div className="flex items-center justify-between gap-3 border border-gray-200 px-4 py-3">
              <div>
                <p className="font-bold text-sm">Football API</p>
                <p className="text-xs text-gray-500">Calendario e match data</p>
              </div>
              <StatusBadge ok={HAS_FOOTBALL_API} readyLabel="Chiave ok" fallbackLabel="Da verificare" />
            </div>

            <div className="flex items-center justify-between gap-3 border border-gray-200 px-4 py-3">
              <div>
                <p className="font-bold text-sm">Google Search Console</p>
                <p className="text-xs text-gray-500">
                  {searchConsoleStatus?.configured
                    ? `${searchConsoleStatus.siteUrl || 'Property configurata'} · ${searchConsoleStatus.sitemapCount || 0} sitemap rilevate`
                    : 'Performance organica reale nella dashboard SEO'}
                </p>
              </div>
              <StatusBadge ok={Boolean(searchConsoleStatus?.configured)} readyLabel="Connesso" fallbackLabel="Da configurare" />
            </div>

            <div className="flex items-center justify-between gap-3 border border-gray-200 px-4 py-3">
              <div>
                <p className="font-bold text-sm">Automazione Instagram</p>
                <p className="text-xs text-gray-500">
                  {instagramStatus?.configured
                    ? `${instagramStatus.provider === 'buffer' ? 'Buffer' : 'Meta diretta'} · ${instagramStatus.pendingCount || 0} articoli in coda`
                    : 'Configura Buffer, Meta diretta o un webhook esterno'}
                </p>
              </div>
              <StatusBadge ok={Boolean(instagramStatus?.configured)} readyLabel="Connessa" fallbackLabel="Da configurare" />
            </div>
          </div>
        </InfoCard>

        <InfoCard
          icon={LifeBuoy}
          title="Azioni Rapide"
          subtitle="Scorciatoie operative utili alla redazione"
          delay={0.05}
        >
          <div className="space-y-3">
            <QuickLink
              to="/admin/profilo"
              icon={UserCircle}
              label="Profilo redazione"
              hint="Nome, avatar e password dell’account admin"
            />
            <QuickLink
              to="/admin/feed"
              icon={Radio}
              label="RSS e Sitemap"
              hint="Controlla feed XML, sitemap e fonti RSS esterne"
            />
            <QuickLink
              to="/admin/proposte-tifosi"
              icon={MessageSquare}
              label="Proposte tifosi"
              hint="Moderazione degli articoli inviati da Area Bianconera"
            />
            <QuickLink
              to="/admin/redattori"
              icon={Users}
              label="Redattori"
              hint="Gestione profili editoriali e autori"
            />
          </div>
        </InfoCard>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <InfoCard
          icon={Mail}
          title="Integrazioni Esterne"
          subtitle="Punti di accesso fuori dal pannello"
        >
          <div className="space-y-3">
            <QuickLink
              to="https://supabase.com/dashboard"
              icon={Radio}
              label="Dashboard Supabase"
              hint="Database, Auth, Storage e Functions"
            />
            <QuickLink
              to="https://search.google.com/search-console"
              icon={Globe}
              label="Google Search Console"
              hint="Indicizzazione, sitemap e performance SEO"
            />
          </div>
        </InfoCard>

        <InfoCard
          icon={SettingsIcon}
          title="Indicazioni"
          subtitle="Cosa tenere sotto controllo prima del go-live"
          delay={0.05}
        >
          <ul className="space-y-2 text-sm text-gray-600">
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 bg-juve-gold rounded-full mt-2 shrink-0" />
              Verifica che il dominio canonico sia corretto e non in fallback.
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 bg-juve-gold rounded-full mt-2 shrink-0" />
              Controlla in <Link to="/admin/feed" className="text-juve-gold hover:underline">RSS / Sitemap</Link> che le fonti esterne siano raggiungibili.
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 bg-juve-gold rounded-full mt-2 shrink-0" />
              Tieni d’occhio commenti e proposte tifosi: sono i due moduli piu esposti all’uso reale.
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 bg-juve-gold rounded-full mt-2 shrink-0" />
              Per Instagram verifica che Buffer oppure Meta Graph API siano configurati prima di avviare la coda automatica.
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 bg-juve-gold rounded-full mt-2 shrink-0" />
              Se questa pagina mostra troppi “Da verificare”, meglio non considerare il setup chiuso.
            </li>
          </ul>
        </InfoCard>
      </div>
    </div>
  )
}
