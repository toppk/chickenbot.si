> Written by the agent that built the original single-file page, before the move to `web/`.
> Function names refer to that version; `docs/architecture.md` maps them to modules.
> Kept for its reasoning; delete once its four items are done and no longer useful.

# Chickenbot's Bar: notes for the new maintainer

Everything lives in one file, `index.html`, about 110 KB, with no build step. It loads Three.js r128 from cdnjs and three Google Fonts (Press Start 2P, VT323, Share Tech Mono). `chickenbot-brain.js` is an optional example WebSocket server. Its logic is rules and keywords, not a model, and the message protocol is documented at the top of that file.

This note covers four things the creator noticed after running the fork outside the Claude chat panel. Each one says what is happening in the code and what I would do about it.

---

## 1. Wide windows make the room feel less cozy

**What happens.** The camera is orthographic. Its height is fixed by the zoom value, and its width is whatever the window's aspect ratio gives you. In `updateCam()`:

```js
const asp = VW / VH, hh = Math.max(CAM.zoom, 5.4 / asp);
camera.left = -hh * asp; camera.right = hh * asp; camera.top = hh; camera.bottom = -hh;
```

In a tall or square panel the bar fills the frame. In a wide browser window the same height shows far more floor on either side, so the bar shrinks into a sea of planks. Zooming in helps because it shrinks that empty margin back down.

**What I'd do.** Use both of these.

1. **Keep the visible floor area constant, not the height.** Size the view so the same amount of room is visible at any aspect ratio, with a soft limit at both extremes:

   ```js
   const AREA = 4 * CAM.zoom * CAM.zoom * 1.25;   // the world area visible at the "ideal" aspect
   let hh = Math.sqrt(AREA / (4 * asp));
   hh = Math.max(hh, 5.4 / asp);                  // still fits the bar on narrow phones
   ```

   Wide screens then zoom in a little on their own, and tall ones zoom out a little.

2. **Cap the stage's aspect ratio.** Above about 16:10, stop widening the 3D view and let the extra width become a dark frame around it. That can be a plain vignette, or brick and wood "wings" drawn in CSS, and it's a natural place for the debug windows to sit. A wide screen then reads as a framed scene rather than a stretched one. In CSS this is roughly `#stage { aspect-ratio: auto; max-width: calc((100vh - var(--hud-h)) * 1.6); margin-inline: auto; }`, with the body background as the frame.

I'd start with the first one. It's a few lines, and it's probably most of the cozy feeling coming back.

---

## 2. The HUD stretches oddly on wide screens

**What happens.** The HUD is a grid in which every cell is `auto` except the last, chat, which is `minmax(0, 1fr)`. All extra width goes into the chat cell, so on a big monitor the chat input becomes a very long strip and everything else gets pushed left.

**What I'd do.** Keep the wood bar full width, but center its contents at a fixed maximum width, the way the Doom status bar is a fixed-width piece of art.

```html
<footer id="hud"><div class="hud-inner"> …cells… </div></footer>
```

```css
#hud        { /* keeps the wood texture and border, spans the full width */ }
.hud-inner  { display: grid; grid-template-columns: auto auto auto auto auto auto minmax(260px, 520px) auto;
              max-width: 1180px; margin-inline: auto; }
```

The space either side of the centered HUD stays plain wood. If it looks empty, two brass screw-heads or a small engraved nameplate on each side are enough. Don't add more data there.

---

## 3. LOFI and SIM don't belong inside the chat box

**What happens.** Both buttons were added into `#chatform` next to the input because that was the free space at the time. They read as chat options, which they aren't: LOFI is about sound, and SIM/LIVE shows whether the brain link is connected.

**What I'd do.** Give them their own HUD cell, styled like the key slots on the Doom HUD.

