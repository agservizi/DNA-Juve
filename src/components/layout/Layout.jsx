import { Outlet } from 'react-router-dom'
import { useToast } from '@/hooks/useToast'
import Header from './Header'
import Footer from './Footer'
import { Toaster } from '@/components/ui/Toast'
import BackToTop from '@/components/blog/BackToTop'
import CookieBanner from '@/components/blog/CookieBanner'
import ReaderLoginDialog from '@/components/reader/ReaderLoginDialog'

export default function Layout() {
  const { toasts, dismiss } = useToast()

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Header />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
      <Toaster toasts={toasts} dismiss={dismiss} />
      <BackToTop />
      <CookieBanner />
      <ReaderLoginDialog />
    </div>
  )
}
