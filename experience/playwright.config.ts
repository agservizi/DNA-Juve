import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 45_000,
  retries: process.env.CI ? 2 : 0,
  use: { baseURL: 'http://127.0.0.1:3102', trace: 'retain-on-failure' },
  webServer: { command: 'npx next start -p 3102', url: 'http://127.0.0.1:3102/admin/login', reuseExistingServer: false, timeout: 120_000 },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
})
