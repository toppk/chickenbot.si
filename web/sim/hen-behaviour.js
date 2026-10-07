import { state } from '../core/state.js';
import { TAU, V3, _v, _v2, angDiff, clamp, headingTo, pick, polar, rand } from '../core/util.js';
import { HEN_R, STATION_A, TOP } from '../scene/layout.js';
import { HIP, hen, legIK } from '../scene/hen-model.js';
import { K, emit, hexRGB } from '../scene/particles.js';
import { DRINKS } from './drinks.js';
import { buildGlass, glasses, liquidTop } from '../scene/glasses.js';
import { people } from '../scene/person-model.js';
import { orders } from './orders.js';
import { say } from '../ui/bubbles.js';
import { hud } from '../ui/hud.js';
import { send } from '../brain/link.js';
import { brain } from '../brain/local-brain.js';
import { clock } from './world.js';

// Chickenbot's moods, choosing the next task, pouring, and per-frame animation.
export const MOODS = {
  cheery: { comb: 0xe83a2a, glow: 0x6a1410, walk: 1.7, pour: 1.0, hud: 'CHEERY' },
  content: { comb: 0xd8302a, glow: 0x300000, walk: 1.4, pour: 1.15, hud: 'CONTENT' },
  grumpy: { comb: 0x8a1a14, glow: 0x100000, walk: 1.15, pour: 1.4, hud: 'GRUMPY' },
  frazzled: { comb: 0xff4a2a, glow: 0x8a1a00, walk: 2.3, pour: 0.75, spill: 0.14, hud: 'FRAZZLED' },
  sleepy: { comb: 0x8a4a40, glow: 0x000000, walk: 0.75, pour: 1.9, hud: 'SLEEPY' },
  smitten: { comb: 0xff6a8a, glow: 0x6a1028, walk: 1.5, pour: 1.0, hud: 'SMITTEN' },
};
export function setMood(m, i, src) {
  if (!MOODS[m]) return;
  const changed = m !== hen.mood;
  hen.mood = m;
  hen.moodI = clamp(i == null ? 0.6 : i, 0, 1);
  hen.combMat.color.setHex(MOODS[m].comb);
  hen.combMat.emissive.setHex(MOODS[m].glow);
  if (changed) {
    state.faceFlash = 0;
    send({ type: 'event', event: 'mood', mood: m, intensity: hen.moodI, source: src || 'local' });
  }
  hud.dirty = true;
}
function henTask() {
  const auto = hen.auto;
  let o = null;
  if (hen.forced) {
    o = orders.find((x) => x.id === hen.forced && x.status === 'queued');
    if (!o) hen.forced = null;
  }
  if (!o && auto) o = orders.find((x) => x.status === 'queued');
  if (o) {
    o.status = 'pouring';
    return { kind: 'pour', order: o, angle: o.angle };
  }
  const empty = glasses.find((g) => g.state === 'bar' && !g.owner && g.fill <= 0.02 && !g.claimed);
  if (empty && auto) {
    empty.claimed = true;
    return { kind: 'bus', glass: empty, angle: Math.atan2(empty.pos.z, empty.pos.x) };
  }
  return null;
}
function vesselFor(type) {
  return hen.vessels[type];
}
export function updateHen(dt) {
  const h = hen,
    mood = MOODS[h.mood];
  h.t += dt;
  let moving = 0,
    pouring = false;
  if (h.state === 'idle') {
    h.idleT = (h.idleT || 0) + dt;
    if (h.idleT > 0.25) {
      h.idleT = 0;
      const t = henTask();
      if (t) {
        h.task = t;
        h.targetAngle = t.angle + (t.kind === 'pour' ? 0.12 : 0.1);
        h.state = 'move';
      }
    }
  }
  if (h.state === 'move') {
    const d = angDiff(h.angle, h.targetAngle),
      w = mood.walk / HEN_R,
      st = Math.sign(d) * Math.min(Math.abs(d), w * dt);
    h.angle += st;
    moving = (Math.abs(st) / dt) * HEN_R;
    h.dir = Math.sign(d);
    if (Math.abs(d) < 0.005) {
      h.angle = h.targetAngle;
      const t = h.task;
      if (t.kind === 'pour') {
        h.state = 'pour';
        startGlass();
      } else {
        h.state = 'bus';
        h.t = 0;
      }
    }
  }
  const hp = polar(h.angle, HEN_R);
  h.root.position.copy(hp);
  const outward = headingTo(Math.cos(h.angle), Math.sin(h.angle)),
    tangent = headingTo(-Math.sin(h.angle) * (h.dir || 1), Math.cos(h.angle) * (h.dir || 1));
  let want = h.state === 'move' ? tangent : outward;
  if (h.emote === 'spin') {
    want = h.heading + 0.5;
  }
  h.heading += angDiff(h.heading, want) * Math.min(1, dt * (h.emote === 'spin' ? 40 : 12));
  h.root.rotation.y = h.heading;
  const v = h.task && h.task.order ? vesselFor(h.task.order.drinks[h.task.order.made] || 'lager') : null;
  for (const k in h.vessels) h.vessels[k].visible = false;
  if (h.state === 'pour') {
    const gl = h.task.glass,
      o = h.task.order;
    if (v) v.visible = true;
    pouring = true;
    if (v) {
      v.rotation.x = -1.0;
      v.updateMatrixWorld(true);
      v.localToWorld(_v.copy(v.userData.spout));
    }
    const top = liquidTop(gl);
    if (_v.y < top + 0.18) _v.y = top + 0.18;
    const fall = Math.sqrt((2 * (_v.y - top)) / 9.8);
    if (gl.fill < 1) {
      gl.fill += dt / mood.pour;
      const col = hexRGB(DRINKS[gl.type].liq);
      for (let i = 0; i < 3; i++) {
        const sx = _v.x + rand(-0.008, 0.008),
          sz = _v.z + rand(-0.008, 0.008);
        emit(K.LIQ, col, sx, _v.y - rand(0, 0.04), sz, (gl.pos.x - sx) / fall, 0, (gl.pos.z - sz) / fall, 1, top);
      }
      if (DRINKS[gl.type].head && Math.random() < 0.3)
        emit(
          K.FOAM,
          hexRGB(DRINKS[gl.type].head),
          gl.pos.x + rand(-0.06, 0.06),
          top + 0.03,
          gl.pos.z + rand(-0.06, 0.06),
          rand(-0.1, 0.1),
          rand(0.2, 0.5),
          rand(-0.1, 0.1),
          0.3,
          -5,
        );
    } else finishGlass();
  }
  if (h.state === 'bus') {
    h.t += dt;
    if (h.t > 0.45 && h.task.glass.state !== 'bus') {
      h.task.glass.state = 'bus';
      h.task.glass.t = 0.3;
    }
    if (h.t > 0.8) {
      h.state = 'idle';
      h.task = null;
    }
  }
  if (h.state === 'spilled') {
    h.t += dt;
    if (h.t > 1.2) h.state = 'idle';
  }
  // pose
  h.speed += (moving - h.speed) * Math.min(1, dt * 8);
  const amp = Math.min(1, h.speed / 0.25),
    T = 0.32;
  h.phase = (h.phase + dt / T) % 1;
  const stride = Math.min(0.28, ((h.speed / 1.3) * T) / 2);
  const bounce = h.mood === 'cheery' ? Math.abs(Math.sin(clock * 5)) * 0.015 : 0;
  h.pelvis.position.y =
    HIP - 0.02 * amp + 0.012 * amp * Math.cos(4 * Math.PI * h.phase) + bounce - (h.mood === 'sleepy' ? 0.03 : 0);
  h.pelvis.rotation.z = 0.06 * amp * Math.sin(TAU * h.phase);
  h.legs.forEach((l) => (l.roll.rotation.z = -h.pelvis.rotation.z));
  legIK(h.legs[0], h.phase, stride, 0.08 * amp, h.pelvis.position.y);
  legIK(h.legs[1], (h.phase + 0.5) % 1, stride, 0.08 * amp, h.pelvis.position.y);
  h.neck.position.z = 0.24 + amp * (((h.speed / 1.3) * T) / 2) * (0.5 - ((h.phase * 2) % 1));
  const L = h.look;
  L.t -= dt;
  const jit = h.mood === 'frazzled' ? 3 : h.mood === 'sleepy' ? 0.3 : 1;
  if (L.t <= 0) {
    L.t = rand(0.5, 1.6) / jit;
    L.ty = rand(-0.7, 0.7);
    L.tp = rand(-0.2, 0.25);
  }
  let ty = L.ty,
    tp = L.tp;
  if (h.lookAt) {
    _v2.copy(h.lookAt.pos || h.lookAt);
    const a = headingTo(_v2.x - hp.x, _v2.z - hp.z);
    ty = clamp(angDiff(h.heading, a), -1, 1);
    tp = 0;
    h.lookT -= dt;
    if (h.lookT <= 0) h.lookAt = null;
  }
  if (h.state === 'pour') {
    ty = -0.3;
    tp = 0.6;
  }
  if (h.state === 'move') {
    ty = 0;
    tp = 0.05;
  }
  if (h.mood === 'sleepy' && h.state === 'idle') {
    tp = 0.45 + Math.sin(clock * 0.8) * 0.1;
  }
  const ls = h.mood === 'sleepy' ? 5 : 22;
  L.yaw += (ty - L.yaw) * Math.min(1, dt * ls);
  L.pitch += (tp - L.pitch) * Math.min(1, dt * ls);
  let hx = L.pitch,
    hz = 0;
  if (h.talkT > 0) {
    h.talkT -= dt;
    hx += Math.sin(clock * 18) * 0.08;
  }
  if (h.emote) {
    h.emoteT -= dt;
    if (h.emote === 'peck') hx += Math.max(0, Math.sin(h.emoteT * 14)) * 0.8;
    if (h.emote === 'bob') hx += Math.sin(h.emoteT * 16) * 0.25;
    if (h.emote === 'shrug') hz = Math.sin(h.emoteT * 5) * 0.3;
    if (h.emoteT <= 0) h.emote = null;
  }
  if (h.mood === 'smitten') hz += Math.sin(clock * 2) * 0.15;
  h.head.rotation.set(hx, L.yaw, hz);
  const lidT = h.mood === 'sleepy' ? 0.75 : h.mood === 'grumpy' ? 0.45 : Math.sin(clock * 1.7) > 0.985 ? 1 : 0.01;
  for (const l of h.lids) l.scale.y += (lidT - l.scale.y) * Math.min(1, dt * 20);
  const wl = h.wings[-1],
    wr = h.wings[1],
    flap = h.emote === 'flap' ? Math.abs(Math.sin(clock * 22)) : 0;
  wl.rotation.x += ((pouring ? 1.7 : 0.1 * amp * Math.sin(h.phase * TAU)) - wl.rotation.x) * Math.min(1, dt * 12);
  wl.rotation.z = pouring ? -0.25 : -flap * 1.1;
  const polishing = h.state === 'idle' && !h.emote && h.mood !== 'sleepy';
  wr.rotation.x +=
    ((h.state === 'bus' ? 1.5 : polishing ? 0.9 + Math.sin(clock * 7) * 0.25 : 0) - wr.rotation.x) *
    Math.min(1, dt * 10);
  wr.rotation.z = flap * 1.1 + (polishing ? Math.cos(clock * 7) * 0.15 : 0);
}
function startGlass() {
  const t = hen.task,
    o = t.order,
    type = o.drinks[o.made];
  const gl = buildGlass(type);
  const a = hen.angle,
    f = new V3(Math.cos(a), 0, Math.sin(a)),
    side = new V3(-Math.sin(a), 0, Math.cos(a));
  gl.pos.copy(polar(a, HEN_R)).addScaledVector(f, 0.4).addScaledVector(side, 0.26);
  gl.pos.y = 0.95;
  gl.state = 'well';
  t.glass = gl;
}
function finishGlass() {
  const h = hen,
    t = h.task,
    o = t.order,
    gl = t.glass;
  gl.fill = 1;
  hen.pours++;
  hud.dirty = true;
  const spill = (MOODS[h.mood].spill || 0) > Math.random();
  gl.from.copy(gl.pos);
  gl.t = 0;
  gl.state = 'lift';
  if (spill) {
    const a = o.angle;
    gl.to.copy(polar(a, 2.4, TOP));
    gl.next = 'fall';
    gl.onLand = (g) => {
      g.vel.set(Math.cos(a) * 1.6, 1.2, Math.sin(a) * 1.6);
      g.state = 'fall';
    };
    say(h, pick(['Ah.', 'That one’s on me.', '...']), 1.6, false, true);
    h.state = 'spilled';
    h.t = 0;
    o.status = 'queued';
    h.task = null;
    brain.lastSpill = clock;
    return;
  }
  if (o.kind === 'bar') {
    const p = o.who;
    gl.to.copy(p.stool ? p.stool.spot : polar(o.angle, 2.26, TOP));
    gl.next = 'bar';
    gl.owner = p;
    gl.onLand = (g) => {
      if (!people.includes(p) || !p.stool) {
        g.owner = null;
        return;
      }
      p.glass = g;
      p.state = 'drinking';
      p.sipT = rand(0.8, 2);
      p.grumbled = false;
    };
    o.status = 'done';
    send({ type: 'event', event: 'served', order: o.id, patron: { id: p.id, name: p.name }, drink: gl.type });
    if (p.regular) brain.lastRegular = clock;
    if (Math.random() < 0.35) say(h, greet(p), 1.8, false, true);
    h.state = 'idle';
    h.task = null;
  } else {
    const i = o.made;
    gl.to.copy(polar(STATION_A + (i - (o.drinks.length - 1) / 2) * 0.07, 2.3, TOP));
    gl.next = 'station';
    o.glasses.push(gl);
    o.made++;
    if (o.made >= o.drinks.length) {
      o.status = 'ready';
      h.state = 'idle';
      h.task = null;
    } else {
      h.state = 'pour';
      startGlass();
    }
  }
}
function greet(p) {
  if (p.regular) return pick([`There you go, ${p.name}.`, `${p.name}.`, `Same as always, ${p.name}.`]);
  return pick(['Enjoy.', 'There you go.', 'Cheers.']);
}
