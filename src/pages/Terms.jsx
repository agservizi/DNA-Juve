import SEO from '@/components/blog/SEO'

export default function Terms() {
  return (
    <>
      <SEO title="Termini di utilizzo" description="Termini di utilizzo del magazine BianconeriHub." url="/termini" noindex />

      <div className="mx-auto max-w-4xl px-4 py-16">
        <p className="text-xs font-black uppercase tracking-[0.28em] text-juve-gold">Termini</p>
        <h1 className="mt-4 font-display text-4xl font-black text-juve-black">Termini di utilizzo</h1>

        <div className="mt-10 space-y-8 text-sm leading-7 text-gray-700">
          <section>
            <h2 className="text-lg font-black text-juve-black">Uso dei contenuti</h2>
            <p className="mt-3">
              I contenuti del magazine sono destinati a consultazione personale e informativa. Non e consentita la ripubblicazione integrale senza autorizzazione.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-black text-juve-black">Commenti e contributi utenti</h2>
            <p className="mt-3">
              L’utente resta responsabile dei contenuti inviati. La redazione puo moderare, non pubblicare o rimuovere commenti e proposte non conformi.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-black text-juve-black">Limitazione di responsabilita</h2>
            <p className="mt-3">
              Facciamo il possibile per mantenere il magazine aggiornato e corretto, ma non possiamo garantire l’assenza di errori o interruzioni del servizio.
            </p>
          </section>
        </div>
      </div>
    </>
  )
}