- A new cell after REGULARS, labelled **SYSTEM** (or split it into **JUKEBOX** and **BRAIN**), holding two stacked toggles: `♪ LOFI` with its lamp, and `◆ SIM / LIVE / RETRY` with its lamp.
- LOFI fits naturally with the jukebox. Its lamp could pulse on the kick, the way the jukebox glow already does (`lofi.pulse`).
- SIM is a status light more than a button. Clicking it still opens the wire window, but its main job is to show at a glance whether a real brain is connected. A green lamp when LIVE is the right weight.
- The chat cell then holds just the 3-line log and the input. Pressing Enter sends, so there's no need for a send button.

On narrow screens the SYSTEM cell can join the top row (`pours mood orders patrons face system`), so the chat row stays a full-width input.

---

## 4. Pixel size looks different at different screen sizes

**What happens.** `PIX` is a fixed number of screen pixels per art pixel, 3 by default. In `resize()`:

```js
RW = Math.ceil(VW / PIX); RH = Math.ceil(VH / PIX);
```

So the art resolution follows the window size. In a small panel the scene is about 230 art pixels tall and looks chunky. On a full monitor it's 350 or more and looks fine and busy, even though the slider still says 3. The ink lines (1 art pixel), the hatching pattern, the particles (2 art pixels) and the wall dither are all measured in art pixels, so they all get relatively thinner on big screens. That matches the two screenshots: same setting, very different feel.

**What I'd do.** Choose the art resolution, not the screen-pixel multiple. Make the slider control "art rows", meaning how many pixels tall the scene is, and work out the scale from that.

```js
let ROWS = 240;                                    // slider: 160 (chunky) … 400 (fine)
function resize() {
  VW = stage.clientWidth; VH = stage.clientHeight;
  const scale = Math.max(1, Math.floor(VH / ROWS)); // whole-number scale keeps every art pixel square and even
  RH = Math.ceil(VH / scale); RW = Math.ceil(VW / scale);
  renderer.setSize(VW, VH, false); makeTargets();
}
```

- **Whole-number scaling** keeps the pixels crisp. A fractional scale with nearest-neighbour sampling gives uneven pixel widths, which look wobbly when the camera orbits.
- Because the scale is rounded down, the real row count lands between `ROWS` and `2×ROWS` rather than exactly on it. If that range is too wide, render exactly `ROWS` tall and add a thin letterbox, or scale up slightly and crop.
- With fixes 1 and 4 together, the room covers the same amount of screen and has the same pixel character in a chat panel, a laptop or a 4K monitor. That's the consistency the creator was after.
- Keep the slider relative ("Pixel Size: chunky ↔ fine") and store it as rows, so it means the same thing on every screen.

One related thing to watch: the renderer uses `setPixelRatio(1)`, so on a high-DPI display the canvas is drawn at CSS-pixel size and then upscaled once more by the browser. That's fine for this look, and it's cheaper, but count it if you ever measure pixels precisely.

---

## Quick orientation

| Area | Where to look |
|---|---|
| Camera, wall fading, under-the-floor ceiling | `updateCam()`, `walls`, `fadeClone()`, `ceiling` |
| Pixel, ink and hatching post-process | `post` shader, `makeTargets()`, `resize()` |
| Chickenbot behaviour | `updateHen()`, `henTask()`, `startGlass()`, `finishGlass()`, `MOODS` |
| Patrons, regulars, waitress | `updatePatrons()`, `spawnWalkup()`, `spawnTable()`, `juneTick()` |
| WebSocket brain link | `connect()`, `handle()`, `send()`, `snapshot()` |
| Local stand-in brain | `brain.tick()`, `brain.reply()` |
| Lofi audio | `lofiInit()`, `lofiStep()`, `barPerc()`, `needle()`, `MOOD_MUSIC` |
| HUD and Doom-style face | `#hud` markup, `renderHud()`, `drawFace()` |
| ImGui debug windows | `makeWin()`, `setDebug()`, the backtick key |

Two things to know when deploying:
- On an HTTPS site the brain server has to be reached with `wss://`, usually through your web server's TLS (a reverse proxy).
- A WebSocket address entered in the wire window is remembered in that visitor's browser.

