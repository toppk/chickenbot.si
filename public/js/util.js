'use strict';
const rand = (a = 0, b = 1) => a + Math.random() * (b - a),
  pick = (a) => a[(Math.random() * a.length) | 0],
  clamp = (v, a, b) => Math.max(a, Math.min(b, v)),
  lerp = (a, b, t) => a + (b - a) * t;
const TAU = Math.PI * 2,
  V3 = THREE.Vector3;
const polar = (a, r, y = 0) => new V3(Math.cos(a) * r, y, Math.sin(a) * r);
const angDiff = (a, b) => {
  let d = b - a;
  while (d > Math.PI) d -= TAU;
  while (d < -Math.PI) d += TAU;
  return d;
};
const headingTo = (dx, dz) => Math.atan2(dx, dz);
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const _v = new V3(),
  _v2 = new V3();
