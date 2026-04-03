import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { FileText, Eye, Tag, TrendingUp, PlusCircle, ChevronRight, Edit } from 'lucide-react'
import { getDashboardStats, getAllArticles } from '@/lib/supabase'
import { formatDate, formatViews } from '@/lib/utils'

function StatCard({ icon: Icon, label, value, color, delay }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="bg-white border border-gray-200 p-6"
    >
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm font-bold text-gray-500 uppercase tracking-wider">{label}</span>
        <div className="w-10 h-10 flex items-center justify-center" style={{ backgroundColor: color + '20' }}>
          <Icon className="h-5 w-5" style={{ color }} />
        </div>
      </div>
      <p className="font-display text-3xl font-black text-juve-black">{value}</p>
    </motion.div>
  )
}

export default function Dashboard() {
  const { data: stats } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: getDashboardStats,
  })

  const { data: articles = [] } = useQuery({
    queryKey: ['all-articles'],
    queryFn: async () => {
      const { data } = await getAllArticles()
      return data || []
    },
  })

  const statCards = [
    { icon: FileText, label: 'Articoli Pubblicati', value: stats?.published ?? '—', color: '#10B981', delay: 0.1 },
    { icon: FileText, label: 'Bozze', value: stats?.drafts ?? '—', color: '#F59E0B', delay: 0.15 },
    { icon: Eye, label: 'Visualizzazioni totali', value: stats?.views ? formatViews(stats.views) : '—', color: '#3B82F6', delay: 0.2 },
    { icon: Tag, label: 'Categorie', value: stats?.categories ?? '—', color: '#8B5CF6', delay: 0.25 },
  ]

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-display text-2xl font-black text-juve-black">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">Panoramica del magazine</p>
        </div>
        <Link
          to="/admin/articoli/nuovo"
          className="flex items-center gap-2 bg-juve-gold text-black px-5 py-2.5 text-sm font-black uppercase tracking-wider hover:bg-juve-gold-dark transition-colors"
        >
          <PlusCircle className="h-4 w-4" />
          Nuovo articolo
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {statCards.map(card => <StatCard key={card.label} {...card} />)}
      </div>

      {/* Recent articles */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-white border border-gray-200"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-juve-gold" />
            <h2 className="font-bold text-sm uppercase tracking-wider">Articoli Recenti</h2>
          </div>
          <Link to="/admin/articoli" className="text-xs text-juve-gold hover:underline flex items-center gap-1">
            Vedi tutti <ChevronRight className="h-3 w-3" />
          </Link>
        </div>

        <div className="divide-y divide-gray-50">
          {articles.slice(0, 8).map((article, i) => (
            <motion.div
              key={article.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 + i * 0.04 }}
              className="flex items-center gap-4 px-6 py-3 hover:bg-gray-50 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-juve-black truncate">{article.title}</p>
                <div className="flex items-center gap-3 mt-0.5">
                  {article.categories && (
                    <span className="text-xs font-bold" style={{ color: article.categories.color || '#F5A623' }}>
                      {article.categories.name}
                    </span>
                  )}
                  <span className="text-xs text-gray-400">{formatDate(article.created_at)}</span>
                </div>
              </div>
              <span className={`shrink-0 text-xs px-2 py-0.5 font-bold uppercase tracking-wider ${
                article.status === 'published'
                  ? 'bg-green-100 text-green-700'
                  : 'bg-amber-100 text-amber-700'
              }`}>
                {article.status === 'published' ? 'Pub.' : 'Bozza'}
              </span>
              {article.views > 0 && (
                <span className="shrink-0 text-xs text-gray-400 flex items-center gap-1">
                  <Eye className="h-3 w-3" />
                  {formatViews(article.views)}
                </span>
              )}
              <Link
                to={`/admin/articoli/${article.id}/modifica`}
                className="shrink-0 p-1.5 hover:bg-gray-200 transition-colors text-gray-500 hover:text-juve-black"
              >
                <Edit className="h-4 w-4" />
              </Link>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </div>
  )
}
