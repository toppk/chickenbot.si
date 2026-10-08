# Architecture

Chickenbot's Bar is one page: a three.js scene drawn at low resolution, then pixelated and
outlined. It shows a round bar with chickenbot behind it, regulars, walk-ins, table groups and a
waitress. Below the scene there's a status bar and chat. ImGui-style debug windows sit on top.
There is no framework: strict TypeScript ES modules, bundled by Bun. The data model (people,
glasses, tables, orders, chickenbot) is described in `web/core/model.ts`, and the brain messages in
`shared/protocol.ts`.

## Layers

Folders roughly follow who depends on whom. Lower layers don't call into higher ones at startup
(see "Startup" below).

| folder     | what lives there |
|------------|------------------|
| `content/` | data only: the drinks menu (also drawn on the chalkboard), moods (look, speed, music, lines), regulars, walk-in names and clothing palettes, June, dialogue, chord loops |
| `core/`    | maths/random helpers; `state.ts`, the few values written by several modules |
| `render/`  | renderer and scene, materials and pixel-art textures, mesh helpers, wall fade, post-process, camera and its input |
| `scene/`   | things in the room: layout constants, walls and furniture, ceiling, bar, the chickenbot model, people models, glasses, particles |
| `sim/`     | what happens: orders, patrons, the waitress, chickenbot's behaviour, the world tick |
| `ui/`      | DOM overlays: speech bubbles, status bar, face, chat, debug windows |
| `brain/`   | the WebSocket link and protocol handler; the local fallback brain |
| `audio/`   | lofi music and sound effects (Web Audio, off until the visitor turns it on) |

Some modules call "up" a layer while the page runs. For example, glasses report a spill with
`send()` from `brain/link.ts`, and orders read the world clock. That's why the module graph has
cycles. See [protocol.md](protocol.md) for the messages.

## Startup

ES modules evaluate dependencies first, and with cycles the order follows the import graph, not
the order of the imports in any one file. So:

1. Module top level only builds that module's own objects, plus scene objects through the
   `render/` and `scene/` builders. For example, `sim/patrons.ts` seats the regulars and
   `sim/waitress.ts` creates June.
2. `main.ts` runs last and does the rest in a fixed order:
   - `openBar()` (`sim/world.ts`): Rosa at the bar with an order, a table already drinking, a
     puddle, "doors open", and reconnecting a saved brain link.
   - `initDebug()` (`ui/debug/panels.ts`): builds the stats, brain and wire windows.
   - Size the render targets, redraw canvas textures once the VT323 font loads, start the frame loop.

Breaking rule 1 shows up as an error at load in the smoke test. In bundled builds it may be
`undefined` rather than a TDZ error, because Bun hoists module bindings.

## Frame loop (`main.ts`)

Each frame, with `dt` capped at 50 ms:

1. Simulation: `world` → local `brain.tick` (does nothing while a link is live) → patrons →
   waitress → chickenbot → people animation → glasses → particles → puddles → camera.
2. Render: a normals pass (walls fading out are hidden), a colour pass, then the post pass that
   pixelates and draws ink edges from depth and normal discontinuities.
3. UI: speech bubbles follow heads, the face redraws, lofi levels update. The HUD refreshes when
   marked dirty or every 0.25 s, the debug stats every 0.25 s.

## Pixel scale

The scene is rendered small and scaled up by a whole number of device pixels, so every art pixel
is square and the same size. `state.artRows` (default 240, "Art Rows" in the stats window) is the
target height in art pixels; `resize()` in `render/post.ts` rounds `device height / artRows` to the
nearest whole scale. A phone, a laptop and a 4K monitor therefore all show roughly 220–240 rows.
The canvas is sized in device pixels, so high-DPI screens get crisp pixels rather than a browser
upscale. The post shader picks each art pixel from `gl_FragCoord / scale`.

## Framing

