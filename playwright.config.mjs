// playwright.config.mjs
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  timeout: 30_000,
  expect: { timeout: 5_000 },

  use: {
    headless: true,                 // ändra till false om du vill se webbläsaren
    baseURL: 'http://localhost:5173',
    trace: 'retain-on-failure'
  },

  // Starta Vite före testerna och återanvänd om den redan kör
  webServer: {
    command: 'npm run dev -- --port 5173 --strictPort',
    url: 'http://localhost:5173',
    reuseExistingServer: true,
    timeout: 120_000
  },

  // Kör tester i två motorer: Chromium (Chrome) & WebKit (Safari)
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'webkit',   use: { ...devices['Desktop Safari'] } }
    // Lägg till { name: 'firefox', use: { ...devices['Desktop Firefox'] } } om du vill
  ]
});
