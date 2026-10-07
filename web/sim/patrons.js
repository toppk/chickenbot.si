import { state } from '../core/state.js';
import { headingTo, pick, rand } from '../core/util.js';
import { DOOR } from '../scene/layout.js';
import { stools, tables } from '../scene/bar.js';
import { DRINKS, DRINK_KEYS } from './drinks.js';
import { buildGlass } from '../scene/glasses.js';
import { HAIR, JACKETS, PANTS, SKINS, buildPerson, people, removePerson } from '../scene/person-model.js';
import { sipLogic, walkTo } from './people.js';
import { makeOrder } from './orders.js';
import { ICONS, say } from '../ui/bubbles.js';
import { send } from '../brain/link.js';
import { clock } from './world.js';

// Regulars, walk-ins and table groups: arriving, ordering, drinking and leaving.
function freeStool() {
  const f = stools.filter((s) => !s.occupant);
  return f.length ? pick(f) : null;
}
export function bubbleOrder(p, drink, prefix) {
  say(p, `${prefix ? `${prefix} ` : ''}<img src="${ICONS[drink]}" alt=""> ${DRINKS[drink].name}`, 3.2, true);
}
const REGULARS = [
  {
    name: 'Gus',
    stoolIdx: 5,
    drink: 'stout',
    look: { jacket: 0x4a5a2f, skin: 0xe0b48a, pants: 0x3d2f22, hair: 0x8a8a8a, cap: 0x5a4028, beard: 0x9a9a9a },
  },
  {
    name: 'Marla',
    stoolIdx: 4,
    drink: 'wine',
    look: { jacket: 0x2f3a5a, skin: 0xf0c9a0, pants: 0x2b2b33, hair: 0x7a2a10, bun: true, scarf: 0xa0281c },
  },
  {
    name: 'Otis',
    stoolIdx: 6,
    drink: 'whiskey',
    look: {
      jacket: 0xe8dcc0,
      vest: 0x7a5a2a,
      skin: 0x9a6a48,
      pants: 0x24304a,
      hair: 0x1a1a1a,
      bald: true,
      specs: true,
    },
  },
];
export const regulars = [];
function seatAtStool(p, st) {
  st.occupant = p;
  p.stool = st;
  p.pos.copy(st.seat);
  p.wantHeading = p.heading = headingTo(-st.seat.x, -st.seat.z);
  p.seatY = 0.75;
  p.sitTarget = 1;
  p.sit = 1;
}
for (const r of REGULARS) {
  const p = buildPerson(Object.assign({ name: r.name, regular: true, drink: r.drink, kind: 'regular' }, r.look));
  const st = stools[r.stoolIdx];
  seatAtStool(p, st);
  p.state = 'drinking';
  p.sipRate = 0.06;
  const g = buildGlass(r.drink);
  g.pos.copy(st.spot);
  g.state = 'bar';
  g.fill = rand(0.35, 0.9);
  g.owner = p;
  p.glass = g;
  regulars.push(p);
}
export const NAMES = [
  'Rosa',
  'Dev',
  'Hank',
  'Priya',
  'Theo',
  'Lena',
  'Marco',
  'Ines',
  'Sully',
  'Bea',
  'Kofi',
  'Nadia',
  'Walt',
  'Yuki',
  'Frank',
  'Opal',
];
export function randomLook() {
  const o = { jacket: pick(JACKETS), skin: pick(SKINS), pants: pick(PANTS), hair: pick(HAIR) };
  const r = Math.random();
  if (r < 0.2) o.cap = pick(JACKETS);
  else if (r < 0.32) o.beanie = pick([0xa0281c, 0x2a4a6a, 0xc8a040]);
  if (Math.random() < 0.2) o.beard = o.hair;
  if (Math.random() < 0.2) o.specs = true;
  if (Math.random() < 0.2) o.ponytail = true;
  if (Math.random() < 0.15) o.scarf = pick([0xa0281c, 0x2a6a5a, 0xd8b048]);
  return o;
}
export function spawnWalkup(name, drink, fromChat) {
  const st = freeStool();
  if (!st) return null;
  const p = buildPerson(
    Object.assign({ name: name || pick(NAMES), kind: 'walkup', drink: drink || pick(DRINK_KEYS) }, randomLook()),
  );
  p.pos.copy(DOOR);
  p.heading = p.wantHeading = 0;
  st.occupant = p;
  p.stool = st;
  p.state = 'arriving';
  p.rounds = fromChat ? 1 : Math.random() < 0.3 ? 2 : 1;
  state.doorSwing = 1;
  walkTo(p, st.approach, () => {
    p.pos.copy(st.seat);
    p.wantHeading = headingTo(-st.seat.x, -st.seat.z);
    p.seatY = 0.75;
    p.sitTarget = 1;
    p.state = 'ordering';
    p.t = 0.7;
  });
  send({ type: 'event', event: 'arrive', patron: { id: p.id, name: p.name } });
  return p;
}
export function spawnTable(n) {
  const t = tables.filter((t) => t.state === 'free');
  if (!t.length) return null;
  const tb = pick(t);
  tb.state = 'arriving';
  tb.group = [];
  const k = Math.min(n || (1 + Math.random() * tb.seats.length) | 0, tb.seats.length);
  const seats = [...tb.seats].sort(() => Math.random() - 0.5).slice(0, k);
  seats.forEach((s, i) => {
    const p = buildPerson(Object.assign({ name: pick(NAMES), kind: 'table', drink: pick(DRINK_KEYS) }, randomLook()));
    p.pos.copy(DOOR);
    p.pos.x += (i - 1) * 0.3;
    s.occupant = p;
    p.seat = s;
    p.table = tb;
    p.state = 'arriving';
    p.path = [];
    setTimeout(() => {
      walkTo(p, s.pos, () => {
        p.wantHeading = s.heading;
        p.seatY = s.seatY;
        p.sitTarget = 1;
        p.state = 'seated';
        if (tb.group.every((q) => q.state === 'seated') && tb.state === 'arriving') {
          tb.state = 'waiting';
          tb.waitSince = clock;
        }
      });
    }, i * 600);
    tb.group.push(p);
  });
  state.doorSwing = 1;
  send({ type: 'event', event: 'arrive', table: tables.indexOf(tb), size: k });
  return tb;
}
function leave(p) {
  p.sitTarget = 0;
  p.state = 'leaving';
  if (p.stool) {
    p.stool.occupant = null;
  }
  if (p.seat) {
    p.seat.occupant = null;
  }
  if (p.glass) {
    p.glass.owner = null;
    if (p.glass.state === 'hand' || p.glass.state === 'return') {
      p.glass.state = p.glass.restState || 'bar';
      p.glass.pos.copy(p.glass.rest);
    }
  }
  setTimeout(
    () =>
      walkTo(p, DOOR, () => {
        removePerson(p);
        state.doorSwing = 1;
      }),
    500,
  );
  send({ type: 'event', event: 'leave', patron: { id: p.id, name: p.name } });
}
export function updatePatrons(dt) {
  for (const p of [...people]) {
    if (p.kind === 'waitress') continue;
    if (p.state === 'ordering') {
      p.t -= dt;
      if (p.t <= 0) {
        bubbleOrder(p, p.drink, p.regular ? 'the usual,' : null);
        makeOrder('bar', [p.drink], p);
        p.state = 'waiting';
        p.waitSince = clock;
      }
    }
    if (p.state === 'waiting' && clock - p.waitSince > 28 && !p.grumbled) {
      p.grumbled = true;
      say(p, '...any time now.', 2.5);
    }
    if (p.state === 'drinking') {
      sipLogic(p, dt);
      const g = p.glass;
      if (g && g.fill <= 0.02 && (g.state === 'bar' || g.state === 'table')) {
        if (p.regular) {
          if (!p.refillT) p.refillT = rand(3, 8);
          p.refillT -= dt;
          if (p.refillT <= 0) {
            p.refillT = 0;
            p.wave = 1.2;
            g.owner = null;
            p.glass = null;
            p.state = 'ordering';
            p.t = 0.4;
          }
        } else if (p.kind === 'walkup') {
          p.rounds--;
          if (p.rounds > 0) {
            g.owner = null;
            p.glass = null;
            p.state = 'ordering';
            p.t = 1.2;
            p.drink = Math.random() < 0.7 ? p.drink : pick(DRINK_KEYS);
          } else {
            p.glass.owner = null;
            p.glass = null;
            leave(p);
          }
        } else if (p.kind === 'table') {
          p.state = 'done';
        }
      }
    }
    if (p.kind === 'regular' && Math.random() < dt * 0.02 && !p.talk) p.head.rotation.y = rand(-0.6, 0.6);
  }
  for (const tb of tables) {
    if (tb.state === 'drinking' && tb.group.every((p) => p.state === 'done')) {
      tb.state = 'dirty';
      for (const p of tb.group) {
        if (p.glass) p.glass.owner = null;
        p.glass = null;
        leave(p);
      }
      tb.group = [];
    }
  }
}
