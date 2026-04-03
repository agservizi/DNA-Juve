import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { TrendingUp, Tag, Flame } from 'lucide-react'
import { getPublishedArticles, getCategories, supabase } from '@/lib/supabase'
import ArticleCard from './ArticleCard'
import Newsletter from './Newsletter'
import MatchCountdown from './MatchCountdown'
import StandingsWidget from './StandingsWidget'
import PollWidget from './PollWidget'
import Leaderboard from './Leaderboard'
import TransferWidget from './TransferWidget'

export default function Sidebar() {
  const { data: latestData } = useQuery({
    queryKey: ['articles-latest-sidebar'],
    queryFn: async () => {
      const { data } = await getPublishedArticles({ limit: 5 })
      return data || []
    },
  })

  const { data: mostViewed } = useQuery({
    queryKey: ['articles-most-viewed'],
    queryFn: async () => {
      const { data } = await supabase
        .from('articles')
        .select('id, title, slug, cover_image, published_at, views, categories(name, slug, color)')
        .eq('status', 'published')
        .order('views', { ascending: false })
        .limit(5)
      return data || []
    },
  })

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const { data } = await getCategories()
      return data || []
    },
  })

  return (
    <aside className="space-y-8">
      {/* Match Countdown */}
      <MatchCountdown />

      {/* Latest articles */}
      <div>
        <div className="flex items-center gap-2 mb-4 pb-3 border-b-2 border-juve-black">
          <TrendingUp className="h-4 w-4 text-juve-gold" />
          <h3 className="text-xs font-black uppercase tracking-widest">Ultime Notizie</h3>
        </div>
        <div className="space-y-4">
          {(latestData || []).map((article, i) => (
            <ArticleCard key={article.id} article={article} variant="horizontal" index={i} />
          ))}
        </div>
      </div>

      {/* Most viewed */}
      {mostViewed?.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-4 pb-3 border-b-2 border-juve-black">
            <Flame className="h-4 w-4 text-juve-gold" />
            <h3 className="text-xs font-black uppercase tracking-widest">Più Letti</h3>
          </div>
          <div className="space-y-4">
            {mostViewed.map((article, i) => (
              <ArticleCard key={article.id} article={article} variant="horizontal" index={i} />
            ))}
          </div>
        </div>
      )}

      {/* Categories */}
      <div>
        <div className="flex items-center gap-2 mb-4 pb-3 border-b-2 border-juve-black">
          <Tag className="h-4 w-4 text-juve-gold" />
          <h3 className="text-xs font-black uppercase tracking-widest">Categorie</h3>
        </div>
        <div className="flex flex-wrap gap-2">
          {(categories || []).map((cat, i) => (
            <motion.div
              key={cat.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.05 }}
            >
              <Link
                to={`/categoria/${cat.slug}`}
                className="inline-block px-3 py-1.5 text-xs font-bold uppercase tracking-wider border-2 border-juve-black hover:bg-juve-black hover:text-white transition-colors"
              >
                {cat.name}
              </Link>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Poll */}
      <PollWidget />

      {/* Leaderboard */}
      <Leaderboard variant="compact" />

      {/* Standings */}
      <StandingsWidget />

      {/* Transfer countdown + rumors */}
      <TransferWidget />

      {/* Social promo banner */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-juve-black text-white p-6 text-center"
      >
        <div className="flex items-baseline justify-center gap-1 mb-2">
          <span className="font-display text-2xl font-black">DNA</span>
          <span className="font-display text-2xl font-black text-juve-gold">JUVE</span>
        </div>
        <p className="text-xs text-gray-400 leading-relaxed mb-4">
          Segui il magazine su tutti i social per non perdere nessuna notizia bianconera
        </p>
        <div className="h-px bg-juve-gold opacity-30 mb-4" />
        <p className="text-xs font-bold uppercase tracking-widest text-juve-gold">
          #FINOALLAFINE
        </p>
      </motion.div>

      {/* Newsletter */}
      <Newsletter variant="inline" />
    </aside>
  )
}
