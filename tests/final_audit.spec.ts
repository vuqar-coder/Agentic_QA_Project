import { test, expect } from '@playwright/test';
import { promises as fs } from 'fs';
import path from 'path';

type BrokenImageRecord = {
  section: string;
  pageUrl: string;
  imageUrl: string;
  status: number;
};

type BrokenPageRecord = {
  section: string;
  fromPage: string;
  pageUrl: string;
  status: number;
};

test('Final Audit: Broken Images və Status Codes (400/500) monitorinqi', async ({ page, context }) => {
  const brokenImages: BrokenImageRecord[] = [];
  const brokenPages: BrokenPageRecord[] = [];

  // Ümumi network monitorinqi (əsasən şəkillər üçün)
  page.on('response', (response) => {
    const request = response.request();
    const resourceType = request.resourceType();
    const status = response.status();

    if (resourceType === 'image' && status === 404) {
      brokenImages.push({
        section: 'Broken Images',
        pageUrl: page.url(),
        imageUrl: response.url(),
        status,
      });
    }
  });

  await test.step('The Internet ana səhifəsinə daxil ol', async () => {
    await page.goto('https://the-internet.herokuapp.com/', { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(/the-internet\.herokuapp\.com/i);
  });

  await test.step('Broken Images bölməsinə daxil ol və qırıq şəkilləri tap', async () => {
    await page.goto('https://the-internet.herokuapp.com/broken_images', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');

    const imageUrls = await page.locator('img').evaluateAll((imgs) =>
      imgs
        .map((img) => (img as HTMLImageElement).getAttribute('src'))
        .filter(Boolean)
        .map((src) => new URL(src as string, window.location.href).toString())
    );

    for (const imageUrl of imageUrls) {
      const response = await context.request.get(imageUrl);
      const status = response.status();

      if (status === 404) {
        brokenImages.push({
          section: 'Broken Images',
          pageUrl: page.url(),
          imageUrl,
          status,
        });
      }
    }
  });

  await test.step('Status Codes bölməsinə daxil ol və 400/500 statuslu səhifələri tap', async () => {
    const statusCodesPage = 'https://the-internet.herokuapp.com/status_codes';
    await page.goto(statusCodesPage, { waitUntil: 'domcontentloaded' });

    const statusLinks = await page.locator('ul li a').evaluateAll((anchors) =>
      anchors.map((a) => ({
        href: (a as HTMLAnchorElement).href,
        label: (a as HTMLAnchorElement).textContent?.trim() || '',
      }))
    );

    for (const link of statusLinks) {
      const response = await page.goto(link.href, { waitUntil: 'domcontentloaded' });
      const status = response?.status() ?? 0;

      if (status === 400 || status === 500) {
        brokenPages.push({
          section: 'Status Codes',
          fromPage: statusCodesPage,
          pageUrl: link.href,
          status,
        });
      }

      await page.goto(statusCodesPage, { waitUntil: 'domcontentloaded' });
    }
  });

  const uniqueBrokenImages = Array.from(
    new Map(brokenImages.map((item) => [`${item.imageUrl}|${item.status}`, item])).values()
  );
  const uniqueBrokenPages = Array.from(
    new Map(brokenPages.map((item) => [`${item.pageUrl}|${item.status}`, item])).values()
  );

  await test.step('Audit hesabatını TXT və CSV fayllarına yaz', async () => {
    const reportDir = path.join(process.cwd(), 'test-results');
    await fs.mkdir(reportDir, { recursive: true });

    const txtReportPath = path.join(reportDir, 'final_audit_report.txt');
    const csvReportPath = path.join(reportDir, 'final_audit_report.csv');

    const txtLines: string[] = [];
    txtLines.push('FINAL AUDIT HESABATI - The Internet (Broken Images & Status Codes)');
    txtLines.push(`Tarix: ${new Date().toISOString()}`);
    txtLines.push('');

    txtLines.push('1) Qırıq şəkillər (404):');
    if (uniqueBrokenImages.length === 0) {
      txtLines.push('- Qırıq şəkil aşkarlanmadı.');
    } else {
      uniqueBrokenImages.forEach((item, idx) => {
        txtLines.push(
          `${idx + 1}. Səhifə: ${item.pageUrl} | Şəkil: ${item.imageUrl} | Status: ${item.status}`
        );
      });
    }

    txtLines.push('');
    txtLines.push('2) Qırıq səhifələr (400/500):');
    if (uniqueBrokenPages.length === 0) {
      txtLines.push('- 400/500 statuslu səhifə aşkarlanmadı.');
    } else {
      uniqueBrokenPages.forEach((item, idx) => {
        txtLines.push(
          `${idx + 1}. Keçid: ${item.pageUrl} | Status: ${item.status} | Mənbə: ${item.fromPage}`
        );
      });
    }

    await fs.writeFile(txtReportPath, txtLines.join('\n'), 'utf-8');

    const csvLines: string[] = [];
    csvLines.push('kateqoriya,səhifə,mənbə_url,resurs,status');

    uniqueBrokenImages.forEach((item) => {
      csvLines.push(`"Qırıq şəkil","${item.pageUrl}","","${item.imageUrl}","${item.status}"`);
    });

    uniqueBrokenPages.forEach((item) => {
      csvLines.push(`"Qırıq səhifə","${item.pageUrl}","${item.fromPage}","${item.pageUrl}","${item.status}"`);
    });

    await fs.writeFile(csvReportPath, csvLines.join('\n'), 'utf-8');

    console.log('\n=== Azərbaycan dilində qırıq resurs siyahısı ===');
    if (uniqueBrokenImages.length === 0 && uniqueBrokenPages.length === 0) {
      console.log('Qırıq resurs tapılmadı.');
    } else {
      uniqueBrokenImages.forEach((item, idx) => {
        console.log(`${idx + 1}) Qırıq şəkil: ${item.imageUrl} (Status: ${item.status})`);
      });

      const base = uniqueBrokenImages.length;
      uniqueBrokenPages.forEach((item, idx) => {
        console.log(`${base + idx + 1}) Qırıq səhifə: ${item.pageUrl} (Status: ${item.status})`);
      });
    }

    console.log(`\nTXT hesabat: ${txtReportPath}`);
    console.log(`CSV hesabat: ${csvReportPath}`);

    expect(txtLines.length).toBeGreaterThan(0);
    expect(csvLines.length).toBeGreaterThan(0);
  });
});
