// Shared by the smoke test (tests/e2e) and the live check (tests/live).
import { expect } from 'bun:test';
import { type Browser, chromium, type Page } from 'playwright';

export const launch = () => chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });

/** The CSP refusal of a deliberately disallowed brain link is the one console error a test may expect. */
export const BLOCKED_WS = 'wss://blocked.invalid/brain';

/**
 * Opens url and collects page errors, console errors, failed requests and requests to other origins
 * into `errors`. Fails fast with them if the page doesn't start.
 */
export async function openPage(
  browser: Browser,
  url: string,
  {
    viewport = { width: 1280, height: 800 },
    ignored = [] as RegExp[],
    thirdPartyOk = [] as RegExp[],
  }: { viewport?: { width: number; height: number }; ignored?: RegExp[]; thirdPartyOk?: RegExp[] } = {},
) {
  const page = await browser.newPage({ viewport });
  const errors: string[] = [];
  const origin = new URL(url).origin;
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  page.on('console', (m) => {
    if (m.type() === 'error' && !ignored.some((re) => re.test(m.text() + (m.location().url ?? ''))))
      errors.push(`console: ${m.text()}`);
  });
  page.on('requestfailed', (r) => {
    if (!ignored.some((re) => re.test(r.url()))) errors.push(`requestfailed: ${r.url()}`);
  });
  // fonts and icons are served by the site, so nothing should go elsewhere
  page.on('request', (r) => {
    const u = r.url();
    if (!u.startsWith(origin) && !u.startsWith('data:') && !thirdPartyOk.some((re) => re.test(u)))
      errors.push(`third-party request: ${u}`);
  });
  const response = await page.goto(url);
  await page.waitForFunction(() => window.chickenbot, null, { timeout: 15_000 }).catch(() => {});
  expect(errors).toEqual([]);
  return { page, errors, response };
}

export const hasText = (page: Page, sel: string, text: string, timeout = 10_000) =>
  page.waitForFunction(([s, t]) => document.querySelector(s)?.textContent?.includes(t), [sel, text] as const, {
    timeout,
  });
export const visible = (page: Page, sel: string) => page.locator(sel).waitFor({ state: 'visible', timeout: 5_000 });
export const hidden = (page: Page, sel: string) => page.locator(sel).waitFor({ state: 'hidden', timeout: 5_000 });
