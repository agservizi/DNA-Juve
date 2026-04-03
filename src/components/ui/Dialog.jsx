import { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

export function Dialog({ open, onClose, children, className }) {
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [open])

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            onClick={e => e.stopPropagation()}
            className={cn(
              'bg-white shadow-2xl w-full max-h-[90vh] overflow-y-auto',
              'max-w-lg mx-4',
              className
            )}
          >
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export function DialogHeader({ children, onClose }) {
  return (
    <div className="flex items-center justify-between p-6 border-b border-gray-200">
      <div>{children}</div>
      {onClose && (
        <button onClick={onClose} className="p-1 hover:bg-gray-100 transition-colors">
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
