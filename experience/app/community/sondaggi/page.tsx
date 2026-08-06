import type { Metadata } from 'next'
import { PollsExperience } from '@/components/community-reader-experience'
export const metadata:Metadata={title:'Sondaggi Live',description:'Vota nei sondaggi della community bianconera.'}
export default function Page(){return <PollsExperience/>}
