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
const PrivacyPolicy = lazy(() => import('@/pages/PrivacyPolicy'))
const CookiePolicy  = lazy(() => import('@/pages/CookiePolicy'))
const Contatti      = lazy(() => import('@/pages/Contatti'))
const Faq           = lazy(() => import('@/pages/Faq'))
const Terms         = lazy(() => import('@/pages/Terms'))
const MyDnaJuve     = lazy(() => import('@/pages/MyDnaJuve'))
const MatchCalendar = lazy(() => import('@/pages/MatchCalendar'))
const Calciomercato = lazy(() => import('@/pages/Calciomercato'))
const NotizeLive    = lazy(() => import('@/pages/NotizeLive'))
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
const Authors       = lazy(() => import('@/pages/admin/Authors'))
const CommentsAdmin = lazy(() => import('@/pages/admin/Comments'))
const FeedManager   = lazy(() => import('@/pages/admin/FeedManager'))
const FanArticleSubmissions = lazy(() => import('@/pages/admin/FanArticleSubmissions'))

function PageLoader() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <Loader2 className="h-7 w-7 animate-spin text-juve-gold" />
    </div>
  )
}

function AdminGuard({ children }) {
  const { user, profile, loading } = useAuth()
  if (loading) return (
    <div className="min-h-screen bg-juve-black flex items-center justify-center">
      <div className="flex items-baseline gap-1">
        <span className="font-display text-3xl font-black text-white animate-pulse">BIANCONERI</span>
        <span className="font-display text-3xl font-black text-juve-gold animate-pulse">HUB</span>
      </div>
    </div>
  )
  if (!user) return <Navigate to="/admin/login" replace />
  if (profile?.role !== 'admin') return <Navigate to="/" replace />
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
          <Route path="privacy" element={<PrivacyPolicy />} />
          <Route path="cookie-policy" element={<CookiePolicy />} />
          <Route path="contatti" element={<Contatti />} />
          <Route path="faq" element={<Faq />} />
          <Route path="termini" element={<Terms />} />
          <Route path="area-bianconera" element={<MyDnaJuve />} />
          <Route path="calendario" element={<MatchCalendar />} />
          <Route path="calciomercato" element={<Calciomercato />} />
          <Route path="notizie-live" element={<NotizeLive />} />
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
          <Route path="redattori" element={<Authors />} />
          <Route path="commenti" element={<CommentsAdmin />} />
          <Route path="proposte-tifosi" element={<FanArticleSubmissions />} />
          <Route path="profilo" element={<Profile />} />
          <Route path="feed" element={<FeedManager />} />
          <Route path="impostazioni" element={<Settings />} />
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
