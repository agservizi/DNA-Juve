import { motion, AnimatePresence } from 'framer-motion'
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react'
import { cn } from '@/lib/utils'

const icons = {
  default: Info,
  success: CheckCircle,
  destructive: AlertCircle,
}

const colors = {
  default: 'bg-juve-black text-white',
  success: 'bg-green-700 text-white',
  destructive: 'bg-red-700 text-white',
}

export function Toaster({ toasts, dismiss }) {
  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full">
      <AnimatePresence>
        {toasts.map((t) => {
          const Icon = icons[t.variant] || icons.default
          return (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              className={cn('flex items-start gap-3 p-4 shadow-lg', colors[t.variant] || colors.default)}
            >
              <Icon className="h-5 w-5 shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                {t.title && <p className="font-bold text-sm">{t.title}</p>}
                {t.description && <p className="text-xs opacity-90 mt-0.5">{t.description}</p>}
              </div>
              <button onClick={() => dismiss(t.id)} className="shrink-0 opacity-70 hover:opacity-100">
                <X className="h-4 w-4" />
              </button>
            </motion.div>
          )
        })}
      </AnimatePresence>
    </div>
  )
}
