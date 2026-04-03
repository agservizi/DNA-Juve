import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Home, ArrowLeft, Search } from 'lucide-react'
import SEO from '@/components/blog/SEO'

export default function NotFound() {
  const navigate = useNavigate()

  return (
    <>
      <SEO title="Pagina non trovata" noindex />
      <div className="min-h-[70vh] flex items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center max-w-lg"
        >
          {/* Big 404 */}
          <div className="relative mb-8">
            <span className="font-display text-[160px] font-black leading-none text-gray-100 select-none">
              404
            </span>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="flex items-baseline gap-2">
                <span className="font-display text-4xl font-black text-juve-black">DNA</span>
                <span className="font-display text-4xl font-black text-juve-gold">JUVE</span>
              </div>
            </div>
          </div>

          <div className="h-1 w-16 bg-juve-gold mx-auto mb-6" />

          <h1 className="font-display text-2xl font-black text-juve-black mb-3">
            Questa pagina non esiste
          </h1>
          <p className="text-gray-500 text-sm leading-relaxed mb-8">
            L'articolo o la pagina che stai cercando potrebbe essere stata rimossa,
            rinominata o temporaneamente non disponibile.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="flex items-center gap-2 px-5 py-2.5 border-2 border-juve-black text-sm font-bold hover:bg-juve-black hover:text-white transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Torna indietro
            </button>
            <Link
              to="/"
              className="flex items-center gap-2 px-5 py-2.5 bg-juve-black text-white text-sm font-bold hover:bg-juve-gold hover:text-black transition-colors"
            >
              <Home className="h-4 w-4" />
              Home
            </Link>
            <Link
              to="/cerca"
              className="flex items-center gap-2 px-5 py-2.5 bg-juve-gold text-black text-sm font-bold hover:bg-juve-gold-dark transition-colors"
            >
              <Search className="h-4 w-4" />
              Cerca articoli
            </Link>
          </div>
        </motion.div>
      </div>
    </>
  )
}
