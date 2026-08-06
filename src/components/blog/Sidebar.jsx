import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { TrendingUp, Tag, Flame } from 'lucide-react'
import { getPublishedArticles, getCategories, supabase } from '@/lib/supabase'
import ArticleCard from './ArticleCard'
import Newsletter from './Newsletter'
import MatchCountdown from './MatchCountdown'
import StandingsWidget from './StandingsWidget'
import PollWidget from './PollWidget'
import Leaderboard from './Leaderboard'
import TransferWidget from './TransferWidget'
import InstagramProfileWidget from '@/components/layout/InstagramProfileWidget'
import Reveal from '@/components/motion/Reveal'

export default function Sidebar({ showInstagramEmbed = false }) {
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
        .select(`
          id, title, slug, cover_image, published_at, views,
          categories(name, slug, color),
          profiles(username, avatar_url),
          article_tags(tags(id, name, slug))
        `)
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
      <Reveal as="div" fromY={12}>
        <div className="flex items-center gap-2 mb-4 pb-3 border-b-2 border-juve-black">
          <TrendingUp className="h-4 w-4 text-juve-gold" />
          <h3 className="text-xs font-black uppercase tracking-widest">Ultime Notizie</h3>
        </div>
        <div className="space-y-4">
          {(latestData || []).map((article, i) => (
            <ArticleCard key={article.id} article={article} variant="horizontal" index={i} />
          ))}
        </div>
      </Reveal>

      {/* Most viewed */}
      {mostViewed?.length > 0 && (
        <Reveal as="div" fromY={12}>
          <div className="flex items-center gap-2 mb-4 pb-3 border-b-2 border-juve-black">
            <Flame className="h-4 w-4 text-juve-gold" />
            <h3 className="text-xs font-black uppercase tracking-widest">Più Letti</h3>
          </div>
          <div className="space-y-4">
            {mostViewed.map((article, i) => (
              <ArticleCard key={article.id} article={article} variant="horizontal" index={i} />
            ))}
          </div>
        </Reveal>
      )}

      {/* Categories */}
      <Reveal as="div" fromY={12}>
        <div className="flex items-center gap-2 mb-4 pb-3 border-b-2 border-juve-black">
          <Tag className="h-4 w-4 text-juve-gold" />
          <h3 className="text-xs font-black uppercase tracking-widest">Categorie</h3>
        </div>
        <div className="flex flex-wrap gap-2">
          {(categories || []).map((cat, i) => (
            <Reveal key={cat.id} as="div" fromY={8} delay={i * 0.02}>
              <Link
                to={`/categoria/${cat.slug}`}
                className="inline-block px-3 py-1.5 text-xs font-bold uppercase tracking-wider border-2 border-juve-black hover:bg-juve-black hover:text-white transition-colors"
              >
                {cat.name}
              </Link>
            </Reveal>
          ))}
        </div>
      </Reveal>

      {/* Poll */}
      <PollWidget />

      {/* Leaderboard */}
      <Leaderboard variant="compact" />

      {/* Standings */}
      <StandingsWidget />

      {/* Transfer countdown + rumors */}
      <TransferWidget />

      {showInstagramEmbed && <InstagramProfileWidget />}

      {/* Social promo banner */}
      <Reveal className="bg-juve-black text-white p-6 text-center" fromY={10}>
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
      </Reveal>

      {/* Newsletter */}
      <Newsletter variant="inline" />
    </aside>
  )
}
