const instagramEmbedUrl = 'https://www.instagram.com/bianconerihub.magazine/embed'

export default function InstagramProfileWidget() {
  return (
    <div className="overflow-hidden border border-black/10 bg-white">
      <iframe
        title="Profilo Instagram ufficiale BianconeriHub Magazine"
        src={instagramEmbedUrl}
        className="h-[560px] w-full"
        loading="lazy"
        allowTransparency={true}
      />
    </div>
  )
}