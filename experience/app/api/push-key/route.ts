import {NextResponse} from 'next/server'
export const dynamic='force-dynamic'
export function GET(){const key=process.env.VAPID_PUBLIC_KEY||process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY||'';return key?NextResponse.json({key}):NextResponse.json({error:'Push non configurate'},{status:503})}
