import { state } from '../core/state.ts';
import { clamp } from '../core/util.ts';
import { DOOR } from '../scene/layout.ts';
import { hen } from '../scene/hen-model.ts';
import { isDrink } from '../content/drinks.ts';
import { people } from '../scene/person-model.ts';
import { makeOrder, orders } from '../sim/orders.ts';
import { spawnTable, spawnWalkup } from '../sim/patrons.ts';
import { STATION_SPOT } from '../sim/waitress.ts';
import { setMood } from '../sim/hen-behaviour.ts';
import { say } from '../ui/bubbles.ts';
import { chatLine } from '../ui/chat.ts';
import { brain } from './local-brain.ts';
import { clock } from '../sim/world.ts';
import { toggleWin } from '../ui/debug/window.ts';
import { byId } from '../core/dom.ts';
import type { Person, Vec3 } from '../core/model.ts';
import { type BarMessage, EMOTE_NAMES, type ServerMessage, type StateSnapshot } from '../../shared/protocol.ts';

declare global {
  interface Window {
    /** the protocol entry points, for the console and tests */
    chickenbot: {
      handle: typeof handle;
      send: typeof send;
      snapshot: typeof snapshot;
      connect: typeof connect;
      disconnect: typeof disconnect;
    };
  }
}

// Brain link: WebSocket client and the protocol message handler (window.chickenbot).
const net = {
  ws: null as WebSocket | null,
  url: '',
  retry: 0,
  timer: undefined as number | undefined,
  /** keep reconnecting after a close */
  want: false,
};
/** the brain endpoint reserved on this site; nothing serves it yet */
export const BRAIN_URL = `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/brain`;
export const linkLamp = byId('linklamp'),
  linkTxt = byId('linktxt'),
  wsNote = document.createElement('div'),
  wsUrl = document.createElement('input');
