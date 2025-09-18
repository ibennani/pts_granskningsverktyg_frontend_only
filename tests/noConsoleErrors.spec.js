// tests/noConsoleErrors.spec.js
import { test, expect } from '@playwright/test';

test('no console errors on homepage', async ({ page }) => {
  const errors = [];

  // Lyssna på allt som loggas i browserns console
  page.on('console', msg => {
    if (msg.type() === 'error') {
      errors.push(msg.text());
    }
  });

  // Gå till startsidan (baseURL är http://localhost:5173 från configen)
  await page.goto('/');

  // Om några fel hittades → faila testet
  expect(errors).toEqual([]);
});
