import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import type { Browser, Page } from 'playwright';
import { startPreview } from '../../scripts/preview.ts';
import { BLOCKED_WS, hasText, hidden, launch, openPage, visible } from '../browser.ts';

const ROOT = process.env.E2E_ROOT ?? 'dist';
// set E2E_URL to test an already-running server (e.g. `bun run dev`) instead of serving ROOT
const URL_UNDER_TEST = process.env.E2E_URL;
// production sends a self-only CSP; the CDN build loads three.js from jsDelivr, so CI tests it with E2E_CSP=0
const CSP = process.env.E2E_CSP !== '0' && !URL_UNDER_TEST;
const IGNORED = [/blocked\.invalid/];
const THIRD_PARTY_OK = CSP ? [] : [/^https:\/\/cdn\.jsdelivr\.net\/npm\/three@/];
const DEFAULTS = '&ideal=1.6&cap=0&rows=346&glass=0.38';

let server: ReturnType<typeof startPreview> | undefined;
let browser: Browser;

beforeAll(async () => {
  if (!URL_UNDER_TEST) server = startPreview({ root: ROOT, port: 0, csp: CSP });
  browser = await launch();
});

afterAll(async () => {
  await browser?.close();
  server?.stop(true);
});

const open = (viewport: { width: number; height: number }, query = '', base = URL_UNDER_TEST ?? server!.url.href) =>
  openPage(browser, base + query, { viewport, ignored: IGNORED, thirdPartyOk: THIRD_PARTY_OK });
const snapshot = (page: Page) => page.evaluate(() => window.chickenbot.snapshot());

describe('bar page', () => {
  test('desktop: visitor defaults, assets, simulation, protocol and debug UI', async () => {
    const { page, errors } = await open({ width: 1280, height: 800 });

    // visitors start with the debug windows folded into the Show tab
    await visible(page, '#dbgmini');
    await hidden(page, 'section[aria-label="stats"]');

    // self-hosted fonts load, the favicons are served, and the build revision is stamped
    const fonts = await page.evaluate(() =>
      Promise.all(
        ['Press Start 2P', 'VT323', 'Share Tech Mono'].map(
          async (f) => (await document.fonts.load(`12px "${f}"`, 'A')).length,
        ),
      ),
    );
    expect(fonts).toEqual([1, 1, 1]);
    // the linked icons, plus the plain /favicon.ico copy that only builds have (the dev server falls back to index.html)
    const iconUrls = await page.evaluate(() =>
      [...document.querySelectorAll<HTMLLinkElement>('link[rel="icon"]')].map((l) => l.href),
    );
    expect(iconUrls.length).toBe(2);
    if (!URL_UNDER_TEST) iconUrls.push(new URL('favicon.ico', page.url()).href);
    for (const u of iconUrls) {
      const r = await page.request.get(u);
      expect(`${r.status()} ${r.headers()['content-type']}`).toMatch(/^200 image\//);
    }
    if (!URL_UNDER_TEST) {
      const rev = await page.getAttribute('meta[name="revision"]', 'content');
      expect(rev).toMatch(/^[0-9a-f]{7,}(-dirty)?$/);
      await hasText(page, '#wins', `Build: ${rev}`);
    }

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

    // the visible Show control opens the debug windows; Hide and the backtick key fold them again
    await page.click('#d-show');
    await visible(page, 'section[aria-label="stats"]');
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
    await hasText(page, '#d-zoom .v', '6.');
    // Home puts the view back
    await page.keyboard.press('Home');
    await hasText(page, '#d-zoom .v', '4.90');
    await hasText(page, '#d-pitch .v', '36.0');
    // Copy Settings logs the view as URL parameters
    const logged = page.waitForEvent('console', (m) => m.text().startsWith('chickenbot settings: ?cam='));
    await page.click('text=Copy Settings');
    expect((await logged).text()).toContain(DEFAULTS);

    expect(errors).toEqual([]);
    await page.close();
  }, 120_000);

  test.if(CSP)(
    'phone width, production CSP: a disallowed brain link is tried once, then the local brain carries on',
    async () => {
      const { page, errors } = await open({ width: 420, height: 860 }, `?ws=${BLOCKED_WS}`);
      const refusals: string[] = [];
      page.on('console', (m) => {
        if (m.text().includes('blocked.invalid')) refusals.push(m.text());
      });
      await visible(page, '#dbgmini');
      await hasText(page, '#chatlog', 'brain link blocked by this site');
      await hasText(page, '#linktxt', 'SIM');
      // the old behaviour retried after 2 s, 4 s, 8 s ...: nothing more may happen
      await page.waitForTimeout(7_000);
      expect(refusals).toEqual([]);
      expect(await page.evaluate(() => localStorage.getItem('chickenbot.ws'))).toBeNull();
      await page.click('#d-show');
      await page.click('#linkbtn');
      await hasText(page, 'section[aria-label="wire"]', 'was blocked. The local brain is running the bar.');
      // the local brain still answers
      await page.fill('#chatin', 'hello');
      await page.press('#chatin', 'Enter');
      await hasText(page, '#chatlog', 'CHICKENBOT:', 5_000);
      expect(errors).toEqual([]);
      await page.close();
    },
    60_000,
  );

  test('development, no CSP: the bar links up to a local brain server', async () => {
    const seen: string[] = [];
    const brain = Bun.serve({
      port: 0,
      fetch: (req, srv) => (srv.upgrade(req) ? undefined : new Response('brain', { status: 426 })),
      websocket: {
        message(ws, msg) {
          const m = JSON.parse(String(msg));
          seen.push(m.type);
          if (m.type === 'hello') ws.send(JSON.stringify({ type: 'say', text: 'Brain online.' }));
        },
      },
    });
    const dev = URL_UNDER_TEST ? undefined : startPreview({ root: ROOT, port: 0 });
    try {
      const { page, errors } = await open(
        { width: 1280, height: 800 },
        `?ws=ws://127.0.0.1:${brain.port}`,
        URL_UNDER_TEST ?? dev!.url.href,
      );
      await hasText(page, '#linktxt', 'LIVE');
      await hasText(page, '#chatlog', 'CHICKENBOT: Brain online.');
      expect(seen.slice(0, 2)).toEqual(['hello', 'state']);
      expect(errors).toEqual([]);
      await page.close();
    } finally {
      dev?.stop(true);
      brain.stop(true);
    }
  }, 60_000);
});
