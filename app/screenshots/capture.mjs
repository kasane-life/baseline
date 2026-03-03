// Playwright screenshot capture — walks the full intake flow at mobile + desktop viewports
// Run: pnpm screenshot (builds first, then captures)
// Scenarios: empty, partial (labs only), full (all phases populated)
// Viewports: mobile (iPhone 16) + desktop
// Color schemes: dark + light

import { chromium } from '@playwright/test';
import { preview } from 'vite';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { mkdir, rm } from 'fs/promises';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT = join(__dirname, 'output');
const APP_ROOT = join(__dirname, '..');

const VIEWPORTS = [
  { width: 393, height: 852, name: 'mobile' },   // iPhone 16
  { width: 1440, height: 900, name: 'desktop' },
];

const COLOR_SCHEMES = ['dark', 'light'];

// Sample data for populated flows
const SAMPLE = {
  age: '35', sex: 'M',
  heightFt: '5', heightIn: '10', weight: '175',
  sbp: '122', dbp: '78', waist: '33',
  familyHistory: 'no',
};

async function capture() {
  // Clean previous run so we only see current build output
  await rm(OUTPUT, { recursive: true, force: true });
  await mkdir(OUTPUT, { recursive: true });

  // Start a temporary Vite preview server from dist/
  const server = await preview({
    root: APP_ROOT,
    preview: { port: 4174, strictPort: true },
    logLevel: 'error',
  });
  const baseUrl = 'http://localhost:4174/baseline/app/';

  const browser = await chromium.launch();

  try {
    for (const vp of VIEWPORTS) {
      for (const scheme of COLOR_SCHEMES) {
        // ── Full scenario: fill everything, walk all steps ──
        const prefix = `${vp.name}-${scheme}-full`;
        console.log(`\n📸 ${prefix} (${vp.width}×${vp.height})`);

        const context = await browser.newContext({
          viewport: { width: vp.width, height: vp.height },
          deviceScaleFactor: 2,
          colorScheme: scheme,
        });
        // Bypass beta email gate so overlay doesn't block the flow
        await context.addInitScript(() => {
          localStorage.setItem('baseline-beta-email', 'screenshots@baseline.app');
        });
        const page = await context.newPage();
        page.on('pageerror', err => console.log(`  ⚠ JS error: ${err.message}`));
        let step = 1;

        const snap = async (label) => {
          const filename = `${prefix}-${String(step).padStart(2, '0')}-${label}.png`;
          await page.screenshot({ path: join(OUTPUT, filename), fullPage: true });
          console.log(`  ✓ ${filename}`);
          step++;
        };

        // Helper: click the Continue button in the stepper strip
        const clickContinue = async () => {
          await page.locator('#stepper-continue').click();
          await page.waitForTimeout(400);
        };

        // 1. Landing
        await page.goto(baseUrl, { waitUntil: 'networkidle' });
        // Dismiss any error/feedback overlay that may have appeared
        await page.evaluate(() => {
          document.querySelectorAll('.feedback-overlay').forEach(el => el.remove());
        });
        await snap('landing');

        // Ensure form mode is visible (default tab, but JS init may still be running)
        await page.evaluate(() => {
          document.getElementById('form-mode').classList.add('open');
          document.getElementById('intake-split').style.display = 'none';
        });
        await page.waitForTimeout(300);

        // 2. Phase 1 — fill form (BP moved to Phase 2)
        await page.fill('#f-age', SAMPLE.age);
        await page.click(`.opt-btn[data-value="${SAMPLE.sex}"]`);
        await page.fill('#f-height-ft', SAMPLE.heightFt);
        await page.fill('#f-height-in', SAMPLE.heightIn);
        await page.fill('#f-weight', SAMPLE.weight);
        await page.fill('#f-waist', SAMPLE.waist);
        await page.click(`.toggle-btn[data-value="${SAMPLE.familyHistory}"]`);
        await snap('phase1-form');

        // 3. Phase 2 — BP (slide 0)
        await page.evaluate(() => {
          document.querySelectorAll('.feedback-overlay').forEach(el => el.remove());
          // Directly show Phase 2 (showPhase2 may not be on window if init errored)
          document.getElementById('phase1').style.display = 'none';
          document.getElementById('phase2').style.display = 'block';
        });
        await page.waitForTimeout(400);
        await page.fill('#f-sbp', SAMPLE.sbp);
        await page.fill('#f-dbp', SAMPLE.dbp);
        await snap('phase2-bp');

        // 4. Wearable (slide 1)
        await clickContinue();
        await snap('phase2-wearable');

        // 5. Labs (slide 2)
        await clickContinue();
        await snap('phase2-labs');

        // 6. Equip (slide 3)
        await clickContinue();
        await snap('phase2-equip');

        // 7. Meds (slide 4)
        await clickContinue();
        await snap('phase2-meds');

        // 8. PHQ-9 (slide 5)
        await clickContinue();
        await snap('phase2-phq9');

        // 9. Score — call computeResults if available (may not be if init errored)
        const hasCompute = await page.evaluate(() => typeof computeResults === 'function');
        if (hasCompute) {
          await page.evaluate(() => computeResults());
          await page.waitForTimeout(2500);
          await snap('results-top');

          // 10. Scroll to below-fold
          await page.evaluate(() => {
            const fold = document.querySelector('.results-fold');
            if (fold) fold.scrollIntoView({ behavior: 'instant' });
          });
          await page.waitForTimeout(300);
          await snap('results-detail');
        } else {
          console.log('  ⚠ computeResults not available — skipping results screenshots');
        }

        await context.close();

        // ── Empty scenario: landing + form blank + phase 2 blank ──
        const emptyPrefix = `${vp.name}-${scheme}-empty`;
        console.log(`\n📸 ${emptyPrefix}`);

        const ctx2 = await browser.newContext({
          viewport: { width: vp.width, height: vp.height },
          deviceScaleFactor: 2,
          colorScheme: scheme,
        });
        // Bypass beta email gate so overlay doesn't block the flow
        await ctx2.addInitScript(() => {
          localStorage.setItem('baseline-beta-email', 'screenshots@baseline.app');
        });
        const page2 = await ctx2.newPage();
        let step2 = 1;

        const snap2 = async (label) => {
          const filename = `${emptyPrefix}-${String(step2).padStart(2, '0')}-${label}.png`;
          await page2.screenshot({ path: join(OUTPUT, filename), fullPage: true });
          console.log(`  ✓ ${filename}`);
          step2++;
        };

        await page2.goto(baseUrl, { waitUntil: 'networkidle' });
        await page2.evaluate(() => {
          document.querySelectorAll('.feedback-overlay').forEach(el => el.remove());
          document.getElementById('form-mode').classList.add('open');
          document.getElementById('intake-split').style.display = 'none';
        });
        await page2.waitForTimeout(300);
        await snap2('phase1-empty');

        await ctx2.close();
      }
    }
  } finally {
    await browser.close();
    server.httpServer.close();
  }

  console.log(`\n✅ All screenshots saved to screenshots/output/`);
}

capture().catch((err) => {
  console.error('Screenshot capture failed:', err);
  process.exit(1);
});
