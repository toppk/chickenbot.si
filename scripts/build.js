// usage: bun scripts/build.js [--three=bundle|cdn] [--outdir=dist]
import { createHash } from 'node:crypto';
import { readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { parseArgs } from 'node:util';

const { values: opts } = parseArgs({
  options: { three: { type: 'string', default: 'bundle' }, outdir: { type: 'string', default: 'dist' } },
});
if (!['bundle', 'cdn'].includes(opts.three)) throw new Error(`--three must be bundle or cdn, got ${opts.three}`);

const threePkg = JSON.parse(await readFile('node_modules/three/package.json', 'utf8'));
const threeModule = await readFile('node_modules/three/build/three.module.js');
const THREE_CDN = `https://cdn.jsdelivr.net/npm/three@${threePkg.version}/build/three.module.js`;
const THREE_SRI = `sha384-${createHash('sha384').update(threeModule).digest('base64')}`;

await rm(opts.outdir, { recursive: true, force: true });
const result = await Bun.build({
  entrypoints: ['web/index.html'],
  outdir: opts.outdir,
  minify: true,
  sourcemap: 'linked',
  external: opts.three === 'cdn' ? ['three'] : [],
});
if (!result.success) {
  for (const log of result.logs) console.error(log);
  process.exit(1);
}

if (opts.three === 'cdn') {
  // the bundle keeps a bare `import "three"`; an import map resolves it to the pinned CDN copy
  const importMap = JSON.stringify({ imports: { three: THREE_CDN }, integrity: { [THREE_CDN]: THREE_SRI } });
  for (const f of await readdir(opts.outdir)) {
    if (!f.endsWith('.html')) continue;
    const path = join(opts.outdir, f);
    const html = await readFile(path, 'utf8');
    await writeFile(path, html.replace('<head>', `<head><script type="importmap">${importMap}</script>`));
  }
}

for (const o of result.outputs)
  console.log(`${o.path.replace(`${process.cwd()}/`, '')}  ${(o.size / 1024).toFixed(1)} KiB`);
console.log(`three.js ${threePkg.version}: ${opts.three === 'cdn' ? THREE_CDN : 'bundled'}`);
