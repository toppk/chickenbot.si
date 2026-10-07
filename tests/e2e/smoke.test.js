import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { chromium } from 'playwright';
import { startPreview } from '../../scripts/preview.js';

const ROOT = process.env.E2E_ROOT ?? 'dist';
// set E2E_URL to test an already-running server (e.g. `bun run dev`) instead of serving ROOT
const URL_UNDER_TEST = process.env.E2E_URL;
const DEAD_WS = 'ws://127.0.0.1:9';
// external font fetches may fail offline, the retry test dials a dead port; anything else in the console is a bug
const IGNORED = [/fonts\.(googleapis|gstatic)\.com/, /ws:\/\/127\.0\.0\.1:9/];

let server;
let browser;

beforeAll(async () => {
  if (!URL_UNDER_TEST) server = startPreview({ root: ROOT, port: 0 });
  browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
});

afterAll(async () => {
  await browser?.close();
  server?.stop(true);
});

async function open(viewport, query = '') {
  const page = await browser.newPage({ viewport });
  const errors = [];
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  page.on('console', (m) => {
    if (m.type() === 'error' && !IGNORED.some((re) => re.test(m.text() + (m.location().url ?? ''))))
      errors.push(`console: ${m.text()}`);
  });
  page.on('requestfailed', (r) => {
    if (!IGNORED.some((re) => re.test(r.url()))) errors.push(`requestfailed: ${r.url()}`);
  });
  await page.goto((URL_UNDER_TEST ?? server.url.href) + query);
  // fail fast with the page's own errors if startup breaks
  await page.waitForFunction(() => window.chickenbot, null, { timeout: 15_000 }).catch(() => {});
  expect(errors).toEqual([]);
  return { page, errors };
}

const snapshot = (page) => page.evaluate(() => window.chickenbot.snapshot());
const hasText = (page, sel, text, timeout = 10_000) =>
  page.waitForFunction(([s, t]) => document.querySelector(s)?.textContent.includes(t), [sel, text], { timeout });
const visible = (page, sel) => page.locator(sel).waitFor({ state: 'visible', timeout: 5_000 });
const hidden = (page, sel) => page.locator(sel).waitFor({ state: 'hidden', timeout: 5_000 });

describe('bar page', () => {
  test('desktop: loads, runs frames, serves drinks, drives the protocol and debug UI', async () => {
    const { page, errors } = await open({ width: 1280, height: 800 });

    await page.waitForFunction(() => /Frame Time: \d/.test(document.getElementById('d-ft')?.textContent ?? ''));
    await hasText(page, '#chatlog', 'doors open');
    expect(Number(await page.locator('#h-patrons').textContent())).toBeGreaterThanOrEqual(5);
    const start = await snapshot(page);
    expect(start.patrons.map((p) => p.name)).toEqual(expect.arrayContaining(['Gus', 'Marla', 'Otis', 'Rosa']));

    // the opening order (Rosa's lager) gets poured
    await page.waitForFunction(() => window.chickenbot.snapshot().pours >= 1, null, { timeout: 60_000 });

    // protocol messages, the same ones a brain server would send
    await page.evaluate(() => {
      const h = window.chickenbot.handle;
      h({ type: 'auto', on: false });
      h({ type: 'mood', mood: 'grumpy', intensity: 0.9 });
      h({ type: 'say', text: 'Protocol check.' });
      h({ type: 'emote', emote: 'spin' });
      h({ type: 'spawn', kind: 'patron', name: 'Testa', drink: 'whiskey' });
      h({ type: 'lights', level: 0.2 });
      h({ type: 'music', on: false });
    });
    await hasText(page, '#h-mood', 'GRUMPY');
    await hasText(page, '#chatlog', 'CHICKENBOT: Protocol check.');
    expect((await snapshot(page)).patrons.some((p) => p.name === 'Testa')).toBe(true);

    // chat input goes to the local brain
    await page.fill('#chatin', 'a stout please');
    await page.press('#chatin', 'Enter');
    await hasText(page, '#chatlog', 'you: a stout please');
    await hasText(page, '#chatlog', 'oatmeal stout', 5_000);

    // debug windows, lofi and the brain-link button
    await page.click('text=Toggle Brain');
    await page.click('text=Toggle Wire');
    await visible(page, 'section[aria-label="wire"]');
    await page.click('#lofibtn');
    expect(await page.getAttribute('#lofibtn', 'aria-pressed')).toBe('true');
    await page.click('#lofibtn');
    await page.click('#d-hide');
    await visible(page, '#dbgmini');
    await page.keyboard.press('`');
    await hidden(page, '#dbgmini');

    // camera drag and zoom
    await page.mouse.move(400, 300);
    await page.mouse.down();
    await page.mouse.move(250, 380, { steps: 5 });
    await page.mouse.up();
    await page.mouse.wheel(0, 300);
    await page.waitForTimeout(500);

    expect(errors).toEqual([]);
    await page.close();
  }, 120_000);

  test('phone width: debug starts folded, saved brain link retries', async () => {
    const { page, errors } = await open({ width: 420, height: 860 }, `?ws=${DEAD_WS}`);
    await visible(page, '#dbgmini');
    await hasText(page, '#linktxt', 'RETRY', 10_000);
    await page.waitForTimeout(1_000);
    expect(errors).toEqual([]);
    await page.close();
  }, 60_000);
});
