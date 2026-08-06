import type { Metadata } from 'next'
import { ForumExperience } from '@/components/community-reader-experience'
export const metadata:Metadata={title:'Forum',description:'Il forum degli iscritti alla community bianconera.'}
export default function Page(){return <ForumExperience/>}
