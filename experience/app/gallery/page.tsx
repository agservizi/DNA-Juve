import type { Metadata } from 'next'
import { GalleryExperience } from '@/components/gallery-experience'

export const metadata:Metadata={title:'Gallery',description:'Fotografie e video live dallo stadio, dalla città e dal mondo bianconero.'}
export default function GalleryPage(){return <GalleryExperience/>}
