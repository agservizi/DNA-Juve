import { lazy, Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from '@/hooks/useAuth'
import { ReaderProvider } from '@/hooks/useReader'
import { Loader2 } from 'lucide-react'

// Public layout
import Layout from '@/components/layout/Layout'

// Eagerly loaded public pages
import Home from '@/pages/Home'
import Article from '@/pages/Article'

// Lazily loaded public pages
const Category  = lazy(() => import('@/pages/Category'))
const Search    = lazy(() => import('@/pages/Search'))
const Author    = lazy(() => import('@/pages/Author'))
const Tag       = lazy(() => import('@/pages/Tag'))
const ChiSiamo     = lazy(() => import('@/pages/ChiSiamo'))
const Redazione    = lazy(() => import('@/pages/Redazione'))
const PrivacyPolicy = lazy(() => import('@/pages/PrivacyPolicy'))
const CookiePolicy  = lazy(() => import('@/pages/CookiePolicy'))
const Contatti      = lazy(() => import('@/pages/Contatti'))
const Faq           = lazy(() => import('@/pages/Faq'))
const Terms         = lazy(() => import('@/pages/Terms'))
const MyDnaJuve     = lazy(() => import('@/pages/MyDnaJuve'))
const MatchCalendar = lazy(() => import('@/pages/MatchCalendar'))
const Calciomercato = lazy(() => import('@/pages/Calciomercato'))
const NotizeLive    = lazy(() => import('@/pages/NotizeLive'))
const Rosa          = lazy(() => import('@/pages/Rosa'))
const Video         = lazy(() => import('@/pages/Video'))
const Podcast       = lazy(() => import('@/pages/Podcast'))
const Sondaggi      = lazy(() => import('@/pages/community/Sondaggi'))
const Pagelle       = lazy(() => import('@/pages/community/Pagelle'))
const Forum         = lazy(() => import('@/pages/community/Forum'))
const ForumThread   = lazy(() => import('@/pages/community/ForumThread'))
const TransferTracker = lazy(() => import('@/pages/community/TransferTracker'))
const NotFound   = lazy(() => import('@/pages/NotFound'))
const RssFeed    = lazy(() => import('@/pages/FeedXML').then(m => ({ default: m.RssFeed })))
const SitemapXML = lazy(() => import('@/pages/FeedXML').then(m => ({ default: m.SitemapXML })))

// Admin — all lazily loaded
const Login         = lazy(() => import('@/pages/admin/Login'))
const AdminLayout   = lazy(() => import('@/components/admin/AdminLayout'))
const Dashboard     = lazy(() => import('@/pages/admin/Dashboard'))
const ArticleList   = lazy(() => import('@/pages/admin/ArticleList'))
const ArticleEditor = lazy(() => import('@/pages/admin/ArticleEditor'))
const Categories    = lazy(() => import('@/pages/admin/Categories'))
const Settings      = lazy(() => import('@/pages/admin/Settings'))
const Profile       = lazy(() => import('@/pages/admin/Profile'))
const Analytics     = lazy(() => import('@/pages/admin/Analytics'))
const SeoDashboard  = lazy(() => import('@/pages/admin/SeoDashboard'))
const Authors       = lazy(() => import('@/pages/admin/Authors'))
const CommentsAdmin = lazy(() => import('@/pages/admin/Comments'))
const FeedManager   = lazy(() => import('@/pages/admin/FeedManager'))
const FanArticleSubmissions = lazy(() => import('@/pages/admin/FanArticleSubmissions'))
const TransferAdmin = lazy(() => import('@/pages/admin/TransferAdmin'))
const VideoAdmin    = lazy(() => import('@/pages/admin/VideoAdmin'))
const ForumModeration = lazy(() => import('@/pages/admin/ForumModeration'))
const Lettori       = lazy(() => import('@/pages/admin/Lettori'))
const NotifichePush = lazy(() => import('@/pages/admin/NotifichePush'))
const SondaggiAdmin = lazy(() => import('@/pages/admin/SondaggiAdmin'))
const PRIMARY_ADMIN_EMAIL = 'admin@bianconerihub.com'

function PageLoader() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <Loader2 className="h-7 w-7 animate-spin text-juve-gold" />
    </div>
  )
}

