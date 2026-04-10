import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/Dialog'

/**
 * ConfirmDialog – dialog di conferma riutilizzabile.
 *
 * Props:
 *  open          boolean
 *  onClose       () => void           (Annulla / chiudi)
 *  onConfirm     () => void           (Conferma)
 *  title         string
 *  description   string | ReactNode
 *  confirmLabel  string               (default: "Conferma")
 *  confirmVariant string              (default: "danger")
 *  loading       boolean
 */
export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = 'Conferma',
  confirmVariant = 'danger',
  loading = false,
}) {
  return (
    <Dialog open={open} onClose={onClose} className="max-w-sm">
      <DialogHeader onClose={onClose}>
        <DialogTitle>{title}</DialogTitle>
      </DialogHeader>
      <DialogContent>
        {description && (
          <p className="text-sm text-gray-600 dark:text-gray-400">{description}</p>
        )}
      </DialogContent>
      <DialogFooter>
        <Button variant="outline" size="sm" onClick={onClose} disabled={loading}>
          Annulla
        </Button>
        <Button
          variant={confirmVariant}
          size="sm"
          onClick={onConfirm}
          disabled={loading}
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : confirmLabel}
        </Button>
      </DialogFooter>
    </Dialog>
  )
}
