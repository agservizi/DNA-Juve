import { ImmersiveHome } from '@/components/immersive-home'
import { getHomeContent } from '@/lib/content'

export const dynamic = 'force-dynamic'

export default async function HomePage() {
  const content = await getHomeContent()
  return <ImmersiveHome {...content} />
}
