import { execFile } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { promisify } from 'node:util';

const run = promisify(execFile);
await run('astro', ['build', '--root', 'fixture/astro'], { maxBuffer: 10 * 1024 * 1024 });
const html = await readFile('fixture/astro/dist/index.html', 'utf8');
if (/foundation-devtools|data-fd-config/.test(html)) {
  throw new Error('Production fixture contains devtools markers');
}
