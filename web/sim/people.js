import { V3, _v, angDiff, clamp, headingTo, lerp, polar, rand } from '../core/util.js';
import { RING_R } from '../scene/layout.js';
import { K, emit, hexRGB } from '../scene/particles.js';
import { DRINKS } from './drinks.js';
import { clock } from './world.js';

// Walking (path planning around the bar), body animation and sipping.
function segHits(ax, az, bx, bz, r) {
  const dx = bx - ax,
    dz = bz - az,
    l2 = dx * dx + dz * dz;
  let t = l2 ? -(ax * dx + az * dz) / l2 : 0;
  t = clamp(t, 0, 1);
  return Math.hypot(ax + dx * t, az + dz * t) < r;
}
function planPath(fx, fz, tx, tz) {
  if (!segHits(fx, fz, tx, tz, 3.3)) return [new V3(tx, 0, tz)];
  const a1 = Math.atan2(fz, fx),
    a2 = Math.atan2(tz, tx),
    pts = [polar(a1, RING_R)];
  const d = angDiff(a1, a2),
    n = Math.max(1, Math.ceil(Math.abs(d) / 0.3));
  for (let i = 1; i <= n; i++) pts.push(polar(a1 + (d * i) / n, RING_R));
  pts.push(new V3(tx, 0, tz));
  return pts;
}
export function walkTo(p, target, onArrive) {
  p.path = planPath(p.pos.x, p.pos.z, target.x, target.z);
  p.onArrive = onArrive || null;
  p.sitTarget = 0;
}
export function animatePerson(p, dt) {
  if (p.path.length && p.sit < 0.05) {
    const t = p.path[0],
      dx = t.x - p.pos.x,
      dz = t.z - p.pos.z,
      d = Math.hypot(dx, dz),
      st = p.speed * dt;
    if (d <= st) {
      p.pos.x = t.x;
      p.pos.z = t.z;
      p.path.shift();
      if (!p.path.length && p.onArrive) {
        const f = p.onArrive;
        p.onArrive = null;
        f();
      }
    } else {
      p.pos.x += (dx / d) * st;
      p.pos.z += (dz / d) * st;
      p.wantHeading = headingTo(dx, dz);
    }
    p.walking = true;
  } else p.walking = false;
  p.heading += angDiff(p.heading, p.wantHeading) * Math.min(1, dt * 9);
  p.sit += (p.sitTarget - p.sit) * Math.min(1, dt * 6);
  const w = p.walking ? 1 : 0;
  p.ph += dt * 8.5 * w;
  const sw = Math.sin(p.ph) * 0.55 * w;
  for (let i = 0; i < 2; i++) {
    const L = p.legs[i],
      s = i ? -sw : sw;
    L.th.rotation.x = lerp(s, -1.45, p.sit);
    L.kn.rotation.x = lerp(Math.max(0, Math.sin(p.ph + (i ? Math.PI : 0) + 0.8)) * 0.7 * w, 1.45, p.sit);
  }
  const yOff = lerp(Math.abs(Math.sin(p.ph)) * 0.03 * w, p.seatY - 0.75, p.sit);
  p.root.position.set(p.pos.x, yOff, p.pos.z);
  p.root.rotation.y = p.heading;
  p.talk = Math.max(0, p.talk - dt);
  p.head.rotation.x = p.talk > 0 ? Math.sin(clock * 14) * 0.06 : 0;
  const a = p.arms[0].p,
    b = p.arms[1].p;
  if (p.tray && p.carrying) {
    b.rotation.set(-1.45, 0, 0.15);
  } else if (p.tray && p.writing) {
    b.rotation.set(-1.0, 0, 0.2);
    a.rotation.set(-1.1, 0, -0.2);
  } else b.rotation.set(p.sit > 0.5 ? -0.5 : sw * 0.6, 0, 0);
  if (p.glass && p.glass.state === 'hand') {
    a.rotation.set(-2.3 * p.glass.blend - 0.4 * (1 - p.glass.blend), 0, 0.15);
  } else if (p.glass && p.glass.state === 'return') {
    a.rotation.set(-2.3 * p.glass.blend - 0.4 * (1 - p.glass.blend), 0, 0.15);
  } else if (p.wave > 0) {
    p.wave -= dt;
    a.rotation.set(-2.6, 0, -0.3 + Math.sin(clock * 12) * 0.3);
  } else if (!(p.tray && p.writing)) a.rotation.set(p.sit > 0.5 ? -0.55 : -sw * 0.6, 0, 0);
  if (p.trayObj) p.trayObj.visible = !!p.carrying;
}
export function sipLogic(p, dt) {
  const g = p.glass;
  if (!g || g.dead) return;
  if (g.state === 'bar' || g.state === 'table') {
    if (g.fill <= 0.02) return;
    p.sipT -= dt;
    if (p.sipT <= 0) {
      g.restState = g.state;
      g.rest.copy(g.pos);
      g.state = 'hand';
      g.owner = p;
      g.blend = 0;
      g.tilt = 0.2;
      p.sipping = 1.7;
    }
  } else if (g.state === 'hand') {
    p.sipping -= dt;
    g.tilt = lerp(g.tilt, 1.0, dt * 3);
    g.fill = Math.max(0, g.fill - dt * (p.sipRate || 0.13));
    if (Math.random() < 0.015) {
      g.g.getWorldPosition(_v);
      emit(K.LIQ, hexRGB(DRINKS[g.type].liq), _v.x, _v.y + 0.25, _v.z, rand(-0.2, 0.2), 0, rand(-0.2, 0.2), 1.5, 0.005);
    }
    if (p.sipping <= 0) {
      g.state = 'return';
      p.sipT = p.regular ? rand(6, 12) : rand(3, 7);
    }
  }
}
