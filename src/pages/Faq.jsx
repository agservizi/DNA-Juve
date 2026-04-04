import SEO from '@/components/blog/SEO'

const items = [
  {
    q: 'BianconeriHub e affiliato a Juventus FC?',
    a: 'No. Il magazine e indipendente e non e affiliato ufficialmente a Juventus FC.',
  },
  {
    q: 'Posso inviare un articolo o una proposta alla redazione?',
    a: 'Si. Puoi usare la sezione "Area Bianconera" per proporre contenuti oppure contattare la redazione via email.',
  },
  {
    q: 'Come funziona la newsletter?',
    a: 'Puoi iscriverti con la tua email. Riceverai aggiornamenti editoriali e potrai disiscriverti in qualsiasi momento.',
  },
  {
    q: 'I commenti vengono pubblicati subito?',
    a: 'No. I commenti passano in moderazione prima della pubblicazione per mantenere la discussione leggibile e rispettosa.',
  },
]

export default function Faq() {
  return (
    <>
      <SEO
        title="FAQ"
        description="Domande frequenti su BianconeriHub: redazione, commenti, newsletter, collaborazioni e funzionamento del magazine."
        url="/faq"
      />

      <div className="mx-auto max-w-4xl px-4 py-16">
        <p className="text-xs font-black uppercase tracking-[0.28em] text-juve-gold">FAQ</p>
        <h1 className="mt-4 font-display text-4xl font-black text-juve-black">Domande frequenti</h1>
        <div className="mt-10 space-y-4">
          {items.map((item) => (
            <section key={item.q} className="border border-gray-200 bg-white p-6">
              <h2 className="text-lg font-black text-juve-black">{item.q}</h2>
              <p className="mt-3 text-sm leading-relaxed text-gray-600">{item.a}</p>
            </section>
          ))}
        </div>
      </div>
    </>
  )
}
