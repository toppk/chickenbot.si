'use strict';
/* ================= people ================= */
const JACKETS = [0x5a2a2a, 0x2f4a6a, 0x4a5a2f, 0x5a3a6a, 0x7a5a2a, 0x3a3a3a, 0x2f5a52, 0x6a4030],
  SKINS = [0xe0b48a, 0xb97e55, 0x7a4e32, 0xf0c9a0, 0x9a6a48],
  PANTS = [0x2b2b33, 0x3d2f22, 0x2a3a2a, 0x4a3a2a, 0x24304a],
  HAIR = [0x2a1a10, 0x5a3a1a, 0x8a6a3a, 0x1a1a1a, 0xa0a0a0, 0x7a2a10];
const people = [];
let nextId = 1;
function buildPerson(o) {
  const root = new THREE.Group();
  scene.add(root);
  const mJ = toon(o.jacket),
    mS = toon(o.skin),
    mP = toon(o.pants);
  const hips = put(new THREE.Group(), 0, 0.78, 0, root),
    legs = [];
  for (const s of [-1, 1]) {
    const th = put(new THREE.Group(), s * 0.1, 0, 0, hips);
    put(box(0.14, 0.4, 0.16, mP), 0, -0.2, 0, th);
    const kn = put(new THREE.Group(), 0, -0.4, 0, th);
    put(box(0.13, 0.32, 0.15, mP), 0, -0.16, 0, kn);
    put(box(0.15, 0.08, 0.25, M.boot), 0, -0.34, 0.04, kn);
    legs.push({ th, kn });
  }
  const torso = put(new THREE.Group(), 0, 0, 0, hips);
  put(box(0.38, 0.5, 0.24, mJ), 0, 0.27, 0, torso);
  if (o.apron) {
    put(box(0.36, 0.42, 0.02, M.apron), 0, 0.12, 0.125, torso);
  }
  if (o.vest) put(box(0.39, 0.4, 0.25, toon(o.vest)), 0, 0.22, 0, torso);
  if (o.scarf) put(box(0.3, 0.08, 0.28, toon(o.scarf)), 0, 0.5, 0, torso);
  const arms = [];
  for (const s of [-1, 1]) {
    const p = put(new THREE.Group(), s * 0.25, 0.48, 0, torso);
    put(box(0.11, 0.46, 0.13, mJ), 0, -0.22, 0, p);
    put(box(0.1, 0.1, 0.1, mS), 0, -0.49, 0, p);
    const hand = put(new THREE.Group(), 0, -0.56, 0.03, p);
    arms.push({ p, hand });
  }
  const head = put(new THREE.Group(), 0, 0.68, 0, torso);
  put(box(0.26, 0.28, 0.26, mS), 0, 0, 0, head);
  for (const s of [-1, 1]) put(box(0.035, 0.035, 0.02, M.black), s * 0.06, 0.03, 0.132, head);
  const hair = toon(o.hair);
  if (o.cap) {
    put(box(0.28, 0.07, 0.28, toon(o.cap)), 0, 0.15, 0, head);
    put(box(0.24, 0.03, 0.12, toon(o.cap)), 0, 0.12, 0.16, head);
  } else if (!o.bald) {
    put(box(0.28, 0.08, 0.28, hair), 0, 0.15, 0, head);
    put(box(0.28, 0.18, 0.06, hair), 0, 0.05, -0.13, head);
  }
  if (o.bald) put(box(0.27, 0.1, 0.06, hair), 0, 0.02, -0.13, head);
  if (o.bun) put(box(0.12, 0.12, 0.12, hair), 0, 0.2, -0.1, head);
  if (o.ponytail) {
    put(box(0.08, 0.24, 0.08, hair), 0, -0.02, -0.18, head);
  }
  if (o.beard) put(box(0.27, 0.12, 0.06, toon(o.beard)), 0, -0.1, 0.12, head);
  if (o.specs) {
    put(box(0.24, 0.06, 0.02, M.black), 0, 0.03, 0.14, head);
  }
  if (o.beanie) put(box(0.29, 0.12, 0.29, toon(o.beanie)), 0, 0.16, 0, head);
  let trayObj = null;
  if (o.tray) {
    trayObj = put(new THREE.Group(), 0, 0, 0, arms[1].hand);
    put(cyl(0.22, 0.22, 0.02, M.tray, 14), 0, 0.03, 0.1, trayObj);
    trayObj.visible = false;
  }
  const p = Object.assign(
    {
      id: 'p' + nextId++,
      root,
      hips,
      legs,
      torso,
      arms,
      head,
      trayObj,
      pos: new V3(),
      heading: 0,
      wantHeading: 0,
      path: [],
      speed: 1.25,
      walking: false,
      ph: rand(0, 6),
      sit: 0,
      sitTarget: 0,
      seatY: 0.75,
      glass: null,
      sipT: rand(2, 5),
      sipping: 0,
      state: 'idle',
      talk: 0,
    },
    o,
  );
  people.push(p);
  return p;
}
function removePerson(p) {
  scene.remove(p.root);
  p.root.traverse((x) => {
    if (x.geometry) x.geometry.dispose();
  });
  const i = people.indexOf(p);
  if (i >= 0) people.splice(i, 1);
}
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
function walkTo(p, target, onArrive) {
  p.path = planPath(p.pos.x, p.pos.z, target.x, target.z);
  p.onArrive = onArrive || null;
  p.sitTarget = 0;
}
function animatePerson(p, dt) {
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
function sipLogic(p, dt) {
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
