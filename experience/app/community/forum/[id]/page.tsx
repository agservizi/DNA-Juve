import type { Metadata } from 'next'
import { ThreadExperience } from '@/components/community-reader-experience'
export const metadata:Metadata={title:'Discussione del forum'}
export default async function Page({params}:{params:Promise<{id:string}>}){const{id}=await params;return <ThreadExperience id={id}/>}
