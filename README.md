# chickenbot.si

The website for chickenbot (the bot itself is `~/workspace/chickenbot`). Static for now,
served behind the haproxy edge on the bllue.org Linodes; a small WebSocket backend may
join it later.

## Running locally

```sh
bun install
bun run dev          # http://localhost:3000 with hot reload, straight from web/
bun run build        # dist/: the deployable static site, three.js bundled
bun run build:cdn    # same, but three.js loads from jsDelivr (pinned, integrity-checked)
bun run preview      # serve dist/
bun run check        # lint, build, browser smoke test
```

The smoke test needs a Playwright browser once: `bunx playwright install chromium-headless-shell`.
Point it at a running server with `E2E_URL=http://localhost:3000/ bun run test:e2e`.

## Layout

```
web/              the site (Bun bundles from web/index.html)
  main.js         entry point and frame loop
  styles/         base, hud (status bar), debug (ImGui-style windows)
  core/           helpers, and state.js for values several modules write
  render/         renderer, materials, mesh helpers, wall fade, post-process, camera
  scene/          the room, ceiling, bar, chickenbot model, people, glasses, particles
  sim/            drinks, orders, patrons, waitress, chickenbot behaviour, world tick
  ui/             speech bubbles, status bar, face, chat, debug windows
  brain/          link.js (WebSocket brain + protocol handler), local-brain.js (fallback)
  audio/          lofi music and sound effects
scripts/          build.js, preview.js (static file server)
tests/e2e/        headless-browser smoke test
docs/             architecture and protocol
```

`server/` is reserved for the WebSocket brain backend.

Append `?ws=ws://host:port` to the URL to point the bar at a brain server; without one
the in-page local brain runs it.

## Dependencies

- `bunfig.toml` sets a 14-day `minimumReleaseAge`: `bun install`/`bun update` never pick a version
  published less than 14 days ago. Ranges in `package.json` are carets; `bun.lock` holds the exact versions.
- CI actions are pinned to commit SHAs of releases at least 14 days old; bump them by hand.
- `.bun-version` sets the Bun used in CI.

## Docs

- [docs/architecture.md](docs/architecture.md): layers, startup, frame loop, build and tests
- [docs/protocol.md](docs/protocol.md): the brain WebSocket messages

## Module rules

- ES modules with explicit imports. three.js is `import * as THREE from 'three'`, pinned at 0.128.0.
- Imports are read-only, so a value written from more than one module lives in `core/state.js`.
- Modules import each other in cycles, so the order they evaluate in is not the order of the imports.
  At the top level a module may only call scene builders (`render/`, `scene/`, as `patrons.js` does
  to seat the regulars); any other startup work goes in an init function that `main.js` calls
  (`openBar`, `initDebug`).
  Biome's import sorting is off for the same reason.
