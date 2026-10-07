// Renders fixed camera views with a seeded Math.random and a fake clock, and compares them to
// tests/visual/baselines. After an intended visual change: UPDATE_VISUAL=1 bun run test:visual
import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import pixelmatch from 'pixelmatch';
import { chromium } from 'playwright';
import { PNG } from 'pngjs';
import { startPreview } from '../../scripts/preview.js';

const ROOT = process.env.E2E_ROOT ?? 'dist';
const UPDATE = process.env.UPDATE_VISUAL === '1';
const BASELINES = join(import.meta.dir, 'baselines');
const OUTPUT = join(import.meta.dir, '__output__');
// per-pixel colour tolerance (0-1), and the share of pixels allowed past it
const THRESHOLD = 0.1;
const MAX_DIFF_RATIO = 0.002;
const SIM_MS = 5_000;

const VIEWS = [
  { name: 'default', cam: '38,36,4.9' },
  { name: 'window-side', cam: '200,30,7' },
  { name: 'bar-closeup', cam: '120,45,3' },
  { name: 'ceiling', cam: '38,-40,5' },
  { name: 'phone', cam: '38,36,4.9', viewport: { width: 420, height: 860 } },
];

// mulberry32, so every run builds the same patrons, bottles and textures
const SEED_RANDOM = `{let s=0x5eed;Math.random=()=>{s=(s+0x6d2b79f5)|0;let t=Math.imul(s^(s>>>15),1|s);t=(t+Math.imul(t^(t>>>7),61|t))^t;return((t^(t>>>14))>>>0)/4294967296;};}`;

// the fake performance.now() starts 0-2 ms off depending on navigation timing; the fake Date doesn't
const EXACT_TIME = `{const raf=window.requestAnimationFrame.bind(window);performance.now=()=>Date.now();window.requestAnimationFrame=(cb)=>raf(()=>cb(Date.now()));}`;

let server;
let browser;

beforeAll(async () => {
  server = startPreview({ root: ROOT, port: 0 });
  browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  mkdirSync(OUTPUT, { recursive: true });
});

afterAll(async () => {
  await browser?.close();
  server?.stop(true);
});

async function render(view) {
  const ctx = await browser.newContext({ viewport: view.viewport ?? { width: 1280, height: 800 } });
  // paused from the start: frames only advance inside runFor, however long loading takes
  await ctx.clock.install({ time: 0 });
  await ctx.clock.pauseAt(1_000);
  // registered after the clock so it wraps the fake timers
  await ctx.addInitScript(SEED_RANDOM + EXACT_TIME);
  const page = await ctx.newPage();
  await page.goto(`${server.url.href}?cam=${view.cam}`);
  await page.waitForFunction(() => window.chickenbot);
  // canvas textures redraw (using Math.random) when VT323 arrives; fonts.ready doesn't wait for a canvas-only font
  await page.evaluate(() => document.fonts.load('14px VT323'));
  await page.evaluate(() => document.fonts.ready);
  await page.clock.runFor(SIM_MS);
  // DOM overlays (bubbles, hint, debug windows) aren't part of the render
  await page.addStyleTag({ content: '#bubbles,#hint,#wins,#dbgmini{display:none!important}' });
  const png = await page.locator('#view').screenshot();
  await ctx.close();
  return png;
}

describe('visual', () => {
  for (const view of VIEWS) {
    test(view.name, async () => {
      const actual = await render(view);
      const file = join(BASELINES, `${view.name}.png`);
      if (UPDATE) {
        mkdirSync(BASELINES, { recursive: true });
        writeFileSync(file, actual);
        return;
      }
      const a = PNG.sync.read(readFileSync(file));
      const b = PNG.sync.read(actual);
      expect(`${b.width}x${b.height}`).toBe(`${a.width}x${a.height}`);
      const diff = new PNG({ width: a.width, height: a.height });
      const bad = pixelmatch(a.data, b.data, diff.data, a.width, a.height, { threshold: THRESHOLD });
      const ratio = bad / (a.width * a.height);
      if (ratio > MAX_DIFF_RATIO) {
        writeFileSync(join(OUTPUT, `${view.name}.actual.png`), actual);
        writeFileSync(join(OUTPUT, `${view.name}.diff.png`), PNG.sync.write(diff));
      }
      expect(ratio).toBeLessThanOrEqual(MAX_DIFF_RATIO);
    }, 60_000);
  }
});
