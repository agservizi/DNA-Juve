import { AdminRouteFrame } from '@/components/admin-route-frame'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <AdminRouteFrame>{children}</AdminRouteFrame>
}
