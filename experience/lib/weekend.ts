/** ISO week key for gallery/home cinema continuity (Europe/Rome calendar days). */

export function weekendKeyFromDate(date = new Date()): string {
  const rome = new Date(date.toLocaleString('en-US', { timeZone: 'Europe/Rome' }))
  const day = rome.getDay() // 0 Sun … 6 Sat
  const offsetToSaturday = (day + 1) % 7 // days since Saturday
  const saturday = new Date(rome)
  saturday.setDate(rome.getDate() - offsetToSaturday)
  const y = saturday.getFullYear()
  const m = String(saturday.getMonth() + 1).padStart(2, '0')
  const d = String(saturday.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function weekendLabel(key: string): string {
  const [y, m, d] = key.split('-').map(Number)
  if (!y || !m || !d) return 'Weekend'
  const start = new Date(Date.UTC(y, m - 1, d))
  const end = new Date(start)
  end.setUTCDate(start.getUTCDate() + 1)
  const fmt = (value: Date) =>
    new Intl.DateTimeFormat('it-IT', { day: 'numeric', month: 'short' }).format(value)
  return `${fmt(start)} – ${fmt(end)}`
}

export function currentWeekendKey() {
  return weekendKeyFromDate(new Date())
}
