'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { HOME_CHAPTERS } from '@/lib/cinema-spine'

type Chapter = { id: string; label: string }

/** Chapter nav as “rooms” of the film — prefers data-cinema-room / HOME_CHAPTERS on homepage. */
export function CinematicChapterNav() {
  const pathname = usePathname()
  const reduced = useReducedMotion()
  const [chapters, setChapters] = useState<Chapter[]>([])
  const [active, setActive] = useState(0)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (pathname.startsWith('/admin') || pathname.startsWith('/area-bianconera')) return
    let observer: IntersectionObserver | undefined
    const frame = requestAnimationFrame(() => {
      const main = document.querySelector('main#contenuto')
      if (!main) return

      let sections: HTMLElement[] = []
      let next: Chapter[] = []

      if (pathname === '/' || main.hasAttribute('data-cinema-spine')) {
        HOME_CHAPTERS.forEach((chapter) => {
          const el = main.querySelector<HTMLElement>(chapter.selector) || document.getElementById(chapter.id)
          if (!el || el.offsetHeight < 120) return
          if (!el.id) el.id = chapter.id
          sections.push(el)
          next.push({ id: el.id, label: chapter.label })
        })
      }

      if (!next.length) {
        sections = [...main.querySelectorAll<HTMLElement>(':scope > section')].filter((x) => x.offsetHeight > 180)
        next = sections.map((section, index) => {
          if (!section.id) section.id = `chapter-${index + 1}`
          const room = section.getAttribute('data-cinema-room')
          const visibleTitle = section.querySelector<HTMLElement>('h1,h2')?.textContent?.replace(/\s+/g, ' ').trim()
          const ownLabel = section.getAttribute('aria-label')?.trim()
          const title = room
            ? room.charAt(0).toUpperCase() + room.slice(1)
            : visibleTitle || ownLabel || `Capitolo ${index + 1}`
          return { id: section.id, label: title.slice(0, 38) }
        })
      }

      setChapters(next)
      observer = new IntersectionObserver(
        (entries) =>
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              const index = sections.indexOf(entry.target as HTMLElement)
              if (index >= 0) setActive(index)
            }
          }),
        { rootMargin: '-38% 0px -52%', threshold: 0 },
      )
      sections.forEach((section) => observer?.observe(section))
    })
    return () => {
      cancelAnimationFrame(frame)
      observer?.disconnect()
    }
  }, [pathname])

  if (chapters.length < 2) return null
  const go = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' })
    setOpen(false)
  }

  return (
    <aside className="chapter-nav" data-open={open} aria-label="Navigazione stanze">
      <button className="chapter-nav__toggle" type="button" onClick={() => setOpen((value) => !value)} aria-expanded={open}>
        <span>{String(active + 1).padStart(2, '0')}</span>
        <i />
        <b>{chapters[active]?.label}</b>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            className="chapter-nav__panel"
            initial={{ clipPath: 'inset(0 0 0 100%)', opacity: 0.6 }}
            animate={{ clipPath: 'inset(0 0 0 0%)', opacity: 1 }}
            exit={{ clipPath: 'inset(0 0 0 100%)', opacity: 0 }}
            transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          >
            {chapters.map((chapter, index) => (
              <button type="button" key={chapter.id} data-active={index === active} onClick={() => go(chapter.id)}>
                <span>{String(index + 1).padStart(2, '0')}</span>
                <b>{chapter.label}</b>
                <i />
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </aside>
  )
}