The camera is orthographic. At a given zoom, `updateCam()` shows as much of the room as a stage of
shape `state.idealAspect` would (default 1.875, about a laptop window), so wide windows zoom in and
tall ones zoom out, and a narrow phone still always fits the bar. `state.maxAspect` optionally stops
the stage widening; the extra width becomes the page's dark frame. Both are sliders in the camera
window ("Ideal Aspect", "Max Aspect") and URL parameters (`?ideal=`, `?cap=`; 0 = off) while the
right values are being found. "Reset" (or the Home key) restores zoom, yaw, pitch, framing, Art Rows,
Glass Opacity, Ink Lines and auto-orbit (on, step, pause) to how the page loaded. Auto-orbit turns
`orbitStep` degrees with an eased start and stop, then holds for `orbitPause` seconds (step 0 =
continuous); "Copy Settings" copies and logs the same
values as URL parameters, with the stage size they were tuned on.

## three.js compatibility

The scene was built and lit on three r128. `render/three-compat.ts`, imported by `renderer.ts` and
`materials.ts` before any material exists, keeps that look on current three:

- Colour management is off, so hex colours are used as-is instead of being treated as sRGB.
- Every light intensity is multiplied by `LIGHT_SCALE` (π), undoing r155's physical-light scaling.
- The point-light distance falloff in the shader is restored to r128's linear ramp. If a three.js
  upgrade changes that shader code, the module throws at load and the smoke test fails.

## Shared state

ES module imports are read-only bindings, so the handful of values written from more than one
module live in `core/state.ts`: `doorSwing`, `music`, `lightLevel`, `faceFlash`, `artRows`
(target art height), `moodFlash`, `autoOrbit`, `idleT`, `wireEl` and `wireState`. Everything else is owned by one module and
changed through that module's functions or by mutating the objects it exports (`hen`, `orders`,
`people`, `CAM` and so on).

## Build

- Fonts: `ui/fonts.ts` imports the `@fontsource` woff2 files and registers them with `FontFace`
  (Bun's CSS bundler would inline them as `data:` URLs). Licences go to `dist/licenses/`.
- `scripts/build.ts` stamps `<meta name="revision">` into `index.html` (from `$CHICKENBOT_REV`, which
  the flake sets to the commit, else `git`), shown as "Build:" in the stats window.

- `bun run dev` serves `web/index.html` through Bun's dev server.
- `scripts/build.ts` uses `Bun.build` with `web/index.html` as the entry and writes `dist/`:
  minified, content-hashed JS and CSS, with source maps.
- three.js comes from npm at the version in `bun.lock`. By default it's bundled. With `--three=cdn` it's left external and
  the page gets an import map to jsDelivr, with integrity hashes computed from the npm copies of `three.module.js` and `three.core.js`.
  The browser rejects a CDN file that doesn't match.

## Testing

`tests/e2e/smoke.test.ts` drives the built page in headless Chromium (SwiftShader WebGL), served with
the production CSP (`scripts/preview.ts`). It checks:

- the page loads with no console errors, no third-party requests, and frames run;
- visitors start with the debug windows folded; the self-hosted fonts load; the favicons are served;
  the build revision is stamped;
- the opening order gets poured;
- protocol messages change the status bar, chat and patrons;
- chat reaches the local brain;
- the debug windows, lofi toggle, hide/show, camera input, Reset and Copy Settings work;
- under the CSP, a disallowed `?ws=` brain link is tried once, never retried, reported, and the local
  brain carries on;
- without the CSP (development), the bar links up to a real WebSocket brain started by the test.

CI runs it against both three.js builds (the CDN one without the CSP, since it loads jsDelivr).

`tests/visual/visual.test.ts` renders nine fixed views (`?cam=`), including phone width, the
ceiling, an ultrawide window, a chat-panel-sized window a 2x high-DPI screen and an ultrawide with the aspect cap on, after 5 s of simulated time and compares them with `tests/visual/baselines/`. To make
renders repeat exactly it seeds `Math.random`, pauses a fake clock so frames only advance inside the
test, snaps frame timestamps to an exact 16 ms grid (the fake clock's own frames start up to 2 ms
off), ties `performance.now()` to the fake `Date`, and waits for VT323 (canvas
textures redraw with random specks when it arrives). Diffs over 0.2 % of pixels fail; CI uploads
the diff images.


## Known quirks, kept as-is

- The mood-change face flash was a no-op (`setMood` set `faceFlash` to 0). It now flashes for 0.3 s;
  "flash face on mood change" in the brain debug window turns it off.
- `local-brain.ts` calls the simulation directly instead of speaking the protocol, so a server
  can't simply replace it yet.
