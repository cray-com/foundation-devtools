import { execFile } from 'node:child_process';
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { promisify } from 'node:util';

const run = promisify(execFile);

async function filesUnder(directory) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await filesUnder(path));
    else files.push(path);
  }
  return files;
}

await run('astro', ['build', '--root', 'fixture/astro'], { maxBuffer: 10 * 1024 * 1024 });
const files = await filesUnder('fixture/astro/dist');
const output = (await Promise.all(files.map((file) => readFile(file, 'utf8')))).join('\n');
if (/foundation-devtools|data-fd-config|FD · devtools/.test(output)) {
  throw new Error('Production fixture contains Foundation Devtools client code or markers');
}
