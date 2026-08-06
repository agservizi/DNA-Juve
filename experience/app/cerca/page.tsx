import type { Metadata } from 'next'
import { EditorialSearchExperience } from '@/components/editorial-search-experience'
import { searchEditorialArticles } from '@/lib/editorial-content'
export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Cerca nel blog', description: 'Ricerca interna tra articoli, analisi e notizie di BianconeriHub.', robots: { index: false, follow: true } }
export default async function Page({ searchParams }: { searchParams: Promise<{ q?: string }> }) { const q = (await searchParams).q?.trim() || ''; return <EditorialSearchExperience query={q} articles={await searchEditorialArticles(q)} /> }
