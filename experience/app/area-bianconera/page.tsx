import type { Metadata } from 'next'
import { ReaderAreaExperience } from '@/components/community-reader-experience'
export const metadata:Metadata={title:'Area Bianconera',description:'Lo spazio personale dei lettori di DNA Juve.'}
export default function Page(){return <ReaderAreaExperience/>}
