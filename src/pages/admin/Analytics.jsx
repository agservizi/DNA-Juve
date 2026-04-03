import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, Legend,
} from 'recharts'
import { supabase } from '@/lib/supabase'
import { formatViews, formatDate } from '@/lib/utils'
import { TrendingUp, Eye, FileText, Loader2 } from 'lucide-react'

// Top articles by views
async function getTopArticles() {
  const { data } = await supabase
    .from('articles')
    .select('id, title, views, published_at, categories(name, color)')
    .eq('status', 'published')
    .order('views', { ascending: false })
    .limit(10)
  return data || []
}

// Articles per category
async function getArticlesPerCategory() {
  const { data } = await supabase
    .from('articles')
    .select('categories(name, color)')
    .eq('status', 'published')
  const counts = {}
  ;(data || []).forEach(a => {
    const cat = a.categories?.name || 'Senza categoria'
    const color = a.categories?.color || '#888'
    counts[cat] = { count: (counts[cat]?.count || 0) + 1, color }
  })
  return Object.entries(counts).map(([name, { count, color }]) => ({ name, count, color }))
}

// Articles per month (last 6 months)
async function getArticlesPerMonth() {
  const { data } = await supabase
    .from('articles')
    .select('published_at')
    .eq('status', 'published')
    .order('published_at', { ascending: true })
  const months = {}
  ;(data || []).forEach(a => {
    if (!a.published_at) return
    const key = a.published_at.slice(0, 7) // YYYY-MM
    months[key] = (months[key] || 0) + 1
  })
  const sorted = Object.entries(months).sort(([a], [b]) => a.localeCompare(b)).slice(-6)
  return sorted.map(([month, count]) => ({
    month: new Date(month + '-01').toLocaleDateString('it-IT', { month: 'short', year: '2-digit' }),
    articoli: count,
  }))
}

const CHART_COLORS = ['#F5A623', '#000000', '#1a56db', '#057a55', '#7e3af2', '#e02424']

function SectionLabel({ icon: Icon, title }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <Icon className="h-4 w-4 text-juve-gold" />
      <h2 className="text-sm font-black uppercase tracking-wider">{title}</h2>
    </div>
  )
}

export default function Analytics() {
  const { data: topArticles = [], isLoading: l1 } = useQuery({ queryKey: ['top-articles'], queryFn: getTopArticles })
  const { data: perCategory = [], isLoading: l2 } = useQuery({ queryKey: ['per-category'], queryFn: getArticlesPerCategory })
  const { data: perMonth = [], isLoading: l3 } = useQuery({ queryKey: ['per-month'], queryFn: getArticlesPerMonth })

  const totalViews = topArticles.reduce((s, a) => s + (a.views || 0), 0)

  return (
    <div>
      <div className="mb-8">
        <h1 className="font-display text-2xl font-black">Analytics</h1>
        <p className="text-sm text-gray-500 mt-1">Statistiche del magazine</p>
      </div>

      {(l1 || l2 || l3) ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-8 w-8 animate-spin text-juve-gold" />
        </div>
      ) : (
        <div className="space-y-8">
          {/* Summary */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {[
              { label: 'Views totali (top 10)', value: formatViews(totalViews), icon: Eye },
              { label: 'Articoli pubblicati', value: topArticles.length, icon: FileText },
              { label: 'Categorie attive', value: perCategory.length, icon: TrendingUp },
            ].map(({ label, value, icon: Icon }, i) => (
              <motion.div key={label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}
                className="bg-white border border-gray-200 p-5">
                <div className="flex items-center gap-2 mb-2">
                  <Icon className="h-4 w-4 text-juve-gold" />
                  <span className="text-xs text-gray-500 uppercase tracking-wider">{label}</span>
                </div>
                <p className="font-display text-2xl font-black">{value}</p>
              </motion.div>
            ))}
          </div>

          {/* Articles per month */}
          {perMonth.length > 0 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="bg-white border border-gray-200 p-6">
              <SectionLabel icon={TrendingUp} title="Articoli pubblicati per mese" />
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={perMonth} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ fontSize: 12, border: '1px solid #e5e5e5' }}
                    formatter={(v) => [`${v} articoli`, '']}
                  />
                  <Bar dataKey="articoli" fill="#F5A623" radius={[2, 2, 0, 0]} maxBarSize={50} />
                </BarChart>
              </ResponsiveContainer>
            </motion.div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top articles by views */}
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="bg-white border border-gray-200 p-6">
              <SectionLabel icon={Eye} title="Articoli più letti" />
              <div className="space-y-3">
                {topArticles.slice(0, 8).map((article, i) => (
                  <div key={article.id} className="flex items-center gap-3">
                    <span className="shrink-0 w-5 text-xs font-bold text-gray-400">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{article.title}</p>
                      {article.categories && (
                        <span className="text-xs font-bold" style={{ color: article.categories.color }}>{article.categories.name}</span>
                      )}
                    </div>
                    <div className="shrink-0 text-right">
                      <div className="flex items-center gap-1 text-sm font-bold text-juve-black">
                        <Eye className="h-3.5 w-3.5 text-gray-400" />
                        {formatViews(article.views || 0)}
                      </div>
                    </div>
                  </div>
                ))}
                {topArticles.length === 0 && <p className="text-sm text-gray-400 text-center py-6">Nessun dato disponibile</p>}
              </div>
            </motion.div>

            {/* Articles per category (Pie) */}
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }} className="bg-white border border-gray-200 p-6">
              <SectionLabel icon={FileText} title="Articoli per categoria" />
              {perCategory.length > 0 ? (
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie
                      data={perCategory}
                      dataKey="count"
                      nameKey="name"
                      cx="50%"
                      cy="45%"
                      outerRadius={90}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      labelLine={false}
                      fontSize={11}
                    >
                      {perCategory.map((entry, i) => (
                        <Cell key={entry.name} fill={entry.color || CHART_COLORS[i % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v) => [`${v} articoli`]} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-sm text-gray-400 text-center py-12">Nessun dato disponibile</p>
              )}
            </motion.div>
          </div>
        </div>
      )}
    </div>
  )
}
