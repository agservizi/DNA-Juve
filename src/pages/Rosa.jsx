import { useState } from 'react'
import { motion } from 'framer-motion'
import { Shield, ChevronRight, ArrowLeft } from 'lucide-react'
import SEO from '@/components/blog/SEO'
import { getSquadPlayers } from '@/lib/footballApi'

const ROLE_ORDER = { POR: 0, DIF: 1, CEN: 2, ATT: 3 }
const ROLE_LABELS = { POR: 'Portieri', DIF: 'Difensori', CEN: 'Centrocampisti', ATT: 'Attaccanti' }
const ROLE_COLORS = { POR: '#F5A623', DIF: '#1a56db', CEN: '#057a55', ATT: '#e02424' }
const RARITY_BORDER = { legendary: 'border-juve-gold', gold: 'border-yellow-400', silver: 'border-gray-400', bronze: 'border-amber-700' }

function PlayerCard({ player, onClick }) {
  return (
    <motion.button
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      onClick={onClick}
      className={`w-full bg-white dark:bg-[#1a1a1a] border-2 ${RARITY_BORDER[player.rarity] || 'border-gray-200'} p-4 text-left hover:border-juve-gold transition-colors group`}
    >
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 bg-gray-100 dark:bg-gray-800 flex items-center justify-center shrink-0 overflow-hidden rounded-full">
          {player.img ? (
            <img src={player.img} alt={player.name} className="w-full h-full object-cover" />
          ) : (
            <span className="font-display text-xl font-black text-juve-black dark:text-white">{player.number}</span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-display text-sm font-black text-juve-black dark:text-white truncate group-hover:text-juve-gold transition-colors">
            {player.name}
          </h3>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-[10px] uppercase tracking-widest font-bold" style={{ color: ROLE_COLORS[player.role] || '#6b7280' }}>
              {ROLE_LABELS[player.role] ? player.role : player.role}
            </span>
            {player.nat && <span className="text-sm">{player.nat}</span>}
            <span className="text-[10px] text-gray-400 dark:text-gray-500">#{player.number}</span>
          </div>
        </div>
        <ChevronRight className="h-4 w-4 text-gray-300 group-hover:text-juve-gold transition-colors shrink-0" />
      </div>
    </motion.button>
  )
}

function PlayerDetail({ player, onBack }) {
  return (
    <div>
      <button
        onClick={onBack}
        className="text-xs font-bold uppercase tracking-widest text-juve-gold hover:text-juve-gold-dark mb-4 inline-flex items-center gap-1"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Rosa
      </button>

      <div className="bg-juve-black text-white p-6 mb-4">
        <div className="flex items-center gap-4">
          <div className="w-20 h-20 bg-gray-800 flex items-center justify-center rounded-full overflow-hidden">
            {player.img ? (
              <img src={player.img} alt={player.name} className="w-full h-full object-cover" />
            ) : (
              <span className="font-display text-4xl font-black text-juve-gold">{player.number}</span>
            )}
          </div>
          <div>
            <h1 className="font-display text-2xl font-black">{player.name}</h1>
            <div className="flex items-center gap-3 mt-1">
              <span className="text-[10px] uppercase tracking-widest font-bold text-juve-gold">{ROLE_LABELS[player.role] || player.role}</span>
              {player.nat && <span className="text-lg">{player.nat}</span>}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-px bg-gray-200 dark:bg-gray-700 mb-4">
        <div className="bg-white dark:bg-[#1a1a1a] p-4 text-center">
          <div className="font-display text-2xl font-black text-juve-black dark:text-white">{player.number}</div>
          <div className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Numero</div>
        </div>
        <div className="bg-white dark:bg-[#1a1a1a] p-4 text-center">
          <div className="font-display text-2xl font-black text-juve-black dark:text-white">{ROLE_LABELS[player.role] || player.role}</div>
          <div className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Ruolo</div>
        </div>
        <div className="bg-white dark:bg-[#1a1a1a] p-4 text-center">
          <div className="font-display text-2xl font-black text-juve-black dark:text-white capitalize">{player.rarity}</div>
          <div className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Rarity</div>
        </div>
      </div>
    </div>
  )
}

export default function Rosa() {
  const [selectedPlayer, setSelectedPlayer] = useState(null)

  const squad = getSquadPlayers()
  const grouped = squad.reduce((acc, player) => {
    const role = player.role || 'ATT'
    if (!acc[role]) acc[role] = []
    acc[role].push(player)
    return acc
  }, {})

  const sortedGroups = Object.entries(grouped).sort(([a], [b]) =>
    (ROLE_ORDER[a] ?? 99) - (ROLE_ORDER[b] ?? 99)
  )

  const selectedPlayerData = selectedPlayer ? squad.find(p => p.id === selectedPlayer) : null

  return (
    <>
      <SEO title="Rosa Juventus" description="La rosa completa della Juventus: giocatori, ruoli, statistiche e informazioni dettagliate." url="/rosa" />

      <section className="bg-juve-black text-white py-10 md:py-14">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <div className="flex items-center justify-center gap-2 mb-3">
              <Shield className="h-4 w-4 text-juve-gold" />
              <span className="text-xs font-black uppercase tracking-widest text-juve-gold">Stagione {new Date().getFullYear()}/{new Date().getFullYear() + 1}</span>
            </div>
            <h1 className="font-display text-3xl sm:text-4xl md:text-5xl font-black leading-tight mb-2">ROSA</h1>
            <p className="text-sm text-gray-400 max-w-lg mx-auto">
              Juventus FC — {squad.length} giocatori in rosa
            </p>
          </motion.div>
        </div>
      </section>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {selectedPlayerData ? (
          <PlayerDetail player={selectedPlayerData} onBack={() => setSelectedPlayer(null)} />
        ) : (
          <>
            {sortedGroups.map(([role, players]) => (
              <div key={role} className="mb-6">
                <div className="flex items-center gap-2 mb-3">
                  <div className="h-5 w-1" style={{ backgroundColor: ROLE_COLORS[role] }} />
                  <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">
                    {ROLE_LABELS[role] || role} ({players.length})
                  </span>
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  {players
                    .sort((a, b) => (a.number || 99) - (b.number || 99))
                    .map(player => (
                      <PlayerCard key={player.id} player={player} onClick={() => setSelectedPlayer(player.id)} />
                    ))
                  }
                </div>
              </div>
            ))}
          </>
        )}
      </div>
    </>
  )
}
