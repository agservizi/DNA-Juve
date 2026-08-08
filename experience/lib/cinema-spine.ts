/**
 * Cinema spine — shared CSS custom-property bus for the immersive homepage.
 * GSAP drives the camera (scroll); Motion stays on UI chrome only; R3F only if a real asset is wired.
 */
export const CINEMA_VARS = {
  progress: '--cinema-progress',
  velocity: '--cinema-velocity',
  era: '--cinema-era',
  eraGrade: '--cinema-era-grade',
  spine: '--cinema-spine',
} as const

export const HOME_CHAPTERS = [
  { id: 'chapter-ingresso', label: 'Ingresso', selector: '[data-hero]' },
  { id: 'chapter-storia', label: 'Storia', selector: '.cinematic-pulse' },
  { id: 'chapter-evidenza', label: 'Evidenza', selector: '.featured-strip' },
  { id: 'chapter-gallery', label: 'Gallery', selector: '.home-gallery' },
  { id: 'chapter-cinema', label: 'Cinema', selector: '.home-cinema' },
  { id: 'chapter-lettori', label: 'Lettori', selector: '.ranking-section' },
  { id: 'chapter-ultime', label: 'Ultime', selector: '.latest-section' },
  { id: 'chapter-portali', label: 'Portali', selector: '.category-portals' },
  { id: 'chapter-esplora', label: 'Esplora', selector: '.domain-rail' },
] as const

/** Per-era grade: 0 sepia archive → 1 classic B/W → 2 night stadium gold */
export const ERA_GRADES = [
  { grade: 0, tint: '35 28 12', haze: '.22' },
  { grade: 0.18, tint: '40 36 28', haze: '.18' },
  { grade: 0.35, tint: '28 28 26', haze: '.14' },
  { grade: 0.55, tint: '18 22 28', haze: '.16' },
  { grade: 0.72, tint: '12 14 18', haze: '.2' },
  { grade: 1, tint: '8 10 14', haze: '.24' },
] as const

export function setCinemaProgress(root: HTMLElement, progress: number, velocity = 0) {
  root.style.setProperty(CINEMA_VARS.progress, progress.toFixed(4))
  root.style.setProperty(CINEMA_VARS.velocity, Math.min(1, Math.abs(velocity) / 2200).toFixed(3))
  root.style.setProperty(CINEMA_VARS.spine, progress.toFixed(4))
}

export function setCinemaEra(root: HTMLElement, eraIndex: number, eraCount: number) {
  const safe = Math.max(0, Math.min(eraCount - 1, eraIndex))
  const grade = ERA_GRADES[Math.min(safe, ERA_GRADES.length - 1)]
  root.style.setProperty(CINEMA_VARS.era, String(safe))
  root.style.setProperty(CINEMA_VARS.eraGrade, String(grade.grade))
  root.dataset.cinemaEra = String(safe)
}
