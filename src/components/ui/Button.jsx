import { forwardRef } from 'react'
import { cva } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-juve-gold disabled:pointer-events-none disabled:opacity-50 cursor-pointer',
  {
    variants: {
      variant: {
        default: 'bg-juve-black text-white hover:bg-juve-gray shadow-sm',
        gold: 'bg-juve-gold text-black font-bold hover:bg-juve-gold-dark shadow-sm',
        outline: 'border-2 border-juve-black bg-transparent text-juve-black hover:bg-juve-black hover:text-white',
        ghost: 'hover:bg-gray-100 text-juve-gray',
        destructive: 'bg-red-600 text-white hover:bg-red-700',
        link: 'text-juve-gold underline-offset-4 hover:underline p-0 h-auto',
      },
      size: {
        default: 'h-10 px-5 py-2',
        sm: 'h-8 px-3 text-xs',
        lg: 'h-12 px-8 text-base',
        icon: 'h-9 w-9',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
)

const Button = forwardRef(({ className, variant, size, ...props }, ref) => (
  <button
    ref={ref}
    className={cn(buttonVariants({ variant, size, className }))}
    {...props}
  />
))
Button.displayName = 'Button'

export { Button, buttonVariants }
