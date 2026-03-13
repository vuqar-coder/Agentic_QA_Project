import { test, expect } from '@playwright/test';

type NetworkErrorRecord = {
  pageUrl: string;
  requestUrl: string;
  status: number;
  resourceType: string;
};

test('BBC daxili linklər və Network Monitorinq (XHR/Fetch)', async ({ page }) => {
  const networkErrors: NetworkErrorRecord[] = [];

  // XHR və Fetch cavablarını monitor et
  page.on('response', (response) => {
    const request = response.request();
    const resourceType = request.resourceType();
    const status = response.status();

    if ((resourceType === 'xhr' || resourceType === 'fetch') && status > 400) {
      networkErrors.push({
        pageUrl: page.url(),
        requestUrl: response.url(),
        status,
        resourceType,
      });
    }
  });

  await test.step('BBC ana səhifəsinə daxil ol', async () => {
    await page.goto('https://www.bbc.com', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);
    await expect(page).toHaveURL(/bbc\.com/i);
  });

  const firstInternalLinks = await test.step('İlk 5-10 daxili linki müəyyən et', async () => {
    const rawLinks = await page.locator('a[href]').evaluateAll((anchors) =>
      anchors
        .map((a) => (a as HTMLAnchorElement).href)
        .filter((href) => Boolean(href))
    );

    const internalLinks = Array.from(
      new Set(
        rawLinks.filter((href) => {
          try {
            const url = new URL(href);
            return /(^|\.)bbc\.com$/i.test(url.hostname);
          } catch {
            return false;
          }
        })
      )
    )
      .filter((href) => !href.startsWith('javascript:'))
      .slice(0, 10);

    expect(internalLinks.length).toBeGreaterThanOrEqual(5);

    console.log('\n=== BBC-də aşkarlanan ilk daxili linklər (maksimum 10) ===');
    internalLinks.forEach((link, idx) => {
      console.log(`${idx + 1}. ${link}`);
    });

    return internalLinks;
  });

  await test.step('Daxili linklərdən ilk 5-ni ziyarət et və monitorinqi davam etdir', async () => {
    const linksToVisit = firstInternalLinks.slice(0, 5);

    for (const link of linksToVisit) {
      await page.goto(link, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(2000);
      console.log(`Ziyarət edildi: ${link}`);
    }
  });

  await test.step('Network xətalarının yekun çıxışı', async () => {
    const uniqueErrors = Array.from(
      new Map(networkErrors.map((item) => [`${item.pageUrl}|${item.requestUrl}|${item.status}`, item])).values()
    );

    if (uniqueErrors.length === 0) {
      console.log('\nNetwork monitorinq nəticəsi: XHR/Fetch üzrə statusu 400-dən böyük xəta aşkarlanmadı.');
      return;
    }

    console.log('\n=== XHR/Fetch Network Xətaları (status > 400) ===');
    uniqueErrors.forEach((err, idx) => {
      console.log(
        `${idx + 1}. Səhifə: ${err.pageUrl}\n   Sorğu: ${err.requestUrl}\n   Status: ${err.status}\n   Növ: ${err.resourceType}`
      );
    });
  });
});
