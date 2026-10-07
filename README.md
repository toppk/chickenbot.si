# chickenbot.si

The website for chickenbot (the bot itself is `~/workspace/chickenbot`). A static site, built by
this repo's Nix flake and served by infra at https://chickenbot.si; a WebSocket brain may join it
later (`wss://chickenbot.si/brain` is reserved). See [docs/release.md](docs/release.md).

## Running locally

```sh
bun install
bun run dev          # http://localhost:3000 with hot reload, straight from web/
bun run build        # dist/: the deployable static site, three.js bundled
bun run build:cdn    # same, but three.js loads from jsDelivr (same version as the lockfile, integrity-checked)
bun run preview      # serve dist/ (add `-- --csp` to send the production Content-Security-Policy)
bun run typecheck    # tsc, strict, for web/ (browser types) and scripts/ + tests/ (Bun types)
bun run check        # lint, typecheck, build, browser smoke test, visual regression
nix build            # what infra deploys: dist/ from the flake (Bun 1.4.2 pinned by hash)
```

The smoke test needs a Playwright browser once: `bunx playwright install chromium-headless-shell`.
Point it at a running server with `E2E_URL=http://localhost:3000/ bun run test:e2e`.

`bun run test:visual` renders fixed views (seeded random, fake clock) and compares them to
`tests/visual/baselines/`; failures write `actual` and `diff` images to `tests/visual/__output__/`.
After an intended visual change, refresh the baselines with `UPDATE_VISUAL=1 bun run test:visual`
and commit them.

`?cam=yaw,pitch,zoom` (e.g. `?cam=200,30,7`) opens the page at a fixed view with auto-orbit off,
handy for comparing renders. `?ideal=`, `?cap=`, `?rows=` and `?glass=` set the matching debug
sliders the same way. In the debug windows, Reset (or the Home key) puts all of those back, and Copy
Settings copies (and logs to the console) them as URL parameters plus the stage size, for sending in
tuned defaults.

The debug windows start folded into a small Show tab; the backtick key or Show opens them, and
`?debug=1` opens them at load.

## Layout

```
web/              the site (Bun bundles from web/index.html)
  main.ts         entry point and frame loop
  styles/         base, hud (status bar), debug (ImGui-style windows)
  content/        the bar's data: drinks menu, moods, regulars and palettes, dialogue, chord loops
  core/           model.ts (types for people, glasses, orders, ...), helpers, and state.ts for
                  values several modules write
  render/         renderer, materials, mesh helpers, wall fade, post-process, camera
  scene/          the room, ceiling, bar, chickenbot model, people, glasses, particles
  sim/            orders, patrons, waitress, chickenbot behaviour, world tick
  ui/             speech bubbles, status bar, face, chat, debug windows, fonts.ts (self-hosted fonts)
  brain/          link.ts (WebSocket brain + protocol handler), local-brain.ts (fallback)
  audio/          lofi music and sound effects
shared/           protocol.ts: brain message types, for the site and the future server
scripts/          build.ts, preview.ts (static file server, optional production CSP)
tests/e2e/        headless-browser smoke test
tests/visual/     visual regression test and its baselines
flake.nix         the Nix build infra deploys (packages.x86_64-linux.default = dist/)
docs/             architecture and protocol
```

`server/` is reserved for the WebSocket brain backend.

Append `?ws=ws://host:port` to the URL to point the bar at a brain server; without one
the in-page local brain runs it. Production's CSP only allows the site's own
`wss://chickenbot.si/brain`; any other URL is tried once, reported, and left to the local brain.

Fonts (Press Start 2P, VT323, Share Tech Mono; OFL) come from `@fontsource` packages and are served by
the site; the build copies their licences, and three.js's, to `dist/licenses/`. The favicons in
`web/` are copies of branding's approved Chickenbot assets (`docs/brands/chickenbot.md` there).

## Dependencies

- `bunfig.toml` sets a 14-day `minimumReleaseAge`: `bun install`/`bun update` never pick a version
  published less than 14 days ago. Ranges in `package.json` are carets; `bun.lock` holds the exact versions.
- CI actions are pinned to commit SHAs of releases at least 14 days old; bump them by hand.
- `.bun-version` sets the Bun used in CI; `flake.nix` pins the same release by hash.
- After `bun.lock` changes, update `outputHash` in `flake.nix` (`nix build` prints the new value).

## Docs

- [docs/architecture.md](docs/architecture.md): layers, startup, frame loop, build and tests
- [docs/protocol.md](docs/protocol.md): the brain WebSocket messages
- [docs/release.md](docs/release.md): CI, the Nix build, how a commit reaches chickenbot.si

## Module rules

- Content lives in `web/content/` as typed data: change the menu, a mood, a regular or a line of
  dialogue there, not in the code that uses it. Drink, mood and emote names come from
  `shared/protocol.ts`, so the brain protocol and the content can't drift apart.

- TypeScript, strict, run directly by Bun (no compile step; `tsc` only checks). `!` marks invariants
  the types can't express, such as elements index.html always has or parts set up at load.
- ES modules with explicit imports. three.js is `import * as THREE from 'three'`; `render/three-compat.ts` keeps the
  r128-era look (colour management off, legacy light levels and falloff).
- Imports are read-only, so a value written from more than one module lives in `core/state.ts`.
- Modules import each other in cycles, so the order they evaluate in is not the order of the imports.
  At the top level a module may only call scene builders (`render/`, `scene/`, as `patrons.ts` does
  to seat the regulars); any other startup work goes in an init function that `main.ts` calls
  (`openBar`, `initDebug`).
  Biome's import sorting is off for the same reason.
