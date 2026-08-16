'use client'

import { AnimatePresence, motion } from 'motion/react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'

const primary = [
  { href: '/', label: 'Home' },
  { href: '/notizie-live', label: 'Notizie live' },
  { href: '/calciomercato', label: 'Calciomercato' },
  { href: '/calendario', label: 'Calendario' },
  { href: '/community/forum', label: 'Community' },
]

const allSections = [
  ...primary,
  { href: '/rosa', label: 'Rosa' },
  { href: '/video', label: 'Video' },
  { href: '/gallery', label: 'Gallery' },
  { href: '/area-bianconera', label: 'Area Bianconera' },
  { href: '/cerca', label: 'Cerca' },
]

function isActive(pathname: string, href: string) {
  if (href === '/') return pathname === '/'
  if (href === '/community/forum') return pathname.startsWith('/community')
  if (href === '/calendario') return pathname.startsWith('/calendario')
  return pathname === href || pathname.startsWith(`${href}/`)
}

export function SiteHeader() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const [compact, setCompact] = useState(false)
  const [hidden, setHidden] = useState(false)
  const lastY = useRef(0)
  const directionStartY = useRef(0)
  const direction = useRef<'up' | 'down'>('down')
  const firstMenuLink = useRef<HTMLAnchorElement>(null)
  const menuButton = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    let frame = 0
    const onScroll = () => {
      if (frame) return
      frame = window.requestAnimationFrame(() => {
        const y = Math.max(0, window.scrollY)
        const delta = y - lastY.current

        if (Math.abs(delta) >= 2) {
          const nextDirection = delta > 0 ? 'down' : 'up'
          if (nextDirection !== direction.current) {
            direction.current = nextDirection
            directionStartY.current = y
          }

          const travelled = Math.abs(y - directionStartY.current)
          setCompact(y > 64)

          if (y < 96) setHidden(false)
          else if (nextDirection === 'down' && y > 220 && travelled > 64) setHidden(true)
          else if (nextDirection === 'up' && travelled > 36) setHidden(false)

          lastY.current = y
        }
        frame = 0
      })
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      if (frame) window.cancelAnimationFrame(frame)
    }
  }, [])

  useEffect(() => {
    if (!open) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const timer = window.setTimeout(() => firstMenuLink.current?.focus(), 120)
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false)
        menuButton.current?.focus()
      }
      if (event.key === 'Tab') {
        const focusable = Array.from(document.querySelectorAll<HTMLElement>('#global-menu a, .nav-shell button'))
        if (!focusable.length) return
        const first = focusable[0]
        const last = focusable[focusable.length - 1]
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus() }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.clearTimeout(timer)
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  const toggleMenu = () => setOpen((current) => {
    if (!current) setHidden(false)
    return !current
  })

  return <>
    <header
      className={`nav-shell${compact ? ' is-compact' : ''}${hidden && !open ? ' is-hidden' : ''}${open ? ' is-open' : ''}`}
      aria-label="Navigazione principale"
    >
      <Link className="brand" href="/" aria-label="BianconeriHub, home" onClick={() => setOpen(false)}>
        BIANCONERI<span>HUB</span>
      </Link>
      <nav aria-label="Sezioni">
        {primary.map((item) => <Link key={item.href} href={item.href} aria-current={isActive(pathname, item.href) ? 'page' : undefined}>{item.label}</Link>)}
      </nav>
      <button ref={menuButton} className={`menu-button${open ? ' is-active' : ''}`} type="button" aria-label={open ? 'Chiudi menu' : 'Apri menu'} aria-expanded={open} aria-controls="global-menu" onClick={toggleMenu}>
        <span /><span />
      </button>
    </header>

    <AnimatePresence>
      {open && <motion.div id="global-menu" className="global-menu" role="dialog" aria-modal="true" aria-label="Menu del sito" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: .45, ease: [.32, .72, 0, 1] }}>
        <div className="global-menu-atmosphere" aria-hidden="true" />
        <nav className="global-menu-links" aria-label="Tutte le sezioni">
          {allSections.map((item, index) => <motion.div key={item.href} initial={{ y: 48, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 20, opacity: 0 }} transition={{ delay: .05 + index * .045, duration: .65, ease: [.16, 1, .3, 1] }}>
            <span>0{index + 1}</span>
            <Link ref={index === 0 ? firstMenuLink : undefined} href={item.href} onClick={() => setOpen(false)} aria-current={isActive(pathname, item.href) ? 'page' : undefined}>{item.label}</Link>
            <i aria-hidden="true">â†—ï¸Ž</i>
          </motion.div>)}
        </nav>
        <div className="global-menu-foot">
          <span>BIANCONERIHUB MAGAZINE</span>
          <span>FINO ALLA FINE</span>
        </div>
      </motion.div>}
    </AnimatePresence>
  </>
}
