# chickenbot.si

The website for chickenbot (the bot itself is `~/workspace/chickenbot`). Static for now,
served behind the haproxy edge on the bllue.org Linodes; a small WebSocket backend may
join it later.

## Running locally

```sh
bun run dev        # http://localhost:3000, restarts on server changes
PORT=8080 bun start
```

`server.ts` is a plain static file server for `public/`; no build step.

## Layout

- `public/index.html` — Chickenbot's Bar: page shell, loads three.js r128 from cdnjs
- `public/css/` — `base` (stage, bubbles), `hud` (status bar), `debug` (ImGui-style windows)
- `public/js/` — plain scripts sharing globals, so the order in `index.html` matters:
  - scene: `util`, `renderer`, `room`, `bar`, `hen`, `particles`, `glasses`, `people`
  - simulation: `patrons` (orders, regulars, waitress), `hen-behaviour`, `world`
  - UI: `bubbles`, `hud`, `camera`, `debug`
  - brains: `net` (WebSocket brain link + protocol), `local-brain` (fallback, chat input)
  - `post` (pixelate + ink pass), `lofi` (Web Audio music/sfx), `main` (frame loop)
- `server.ts` — dev server

Append `?ws=ws://host:port` to the URL to point the bar at a brain server; without one
the in-page local brain runs it.
