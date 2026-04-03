import { cn } from '@/lib/utils'

export function Card({ className, children, ...props }) {
  return (
    <div className={cn('bg-white border border-gray-200 shadow-sm', className)} {...props}>
      {children}
    </div>
  )
}

export function CardHeader({ className, children, ...props }) {
  return (
    <div className={cn('p-6 pb-4', className)} {...props}>
      {children}
    </div>
  )
}

export function CardTitle({ className, children, ...props }) {
  return (
    <h3 className={cn('font-display text-xl font-bold text-juve-black', className)} {...props}>
      {children}
    </h3>
  )
}

export function CardContent({ className, children, ...props }) {
  return (
    <div className={cn('p-6 pt-0', className)} {...props}>
      {children}
    </div>
  )
}

export function CardFooter({ className, children, ...props }) {
  return (
    <div className={cn('p-6 pt-0 flex items-center', className)} {...props}>
      {children}
    </div>
  )
}
