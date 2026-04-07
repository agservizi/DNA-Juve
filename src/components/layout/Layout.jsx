import { useLayoutEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { useToast } from '@/hooks/useToast'
import Header from './Header'
import Footer from './Footer'
import { Toaster } from '@/components/ui/Toast'
import BackToTop from '@/components/blog/BackToTop'
import CookieBanner from '@/components/blog/CookieBanner'
import ReaderLoginDialog from '@/components/reader/ReaderLoginDialog'

export default function Layout() {
  const location = useLocation()
  const { toasts, dismiss } = useToast()

  useLayoutEffect(() => {
    if (location.hash) return
    window.scrollTo({ top: 0, left: 0 })
  }, [location.pathname, location.search, location.hash])

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
