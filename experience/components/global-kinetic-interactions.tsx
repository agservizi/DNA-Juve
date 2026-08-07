'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'

/** Magnetic pull only on primary CTAs — no global card tilt. */
const actionSelector = 'a.kinetic-cta,button.kinetic-cta,.kinetic-cta'

export function GlobalKineticInteractions() {
  const pathname = usePathname()
  useEffect(() => {
    if (pathname.startsWith('/admin') || matchMedia('(prefers-reduced-motion: reduce),(pointer: coarse)').matches) return
    let frame = 0
    let last: PointerEvent | null = null
    const reset = (node: HTMLElement) => {
      node.style.removeProperty('--kinetic-x')
      node.style.removeProperty('--kinetic-y')
    }
    const move = (event: PointerEvent) => {
      last = event
      if (frame) return
      frame = requestAnimationFrame(() => {
        frame = 0
        if (!last) return
        const target = last.target as Element | null
        const action = target?.closest<HTMLElement>(actionSelector)
        if (action) {
          const r = action.getBoundingClientRect()
          const x = (last.clientX - r.left - r.width / 2) * 0.075
          const y = (last.clientY - r.top - r.height / 2) * 0.075
          action.style.setProperty('--kinetic-x', `${x.toFixed(2)}px`)
          action.style.setProperty('--kinetic-y', `${y.toFixed(2)}px`)
        }
      })
    }
    const out = (event: PointerEvent) => {
      const from = event.target as Element | null
      const to = event.relatedTarget as Node | null
      const action = from?.closest<HTMLElement>(actionSelector)
      if (action && !action.contains(to)) reset(action)
    }
    document.addEventListener('pointermove', move, { passive: true })
    document.addEventListener('pointerout', out, { passive: true })
    return () => {
      cancelAnimationFrame(frame)
      document.removeEventListener('pointermove', move)
      document.removeEventListener('pointerout', out)
    }
  }, [pathname])
  return null
}
