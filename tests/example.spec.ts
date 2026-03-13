import { test, expect } from '@playwright/test';

test('Google search test', async ({ page }) => {
  await page.goto('https://www.google.com');
  
  // Axtarış sahəsini tapırıq
  const searchInput = page.locator('textarea[name="q"], input[name="q"]');
  await searchInput.fill('Playwright');
  await searchInput.press('Enter');
  
  // Nəticəni yoxlayırıq
  await expect(page).toHaveTitle(/Playwright/);
});
