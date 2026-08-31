import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { chromium, firefox } from '@playwright/test';

test('Astro fixture covers production and browser contracts', async () => {
  const html = await readFile('fixture/index.html', 'utf8');
  assert.match(html, /data-fd-scope="grid"/);
  assert.match(html, /data-fd-scope="card"/);

  const production = await readFile('fixture/astro/dist/index.html', 'utf8');
  assert.doesNotMatch(production, /foundation-devtools|data-fd-config/);

  for (const [name, launcher, options] of [['Chromium', chromium, { args: ['--allow-file-access-from-files'] }], ['Firefox', firefox, {}]]) {
    let browser;
    try { browser = await launcher.launch({ ...options, headless: true }); } catch (error) { throw new Error(`${name} smoke could not start`, { cause: error }); }
    try {
      const context = await browser.newContext({ reducedMotion: 'no-preference' });
      const page = await context.newPage();
      let navigations = 0;
      page.on('framenavigated', (frame) => { if (frame === page.mainFrame()) navigations += 1; });
      await page.goto(pathToFileURL(`${process.cwd()}/fixture/smoke.html`).href, { waitUntil: 'load' });
      await page.waitForFunction(() => document.title.startsWith('FD browser '), undefined, { timeout: 20_000 });
      assert.equal(await page.title(), 'FD browser PASS');
      assert.ok(navigations >= 3, `${name} restore test did not reload through both selections`);
      const panel = page.locator('foundation-devtools').locator('.panel');
      assert.ok(await panel.boundingBox());
      await page.setViewportSize({ width: 480, height: 320 });
      assert.ok(await panel.evaluate((node) => {
        const maxHeight = parseFloat(getComputedStyle(node).maxHeight);
        return maxHeight <= 224 && node.getBoundingClientRect().right <= innerWidth && node.getBoundingClientRect().bottom <= innerHeight;
      }));
      await context.close();
    } finally { await browser.close(); }
  }
});
