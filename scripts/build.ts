// usage: bun scripts/build.ts [--three=bundle|cdn] [--outdir=dist]
// The revision stamped into index.html comes from $CHICKENBOT_REV (the Nix build sets it), else git.
import { createHash } from 'node:crypto';
import { copyFile, mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { parseArgs } from 'node:util';

const { values: opts } = parseArgs({
  options: { three: { type: 'string', default: 'bundle' }, outdir: { type: 'string', default: 'dist' } },
});
if (!['bundle', 'cdn'].includes(opts.three)) throw new Error(`--three must be bundle or cdn, got ${opts.three}`);

const threePkg = JSON.parse(await readFile('node_modules/three/package.json', 'utf8'));
const THREE_BASE = `https://cdn.jsdelivr.net/npm/three@${threePkg.version}/build/`;
const THREE_CDN = `${THREE_BASE}three.module.js`;
// three.module.js imports ./three.core.js (r171+); every file the browser fetches needs a hash
const THREE_FILES = ['three.module.js', 'three.core.js'];
const threeIntegrity: Record<string, string> = {};
for (const f of THREE_FILES) {
  const bytes = await readFile(`node_modules/three/build/${f}`);
  threeIntegrity[THREE_BASE + f] = `sha384-${createHash('sha384').update(bytes).digest('base64')}`;
}

/** short commit, with -dirty for uncommitted changes, so a shown revision always traces to source */
function revision() {
  if (process.env.CHICKENBOT_REV) return process.env.CHICKENBOT_REV;
  const git = (...args: string[]) => Bun.spawnSync(['git', ...args], { stderr: 'ignore' });
  const rev = git('rev-parse', '--short', 'HEAD');
  if (!rev.success) return 'unknown';
  const dirty = git('status', '--porcelain').stdout.toString().trim() !== '';
  return `${rev.stdout.toString().trim()}${dirty ? '-dirty' : ''}`;
}
const REV = revision();
if (!/^[\w.-]+$/.test(REV)) throw new Error(`unexpected revision ${JSON.stringify(REV)}`);

await rm(opts.outdir, { recursive: true, force: true });
const result = await Bun.build({
  entrypoints: ['web/index.html'],
  outdir: opts.outdir,
  minify: true,
  sourcemap: 'linked',
  external: opts.three === 'cdn' ? ['three'] : [],
  // web/ui/fonts.ts imports the font files for their URLs: emit them as hashed files
  loader: { '.woff2': 'file', '.woff': 'file' },
});
if (!result.success) {
  for (const log of result.logs) console.error(log);
  process.exit(1);
}

let head = `<meta name="revision" content="${REV}">`;
if (opts.three === 'cdn') {
  // the bundle keeps a bare `import "three"`; an import map resolves it to the pinned CDN copy
  head += `<script type="importmap">${JSON.stringify({ imports: { three: THREE_CDN }, integrity: threeIntegrity })}</script>`;
}
for (const f of await readdir(opts.outdir)) {
  if (!f.endsWith('.html')) continue;
  const path = join(opts.outdir, f);
  const html = await readFile(path, 'utf8');
  await writeFile(path, html.replace('<head>', `<head>${head}`));
}

// the minified bundle drops licence comments, so ship the notices alongside it
const LICENSES = [
  ['node_modules/three/LICENSE', 'three.js-MIT.txt'],
  ['node_modules/@fontsource/press-start-2p/LICENSE', 'Press-Start-2P-OFL.txt'],
  ['node_modules/@fontsource/vt323/LICENSE', 'VT323-OFL.txt'],
  ['node_modules/@fontsource/share-tech-mono/LICENSE', 'Share-Tech-Mono-OFL.txt'],
];
await mkdir(join(opts.outdir, 'licenses'));
for (const [from, to] of LICENSES) await copyFile(from!, join(opts.outdir, 'licenses', to!));
// browsers and other clients also ask for /favicon.ico directly
await copyFile('web/favicon.ico', join(opts.outdir, 'favicon.ico'));

for (const o of result.outputs)
  console.log(`${o.path.replace(`${process.cwd()}/`, '')}  ${(o.size / 1024).toFixed(1)} KiB`);
console.log(`three.js ${threePkg.version}: ${opts.three === 'cdn' ? THREE_CDN : 'bundled'}; revision ${REV}`);
