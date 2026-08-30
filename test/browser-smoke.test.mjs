import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn } from 'node:child_process';

async function chromium(url) {
  const profile = await mkdtemp(join(tmpdir(), 'foundation-devtools-chromium-'));
  try {
    return await new Promise((resolve, reject) => {
      const child = spawn('chromium', [
        '--headless=new', '--no-sandbox', '--disable-gpu', '--allow-file-access-from-files', '--force-prefers-reduced-motion',
        `--user-data-dir=${profile}`, '--virtual-time-budget=1000', '--dump-dom', url,
      ], { stdio: ['ignore', 'pipe', 'pipe'] });
      const timeout = setTimeout(() => child.kill('SIGKILL'), 30000);
      let output = '';
      let errors = '';
      child.stdout.on('data', (chunk) => { output += chunk; });
      child.stderr.on('data', (chunk) => { errors += chunk; });
      child.on('error', reject);
      child.on('close', (code) => {
        clearTimeout(timeout);
        code === 0 ? resolve(output) : reject(new Error(errors || `Chromium exited with ${code}`));
      });
    });
  } finally {
    await rm(profile, { force: true, recursive: true });
  }
}

test('Astro fixture covers production and browser contracts', async () => {
  const html = await readFile('fixture/index.html', 'utf8');
  assert.match(html, /data-fd-scope="grid"/);
  assert.match(html, /data-fd-scope="card"/);

  const production = await readFile('fixture/astro/dist/index.html', 'utf8');
  assert.doesNotMatch(production, /foundation-devtools|data-fd-config/);

  const output = await chromium(`file://${process.cwd()}/fixture/smoke.html`);
  assert.match(output, /<title>FD browser PASS<\/title>/);
});
