// Read-only browser checks against a deployed site:
//   LIVE_URL=https://chickenbot.si/ LIVE_REV=682c3b4 bun run test:live
// Nothing is injected: the page runs under the server's own CSP. Nothing server-side changes either:
// the site is static, chat goes to the in-page local brain, and the one brain link tried is to a
// .invalid host that can never resolve.
import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import type { Browser } from 'playwright';
import { BLOCKED_WS, hasText, launch, openPage } from '../browser.ts';

const LIVE_URL = process.env.LIVE_URL;
// expected revision: the short or full commit; leave unset to only check it looks like a clean commit
const LIVE_REV = process.env.LIVE_REV;
if (!LIVE_URL) throw new Error('set LIVE_URL, e.g. LIVE_URL=https://chickenbot.si/ bun run test:live');

let browser: Browser;
beforeAll(async () => {
  browser = await launch();
});
afterAll(async () => {
  await browser?.close();
});

const withQuery = (q: string) => {
  const u = new URL(LIVE_URL);
  u.search = q;
  return u.href;
};

describe(`live site ${LIVE_URL}`, () => {
  test('self-only CSP, revision, assets, no errors or off-site requests', async () => {
    const { page, errors, response } = await openPage(browser, LIVE_URL);
    expect(response?.status()).toBe(200);

    const csp = response?.headers()['content-security-policy'];
    console.log(`CSP: ${csp ?? '(none)'}`);
    expect(csp).toBeDefined();
    const directives = new Map(
      csp!.split(';').map((d) => {
        const [name = '', ...values] = d.trim().split(/\s+/);
        return [name, values] as const;
      }),
    );
    // remote brain links must stay blocked: connect-src (or default-src, if absent) is 'self' only
    expect(directives.get('connect-src') ?? directives.get('default-src')).toEqual(["'self'"]);

    const rev = await page.getAttribute('meta[name="revision"]', 'content');
    console.log(`revision: ${rev}`);
    expect(rev).toMatch(/^[0-9a-f]{7,40}$/);
    if (LIVE_REV) expect(LIVE_REV.startsWith(rev!) || rev!.startsWith(LIVE_REV)).toBe(true);

    // the self-hosted fonts load and the linked icons are served
    const fonts = await page.evaluate(() =>
      Promise.all(
        ['Press Start 2P', 'VT323', 'Share Tech Mono'].map(
          async (f) => (await document.fonts.load(`12px "${f}"`, 'A')).length,
        ),
      ),
    );
    expect(fonts).toEqual([1, 1, 1]);
    const icons = await page.evaluate(() =>
      [...document.querySelectorAll<HTMLLinkElement>('link[rel="icon"]')].map((l) => l.href),
    );
    expect(icons.length).toBe(2);
    for (const u of icons) {
      const r = await page.request.get(u);
      expect(`${r.status()} ${r.headers()['content-type']}`).toMatch(/^200 image\//);
    }

    // the bar is running
    await hasText(page, '#chatlog', 'doors open');
    await page.waitForFunction(() => window.chickenbot.snapshot().patrons.length >= 4, null, { timeout: 15_000 });
    expect(errors).toEqual([]);
    await page.close();
  }, 60_000);

  test('local brain answers chat', async () => {
    const { page, errors } = await openPage(browser, LIVE_URL);
    await hasText(page, '#chatlog', 'doors open');
    await page.fill('#chatin', 'a stout please');
    await page.press('#chatin', 'Enter');
    await hasText(page, '#chatlog', 'you: a stout please');
    await hasText(page, '#chatlog', 'oatmeal stout', 10_000);
    expect(errors).toEqual([]);
    await page.close();
  }, 60_000);

  test('a disallowed brain link is refused once and the local brain carries on', async () => {
    const { page, errors } = await openPage(browser, withQuery(`?ws=${BLOCKED_WS}`), {
      viewport: { width: 420, height: 860 },
      ignored: [/blocked\.invalid/],
    });
    const later: string[] = [];
    page.on('console', (m) => {
      if (m.text().includes('blocked.invalid')) later.push(m.text());
    });
    await hasText(page, '#chatlog', 'brain link blocked by this site');
    await hasText(page, '#linktxt', 'SIM');
    // no retry loop (it used to retry after 2 s, 4 s, 8 s ...)
    await page.waitForTimeout(7_000);
    expect(later).toEqual([]);
    await page.fill('#chatin', 'hello');
    await page.press('#chatin', 'Enter');
    await hasText(page, '#chatlog', 'CHICKENBOT:', 10_000);
    expect(errors).toEqual([]);
    await page.close();
  }, 60_000);
});