function AdminGuard({ children }) {
  const { user, profile, loading, profileLoading } = useAuth()
  if (loading || (user && profileLoading)) return (
    <div className="min-h-screen bg-juve-black flex items-center justify-center">
      <div className="flex items-baseline gap-1">
        <span className="font-display text-3xl font-black text-white animate-pulse">BIANCONERI</span>
        <span className="font-display text-3xl font-black text-juve-gold animate-pulse">HUB</span>
      </div>
    </div>
  )
  if (!user) return <Navigate to="/admin/login" replace />
  if (profile?.role !== 'admin' && user?.email !== PRIMARY_ADMIN_EMAIL) return <Navigate to="/" replace />
  return children
}

function AppRoutes() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        {/* Public */}
        <Route element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="articolo/:slug" element={<Article />} />
          <Route path="categoria/:slug" element={<Category />} />
          <Route path="cerca" element={<Search />} />
          <Route path="autore/:username" element={<Author />} />
          <Route path="tag/:slug" element={<Tag />} />
          <Route path="chi-siamo" element={<ChiSiamo />} />
          <Route path="redazione" element={<Redazione />} />
          <Route path="privacy" element={<PrivacyPolicy />} />
          <Route path="cookie-policy" element={<CookiePolicy />} />
          <Route path="contatti" element={<Contatti />} />
          <Route path="faq" element={<Faq />} />
          <Route path="termini" element={<Terms />} />
          <Route path="area-bianconera" element={<MyDnaJuve />} />
          <Route path="calendario" element={<MatchCalendar />} />
          <Route path="calendario-partite" element={<MatchCalendar />} />
          <Route path="calciomercato" element={<Calciomercato />} />
          <Route path="notizie-live" element={<NotizeLive />} />
          <Route path="rosa" element={<Rosa />} />
          <Route path="video" element={<Video />} />
          <Route path="podcast" element={<Podcast />} />
          <Route path="community/sondaggi" element={<Sondaggi />} />
          <Route path="community/pagelle" element={<Pagelle />} />
          <Route path="community/forum" element={<Forum />} />
          <Route path="community/forum/:id" element={<ForumThread />} />
          <Route path="calciomercato/tracker" element={<TransferTracker />} />
          <Route path="feed.xml" element={<RssFeed />} />
          <Route path="sitemap.xml" element={<SitemapXML />} />
          <Route path="*" element={<NotFound />} />
        </Route>

        {/* Admin login */}
        <Route path="admin/login" element={<Login />} />

        {/* Admin protected */}
        <Route
          path="admin"
          element={
            <AdminGuard>
              <Suspense fallback={<PageLoader />}>
                <AdminLayout />
              </Suspense>
            </AdminGuard>
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="articoli" element={<ArticleList />} />
          <Route path="articoli/nuovo" element={<ArticleEditor />} />
          <Route path="articoli/:id/modifica" element={<ArticleEditor />} />
          <Route path="categorie" element={<Categories />} />
          <Route path="analytics" element={<Analytics />} />
          <Route path="seo" element={<SeoDashboard />} />
          <Route path="redattori" element={<Authors />} />
          <Route path="commenti" element={<CommentsAdmin />} />
          <Route path="forum" element={<ForumModeration />} />
          <Route path="proposte-tifosi" element={<FanArticleSubmissions />} />
          <Route path="mercato" element={<TransferAdmin />} />
          <Route path="video" element={<VideoAdmin />} />
          <Route path="profilo" element={<Profile />} />
          <Route path="feed" element={<FeedManager />} />
          <Route path="impostazioni" element={<Settings />} />
          <Route path="lettori" element={<Lettori />} />
          <Route path="notifiche-push" element={<NotifichePush />} />
          <Route path="sondaggi" element={<SondaggiAdmin />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <ReaderProvider>
        <AppRoutes />
      </ReaderProvider>
    </AuthProvider>
  )
}
