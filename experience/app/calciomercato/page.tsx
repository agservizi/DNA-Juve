import type { Metadata } from 'next'
import { MarketPage } from '@/components/market-page'
import { getMarketArticles } from '@/lib/match-market-content'

export const metadata: Metadata = {
  title: 'Calciomercato | BianconeriHub',
  description: 'Calciomercato Juventus: notizie, rumors e trattative.',
}
export const dynamic = 'force-dynamic'

export default async function Page() {
  return <MarketPage articles={await getMarketArticles()} />
}