wsNote.className = 'dim';
wsNote.textContent = 'Not connected. The local brain is running the bar.';
wsUrl.className = 'iin';
wsUrl.id = 'wsurl';
wsUrl.placeholder = BRAIN_URL;
wsUrl.spellcheck = false;
wsUrl.autocomplete = 'off';
/** wire log direction: received, sent, would send (no link), fired from the debug window */
type WireDir = 'in' | 'out' | 'sim' | 'dbg';
interface WireLine {
  dir: WireDir;
  t: number;
  txt: string;
}
export const wireBuf: WireLine[] = [];
export function wireLog(dir: WireDir, obj: unknown) {
  if ((obj as { type?: unknown } | null)?.type === 'state' && !state.wireState) return;
  const line: WireLine = { dir, t: clock, txt: JSON.stringify(obj) };
  wireBuf.push(line);
  if (wireBuf.length > 120) wireBuf.shift();
  if (state.wireEl) appendWire(line);
}
export function appendWire(l: WireLine) {
  const el = state.wireEl!;
  const atEnd = el.scrollHeight - el.scrollTop - el.clientHeight < 6;
  const d = document.createElement('div');
  d.className = l.dir;
  d.textContent = `${{ in: '\u2190', out: '\u2192', sim: '\u00b7', dbg: '\u2190' }[l.dir]} ${l.dir === 'dbg' ? '[debug] ' : ''}${l.txt}`;
  el.appendChild(d);
  while (el.children.length > 120) el.firstChild!.remove();
  if (atEnd) el.scrollTop = el.scrollHeight;
}
export function live() {
  return !!(net.ws && net.ws.readyState === 1);
}
export function send(obj: BarMessage) {
  if (!live()) {
    wireLog('sim', obj);
    return;
  }
  wireLog('out', obj);
  try {
    net.ws!.send(JSON.stringify(obj));
  } catch {}
}
/** blocked: the page's CSP refused the URL, so the local brain carries on and nothing retries */
function setLink(state: 'live' | 'off' | 'sim' | 'blocked', note?: string) {
  linkLamp.className = `lamp ${state === 'blocked' ? 'off' : state}`;
  linkTxt.textContent = state === 'live' ? 'LIVE' : state === 'off' ? 'RETRY' : 'SIM';
  if (note) wsNote.textContent = note;
}
export function connect(url: string) {
  disconnect(false);
  net.url = url;
  net.want = true;
  try {
    localStorage.setItem('chickenbot.ws', url);
  } catch {}
  let ws: WebSocket;
  try {
    ws = new WebSocket(url);
  } catch {
    setLink('off', 'That address is not a valid WebSocket URL.');
    return;
  }
  net.ws = ws;
  setLink('off', `Connecting to ${url} ...`);
  ws.onopen = () => {
    net.retry = 0;
    setLink('live', `Live. ${url} is driving mood, lines and orders.`);
    chatLine('', 'brain link up', 'sys');
    send({ type: 'hello', client: 'chickenbot-bar', v: 1 });
    send(snapshot());
  };
  ws.onmessage = (e) => {
    let m: unknown;
    try {
      m = JSON.parse(e.data);
    } catch {
      wireLog('in', { unparsed: String(e.data).slice(0, 200) });
      return;
    }
    (Array.isArray(m) ? m : [m]).forEach((x: ServerMessage) => {
      wireLog('in', x);
      handle(x);
    });
  };
  ws.onclose = () => {
    if (net.ws !== ws) return;
    net.ws = null;
    if (!net.want) {
      setLink('sim');
      return;
    }
    net.retry = Math.min(net.retry + 1, 6);
    const wait = Math.min(30, 2 ** net.retry);
    setLink('off', `Can't reach ${url}. The local brain is running the bar. Retrying in ${wait}s.`);
    net.timer = window.setTimeout(() => {
      if (net.want) connect(url);
    }, wait * 1000);
  };
  ws.onerror = () => {};
}
// Under the production CSP (connect-src 'self') a remote URL is refused without an exception: the
// socket just closes. Catch the violation and stop, instead of retrying a URL that can never work here.
document.addEventListener('securitypolicyviolation', (e) => {
  if (!net.url || !e.effectiveDirective.startsWith('connect-src') || !sameOrigin(e.blockedURI, net.url)) return;
  const url = net.url;
  disconnect(false);
  try {
    // a saved URL would hit the same block on every visit
    if (localStorage.getItem('chickenbot.ws') === url) localStorage.removeItem('chickenbot.ws');
  } catch {}
  setLink(
    'blocked',
    `This site only allows a brain link to ${BRAIN_URL}, so ${url} was blocked. The local brain is running the bar.`,
  );
  chatLine('', 'brain link blocked by this site; local brain running', 'sys');
});
function sameOrigin(a: string, b: string) {
  try {
    return new URL(a).origin === new URL(b).origin;
  } catch {
    return false;
  }
}
export function disconnect(forget?: boolean) {
  net.want = false;
  clearTimeout(net.timer);
  if (net.ws) {
    const w = net.ws;
    net.ws = null;
    try {
      w.close();
    } catch {}
  }
  if (forget) {
    try {
      localStorage.removeItem('chickenbot.ws');
    } catch {}
    setLink('sim', 'Not connected. The local brain is running the bar.');
  }
}
export function snapshot(): StateSnapshot {
  return {
    type: 'state',
    mood: hen.mood,
    intensity: hen.moodI,
    auto: hen.auto,
    pours: hen.pours,
    orders: orders
      .filter((o): o is typeof o & { status: StateSnapshot['orders'][number]['status'] } => o.status !== 'done')
      .map((o) => ({
        id: o.id,
        kind: o.kind,
        drinks: o.drinks,
        status: o.status,
        patron: o.kind === 'bar' ? o.who.name : null,
      })),
    patrons: people
      .filter((p) => p.kind !== 'waitress')
      .map((p) => ({ id: p.id, name: p.name, kind: p.kind, state: p.state, drink: p.drink, regular: !!p.regular })),
  };
}
function findPatron(ref: unknown): Person | null | undefined {
  if (!ref) return null;
  return people.find((p) => p.id === ref || (p.name && p.name.toLowerCase() === String(ref).toLowerCase()));
}
/** Applies one server message. The JSON is untrusted, so fields are re-checked here. */
export function handle(m: ServerMessage) {
  if (!m || typeof m !== 'object') return;
  switch (m.type) {
    case 'mood':
      setMood(m.mood, m.intensity, 'remote');
      break;
    case 'say': {
      const t = String(m.text || '').slice(0, 160);
      if (!t) break;
      const to = findPatron(m.to);
      if (to) {
        hen.lookAt = to;
        hen.lookT = 2.5;
      }
      say(hen, t, clamp(t.length * 0.07, 2, 6));
      break;
    }
    case 'chat':
      chatLine(String(m.from || 'guest'), String(m.text || '').slice(0, 160), '');
      if (!live()) brain.reply(String(m.text || ''), String(m.from || 'guest'));
      break;
    case 'serve': {
      if (m.order) {
        hen.forced = m.order;
        break;
      }
      const p = findPatron(m.to);
      if (p?.stool) {
        p.drink = isDrink(m.drink) ? m.drink : p.drink;
        if (p.state !== 'waiting') {
          if (p.glass) {
            p.glass.owner = null;
            p.glass = null;
          }
          p.state = 'waiting';
          const o = makeOrder('bar', [p.drink!], p);
          hen.forced = o.id;
        }
      }
      break;
    }
    case 'spawn':
      if (m.kind === 'table') spawnTable(m.size);
      else spawnWalkup(m.name, isDrink(m.drink) ? m.drink : null, true);
      break;
    case 'emote':
      if (EMOTE_NAMES.includes(m.emote)) {
        hen.emote = m.emote;
        hen.emoteT = m.emote === 'spin' ? 1.6 : 1.2;
      }
      break;
    case 'look': {
      const p: { pos: Vec3 } | null | undefined =
        m.at === 'door' ? { pos: DOOR } : m.at === 'station' ? { pos: STATION_SPOT } : findPatron(m.at);
      if (p) {
        hen.lookAt = p;
        hen.lookT = m.seconds || 3;
      }
      break;
    }
    case 'lights':
      state.lightLevel = clamp(+m.level || 0, 0, 1);
      break;
    case 'music':
      state.music = !!m.on;
      break;
    case 'auto':
      hen.auto = !!m.on;
      break;
    case 'state':
      send(snapshot());
      break;
  }
}
window.chickenbot = { handle, send, snapshot, connect, disconnect };
byId('linkbtn').addEventListener('click', () => {
  toggleWin('wire');
});
