import { state } from '../core/state.ts';
import { _v, headingTo, pick, rand } from '../core/util.ts';
import { ROOM } from '../scene/layout.ts';
import { ambient, carLight, doorL, doorR, jukeGlow, jukeLight, pendLights, tubes, wS } from '../scene/room.ts';
import { tables } from '../scene/bar.ts';
import { hen } from '../scene/hen-model.ts';
import { K, addPuddle, emit } from '../scene/particles.ts';
import { DRINK_KEYS } from '../content/drinks.ts';
import { buildGlass } from '../scene/glasses.ts';
import { buildPerson, people } from '../scene/person-model.ts';
import { makeOrder } from './orders.ts';
import { randomLook, spawnTable, spawnWalkup } from './patrons.ts';
import { say } from '../ui/bubbles.ts';
import { chatLine } from '../ui/chat.ts';
import { connect, send, snapshot, wsUrl } from '../brain/link.ts';
import { lofi } from '../audio/lofi.ts';
import { LIGHT_SCALE } from '../render/three-compat.ts';
import { WALKIN_NAMES } from '../content/patrons.ts';
import { HEN } from '../content/dialogue.ts';

// World tick (spawning, door, street, jukebox, lights) and the opening state.
export let clock = 0,
  spawnWalkT = rand(4, 8),
  spawnTableT = rand(10, 16),
  stateT = 5,
  carT = rand(3, 9),
  jukeT = 0;
// opening state: called once by main after every module has loaded
export function openBar() {
  {
    const p = spawnWalkup('Rosa', 'lager');
    if (p) {
      p.path = [];
      p.pos.copy(p.stool!.seat);
      p.wantHeading = p.heading = headingTo(-p.pos.x, -p.pos.z);
      p.sitTarget = p.sit = 1;
      p.state = 'waiting';
      p.waitSince = 0;
      makeOrder('bar', ['lager'], p);
    }
  }
  {
    const tb = tables[1]!;
    tb.state = 'drinking';
    tb.group = [];
    tb.seats.slice(0, 2).forEach((s) => {
      const p = buildPerson({ name: pick(WALKIN_NAMES), kind: 'table', drink: pick(DRINK_KEYS), ...randomLook() });
      p.pos.copy(s.pos);
      p.heading = p.wantHeading = s.heading;
      p.seat = s;
      s.occupant = p;
      p.table = tb;
      p.seatY = s.seatY;
      p.sit = p.sitTarget = 1;
      p.state = 'drinking';
      const g = buildGlass(p.drink!);
      g.pos.copy(s.place);
      g.state = 'table';
      g.fill = rand(0.4, 0.9);
      g.owner = p;
      p.glass = g;
      tb.group.push(p);
    });
  }
  addPuddle(-2.6, 0, 3.2, 0.35, 0xe8a020);
  chatLine('', 'doors open', 'sys');
  setTimeout(() => say(hen, HEN.opening, 2.2), 900);
  // try a saved brain link (works when this page is hosted outside the preview)
  try {
    const q = new URLSearchParams(location.search).get('ws') || localStorage.getItem('chickenbot.ws');
    if (q) {
      wsUrl.value = q;
      connect(q);
    }
  } catch {}
}

export function world(dt: number) {
  clock += dt;
  if (hen.auto) {
    spawnWalkT -= dt;
    spawnTableT -= dt;
    const guests = people.filter((p) => p.kind === 'walkup').length;
    if (spawnWalkT <= 0) {
      spawnWalkT = rand(9, 20);
      if (guests < 4) spawnWalkup();
    }
    if (spawnTableT <= 0) {
      spawnTableT = rand(20, 38);
      spawnTable();
    }
  }
  state.doorSwing = Math.max(0, state.doorSwing - dt * 0.6);
  const da = state.doorSwing * Math.abs(Math.sin(clock * 7)) * 1.3;
  doorL.rotation.y = -da;
  doorR.rotation.y = da;
  // street: rain + passing cars (only while that wall is visible)
  if (wS.fade < 0.5) {
    for (let i = 0; i < 3; i++)
      emit(K.RAIN, [0.55, 0.65, 0.8], rand(-2.2, 2.2), 2.7, ROOM + rand(0.35, 1.2), 0, -4, 0, 0.6, 0.35);
    carT -= dt;
    if (carT <= 0) {
      carT = rand(4, 10);
      carLight.userData.v = rand(3, 5) * (Math.random() < 0.5 ? 1 : -1);
      carLight.position.x = -carLight.userData.v * 2.2;
    }
    if (carLight.userData.v) carLight.position.x += carLight.userData.v * dt;
  }
  // jukebox
  jukeT += dt;
  const jk = state.music ? 0.6 + 0.4 * Math.sin(jukeT * 3) : 0.08;
  jukeGlow.emissiveIntensity = jk + (lofi.pulse || 0) * 0.8;
  lofi.pulse = Math.max(0, (lofi.pulse || 0) - dt * 4);
  jukeLight.intensity = (state.music ? 0.5 + 0.4 * Math.sin(jukeT * 2.2) : 0.05) * LIGHT_SCALE;
  jukeLight.color.setHSL((jukeT * 0.05) % 1, 0.7, 0.55);
  if (state.music && Math.random() < 0.3)
    for (const t of tubes) {
      t.getWorldPosition(_v);
      emit(K.FLOAT, [0.6, 0.85, 1], _v.x, _v.y - 0.55, _v.z + rand(-0.02, 0.02), 0, 0.4, 0, 3, _v.y - 0.6);
    }
  if (Math.random() < 0.15)
    emit(
      K.FLOAT,
      [0.45, 0.36, 0.28],
      rand(-3, 3),
      rand(1.4, 2.6),
      rand(-3, 3),
      rand(-0.02, 0.02),
      0,
      rand(-0.02, 0.02),
      rand(4, 7),
      1.2,
    );
  // lights
  ambient.intensity = (0.35 + 0.35 * state.lightLevel) * LIGHT_SCALE;
  for (const l of pendLights) l.intensity = (0.25 + 0.45 * state.lightLevel) * LIGHT_SCALE;
  stateT -= dt;
  if (stateT <= 0) {
    stateT = 5;
    send(snapshot());
  }
}
