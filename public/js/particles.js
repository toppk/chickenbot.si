'use strict';
/* ================= particles & puddles ================= */
const PMAX = 4000,
  pPos = new Float32Array(PMAX * 3),
  pCol = new Float32Array(PMAX * 3),
  pVel = new Float32Array(PMAX * 3),
  pLife = new Float32Array(PMAX),
  pKind = new Uint8Array(PMAX),
  pFloor = new Float32Array(PMAX);
let pNext = 0,
  liveP = 0;
for (let i = 0; i < PMAX; i++) pPos[i * 3 + 1] = -999;
const pGeo = new THREE.BufferGeometry();
pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
pGeo.setAttribute('color', new THREE.BufferAttribute(pCol, 3));
const points = new THREE.Points(
  pGeo,
  new THREE.PointsMaterial({ size: 2, sizeAttenuation: false, vertexColors: true, depthWrite: false }),
);
points.frustumCulled = false;
points.layers.set(1);
scene.add(points);
const K = { LIQ: 0, SHARD: 1, FLOAT: 2, FOAM: 3, RAIN: 4 };
const hexRGB = (h) => [((h >> 16) & 255) / 255, ((h >> 8) & 255) / 255, (h & 255) / 255];
function emit(kind, col, x, y, z, vx, vy, vz, life, fl) {
  const i = pNext;
  pNext = (pNext + 1) % PMAX;
  const k = i * 3;
  pPos[k] = x;
  pPos[k + 1] = y;
  pPos[k + 2] = z;
  pVel[k] = vx;
  pVel[k + 1] = vy;
  pVel[k + 2] = vz;
  pLife[i] = life;
  pKind[i] = kind;
  pFloor[i] = fl;
  const j = rand(0.85, 1.1);
  pCol[k] = col[0] * j;
  pCol[k + 1] = col[1] * j;
  pCol[k + 2] = col[2] * j;
}
function updateParticles(dt) {
  liveP = 0;
  for (let i = 0; i < PMAX; i++) {
    if (pLife[i] <= 0) continue;
    pLife[i] -= dt;
    const k = i * 3,
      kind = pKind[i];
    if (pLife[i] <= 0) {
      pPos[k + 1] = -999;
      continue;
    }
    liveP++;
    const g = kind === K.FLOAT ? -0.25 : kind === K.RAIN ? 14 : kind === K.FOAM && pVel[k + 1] > 0 ? 2 : 9.8;
    pVel[k + 1] -= g * dt;
    pPos[k] += pVel[k] * dt;
    pPos[k + 1] += pVel[k + 1] * dt;
    pPos[k + 2] += pVel[k + 2] * dt;
    if (pPos[k + 1] < pFloor[i]) {
      if (kind === K.SHARD) {
        pPos[k + 1] = pFloor[i];
        pVel[k + 1] *= -0.3;
        pVel[k] *= 0.5;
        pVel[k + 2] *= 0.5;
      } else {
        pLife[i] = 0;
        pPos[k + 1] = -999;
        liveP--;
      }
    }
    if (kind === K.FLOAT && pPos[k + 1] > pFloor[i] + 1.0) {
      pLife[i] = 0;
      pPos[k + 1] = -999;
    }
  }
  pGeo.attributes.position.needsUpdate = true;
  pGeo.attributes.color.needsUpdate = true;
}
const puddles = [],
  PUD = new THREE.CircleGeometry(1, 12);
PUD.rotateX(-Math.PI / 2);
function addPuddle(x, y, z, r, color) {
  if (puddles.length >= 14) {
    const p = puddles.shift();
    scene.remove(p.m);
    p.m.material.dispose();
    p.hl.material.dispose();
  }
  const m = new THREE.Mesh(
    PUD,
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.85, depthWrite: false }),
  );
  m.layers.set(1);
  m.position.set(x, y + 0.012 + puddles.length * 0.0005, z);
  m.scale.set(0.01, 1, 0.01);
  m.rotation.y = rand(0, 6);
  scene.add(m);
  const hl = new THREE.Mesh(
    PUD,
    new THREE.MeshBasicMaterial({ color: 0xffe0a0, transparent: true, opacity: 0.5, depthWrite: false }),
  );
  hl.layers.set(1);
  hl.position.set(0.25, 0.002, -0.2);
  hl.scale.set(0.25, 1, 0.1);
  m.add(hl);
  puddles.push({ m, hl, r, sx: rand(0.75, 1.3), age: 0 });
}
function updatePuddles(dt) {
  for (let i = puddles.length - 1; i >= 0; i--) {
    const p = puddles[i];
    p.age += dt;
    const s = Math.min(1, p.age / 0.6);
    p.m.scale.set(p.r * s * p.sx, 1, p.r * s);
    const o = clamp(1 - (p.age - 20) / 10, 0, 1);
    p.m.material.opacity = 0.85 * o;
    p.hl.material.opacity = 0.5 * o;
    if (p.age > 30) {
      scene.remove(p.m);
      p.m.material.dispose();
      p.hl.material.dispose();
      puddles.splice(i, 1);
    }
  }
}
