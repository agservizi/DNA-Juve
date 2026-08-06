'use client'

import { usePathname } from 'next/navigation'
import { SiteFooter } from '@/components/site-footer'
import { SiteHeader } from '@/components/site-header'

export function SiteChrome({ position }: { position: 'before' | 'after' }) {
  const pathname = usePathname()
  if (pathname.startsWith('/admin') || pathname.startsWith('/area-bianconera')) return null

  if (position === 'before') {
    return <><a className="skip-link" href="#contenuto">Vai al contenuto</a><SiteHeader /></>
  }

  return <SiteFooter />
}
