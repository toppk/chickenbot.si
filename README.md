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

- `public/index.html` — Chickenbot's Bar, a three.js (r128, from cdnjs) pixel-art scene
- `server.ts` — dev server

Append `?ws=ws://host:port` to the URL to point the bar at a brain server; without one
the in-page local brain runs it.
