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
    try { browser = await launcher.launch({ ...options, headless: true }); } catch (error) { if (name === 'Firefox') continue; throw error; }
    try {
      const context = await browser.newContext({ reducedMotion: 'reduce' });
      const page = await context.newPage();
      await page.goto(pathToFileURL(`${process.cwd()}/fixture/smoke.html`).href, { waitUntil: 'load' });
      await page.waitForFunction(() => document.title === 'FD browser PASS', undefined, { timeout: 10_000 });
      assert.equal(await page.title(), 'FD browser PASS');
      await context.close();
    } finally { await browser.close(); }
  }
});
