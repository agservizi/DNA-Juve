import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

export function Dialog({ open, onClose, children, className }) {
  const canUseDOM = typeof window !== 'undefined' && typeof document !== 'undefined'

  useEffect(() => {
    if (!canUseDOM) return undefined

    const { body, documentElement } = document
    const previousBodyOverflow = body.style.overflow
    const previousBodyPaddingRight = body.style.paddingRight
    const previousHtmlOverflow = documentElement.style.overflow

    if (open) {
      const scrollbarWidth = window.innerWidth - documentElement.clientWidth

      body.style.overflow = 'hidden'
      documentElement.style.overflow = 'hidden'

      if (scrollbarWidth > 0) {
        body.style.paddingRight = `${scrollbarWidth}px`
      }
    }

    return () => {
      body.style.overflow = previousBodyOverflow
      body.style.paddingRight = previousBodyPaddingRight
      documentElement.style.overflow = previousHtmlOverflow
    }
  }, [canUseDOM, open])

  useEffect(() => {
    if (!canUseDOM || !open) return undefined

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        onClose?.()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [canUseDOM, onClose, open])

  if (!canUseDOM) return null

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4"
          onClick={onClose}
          role="presentation"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            onClick={e => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            className={cn(
              'bg-white shadow-2xl w-full max-h-[90vh] overflow-y-auto dark:bg-neutral-900',
              'max-w-lg',
              className
            )}
          >
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  )
}

export function DialogHeader({ children, onClose }) {
  return (
    <div className="flex items-center justify-between border-b border-gray-200 p-6 dark:border-white/10">
      <div>{children}</div>
      {onClose && (
        <button onClick={onClose} className="p-1 transition-colors hover:bg-gray-100 dark:hover:bg-white/10">
          <X className="h-5 w-5" />
        </button>
      )}
    </div>
  )
}

export function DialogTitle({ children, className }) {
  return <h2 className={cn('font-display text-xl font-bold', className)}>{children}</h2>
}

export function DialogContent({ children, className }) {
  return <div className={cn('p-6', className)}>{children}</div>
}

export function DialogFooter({ children, className }) {
  return (
    <div className={cn('flex items-center justify-end gap-3 p-6 pt-0', className)}>
      {children}
    </div>
  )
}
