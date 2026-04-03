import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { List, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

function extractHeadings(html) {
  if (!html || typeof document === 'undefined') return []
  const div = document.createElement('div')
  div.innerHTML = html
  const nodes = div.querySelectorAll('h1, h2, h3')
  return Array.from(nodes).map((node, i) => ({
    id: `heading-${i}`,
    text: node.textContent,
    level: parseInt(node.tagName[1]),
  }))
}

function injectIds(html) {
  if (!html) return html
  let i = 0
  return html.replace(/<(h[123])(.*?)>/g, (match, tag, attrs) => {
    return `<${tag}${attrs} id="heading-${i++}">`
  })
}

export function useHeadingIds(content) {
  return injectIds(content)
}

export default function TableOfContents({ content }) {
  const [headings, setHeadings] = useState([])
  const [active, setActive] = useState(null)
  const [open, setOpen] = useState(true)

  useEffect(() => {
    setHeadings(extractHeadings(content))
  }, [content])

  useEffect(() => {
    if (!headings.length) return
    const observer = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) setActive(entry.target.id)
        })
      },
      { rootMargin: '-20% 0% -70% 0%' }
    )
    headings.forEach(({ id }) => {
      const el = document.getElementById(id)
      if (el) observer.observe(el)
    })
    return () => observer.disconnect()
  }, [headings])

  if (headings.length < 2) return null

  return (
    <div className="bg-gray-50 border border-gray-200 mb-8">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center justify-between w-full px-4 py-3 text-sm font-black uppercase tracking-wider hover:bg-gray-100 transition-colors"
      >
        <div className="flex items-center gap-2">
          <List className="h-4 w-4 text-juve-gold" />
          Indice dell'articolo
        </div>
        <ChevronDown className={cn('h-4 w-4 text-gray-400 transition-transform', open && 'rotate-180')} />
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.nav
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <ul className="px-4 pb-4 space-y-1">
              {headings.map(({ id, text, level }) => (
                <li key={id} style={{ paddingLeft: `${(level - 1) * 12}px` }}>
                  <a
                    href={`#${id}`}
                    onClick={e => {
                      e.preventDefault()
                      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                    }}
                    className={cn(
                      'block text-sm py-0.5 transition-colors hover:text-juve-gold',
                      active === id ? 'text-juve-gold font-bold' : 'text-gray-600'
                    )}
                  >
                    {text}
                  </a>
                </li>
              ))}
            </ul>
          </motion.nav>
        )}
      </AnimatePresence>
    </div>
  )
}
