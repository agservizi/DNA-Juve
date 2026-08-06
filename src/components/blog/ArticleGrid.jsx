import ArticleCard from './ArticleCard'
import { Loader2 } from 'lucide-react'
import Reveal from '@/components/motion/Reveal'

export default function ArticleGrid({ articles = [], loading = false, title, subtitle }) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-juve-gold" />
      </div>
    )
  }

  return (
    <section>
      {(title || subtitle) && (
        <Reveal className="flex items-center gap-3 mb-6" fromY={10}>
          <div className="h-6 w-1.5 bg-juve-gold" />
          <div>
            {title && <h2 className="text-xs font-black uppercase tracking-[0.2em] text-gray-500">{title}</h2>}
            {subtitle && <p className="text-sm text-gray-400 mt-0.5">{subtitle}</p>}
          </div>
          <div className="flex-1 h-px bg-gray-200" />
        </Reveal>
      )}

      {articles.length === 0 ? (
        <Reveal className="text-center py-20 text-gray-400" fromY={10}>
          <p className="font-display text-2xl font-bold mb-2">Nessun articolo trovato</p>
          <p className="text-sm">Non ci sono ancora articoli in questa sezione.</p>
        </Reveal>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-px bg-gray-200">
          {articles.map((article, i) => (
            <div key={article.id} className="bg-white">
              <ArticleCard article={article} index={i} />
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
