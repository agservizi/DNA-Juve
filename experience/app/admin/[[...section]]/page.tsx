import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { AdminConsole } from '@/components/admin-console'
import { isAllowedAdminPath } from '@/lib/admin-routes'

export const metadata: Metadata = { title: 'Admin', robots: { index: false, follow: false } }
export default async function AdminPage({ params }: { params: Promise<{ section?: string[] }> }) {
  const { section = [] } = await params
  if (!isAllowedAdminPath(section)) notFound()
  return <AdminConsole path={section} />
}
