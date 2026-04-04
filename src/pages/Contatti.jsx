import SEO from '@/components/blog/SEO'

export default function Contatti() {
  return (
    <>
      <SEO
        title="Contatti"
        description="Contatta la redazione di BianconeriHub per segnalazioni, collaborazioni, richieste editoriali e supporto lettori."
        url="/contatti"
      />

      <div className="mx-auto max-w-4xl px-4 py-16">
        <div className="max-w-2xl">
          <p className="text-xs font-black uppercase tracking-[0.28em] text-juve-gold">Contatti</p>
          <h1 className="mt-4 font-display text-4xl font-black text-juve-black">Parla con la redazione</h1>
          <p className="mt-4 text-lg leading-relaxed text-gray-600">
            Scrivici per segnalare errori, proporre collaborazioni, inviare comunicati o chiedere supporto sul magazine.
          </p>
        </div>

        <div className="mt-10 grid gap-6 md:grid-cols-2">
          <section className="border border-gray-200 bg-white p-6">
            <h2 className="text-sm font-black uppercase tracking-wider text-juve-black">Email redazione</h2>
            <p className="mt-3 text-sm text-gray-600">Per richieste editoriali e partnership.</p>
            <a href="mailto:info@bianconerihub.com" className="mt-4 inline-block text-lg font-bold text-juve-gold hover:underline">
              info@bianconerihub.com
            </a>
          </section>

          <section className="border border-gray-200 bg-white p-6">
            <h2 className="text-sm font-black uppercase tracking-wider text-juve-black">Tempi di risposta</h2>
            <p className="mt-3 text-sm leading-relaxed text-gray-600">
              Cerchiamo di rispondere entro 2 giorni lavorativi. Per temi urgenti indica chiaramente l’oggetto del messaggio.
            </p>
          </section>
        </div>
      </div>
    </>
  )
}
