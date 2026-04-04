import { motion } from 'framer-motion'
import { Users, Target, Heart, Award } from 'lucide-react'
import SEO from '@/components/blog/SEO'

const VALUES = [
  { icon: Target, title: 'Indipendenza', desc: 'Un magazine libero, senza vincoli editoriali. Raccontiamo la Juventus con onestà e passione.' },
  { icon: Heart, title: 'Passione', desc: 'Siamo tifosi prima che giornalisti. Il DNA bianconero scorre nelle nostre vene.' },
  { icon: Award, title: 'Qualità', desc: 'Analisi approfondite, dati, tattica. Non semplici notizie, ma contenuti di valore.' },
  { icon: Users, title: 'Comunità', desc: 'BianconeriHub è la casa di chi vive il calcio con il cuore. Ogni lettore è parte della famiglia.' },
]

const TEAM = [
  { name: 'Redazione BianconeriHub', role: 'Direzione editoriale', bio: 'Il cuore pulsante del magazine. Coordinamento, pianificazione editoriale e controllo qualità di ogni contenuto pubblicato.' },
  { name: 'Marco Bianchi', role: 'Giornalista sportivo', bio: 'Analista tattico e appassionato di dati. Si occupa di formazioni, analisi post-partita e approfondimenti tecnici.' },
]

export default function ChiSiamo() {
  return (
    <>
      <SEO title="Chi siamo" url="/chi-siamo" />

      {/* Hero */}
      <section className="bg-juve-black text-white py-16 sm:py-20 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <div className="flex items-baseline justify-center gap-1 mb-4 flex-wrap">
              <span className="font-display text-3xl sm:text-5xl font-black">BIANCONERI</span>
              <span className="font-display text-3xl sm:text-5xl font-black text-juve-gold">HUB</span>
            </div>
            <div className="h-0.5 w-16 bg-juve-gold mx-auto my-6" />
            <p className="text-base sm:text-lg text-gray-300 leading-relaxed">
              Il magazine digitale bianconero. Nato dalla passione, guidato dalla qualità.
            </p>
          </motion.div>
        </div>
      </section>

      <div className="max-w-4xl mx-auto px-4 py-16 space-y-20">
        {/* Mission */}
        <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <div className="flex items-center gap-3 mb-6">
            <div className="h-6 w-1.5 bg-juve-gold" />
            <h2 className="text-xs font-black uppercase tracking-[0.2em] text-gray-500">La nostra missione</h2>
            <div className="flex-1 h-px bg-gray-200" />
          </div>
          <div className="prose prose-lg max-w-none">
            <p>
              <strong>BianconeriHub</strong> nasce con un obiettivo chiaro: offrire ai tifosi della Juventus un punto di
              riferimento editoriale di qualità. Non un semplice aggregatore di notizie, ma un vero e proprio magazine
              digitale dove ogni articolo è curato, ogni analisi è approfondita, ogni opinione è argomentata.
            </p>
            <p>
              Crediamo che il tifoso bianconero meriti contenuti all'altezza della storia del club che ama.
              Per questo lavoriamo ogni giorno per alzare l'asticella, con analisi tattiche basate sui dati,
              approfondimenti di mercato verificati e interviste esclusive.
            </p>
          </div>
        </motion.section>

        {/* Values */}
        <section>
          <div className="flex items-center gap-3 mb-8">
            <div className="h-6 w-1.5 bg-juve-gold" />
            <h2 className="text-xs font-black uppercase tracking-[0.2em] text-gray-500">I nostri valori</h2>
            <div className="flex-1 h-px bg-gray-200" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {VALUES.map(({ icon: Icon, title, desc }, i) => (
              <motion.div
                key={title}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + i * 0.1 }}
                className="border border-gray-200 p-6"
              >
                <Icon className="h-6 w-6 text-juve-gold mb-3" />
                <h3 className="font-display text-lg font-bold mb-2">{title}</h3>
                <p className="text-sm text-gray-600 leading-relaxed">{desc}</p>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Team */}
        <section>
          <div className="flex items-center gap-3 mb-8">
            <div className="h-6 w-1.5 bg-juve-gold" />
            <h2 className="text-xs font-black uppercase tracking-[0.2em] text-gray-500">La redazione</h2>
            <div className="flex-1 h-px bg-gray-200" />
          </div>
          <div className="space-y-6">
            {TEAM.map((member, i) => (
              <motion.div
                key={member.name}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 + i * 0.1 }}
                className="flex gap-5 items-start border-l-4 border-juve-gold pl-5"
              >
                <div className="w-14 h-14 bg-juve-black flex items-center justify-center shrink-0">
                  <span className="font-display text-xl font-black text-juve-gold">
                    {member.name[0]}
                  </span>
                </div>
                <div>
                  <h3 className="font-display text-lg font-bold">{member.name}</h3>
                  <p className="text-xs font-bold uppercase tracking-widest text-juve-gold mb-2">{member.role}</p>
                  <p className="text-sm text-gray-600 leading-relaxed">{member.bio}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Contact */}
        <section className="bg-gray-50 border border-gray-200 p-6 sm:p-8 text-center">
          <h2 className="font-display text-xl sm:text-2xl font-bold mb-3">Vuoi collaborare?</h2>
          <p className="text-gray-600 text-sm mb-5">
            Siamo sempre alla ricerca di penne appassionate. Scrivi alla redazione per proporre i tuoi contenuti.
          </p>
          <a
            href="mailto:info@bianconerihub.com"
            className="inline-flex w-full sm:w-auto justify-center px-6 py-3 bg-juve-black text-white text-sm font-black uppercase tracking-widest hover:bg-juve-gold hover:text-black transition-colors"
          >
            Contattaci
          </a>
        </section>
      </div>
    </>
  )
}
