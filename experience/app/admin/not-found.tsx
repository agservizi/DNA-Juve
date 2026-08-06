import { Link } from 'next-view-transitions'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

export default function AdminNotFound() {
  return (
    <main id="contenuto" className="grid min-h-screen place-items-center bg-[#090a09] p-6 text-[#f3f1eb]">
      <Card className="w-full max-w-xl border-[#292a29] bg-[#111210]">
        <CardContent className="grid gap-4 p-8">
          <span className="text-xs font-semibold uppercase tracking-[.24em] text-[#d2b27d]">Admin · 404</span>
          <h1 className="font-serif text-4xl">Sezione non disponibile</h1>
          <p className="text-[#a5a69f]">Il percorso richiesto non appartiene alla console amministrativa.</p>
          <Button asChild className="w-fit"><Link href="/admin">Torna alla dashboard</Link></Button>
        </CardContent>
      </Card>
    </main>
  )
}
