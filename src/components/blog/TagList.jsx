import { Link } from 'react-router-dom'
import { Tag } from 'lucide-react'
import { cn } from '@/lib/utils'

export default function TagList({ tags = [], className, linked = true }) {
  if (!tags.length) return null

  return (
    <div className={cn('flex flex-wrap items-center gap-2', className)}>
      <Tag className="h-3.5 w-3.5 text-gray-400 shrink-0" />
      {tags.map(tag => (
        linked ? (
          <Link
            key={tag.id || tag.slug}
            to={`/tag/${tag.slug}`}
            className="text-xs px-2.5 py-1 border border-gray-300 text-gray-600 hover:border-juve-black hover:text-juve-black hover:bg-juve-black hover:text-white transition-all font-medium"
          >
            #{tag.name}
          </Link>
        ) : (
          <span
            key={tag.id || tag.slug}
            className="text-xs px-2.5 py-1 border border-gray-200 text-gray-500 font-medium"
          >
            #{tag.name}
          </span>
        )
      ))}
    </div>
  )
}
