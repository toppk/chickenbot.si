import { state } from '../core/state.ts';
import { headingTo, pick, rand } from '../core/util.ts';
import { DOOR } from '../scene/layout.ts';
import { stools, tables } from '../scene/bar.ts';
import { DRINKS, DRINK_KEYS, type DrinkKey } from '../content/drinks.ts';
import { buildGlass } from '../scene/glasses.ts';
import { buildPerson, people, removePerson } from '../scene/person-model.ts';
import { sipLogic, walkTo } from './people.ts';
import { makeOrder } from './orders.ts';
import { ICONS, say } from '../ui/bubbles.ts';
import { send } from '../brain/link.ts';
import { clock } from './world.ts';
import type { Look, Person, Stool, Table } from '../core/model.ts';
import { PALETTE, REGULARS, WALKIN_NAMES } from '../content/patrons.ts';
import { PATRON } from '../content/dialogue.ts';

// Regulars, walk-ins and table groups: arriving, ordering, drinking and leaving.
function freeStool() {
  const f = stools.filter((s) => !s.occupant);
  return f.length ? pick(f) : null;
}
export function bubbleOrder(p: Person, drink: DrinkKey, prefix?: string | null) {
  say(p, `${prefix ? `${prefix} ` : ''}<img src="${ICONS[drink]}" alt=""> ${DRINKS[drink].name}`, 3.2, true);
}
export const regulars: Person[] = [];
function seatAtStool(p: Person, st: Stool) {
  st.occupant = p;
  p.stool = st;
  p.pos.copy(st.seat);
  p.wantHeading = p.heading = headingTo(-st.seat.x, -st.seat.z);
  p.seatY = 0.75;
  p.sitTarget = 1;
  p.sit = 1;
}
for (const r of REGULARS) {
  const p = buildPerson({ name: r.name, regular: true, drink: r.drink, kind: 'regular', ...r.look });
  const st = stools[r.stoolIdx]!;
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
export function randomLook(): Look {
  const o: Look = {
    jacket: pick(PALETTE.jackets),
    skin: pick(PALETTE.skins),
    pants: pick(PALETTE.pants),
    hair: pick(PALETTE.hair),
  };
  const r = Math.random();
  if (r < 0.2) o.cap = pick(PALETTE.jackets);
  else if (r < 0.32) o.beanie = pick(PALETTE.beanies);
  if (Math.random() < 0.2) o.beard = o.hair;
  if (Math.random() < 0.2) o.specs = true;
  if (Math.random() < 0.2) o.ponytail = true;
  if (Math.random() < 0.15) o.scarf = pick(PALETTE.scarves);
  return o;
}
export function spawnWalkup(name?: string, drink?: DrinkKey | null, fromChat?: boolean): Person | null {
  const st = freeStool();
  if (!st) return null;
  const p = buildPerson({
    name: name || pick(WALKIN_NAMES),
    kind: 'walkup',
    drink: drink || pick(DRINK_KEYS),
    ...randomLook(),
  });
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
export function spawnTable(n?: number): Table | null {
  const t = tables.filter((t) => t.state === 'free');
  if (!t.length) return null;
  const tb = pick(t);
  tb.state = 'arriving';
  tb.group = [];
  const k = Math.min(n || (1 + Math.random() * tb.seats.length) | 0, tb.seats.length);
  const seats = [...tb.seats].sort(() => Math.random() - 0.5).slice(0, k);
  seats.forEach((s, i) => {
    const p = buildPerson({ name: pick(WALKIN_NAMES), kind: 'table', drink: pick(DRINK_KEYS), ...randomLook() });
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
function leave(p: Person) {
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
export function updatePatrons(dt: number) {
  for (const p of [...people]) {
    if (p.kind === 'waitress') continue;
    if (p.state === 'ordering') {
      p.t! -= dt;
      if (p.t! <= 0) {
        bubbleOrder(p, p.drink!, p.regular ? PATRON.usual : null);
        makeOrder('bar', [p.drink!], p);
        p.state = 'waiting';
        p.waitSince = clock;
      }
    }
    if (p.state === 'waiting' && clock - p.waitSince! > 28 && !p.grumbled) {
      p.grumbled = true;
      say(p, PATRON.impatient, 2.5);
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
          p.rounds!--;
          if (p.rounds! > 0) {
            g.owner = null;
            p.glass = null;
            p.state = 'ordering';
            p.t = 1.2;
            p.drink = Math.random() < 0.7 ? p.drink : pick(DRINK_KEYS);
          } else {
            g.owner = null;
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
