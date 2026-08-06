'use client'

import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'

export function AdminRouteFrame({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const root = useRef<HTMLDivElement>(null)

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
    root.current?.focus({ preventScroll: true })
  }, [pathname])

  return <div id="contenuto" ref={root} tabIndex={-1} data-admin-route>{children}</div>
}
