# Release and CI

For whoever builds, ships and hosts chickenbot.si. It covers how a change gets from a commit to a
deployable `dist/`, what CI guarantees, and what the hosting side needs to know. Deployment itself is
not set up yet; the open decisions are at the end.

## The short version

- The site is **static files**: `bun run build` writes `dist/` (an `index.html`, one hashed JS
  bundle, one hashed CSS file, and a source map). There is no server-side code, routing or
  environment config.
- Every push and pull request runs **CI** on GitHub Actions: lint, typecheck, build, a browser smoke
  test of two builds, and a pixel-level visual regression test. A green run uploads `dist/` as an
  artifact.
- Dependencies follow a **14-day supply-chain cooldown**: nothing newer than 14 days is installed,
  and CI actions are pinned to commit SHAs.

## Repository

| | |
|---|---|
| Repo | https://github.com/toppk/chickenbot.si (public) |
| Branch | `master`, the only branch; changes are committed straight to it |
| Toolchain | [Bun](https://bun.sh), version in `.bun-version` (1.4.2); CI installs exactly that |
| Language | strict TypeScript, run and bundled by Bun; `tsc` only typechecks |
| Runtime deps | `three` (0.186). Everything else in `package.json` is build/test tooling |

## Commands

```sh
bun install --frozen-lockfile   # exact versions from bun.lock
bun run build                   # dist/, three.js bundled in (the default)
bun run build:cdn               # dist/, three.js from jsDelivr (pinned + integrity-checked)
bun run preview                 # serve dist/ at http://localhost:3000 (PORT=... to change)
bun run check                   # everything CI runs, locally
```

The browser tests need Playwright's headless Chromium once per machine:
`bunx playwright install chromium-headless-shell`.

## What CI checks

`.github/workflows/ci.yml`, one job on `ubuntu-latest`, triggered by every push and pull request:

| Step | Fails when |
|---|---|
| `bun install --frozen-lockfile` | `bun.lock` doesn't match `package.json` |
| `bun run lint` | any Biome error **or warning** (format or lint) |
| `bun run typecheck` | any TypeScript error (`web/` with browser types; `scripts/` and `tests/` with Bun's) |
| Playwright browser install | apt or download problems (10 min timeout) |
| Smoke test, CDN build | the page logs an error, frames don't run, or the scripted checks fail (below) |
| Smoke test, bundled build | same, against the default build |
| Visual regression | any of 9 fixed views differs from its reference image by more than 0.2% of pixels |

The smoke test (`tests/e2e/`) drives the built page in headless Chromium. It checks that the page
loads with no console errors, that frames run, and that the opening drink order gets poured. It sends
protocol messages and checks the status bar, chat and patrons react, and checks that chat reaches the
local brain. It exercises the debug windows, the lofi toggle, camera input, Reset and Copy Settings.
At phone width it checks the debug windows start folded and that a saved brain link shows RETRY.

The visual test (`tests/visual/`) seeds `Math.random` and runs a fake clock, so every render is
exactly repeatable on any machine. It covers laptop, phone, ultrawide, chat-panel and 2x high-DPI
sizes, and the under-the-floor view. The reference images are committed in
`tests/visual/baselines/`. When a change is meant to look different, its commit regenerates them
(`UPDATE_VISUAL=1 bun run test:visual`), so a visual change always shows up in the diff.

**Artifacts.** A green run uploads `dist` (the **bundled** build, since it's built last). A failed
run uploads `visual-diffs` (actual and diff images) when the visual test is what failed. The job has
a 20-minute timeout; a normal run takes about a minute.

## Dependencies and supply chain

- `bunfig.toml` sets `minimumReleaseAge` to 14 days. `bun install`, `bun add` and `bun update` will
  not pick any package version, transitive ones included, published less than 14 days ago.
- `package.json` uses caret ranges; `bun.lock` records the exact versions, and CI installs with
  `--frozen-lockfile`.
- GitHub Actions are pinned to full commit SHAs of releases at least 14 days old, with the version
  in a comment. Nothing updates them automatically; Dependabot with a 14-day cooldown is an option.
- The CDN build loads three.js from jsDelivr with an import map that carries **SRI hashes** computed
  from the npm copies of `three.module.js` and `three.core.js`. The browser refuses a CDN file that
  doesn't match.

## What gets deployed

```
dist/
  index.html                 2.2 KB   no-cache
  chunk-<hash>.js          ~620 KB    ~165 KB gzipped; content-hashed, cache forever
  chunk-<hash>.css          ~9 KB     content-hashed, cache forever
  chunk-<hash>.js.map       ~3 MB     source map (optional to deploy, see below)
```

- **Relative paths.** `index.html` references `./chunk-…`, so the site works at a domain root or
  under a sub-path.
- **Caching.** Hashed `chunk-*` files never change content, so serve them with
  `Cache-Control: public, max-age=31536000, immutable`. Serve `index.html` with `no-cache` so
  new builds are picked up.
- **MIME types.** `.js` must be served as `text/javascript` (it's an ES module), and `.map` as
  `application/json`.
- **Compression.** gzip or brotli for `.js`, `.css` and `.html`.
- **No routing.** There's one page and no client-side routes; anything other than the files above
  can be a 404.

### External requests made by the page

| To | Why | When |
|---|---|---|
| `fonts.googleapis.com`, `fonts.gstatic.com` | the three web fonts | always |
| `cdn.jsdelivr.net` | three.js | CDN build only |
| a `ws://` / `wss://` brain server | live brain link | only with `?ws=…` or a URL saved in the wire debug window |

For a Content-Security-Policy, roughly:

- `default-src 'self'`
- `style-src 'self' https://fonts.googleapis.com`
- `font-src https://fonts.gstatic.com`
- `img-src 'self' data:` (the drink icons are data URLs)
- `connect-src` should list the brain server's `wss://` origin once there is one

The CDN build adds an inline `<script type="importmap">`, which needs its hash in `script-src`
(plus `https://cdn.jsdelivr.net`). The bundled build has no inline script.

### The brain server

The page works on its own: a built-in "local brain" runs the bar. A real brain is a separate
WebSocket server (not built yet; `server/` is reserved for it), reached with `?ws=wss://host/path`.
On an HTTPS site it has to be `wss://`, usually behind the same TLS reverse proxy. The messages are
in [protocol.md](protocol.md), with the types in `shared/protocol.ts`.

## Not decided yet

1. **Bundled or CDN build for the test site.** The bundled build has no third-party script
   dependency; the CDN build shares jsDelivr's cache. CI tests both.
2. **Debug windows for visitors.** The ImGui-style debug windows are open by default on desktop
   (the backtick key toggles them). For a public site they should probably start hidden.
3. **Source maps.** The repo is public, so deploying the `.map` is harmless and helps debugging. To
   leave it out, delete it from `dist/`, or build with `sourcemap: 'none'` in `scripts/build.ts`.
4. **Versioning.** There are no tags, version number or changelog yet, and the page doesn't show
   which commit it was built from. A tag per deploy, and the commit SHA stamped into the page, would
   make "what's on the test site" answerable.
5. **The deploy job.** CI produces the artifact; nothing ships it yet. A deploy job (on tag or on
   green `master`) would sit after the existing steps and needs credentials for the host.
6. **Visual-tuning defaults.** Framing, Art Rows and glass opacity defaults are still being tuned
   (see the README's `?cam=` notes). Expect a commit that changes them and regenerates the reference
   images.
