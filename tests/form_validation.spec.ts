import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

const LOGIN_URL = 'https://practicetestautomation.com/practice-test-login/';
const SCREENSHOT_DIR = path.join('test-results', 'screenshots');

test.describe.serial('Form validation scenarios - Practice Test Automation', () => {
  test.beforeAll(async () => {
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
  });

  test('Scenario A - Empty form', async ({ page }) => {
    await page.goto(LOGIN_URL);

    await page.click('#submit');

    const errorBanner = page.locator('#error');
    await expect(errorBanner).toBeVisible();
    await expect(errorBanner).toContainText('Your username is invalid');

    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, 'scenario-a-empty-form.png'),
      fullPage: true,
    });
  });

  test('Scenario B - Wrong credentials', async ({ page }) => {
    await page.goto(LOGIN_URL);

    await page.fill('#username', 'wrong_user');
    await page.fill('#password', 'wrong_pass');
    await page.click('#submit');

    const errorBanner = page.locator('#error');
    await expect(errorBanner).toBeVisible();
    await expect(errorBanner).toContainText('invalid');

    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, 'scenario-b-wrong-credentials.png'),
      fullPage: true,
    });
  });

  test('Scenario C - Valid credentials', async ({ page }) => {
    await page.goto(LOGIN_URL);

    await page.fill('#username', 'student');
    await page.fill('#password', 'Password123');
    await page.click('#submit');

    await expect(page).toHaveURL(/logged-in-successfully/);
    await expect(page.locator('h1')).toContainText('Logged In Successfully');
    await expect(page.locator('.has-text-align-center')).toContainText('Congratulations');

    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, 'scenario-c-valid-login.png'),
      fullPage: true,
    });
  });
});
