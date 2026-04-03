import { useState, useRef } from 'react'
import { X } from 'lucide-react'
import { slugify } from '@/lib/utils'

export default function TagInput({ tags = [], onChange }) {
  const [input, setInput] = useState('')
  const inputRef = useRef(null)

  const addTag = (raw) => {
    const name = raw.trim()
    if (!name) return
    const slug = slugify(name)
    if (tags.find(t => t.slug === slug)) { setInput(''); return }
    onChange([...tags, { name, slug }])
    setInput('')
  }

  const removeTag = (slug) => onChange(tags.filter(t => t.slug !== slug))

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      addTag(input)
    } else if (e.key === 'Backspace' && !input && tags.length) {
      removeTag(tags[tags.length - 1].slug)
    }
  }

  return (
    <div
      className="flex flex-wrap gap-1.5 min-h-[40px] border border-gray-300 px-2 py-1.5 cursor-text focus-within:border-juve-black"
      onClick={() => inputRef.current?.focus()}
    >
      {tags.map(tag => (
        <span
          key={tag.slug}
          className="flex items-center gap-1 bg-juve-black text-white text-xs px-2 py-1 font-medium"
        >
          #{tag.name}
          <button type="button" onClick={() => removeTag(tag.slug)} className="hover:text-juve-gold">
            <X className="h-3 w-3" />
          </button>
        </span>
      ))}
      <input
        ref={inputRef}
        value={input}
        onChange={e => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={() => addTag(input)}
        placeholder={tags.length === 0 ? 'Aggiungi tag (Enter o virgola)…' : ''}
        className="flex-1 min-w-[120px] text-sm focus:outline-none bg-transparent"
      />
    </div>
  )
}
