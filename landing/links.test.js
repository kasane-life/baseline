// links.test.js — Playwright test: verify all internal links on the landing site
// Run: cd landing && npx playwright test links.test.js
// Requires: pnpm add -D @playwright/test (already in app/package.json)

import { test, expect } from '@playwright/test';

const BASE = 'https://mybaseline.health';

const PAGES = [
  { name: 'Home', url: `${BASE}/` },
  { name: 'Privacy', url: `${BASE}/privacy/` },
  { name: 'SMS Consent', url: `${BASE}/sms-consent/` },
];

// Every page should load without 404
for (const page of PAGES) {
  test(`${page.name} page loads (not 404)`, async ({ request }) => {
    const res = await request.get(page.url);
    expect(res.status(), `${page.name} returned ${res.status()}`).not.toBe(404);
    expect(res.status()).toBeLessThan(400);
  });
}

// All internal links on each page should resolve
for (const page of PAGES) {
  test(`${page.name} — all internal links resolve`, async ({ page: browser }) => {
    await browser.goto(page.url, { waitUntil: 'domcontentloaded' });

    const links = await browser.$$eval('a[href]', (anchors, base) => {
      return anchors
        .map(a => a.href)
        .filter(href => href.startsWith(base))
        // Strip hash-only links (same-page anchors)
        .filter(href => {
          const url = new URL(href);
          return url.pathname !== new URL(base).pathname || !url.hash;
        });
    }, BASE);

    const unique = [...new Set(links)];

    for (const link of unique) {
      const res = await browser.request.get(link);
      expect(res.status(), `Broken link on ${page.name}: ${link}`).toBeLessThan(400);
    }
  });
}

// Back links exist on subpages and point to home
for (const page of PAGES.filter(p => p.name !== 'Home')) {
  test(`${page.name} has a working back/home link`, async ({ page: browser }) => {
    await browser.goto(page.url, { waitUntil: 'domcontentloaded' });

    const homeLinks = await browser.$$eval('a[href]', (anchors, base) => {
      return anchors
        .map(a => ({ href: a.href, text: a.textContent.trim() }))
        .filter(a => {
          const url = new URL(a.href);
          // Link to home: either root or root with hash
          return url.origin === new URL(base).origin &&
            (url.pathname === '/' || url.pathname === '') &&
            !url.hash;
        });
    }, BASE);

    expect(homeLinks.length, `${page.name} should have at least one link back to home`).toBeGreaterThan(0);
  });
}
