import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowRight, ClipboardCheck, MessagesSquare, PenSquare, ShieldCheck } from 'lucide-react'
import SEO from '@/components/blog/SEO'

const DESKS = [
  {
    title: 'Notizie e live',
    description:
      "Seguiamo l'attualita Juventus con aggiornamenti, notizie del giorno e tutto quello che merita attenzione nel flusso quotidiano bianconero.",
  },
  {
    title: 'Analisi e approfondimenti',
    description:
      'Quando una partita o un tema lo richiedono, ci prendiamo piu spazio per analisi, opinioni ragionate e pezzi meno veloci.',
  },
  {
    title: 'Community e contributi',
    description:
      'Area Bianconera, spunti dei lettori e contributi dei tifosi: la parte piu aperta del progetto, dove la community entra davvero nel magazine.',
  },
]

const WORKFLOW = [
  {
    icon: ClipboardCheck,
    title: 'Verifica',
    description: 'Prima di pubblicare cerchiamo di controllare fonti, contesto e senso generale del pezzo, senza inseguire il rumore.',
  },
  {
    icon: PenSquare,
    title: 'Editing',
    description: 'Rileggiamo, sistemiamo e tagliamo il superfluo per mantenere una voce chiara, leggibile e coerente con il progetto.',
  },
  {
    icon: ShieldCheck,
    title: 'Onesta',
    description: 'Non siamo una testata giornalistica: puntiamo a essere seri, trasparenti e utili per chi legge, da tifosi a tifosi.',
  },
]

export default function Redazione() {
  return (
    <>
      <SEO
        title="Redazione"
        description="Scopri come lavora la redazione di BianconeriHub: un progetto editoriale di tifosi tra notizie, approfondimenti e community."
        url="/redazione"
      />

      <section className="bg-juve-black px-4 py-16 text-white sm:py-20">
        <div className="mx-auto max-w-5xl">
          <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }}>
            <p className="text-xs font-black uppercase tracking-[0.28em] text-juve-gold">Redazione</p>
            <h1 className="mt-4 max-w-3xl font-display text-4xl font-black sm:text-5xl">
              Un gruppo di tifosi che prova a raccontare la Juventus con ordine, passione e buon senso.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-relaxed text-gray-300 sm:text-lg">
              BianconeriHub e un blog di tifosi, non un giornale tradizionale. Dietro ai contenuti c'e una piccola
              redazione che seleziona temi, rilegge i pezzi e cerca di dare una forma chiara alla passione bianconera.
            </p>
          </motion.div>
        </div>
      </section>

      <div className="mx-auto max-w-5xl space-y-16 px-4 py-16">
        <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-start">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.24em] text-juve-gold">Chi siamo davvero</p>
            <h2 className="mt-3 font-display text-3xl font-black text-juve-black">Come lavoriamo senza fingere di essere una newsroom</h2>
            <p className="mt-4 max-w-2xl text-base leading-relaxed text-gray-600">
              Seguiamo la Juventus ogni giorno e proviamo a trasformare quella presenza costante in contenuti ordinati,
              leggibili e con un minimo di filtro. Alcuni pezzi nascono sull'onda della giornata, altri richiedono piu
              calma, ma l'idea resta la stessa: pubblicare cose che avremmo voglia di leggere noi per primi.
            </p>
          </div>

          <div className="border border-gray-200 bg-gray-50 p-6">
            <div className="flex items-start gap-3">
              <MessagesSquare className="mt-0.5 h-5 w-5 text-juve-gold" />
              <div>
                <p className="text-sm font-black uppercase tracking-wider text-juve-black">Il nostro taglio</p>
                <p className="mt-2 text-sm leading-relaxed text-gray-600">
                  Meno toni da comunicato, meno frasi gonfiate, piu attenzione al contesto. Se la community porta uno
                  spunto buono, per noi ha senso farlo entrare davvero nel progetto.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section>
          <div className="flex items-center gap-3">
            <div className="h-6 w-1.5 bg-juve-gold" />
            <h2 className="text-xs font-black uppercase tracking-[0.2em] text-gray-500">Le aree che seguiamo</h2>
            <div className="h-px flex-1 bg-gray-200" />
          </div>

          <div className="mt-8 grid gap-6 md:grid-cols-3">
            {DESKS.map((desk, index) => (
              <motion.article
                key={desk.title}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.08 * index }}
                className="border border-gray-200 bg-white p-6"
              >
                <p className="text-xs font-black uppercase tracking-[0.22em] text-juve-gold">Area {index + 1}</p>
                <h3 className="mt-3 font-display text-xl font-black text-juve-black">{desk.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-gray-600">{desk.description}</p>
              </motion.article>
            ))}
          </div>
        </section>

        <section>
          <div className="flex items-center gap-3">
            <div className="h-6 w-1.5 bg-juve-gold" />
            <h2 className="text-xs font-black uppercase tracking-[0.2em] text-gray-500">Come passano i contenuti</h2>
            <div className="h-px flex-1 bg-gray-200" />
          </div>

          <div className="mt-8 grid gap-6 md:grid-cols-3">
            {WORKFLOW.map(({ icon: Icon, title, description }, index) => (
              <motion.div
                key={title}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + index * 0.08 }}
                className="border border-gray-200 bg-white p-6"
              >
                <Icon className="h-6 w-6 text-juve-gold" />
                <h3 className="mt-4 font-display text-xl font-black text-juve-black">{title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-gray-600">{description}</p>
              </motion.div>
            ))}
          </div>
        </section>

        <section className="border border-gray-200 bg-gray-50 p-6 sm:p-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <p className="text-xs font-black uppercase tracking-[0.24em] text-juve-gold">Collaborazioni</p>
              <h2 className="mt-3 font-display text-2xl font-black text-juve-black sm:text-3xl">
                Hai una segnalazione o vuoi dare una mano al progetto?
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-gray-600 sm:text-base">
                Puoi scriverci per condividere uno spunto, proporre un contributo o raccontarci come vorresti vedere
                crescere il blog. Se c'e sintonia, si costruisce qualcosa.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Link
                to="/contatti"
                className="inline-flex items-center justify-center gap-2 bg-juve-black px-5 py-3 text-xs font-black uppercase tracking-widest text-white transition-colors hover:bg-juve-gold hover:text-black"
              >
                Contatta la redazione
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to="/area-bianconera"
                className="inline-flex items-center justify-center gap-2 border border-juve-black px-5 py-3 text-xs font-black uppercase tracking-widest text-juve-black transition-colors hover:border-juve-gold hover:text-juve-gold"
              >
                Vai in Area Bianconera
              </Link>
            </div>
          </div>
        </section>
      </div>
    </>
  )
}