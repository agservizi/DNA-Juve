import type { Metadata } from 'next'
import { CalendarPage } from '@/components/match-pages'
import { getTeamMatches } from '@/lib/match-market-content'

export const metadata:Metadata={
  title:'Calendario Partite | BianconeriHub',
  description:'Tutte le partite della Juventus: risultati, prossimi match e statistiche.',
}

export const revalidate=300

export default async function Page(){
  const matches=await getTeamMatches()
  return <CalendarPage initialMatches={matches}/>
}
