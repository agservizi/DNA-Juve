import { useState, useRef } from 'react'
import { useInView } from 'react-intersection-observer'
import { cn } from '@/lib/utils'

export default function LazyImage({
  src,
  alt = '',
  className,
  wrapperClassName,
  fallback,
  aspectRatio = 'aspect-[16/9]',
  objectFit = 'object-cover',
  width,
  height,
}) {
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState(false)
  const { ref, inView } = useInView({ triggerOnce: true, rootMargin: '200px' })

  if (!src || error) {
    return (
      <div ref={ref} className={cn('bg-juve-black flex items-center justify-center', aspectRatio, wrapperClassName)}>
        {fallback || <span className="font-display text-juve-gold text-4xl font-bold opacity-40">J</span>}
      </div>
    )
  }

  return (
    <div ref={ref} className={cn('relative overflow-hidden', aspectRatio, wrapperClassName)}>
      {/* Blur placeholder shown while loading */}
      <div
        className={cn(
          'absolute inset-0 bg-gray-200 transition-opacity duration-500',
          loaded ? 'opacity-0' : 'opacity-100'
        )}
        style={{
          backgroundImage: 'linear-gradient(135deg, #1a1a1a 0%, #3a3a3a 50%, #1a1a1a 100%)',
          backgroundSize: '200% 200%',
          animation: loaded ? 'none' : 'shimmer 1.5s infinite',
        }}
      />

      {inView && (
        <img
          src={src}
          alt={alt}
          loading="lazy"
          decoding="async"
          {...(width ? { width } : {})}
          {...(height ? { height } : {})}
          onLoad={() => setLoaded(true)}
          onError={() => setError(true)}
          className={cn(
            'w-full h-full transition-opacity duration-500',
            objectFit,
            loaded ? 'opacity-100' : 'opacity-0',
            className
          )}
        />
      )}

      <style>{`
        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
    </div>
  )
}
