import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Search as SearchIcon } from 'lucide-react'
import { searchArticles } from '@/lib/supabase'
import ArticleGrid from '@/components/blog/ArticleGrid'
import SEO from '@/components/blog/SEO'

export default function Search() {
  const [searchParams, setSearchParams] = useSearchParams()
  const q = searchParams.get('q') || ''
  const [input, setInput] = useState(q)

  useEffect(() => { setInput(q) }, [q])

  const { data: results = [], isLoading } = useQuery({
    queryKey: ['search', q],
    queryFn: async () => {
      if (!q.trim()) return []
      const { data } = await searchArticles(q)
      return data || []
    },
    enabled: !!q.trim(),
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    if (input.trim()) setSearchParams({ q: input.trim() })
  }

  return (
    <>
      <SEO
        title={q ? `Ricerca: ${q}` : 'Cerca nel Magazine'}
        description="Ricerca interna tra articoli, analisi e notizie del magazine BianconeriHub."
        url={q ? `/cerca?q=${encodeURIComponent(q)}` : '/cerca'}
        noindex
      />

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Search form */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-2xl mb-10"
        >
          <h1 className="font-display text-2xl sm:text-3xl font-black mb-6">Cerca nel Magazine</h1>
          <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 sm:gap-0">
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Cerca articoli, notizie, analisi..."
              className="flex-1 border-2 border-juve-black px-4 py-3 text-base focus:outline-none focus:border-juve-gold sm:border-r-0"
            />
            <button
              type="submit"
              className="bg-juve-black text-white px-6 py-3 font-bold uppercase tracking-widest text-sm hover:bg-juve-gold hover:text-black transition-colors sm:min-w-[76px]"
            >
              <SearchIcon className="h-5 w-5" />
            </button>
          </form>
        </motion.div>

        {q && (
          <div className="mb-6">
            <p className="text-sm text-gray-500">
              {isLoading ? 'Ricerca in corso…' : `${results.length} risultat${results.length === 1 ? 'o' : 'i'} per `}
              {!isLoading && <strong className="text-juve-black">"{q}"</strong>}
            </p>
          </div>
        )}

        {!q ? (
          <div className="text-center py-24 text-gray-400">
            <SearchIcon className="h-12 w-12 mx-auto mb-4 opacity-30" />
            <p className="font-display text-xl">Inserisci un termine per cercare</p>
          </div>
        ) : (
          <ArticleGrid articles={results} loading={isLoading} />
        )}
      </div>
    </>
  )
}
