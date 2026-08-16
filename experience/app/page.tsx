import { ImmersiveHome } from '@/components/immersive-home'
import { NewsletterCapture } from '@/components/newsletter-capture'
import { getHomeContent } from '@/lib/content'

export const dynamic = 'force-dynamic'

export default async function HomePage() {
  const content = await getHomeContent()
  return (
    <>
      <ImmersiveHome {...content} />
      <section className="home-newsletter-band" aria-label="Newsletter">
        <NewsletterCapture />
      </section>
    </>
  )
}
