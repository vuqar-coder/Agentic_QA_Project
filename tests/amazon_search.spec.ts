import { test, expect } from '@playwright/test';

test.skip('Google-da MacBook Air M4 axtarışı və ilk nəticələrin görünməsi', async ({ page }) => {
  await page.goto('https://www.google.com', { waitUntil: 'domcontentloaded' });

  const searchInput = page.locator('textarea[name="q"]');
  await expect(searchInput).toBeVisible();
  await searchInput.fill('MacBook Air M4');
  await searchInput.press('Enter');

  await page.waitForLoadState('domcontentloaded');

  const firstResultTitle = page.locator('h3').first();
  await expect(firstResultTitle).toBeVisible({ timeout: 15000 });
  await expect(firstResultTitle).toContainText(/MacBook|Air|M4/i);
});