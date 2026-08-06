export type AdminProfile = {
  role: string | null
  username: string | null
}

export function isAdminProfile(profile: AdminProfile | null | undefined): profile is AdminProfile & { role: 'admin' } {
  return profile?.role === 'admin'
}
