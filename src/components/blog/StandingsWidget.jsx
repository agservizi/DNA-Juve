import { useState } from 'react'
import { motion } from 'framer-motion'
import { TableIcon, ChevronDown, Loader2 } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { cn } from '@/lib/utils'
import { getStandings, JUVE_ID, shouldRetryFootballQuery } from '@/lib/footballApi'

// Fallback demo standings
const DEMO_STANDINGS = [
  { pos: 1, team: 'Napoli',   pts: 61, w: 18, d: 7,  l: 3, gd: '+32' },
  { pos: 2, team: 'Inter',    pts: 59, w: 17, d: 8,  l: 3, gd: '+38' },
  { pos: 3, team: 'Juventus', pts: 58, w: 17, d: 7,  l: 4, gd: '+27', isJuve: true },
  { pos: 4, team: 'Milan',    pts: 52, w: 15, d: 7,  l: 6, gd: '+18' },
  { pos: 5, team: 'Atalanta', pts: 50, w: 14, d: 8,  l: 6, gd: '+22' },
  { pos: 6, team: 'Roma',     pts: 45, w: 12, d: 9,  l: 7, gd: '+10' },
  { pos: 7, team: 'Lazio',    pts: 42, w: 11, d: 9,  l: 8, gd: '+8' },
  { pos: 8, team: 'Fiorentina', pts: 39, w: 10, d: 9, l: 9, gd: '+5' },
]

function mapStandings(apiTable) {
  return apiTable.map(row => ({
    pos: row.position,
    team: row.team.shortName || row.team.name,
    pts: row.points,
    w: row.won,
    d: row.draw,
    l: row.lost,
    gd: row.goalDifference > 0 ? `+${row.goalDifference}` : String(row.goalDifference),
    isJuve: row.team.id === JUVE_ID,
  }))
}

export default function StandingsWidget() {
  const [showAll, setShowAll] = useState(false)

  const { data: apiTable, isLoading } = useQuery({
    queryKey: ['standings', 'SA'],
    queryFn: () => getStandings('SA'),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: shouldRetryFootballQuery,
  })

  const allRows = apiTable ? mapStandings(apiTable) : DEMO_STANDINGS
  const rows = showAll ? allRows : allRows.slice(0, 8)

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="border border-gray-200"
    >
      <div className="flex items-center gap-2 px-4 py-3 border-b-2 border-juve-black">
        <TableIcon className="h-4 w-4 text-juve-gold" />
        <h3 className="text-xs font-black uppercase tracking-widest">Classifica Serie A</h3>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-juve-gold" />
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-[380px] w-full text-xs">
            <thead>
              <tr className="bg-gray-50 text-gray-500">
                <th className="text-left px-3 py-2 font-bold">#</th>
                <th className="text-left px-2 py-2 font-bold">Squadra</th>
                <th className="text-center px-2 py-2 font-bold">V</th>
                <th className="text-center px-2 py-2 font-bold">P</th>
                <th className="text-center px-2 py-2 font-bold">S</th>
                <th className="text-center px-2 py-2 font-bold">DR</th>
                <th className="text-right px-3 py-2 font-bold">Pt</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr
                  key={row.team}
                  className={cn(
                    'border-t border-gray-100 transition-colors',
                    row.isJuve ? 'bg-juve-gold/10 font-bold' : 'hover:bg-gray-50'
                  )}
                >
                  <td className={cn('px-3 py-2', row.pos <= 4 && 'text-juve-gold font-bold')}>{row.pos}</td>
                  <td className={cn('px-2 py-2', row.isJuve && 'text-juve-black')}>{row.team}</td>
                  <td className="text-center px-2 py-2 text-gray-600">{row.w}</td>
                  <td className="text-center px-2 py-2 text-gray-600">{row.d}</td>
                  <td className="text-center px-2 py-2 text-gray-600">{row.l}</td>
                  <td className="text-center px-2 py-2 text-gray-500">{row.gd}</td>
                  <td className={cn('text-right px-3 py-2 font-bold', row.isJuve ? 'text-juve-gold' : 'text-juve-black')}>{row.pts}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex flex-col gap-2 border-t border-gray-100 bg-gray-50 px-4 py-2 sm:flex-row sm:items-center sm:justify-between">
        <span className="text-[10px] text-gray-400">Le prime 4 si qualificano alla Champions League</span>
        {allRows.length > 8 && (
          <button
            onClick={() => setShowAll(!showAll)}
            className="text-[10px] font-bold text-juve-gold hover:underline flex items-center gap-0.5"
          >
            {showAll ? 'Mostra meno' : 'Mostra tutta'}
            <ChevronDown className={cn('h-3 w-3 transition-transform', showAll && 'rotate-180')} />
          </button>
        )}
      </div>
    </motion.div>
  )
}
