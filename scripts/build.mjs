import { cp, mkdir, writeFile } from 'node:fs/promises';
import { build } from 'esbuild';

await mkdir('dist', { recursive: true });
await build({
  bundle: true,
  entryPoints: ['src/browser-entry.ts'],
  format: 'esm',
  minify: true,
  outfile: 'dist/browser.js',
  platform: 'browser',
  target: ['es2022'],
});
await cp('README.md', 'dist/README.md');
await cp('src/FoundationDevtools.astro', 'dist/FoundationDevtools.astro');
await writeFile('dist/astro.d.ts', `import type { AstroComponentFactory } from 'astro/runtime/server/index.js';\nimport type { DevtoolsConfig } from './core.js';\nexport type FoundationDevtoolsProps = { config: DevtoolsConfig };\ndeclare const FoundationDevtools: AstroComponentFactory;\nexport default FoundationDevtools;\nexport type { DevtoolsConfig };\n`);
const { execFile } = await import('node:child_process');
const { promisify } = await import('node:util');
await promisify(execFile)('node', ['scripts/production-check.mjs'], { maxBuffer: 10 * 1024 * 1024 });
