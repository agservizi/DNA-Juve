import { expect, test } from '@playwright/test'

test('le route admin protette convergono sul login', async ({ page }) => {
  await page.goto('/admin/articoli')
  await expect(page).toHaveURL(/\/admin\/login$/)
  await expect(page.getByRole('heading', { name: 'Admin' })).toBeVisible()
  await expect(page.getByLabel('Email')).toBeVisible()
  await expect(page.getByLabel('Password')).toBeVisible()
})

test('credenziali errate restituiscono feedback accessibile', async ({ page }) => {
  await page.goto('/admin/login')
  await page.getByLabel('Email').fill('invalid@example.com')
  await page.getByLabel('Password').fill('password-non-valida')
  await page.getByRole('button', { name: /accedi/i }).click()
  await expect(page.getByText('Credenziali non valide.')).toBeVisible()
})

test('la console autenticata espone tutte le aree migrate', async ({ page }) => {
  test.skip(!process.env.ADMIN_EMAIL || !process.env.ADMIN_PASSWORD, 'Credenziali admin non disponibili')
  await page.goto('/admin/login')
  await page.getByLabel('Email').fill(process.env.ADMIN_EMAIL!)
  await page.getByLabel('Password').fill(process.env.ADMIN_PASSWORD!)
  await page.getByRole('button', { name: /accedi/i }).click()
  await expect(page).toHaveURL(/\/admin$/)
  for (const label of ['Articoli', 'Categorie', 'Commenti', 'Forum', 'Proposte tifosi', 'Mercato', 'Video', 'Sondaggi', 'Profili', 'Lettori', 'Notifiche push', 'Analytics', 'SEO', 'Feed', 'Profilo', 'Impostazioni']) {
    await expect(page.getByRole('link', { name: new RegExp(label, 'i') }).first()).toBeVisible()
  }
})
