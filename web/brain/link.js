import { state } from '../core/state.js';
import { clamp } from '../core/util.js';
import { DOOR } from '../scene/layout.js';
import { hen } from '../scene/hen-model.js';
import { DRINKS } from '../sim/drinks.js';
import { people } from '../scene/person-model.js';
import { makeOrder, orders } from '../sim/orders.js';
import { spawnTable, spawnWalkup } from '../sim/patrons.js';
import { STATION_SPOT } from '../sim/waitress.js';
import { setMood } from '../sim/hen-behaviour.js';
import { say } from '../ui/bubbles.js';
import { chatLine } from '../ui/chat.js';
import { brain } from './local-brain.js';
import { clock } from '../sim/world.js';
import { toggleWin } from '../ui/debug/window.js';

// Brain link: WebSocket client and the protocol message handler (window.chickenbot).
const net = { ws: null, url: '', retry: 0, timer: null, want: false };
export const linkLamp = document.getElementById('linklamp'),
  linkTxt = document.getElementById('linktxt'),
  wsNote = document.createElement('div'),
  wsUrl = document.createElement('input');
wsNote.className = 'dim';
wsNote.textContent = 'Not connected. The local brain is running the bar.';
wsUrl.className = 'iin';
wsUrl.id = 'wsurl';
wsUrl.placeholder = 'ws://localhost:8787';
wsUrl.spellcheck = false;
wsUrl.autocomplete = 'off';
export const wireBuf = [];
export function wireLog(dir, obj) {
  if (obj && obj.type === 'state' && !state.wireState) return;
  const line = { dir, t: clock, txt: JSON.stringify(obj) };
  wireBuf.push(line);
  if (wireBuf.length > 120) wireBuf.shift();
  if (state.wireEl) appendWire(line);
}
export function appendWire(l) {
  const atEnd = state.wireEl.scrollHeight - state.wireEl.scrollTop - state.wireEl.clientHeight < 6;
  const d = document.createElement('div');
  d.className = l.dir;
  d.textContent = `${{ in: '\u2190', out: '\u2192', sim: '\u00b7', dbg: '\u2190' }[l.dir]} ${l.dir === 'dbg' ? '[debug] ' : ''}${l.txt}`;
  state.wireEl.appendChild(d);
  while (state.wireEl.children.length > 120) state.wireEl.firstChild.remove();
  if (atEnd) state.wireEl.scrollTop = state.wireEl.scrollHeight;
}
export function live() {
  return !!(net.ws && net.ws.readyState === 1);
}
export function send(obj) {
  if (!live()) {
    wireLog('sim', obj);
    return;
  }
  wireLog('out', obj);
  try {
    net.ws.send(JSON.stringify(obj));
  } catch {}
}
function setLink(state, note) {
  linkLamp.className = `lamp ${state}`;
  linkTxt.textContent = state === 'live' ? 'LIVE' : state === 'off' ? 'RETRY' : 'SIM';
  if (note) wsNote.textContent = note;
}
export function connect(url) {
  disconnect(false);
  net.url = url;
  net.want = true;
  try {
    localStorage.setItem('chickenbot.ws', url);
  } catch {}
  let ws;
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
    let m;
    try {
      m = JSON.parse(e.data);
    } catch {
      wireLog('in', { unparsed: String(e.data).slice(0, 200) });
      return;
    }
    (Array.isArray(m) ? m : [m]).forEach((x) => {
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
    net.timer = setTimeout(() => {
      if (net.want) connect(url);
    }, wait * 1000);
  };
  ws.onerror = () => {};
}
export function disconnect(forget) {
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
export function snapshot() {
  return {
    type: 'state',
    mood: hen.mood,
    intensity: hen.moodI,
    auto: hen.auto,
    pours: hen.pours,
    orders: orders
      .filter((o) => o.status !== 'done')
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
function findPatron(ref) {
  if (!ref) return null;
  return people.find((p) => p.id === ref || (p.name && p.name.toLowerCase() === String(ref).toLowerCase()));
}
export function handle(m) {
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
        p.drink = DRINKS[m.drink] ? m.drink : p.drink;
        if (p.state !== 'waiting') {
          if (p.glass) {
            p.glass.owner = null;
            p.glass = null;
          }
          p.state = 'waiting';
          const o = makeOrder('bar', [p.drink], p);
          hen.forced = o.id;
        }
      }
      break;
    }
    case 'spawn':
      if (m.kind === 'table') spawnTable(m.size);
      else spawnWalkup(m.name, DRINKS[m.drink] ? m.drink : null, true);
      break;
    case 'emote':
      if (['flap', 'peck', 'bob', 'shrug', 'spin'].includes(m.emote)) {
        hen.emote = m.emote;
        hen.emoteT = m.emote === 'spin' ? 1.6 : 1.2;
      }
      break;
    case 'look': {
      const p = m.at === 'door' ? { pos: DOOR } : m.at === 'station' ? { pos: STATION_SPOT } : findPatron(m.at);
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
document.getElementById('linkbtn').addEventListener('click', () => {
  toggleWin('wire');
});
