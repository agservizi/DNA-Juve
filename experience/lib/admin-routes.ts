export const ADMIN_COLLECTION_SECTIONS = new Set([
  'articoli',
  'categorie',
  'commenti',
  'forum',
  'video',
  'gallery',
  'gallery-commenti',
])

export const ADMIN_SINGLETON_SECTIONS = new Set([
  'proposte-tifosi',
  'mercato',
  'sondaggi',
  'redattori',
  'lettori',
  'notifiche-push',
  'analytics',
  'seo',
  'feed',
  'profilo',
  'impostazioni',
])

const safeRecordId = /^[a-zA-Z0-9_-]+$/

export function isAllowedAdminPath(path: readonly string[]) {
  if (path.length === 0) return true

  const [section, second, third] = path
  if (section === 'login') return path.length === 1
  if (ADMIN_SINGLETON_SECTIONS.has(section)) return path.length === 1
  if (!ADMIN_COLLECTION_SECTIONS.has(section)) return false
  if (path.length === 1) return true
  if (path.length === 2) return second === 'nuovo'

  return path.length === 3
    && third === 'modifica'
    && second !== 'nuovo'
    && safeRecordId.test(second)
}
