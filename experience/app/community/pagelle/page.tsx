import type { Metadata } from 'next'
import { RatingsExperience } from '@/components/community-reader-experience'
export const metadata:Metadata={title:'Pagelle Post-Partita',description:'Dai i tuoi voti ai giocatori della Juventus dopo ogni partita.'}
export default function Page(){return <RatingsExperience/>}
