import { expect, test } from '@playwright/test'

const publicRoutes = [
  '/', '/notizie-live', '/calciomercato', '/calendario', '/rosa', '/video',
  '/community/forum', '/community/sondaggi', '/community/pagelle', '/chi-siamo',
  '/contatti', '/privacy', '/cookie-policy', '/faq', '/termini', '/area-bianconera',
]

test('le pagine pubbliche principali non restituiscono errori server', async ({ page }) => {
  for (const route of publicRoutes) {
    const response = await page.goto(route, { waitUntil: 'domcontentloaded' })
    expect(response?.status(), `${route} non deve restituire errore`).toBeLessThan(500)
    await expect(page.locator('body')).toBeVisible()
  }
})

test('il consenso cookie è accessibile, persistente e riapribile', async ({ page }) => {
  await page.goto('/')
  const dialog = page.getByRole('dialog', { name: /le tue preferenze/i })
  await expect(dialog).toBeVisible()
  await expect(dialog.getByRole('button', { name: 'Rifiuta', exact: true })).toBeVisible()
  await expect(dialog.getByRole('button', { name: 'Accetta', exact: true })).toBeVisible()
  await dialog.getByRole('button', { name: 'Rifiuta', exact: true }).click()
  await expect(dialog).toBeHidden()
  await page.reload()
  await expect(dialog).toBeHidden()
  await page.getByRole('button', { name: /rivedi preferenze cookie/i }).click()
  await expect(dialog).toBeVisible()
  await expect(dialog.getByLabel('Analisi anonime')).not.toBeChecked()
  await expect(dialog.getByLabel('Contenuti esterni')).not.toBeChecked()
  await dialog.getByLabel('Contenuti esterni').check()
  await dialog.getByRole('button', { name: 'Salva', exact: true }).click()
  const consent = await page.evaluate(() => JSON.parse(localStorage.getItem('fb-cookie-consent') || 'null'))
  expect(consent).toMatchObject({ essential: true, analytics: false, externalMedia: true, version: 1 })
})

test('la UI mobile non genera overflow orizzontale sulle shell principali', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')
  await page.getByRole('button', { name: 'Rifiuta', exact: true }).click()
  for (const route of ['/', '/community/forum', '/area-bianconera', '/admin/login']) {
    await page.goto(route)
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
    expect(overflow, `${route} presenta overflow orizzontale`).toBeLessThanOrEqual(1)
  }
})

test('manifest, feed, robots e sitemap sono pubblicati', async ({ request }) => {
  for (const route of ['/manifest.webmanifest', '/favicon.svg', '/feed.xml', '/robots.txt', '/sitemap.xml']) {
    const response = await request.get(route)
    expect(response.ok(), route).toBeTruthy()
  }
})

test('i titoli lunghi dei più letti non toccano i divisori', async ({ page }) => {
  await page.goto('/')
  const reject = page.getByRole('button', { name: 'Rifiuta', exact: true })
  if (await reject.isVisible()) await reject.click()
  const rows = page.locator('.ranking-list > a')
  const count = await rows.count()
  for (let index = 0; index < count; index += 1) {
    const row = await rows.nth(index).boundingBox()
    const title = await rows.nth(index).locator('strong').boundingBox()
    expect(row).not.toBeNull()
    expect(title).not.toBeNull()
    if (row && title) {
      expect(title.y - row.y).toBeGreaterThanOrEqual(16)
      expect(row.y + row.height - title.y - title.height).toBeGreaterThanOrEqual(16)
    }
  }
})

test('i titoli editoriali lunghi mantengono tracking e interlinea leggibili', async ({ page }) => {
  await page.goto('/')
  const title = page.locator('.content-title').first()
  await expect(title).toBeVisible()
  const metrics = await title.evaluate((element) => {
    const style = getComputedStyle(element)
    return { letterSpacing: Number.parseFloat(style.letterSpacing), lineHeight: Number.parseFloat(style.lineHeight), fontSize: Number.parseFloat(style.fontSize) }
  })
  expect(metrics.letterSpacing).toBeGreaterThanOrEqual(0)
  expect(metrics.lineHeight / metrics.fontSize).toBeGreaterThanOrEqual(1)
})
