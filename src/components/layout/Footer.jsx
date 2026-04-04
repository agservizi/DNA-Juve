import { Link } from 'react-router-dom'
import { Mail, ArrowRight } from 'lucide-react'

const editorialHighlights = [
  { label: 'Notizie Live', to: '/notizie-live' },
  { label: 'Calciomercato', to: '/calciomercato' },
  { label: 'Area Bianconera', to: '/area-bianconera' },
]

export default function Footer() {
  return (
    <footer className="bg-juve-black text-white mt-16">
      {/* Gold top border */}
      <div className="h-1 bg-juve-gold" />

      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="md:col-span-2">
            <div className="flex items-baseline gap-1 mb-3">
              <span className="font-display text-3xl font-black text-white">BIANCONERI</span>
              <span className="font-display text-3xl font-black text-juve-gold">HUB</span>
            </div>
            <p className="text-gray-400 text-sm leading-relaxed max-w-xs">
              Il magazine digitale dedicato alla Juventus. Analisi, notizie, mercato
              e tanto altro dalla redazione bianconera.
            </p>
            <div className="mt-6 max-w-md border border-white/10 bg-white/5 p-4">
              <p className="text-[11px] font-black uppercase tracking-[0.22em] text-juve-gold">
                Da Seguire
              </p>
              <p className="mt-2 text-sm text-gray-300 leading-relaxed">
                Un accesso rapido alle aree piu calde del magazine, tra aggiornamenti,
                mercato e contenuti per la community bianconera.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {editorialHighlights.map((item) => (
                  <Link
                    key={item.label}
                    to={item.to}
                    className="inline-flex items-center gap-2 border border-gray-700 px-3 py-2 text-xs font-bold uppercase tracking-wider text-gray-200 transition-colors hover:border-juve-gold hover:text-juve-gold"
                  >
                    {item.label}
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                ))}
              </div>
            </div>
          </div>

          {/* Navigation */}
          <div>
            <h4 className="text-xs font-black uppercase tracking-widest text-juve-gold mb-4">Sezioni</h4>
            <ul className="space-y-2">
              {['Home', 'Calcio', 'Mercato', 'Champions', 'Serie A', 'Interviste'].map((item) => (
                <li key={item}>
                  <Link
                    to={item === 'Home' ? '/' : `/categoria/${item.toLowerCase().replace(' ', '-')}`}
                    className="text-sm text-gray-400 hover:text-juve-gold transition-colors"
                  >
                    {item}
                  </Link>
                </li>
              ))}
              <li>
                <Link to="/calciomercato" className="text-sm text-gray-400 hover:text-juve-gold transition-colors">
                  Calciomercato
                </Link>
              </li>
              <li>
                <Link to="/calendario" className="text-sm text-gray-400 hover:text-juve-gold transition-colors">
                  Calendario
                </Link>
              </li>
            </ul>
          </div>

          {/* Info */}
          <div>
            <h4 className="text-xs font-black uppercase tracking-widest text-juve-gold mb-4">Magazine</h4>
            <ul className="space-y-2">
              {[
                { label: 'Chi siamo', to: '/chi-siamo' },
                { label: 'Redazione', to: '/chi-siamo' },
                { label: 'Contatti', to: '/contatti' },
                { label: 'FAQ', to: '/faq' },
                { label: 'Termini', to: '/termini' },
                { label: 'Privacy Policy', to: '/privacy' },
                { label: 'Cookie Policy', to: '/cookie-policy' },
              ].map((item) => (
                <li key={item.label}>
                  <Link to={item.to} className="text-sm text-gray-400 hover:text-juve-gold transition-colors">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
            <div className="mt-5">
              <a href="mailto:info@bianconerihub.com" className="flex items-center gap-2 text-sm text-gray-400 hover:text-juve-gold transition-colors">
                <Mail className="h-4 w-4" />
                info@bianconerihub.com
              </a>
            </div>
          </div>
        </div>

        <div className="border-t border-gray-800 mt-10 pt-6 flex flex-col md:flex-row items-center justify-between gap-3">
          <p className="text-xs text-gray-600">
            &copy; {new Date().getFullYear()} BianconeriHub Magazine. Tutti i diritti riservati.
          </p>
          <p className="text-xs text-gray-700 italic">
            Questo sito non è affiliato con Juventus F.C.
          </p>
        </div>
      </div>
    </footer>
  )
}
