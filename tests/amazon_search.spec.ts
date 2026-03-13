import { test, expect } from '@playwright/test';

test('Amazon-da MacBook Air M4 axtarışı və ilk nəticənin yoxlanması', async ({ page }) => {
  await page.goto('https://www.amazon.com', { waitUntil: 'domcontentloaded' });

  // Əgər Amazon robot yoxlaması çıxarsa, testi dayandır.
  const captchaDetected = await page
    .locator('input#captchacharacters, form[action*="validateCaptcha"], text=/Enter the characters you see below/i')
    .first()
    .isVisible()
    .catch(() => false);

  if (captchaDetected) {
    throw new Error('CAPTCHA_DETECTED: Amazon robot yoxlaması göründü. Test dayandırıldı.');
  }

  const searchInput = page.locator('#twotabsearchtextbox');
  await expect(searchInput).toBeVisible();
  await searchInput.fill('"MacBook Air M4"');
  await searchInput.press('Enter');

  await page.waitForLoadState('domcontentloaded');

  // Nəticələrdə ilk məhsul başlığını tap və "MacBook" sözünü yoxla.
  const firstResultTitle = page
    .locator('div[data-component-type="s-search-result"] h2 a')
    .first();

  await expect(firstResultTitle).toBeVisible({ timeout: 15000 });
  await expect(firstResultTitle).toContainText(/MacBook/i);
});