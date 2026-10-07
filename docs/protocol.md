# Brain protocol

The bar talks to a "brain" over a WebSocket using JSON messages. With no server connected the
in-page local brain (`web/brain/local-brain.ts`) runs the bar instead. It calls the simulation
directly rather than sending these messages.

The message types are in `shared/protocol.ts`; the handler and the snapshot live in `web/brain/link.ts`. The same entry points are exposed on
`window.chickenbot` (`handle`, `send`, `snapshot`, `connect`, `disconnect`), and the debug "brain"
window fires inbound messages through `handle` by hand.

## Connecting

- The URL comes from `?ws=ws://host:port`, then `localStorage['chickenbot.ws']`, or from the wire
  debug window. Every `connect` saves its URL to localStorage, whether or not it succeeds.
- On open the bar sends `hello`, then a `state` snapshot.
- When the socket closes the bar retries after 2, 4, 8, 16, then every 30 s; "Local" in
  the wire window stops retrying and forgets the URL.
- A server frame can hold one message object or an array of them. Frames that fail to parse are
  logged and dropped.

## Server → bar

| type    | fields                                     | effect |
|---------|--------------------------------------------|--------|
| `mood`  | `mood`, `intensity` (0–1, default 0.6)     | Set chickenbot's mood: `cheery`, `content`, `grumpy`, `frazzled`, `sleepy`, `smitten`. Unknown moods are ignored. |
| `say`   | `text` (cut to 160 chars), `to`?           | Chickenbot says it. `to` (patron id or name) makes it look at that patron. |
| `chat`  | `from`, `text` (cut to 160 chars)          | Adds a line to the chat log. When no link is live the local brain also replies. |
| `serve` | `order`? or `to` + `drink`?                | With `order`: pour that queued order next. With `to`: that seated patron orders `drink` (or their usual) and it's poured next. |
| `spawn` | `kind: 'table'`, `size`?                   | Seat a table group. |
| `spawn` | any other `kind`, `name`?, `drink`?        | A walk-in comes to a free stool. |
| `emote` | `emote`                                    | `flap`, `peck`, `bob`, `shrug` or `spin`. |
| `look`  | `at` (`door`, `station`, or patron id/name), `seconds`? (default 3) | Chickenbot looks there. |
| `lights`| `level` (0–1)                              | Room lighting. |
| `music` | `on`                                       | Jukebox on/off (also ducks the lofi music). |
| `auto`  | `on`                                       | Autopilot: spawning patrons and picking up queued orders unprompted. |
| `state` |                                            | Reply with a `state` snapshot. |

Anything else is ignored.

## Bar → server

| type    | fields | when |
|---------|--------|------|
| `hello` | `client: 'chickenbot-bar'`, `v: 1` | On connect. |
| `state` | `mood`, `intensity`, `auto`, `pours`, `orders[]` (`id`, `kind`, `drinks`, `status`, `patron`), `patrons[]` (`id`, `name`, `kind`, `state`, `drink`, `regular`) | On connect, on request, and every 5 s. |
| `chat`  | `from: 'you'`, `text` | The visitor typed in the chat box while a link is live. |
| `event` | `event` plus fields below | Things that happened in the bar. |

| event    | fields |
|----------|--------|
| `order`  | `order`, `kind` (`bar`/`table`), `drinks[]`, `patron` (`id`, `name`, `regular`) or `table` (index) |
| `served` | `order`, plus `patron` and `drink` for bar orders |
| `spill`  | `drink` |
| `arrive` | `patron` (`id`, `name`), or `table` + `size` |
| `leave`  | `patron` (`id`, `name`) |
| `mood`   | `mood`, `intensity`, `source` (`local`, `remote`, `chat`) |
| `said`   | `text` (chickenbot's line) |
| `lofi`   | `on` |
| `easter` | `what: 'ceiling'` |

Drinks are `lager`, `stout`, `wine` and `whiskey` (`web/content/drinks.ts`); moods are listed in
`web/content/moods.ts`. The names themselves are defined in `shared/protocol.ts`.

While no link is live, outgoing messages are only written to the wire debug window, marked as
"would send".
