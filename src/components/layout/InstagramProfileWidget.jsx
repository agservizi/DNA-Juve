import { ArrowUpRight, Instagram } from 'lucide-react'

const instagramProfileUrl = 'https://www.instagram.com/bianconerihub.magazine'

export default function InstagramProfileWidget() {
  return (
    <section className="border border-black/10 bg-white p-6">
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-juve-black text-white">
          <Instagram className="h-5 w-5" />
        </div>
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.22em] text-juve-gold">
            Instagram Ufficiale
          </p>
          <h3 className="mt-1 font-display text-xl font-black text-juve-black">
            @bianconerihub.magazine
          </h3>
        </div>
      </div>

      <p className="mt-4 text-sm leading-relaxed text-gray-600">
        Segui il profilo per highlights, clip, copertine e aggiornamenti rapidi dal magazine bianconero.
      </p>

      <div className="mt-5 grid grid-cols-3 gap-2 border-y border-black/10 py-4 text-center">
        <div>
          <p className="font-display text-lg font-black text-juve-black">News</p>
          <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Breaking</p>
        </div>
        <div>
          <p className="font-display text-lg font-black text-juve-black">Video</p>
          <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Highlights</p>
        </div>
        <div>
          <p className="font-display text-lg font-black text-juve-black">Community</p>
          <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Inside DNA Juve</p>
        </div>
      </div>

      <a
        href={instagramProfileUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-5 inline-flex w-full items-center justify-center gap-2 bg-juve-black px-4 py-3 text-xs font-black uppercase tracking-[0.2em] text-white transition-colors hover:bg-juve-gold hover:text-juve-black"
        aria-label="Apri il profilo Instagram di BianconeriHub Magazine"
      >
        Vai al profilo
        <ArrowUpRight className="h-4 w-4" />
      </a>
    </section>
  )
}