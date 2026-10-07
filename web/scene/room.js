import * as THREE from 'three';
import { TAU, rand } from '../core/util.js';
import { scene } from '../render/renderer.js';
import { M, ctex, toon } from '../render/materials.js';
import { box, cyl, plane, put, sph } from '../render/mesh.js';
import { finalizeWall, makeWall } from '../render/wall-fade.js';
import { ROOM, WALL_H } from './layout.js';

// The four walls with their decorations, the jukebox, pool table and lights.
export const ambient = new THREE.AmbientLight(0x7a5a46, 0.6);
scene.add(ambient);
const sun = new THREE.DirectionalLight(0xffe6c8, 0.55);
sun.position.set(-3, 10, 4);
scene.add(sun);
export const pendLights = [];
// floor
const floorTex = ctex(
  64,
  64,
  (g) => {
    const sh = ['#5e3620', '#54301b', '#663c24', '#4c2a17'];
    for (let r = 0; r < 8; r++) {
      g.fillStyle = sh[r % 4];
      g.fillRect(0, r * 8, 64, 8);
      g.fillStyle = '#24130a';
      g.fillRect(0, r * 8 + 7, 64, 1);
      const off = (r * 23) % 64;
      for (let k = 0; k < 3; k++) g.fillRect((off + k * 24) % 64, r * 8, 1, 7);
      g.fillStyle = 'rgba(0,0,0,0.16)';
      for (let k = 0; k < 5; k++) g.fillRect((r * 13 + k * 11) % 64, r * 8 + 2 + (k % 4), 3, 1);
    }
  },
  [9, 9],
);
export const floor = new THREE.Mesh(new THREE.PlaneGeometry(2 * ROOM, 2 * ROOM), toon(0xffffff, { map: floorTex }));
floor.rotation.x = -Math.PI / 2;
scene.add(floor);
// wall textures
const brickTex = ctex(
  32,
  32,
  (g) => {
    g.fillStyle = '#3a2216';
    g.fillRect(0, 0, 32, 32);
    const reds = ['#7a3626', '#6c2e20', '#843d2a', '#5e281c'];
    for (let r = 0; r < 4; r++)
      for (let c = -1; c < 2; c++) {
        const x = c * 16 + (r % 2 ? 8 : 0);
        g.fillStyle = reds[(r * 3 + c + 4) % 4];
        g.fillRect(x + 1, r * 8 + 1, 15, 7);
        g.fillStyle = 'rgba(255,255,255,0.06)';
        g.fillRect(x + 1, r * 8 + 1, 15, 1);
      }
  },
  [16, 3.4],
);
const paperTex = ctex(
  16,
  16,
  (g) => {
    g.fillStyle = '#2b4434';
    g.fillRect(0, 0, 16, 16);
    g.fillStyle = '#33503d';
    g.fillRect(0, 0, 3, 16);
    g.fillRect(8, 0, 1, 16);
    g.fillStyle = '#4a6a4c';
    g.fillRect(12, 3, 1, 1);
    g.fillRect(11, 4, 3, 1);
    g.fillRect(12, 5, 1, 1);
    g.fillRect(12, 11, 1, 1);
    g.fillRect(11, 12, 3, 1);
  },
  [30, 4],
);
const plasterTex = ctex(
  32,
  32,
  (g) => {
    g.fillStyle = '#d8c8a4';
    g.fillRect(0, 0, 32, 32);
    for (let i = 0; i < 40; i++) {
      g.fillStyle = Math.random() < 0.5 ? '#cbb994' : '#e2d4b4';
      g.fillRect((Math.random() * 32) | 0, (Math.random() * 32) | 0, 1 + ((Math.random() * 2) | 0), 1);
    }
  },
  [15, 3],
);
function wallBody(w, tex, x, y, z, sx, sy, sz) {
  const b = box(sx, sy, sz, toon(0xffffff, { map: tex }));
  put(b, x, y, z, w.g);
  return b;
}
function baseStub(x, z, sx, sz) {
  put(box(sx, 0.34, sz, M.mahogDark), x, 0.17, z);
}
const E = ROOM + 0.13;
// ---- NORTH: the entrance
const wN = makeWall(0, -1);
wallBody(wN, brickTex, -4.9, WALL_H / 2, -E, 5.6, WALL_H, 0.26);
wallBody(wN, brickTex, 4.9, WALL_H / 2, -E, 5.6, WALL_H, 0.26);
wallBody(wN, brickTex, 0, 2.85, -E, 4.2, 0.9, 0.26);
put(box(4.3, 0.14, 0.32, M.mahog), 0, 2.4, -ROOM + 0.02, wN.g);
for (const s of [-1, 1]) put(box(0.16, 2.4, 0.32, M.mahog), s * 1.0, 1.2, -ROOM + 0.02, wN.g);
export const doorL = put(new THREE.Group(), -0.92, 0, -ROOM + 0.05, wN.g),
  doorR = put(new THREE.Group(), 0.92, 0, -ROOM + 0.05, wN.g);
for (const [d, s] of [
  [doorL, 1],
  [doorR, -1],
]) {
  put(box(0.9, 2.3, 0.07, M.mahog), s * 0.45, 1.15, 0, d);
  put(box(0.5, 0.7, 0.08, toon(0x2c4654)), s * 0.45, 1.6, 0, d);
  put(box(0.05, 0.3, 0.1, M.brass), s * 0.8, 1.1, 0.04, d);
}
put(box(1.84, 0.5, 0.06, toon(0x3a5a6a, { emissive: 0x0a1418 })), 0, 2.1, -ROOM - 0.05, wN.g);
// coat hooks with coats
put(box(1.8, 0.1, 0.06, M.mahog), -3.2, 1.95, -ROOM + 0.03, wN.g);
[
  [0x3b4a5a, -3.8],
  [0x7a3a22, -3.25],
  [0x2e2e2e, -2.65],
].forEach(([c, x]) => {
  put(box(0.04, 0.08, 0.12, M.brass), x, 1.92, -ROOM + 0.08, wN.g);
  const co = put(box(0.42, 0.95, 0.14, toon(c)), x, 1.42, -ROOM + 0.14, wN.g);
  co.rotation.z = rand(-0.05, 0.05);
});
put(sph(0.12, toon(0x5a4a3a), 8), -3.25, 2.07, -ROOM + 0.12, wN.g).scale.set(1.3, 0.5, 1.3);
// mirror
const mirTex = ctex(32, 20, (g) => {
  const gr = g.createLinearGradient(0, 0, 32, 20);
  gr.addColorStop(0, '#9fb6bf');
  gr.addColorStop(0.5, '#5e7680');
  gr.addColorStop(1, '#3a4e58');
  g.fillStyle = gr;
  g.fillRect(0, 0, 32, 20);
  g.fillStyle = 'rgba(255,255,255,.35)';
  for (let i = 0; i < 6; i++) g.fillRect(4 + i, 14 - i * 2, 2, 1);
  g.fillRect(20, 6, 1, 1);
});
put(box(2.0, 1.3, 0.08, M.brass), 3.4, 1.75, -ROOM + 0.03, wN.g);
put(plane(1.84, 1.14, mirTex), 3.4, 1.75, -ROOM + 0.08, wN.g);
for (const x of [-1.6, 1.6]) {
  put(box(0.12, 0.2, 0.1, M.brass), x, 2.25, -ROOM + 0.05, wN.g);
  put(sph(0.09, M.bulb, 8), x, 2.42, -ROOM + 0.1, wN.g);
}
finalizeWall(wN);
baseStub(-4.9, -E, 5.6, 0.32);
baseStub(4.9, -E, 5.6, 0.32);
// ---- EAST: photos, dartboard, wallpaper above wainscot
const wE = makeWall(1, 0);
wallBody(wE, paperTex, E, WALL_H / 2, 0, 0.26, WALL_H, 2 * ROOM + 0.52);
put(box(0.06, 1.05, 2 * ROOM, M.mahog), ROOM - 0.03, 0.52, 0, wE.g);
put(box(0.1, 0.07, 2 * ROOM, M.mahogTop), ROOM - 0.05, 1.06, 0, wE.g);
const photoArt = [
  (g) => {
    g.fillStyle = '#c9b48a';
    g.fillRect(0, 0, 24, 18);
    g.fillStyle = '#8a7350';
    g.fillRect(0, 11, 24, 7);
    g.fillStyle = '#3a2a18';
    g.fillRect(8, 7, 8, 4);
    g.fillRect(11, 3, 1, 4);
    g.fillStyle = '#e8dcb8';
    g.fillRect(12, 3, 3, 3);
  },
  (g) => {
    g.fillStyle = '#b8a47e';
    g.fillRect(0, 0, 24, 18);
    g.fillStyle = '#6a5638';
    for (let x = 0; x < 24; x++) {
      const h = 6 + Math.abs(Math.sin(x * 0.5)) * 6;
      g.fillRect(x, 18 - h, 1, h);
    }
    g.fillStyle = '#e8dcb8';
    g.fillRect(17, 3, 3, 3);
  },
  (g) => {
    g.fillStyle = '#cdb991';
    g.fillRect(0, 0, 24, 18);
    g.fillStyle = '#3e2e1e';
    for (let r = 0; r < 2; r++)
      for (let i = 0; i < 5; i++) {
        g.fillRect(2 + i * 4 + r * 2, 4 + r * 6, 3, 3);
        g.fillRect(2 + i * 4 + r * 2, 7 + r * 6, 3, 4);
      }
  },
  (g) => {
    g.fillStyle = '#c4ae86';
    g.fillRect(0, 0, 24, 18);
    g.fillStyle = '#f0e6cc';
    g.fillRect(8, 6, 8, 9);
    g.fillRect(10, 3, 5, 5);
    g.fillStyle = '#8a2a1a';
    g.fillRect(11, 1, 3, 2);
    g.fillStyle = '#c08a2a';
    g.fillRect(15, 5, 2, 1);
  },
];
photoArt.forEach((draw, i) => {
  const z = 1.6 + i * 1.35,
    y = i % 2 ? 2.05 : 1.85;
  const t = ctex(24, 18, draw);
  put(box(0.05, 0.66, 0.86, M.mahogDark), ROOM - 0.03, y, z, wE.g);
  const p = plane(0.72, 0.54, t);
  p.rotation.y = -Math.PI / 2;
  put(p, ROOM - 0.07, y, z, wE.g);
});
const dartTex = ctex(48, 48, (g) => {
  const cx = 24,
    cy = 24;
  for (let r = 23; r > 0; r--) {
    for (let a = 0; a < 20; a++) {
      g.beginPath();
      g.moveTo(cx, cy);
      g.arc(cx, cy, r, (a / 20) * TAU, ((a + 1) / 20) * TAU);
      g.closePath();
      const ring = r > 21 || (r > 12 && r < 14) ? 1 : 0;
      g.fillStyle = ring ? (a % 2 ? '#b02a20' : '#2a7a40') : a % 2 ? '#1a1410' : '#e8dcb8';
      g.fill();
    }
  }
  g.fillStyle = '#b02a20';
  g.fillRect(22, 22, 4, 4);
});
put(cyl(0.34, 0.34, 0.06, M.mahogDark, 16), ROOM - 0.05, 1.75, -3.0, wE.g).rotation.z = Math.PI / 2;
{
  const p = new THREE.Mesh(new THREE.CircleGeometry(0.3, 20), new THREE.MeshBasicMaterial({ map: dartTex }));
  p.rotation.y = -Math.PI / 2;
  put(p, ROOM - 0.09, 1.75, -3.0, wE.g);
}
for (let i = 0; i < 3; i++) put(box(0.12, 0.012, 0.012, M.brass), ROOM - 0.15, 1.7 + i * 0.05, -2.95 + i * 0.04, wE.g);
put(box(0.04, 0.4, 0.6, M.black), ROOM - 0.03, 1.4, -4.6, wE.g);
finalizeWall(wE);
baseStub(E, 0, 0.32, 2 * ROOM + 0.5);
// ---- SOUTH: the big window onto the street
export const wS = makeWall(0, 1);
wallBody(wS, brickTex, -4.95, WALL_H / 2, E, 5.4, WALL_H, 0.26);
wallBody(wS, brickTex, 4.95, WALL_H / 2, E, 5.4, WALL_H, 0.26);
wallBody(wS, brickTex, 0, 0.45, E, 4.5, 0.9, 0.26);
wallBody(wS, brickTex, 0, 3.0, E, 4.5, 0.6, 0.26);
put(box(4.6, 0.1, 0.4, M.mahog), 0, 0.95, ROOM - 0.02, wS.g);
for (const x of [-2.25, -0.75, 0.75, 2.25]) put(box(0.1, 1.8, 0.12, M.mahogDark), x, 1.8, ROOM, wS.g);
for (const y of [0.92, 1.8, 2.68]) put(box(4.5, 0.08, 0.12, M.mahogDark), 0, y, ROOM, wS.g);
const streetTex = ctex(160, 64, (g) => {
  const gr = g.createLinearGradient(0, 0, 0, 64);
  gr.addColorStop(0, '#0a1020');
  gr.addColorStop(0.6, '#16223a');
  gr.addColorStop(1, '#1c2a3a');
  g.fillStyle = gr;
  g.fillRect(0, 0, 160, 64);
  const bs = [
    [0, 14, 30],
    [30, 8, 26],
    [56, 20, 34],
    [90, 4, 30],
    [120, 16, 40],
  ];
  for (const [x, y, w] of bs) {
    g.fillStyle = '#0c1424';
    g.fillRect(x, y, w, 46 - y);
    for (let wy = y + 4; wy < 42; wy += 6)
      for (let wx = x + 3; wx < x + w - 3; wx += 5) {
        if ((wx * 7 + wy * 13) % 5 < 2) {
          g.fillStyle = (wx + wy) % 3 ? '#e8b85a' : '#d89a40';
          g.fillRect(wx, wy, 2, 3);
        }
      }
  }
  g.fillStyle = '#22303e';
  g.fillRect(0, 46, 160, 18);
  g.fillStyle = '#3a4a5a';
  for (let x = 0; x < 160; x += 12) g.fillRect(x, 54, 6, 1);
  g.fillStyle = '#e8b85a';
  g.fillRect(118, 48, 1, 1);
  g.fillStyle = 'rgba(232,184,90,.25)';
  g.fillRect(112, 49, 14, 14);
  g.fillStyle = '#2a2a30';
  g.fillRect(117, 20, 2, 30);
  g.fillStyle = '#ffe2a0';
  g.fillRect(115, 19, 6, 3);
});
put(plane(6.5, 2.6, streetTex, {}), 0, 1.8, ROOM + 1.4, wS.g);
export const carLight = put(
  box(0.5, 0.12, 0.04, new THREE.MeshBasicMaterial({ color: 0xfff0c0 })),
  -9,
  0.55,
  ROOM + 1.2,
  wS.g,
);
finalizeWall(wS);
baseStub(-4.95, E, 5.4, 0.32);
baseStub(4.95, E, 5.4, 0.32);
baseStub(0, E, 4.5, 0.32);
const winLight = new THREE.PointLight(0x5a7aaa, 0.5, 6, 1);
winLight.position.set(0, 2, ROOM - 0.8);
scene.add(winLight);
// ---- WEST: chalkboard menu, cue rack, the hallway
const wW = makeWall(-1, 0);
wallBody(wW, plasterTex, -E, WALL_H / 2, 0, 0.26, WALL_H, 2 * ROOM + 0.52);
put(box(0.06, 1.05, 2 * ROOM, M.mahog), -ROOM + 0.03, 0.52, 0, wW.g);
put(box(0.1, 0.07, 2 * ROOM, M.mahogTop), -ROOM + 0.05, 1.06, 0, wW.g);
const chalkTex = ctex(128, 80, (g) => {
  g.fillStyle = '#1d2620';
  g.fillRect(0, 0, 128, 80);
  g.fillStyle = 'rgba(255,255,255,.05)';
  for (let i = 0; i < 14; i++) g.fillRect(rand(0, 120) | 0, rand(0, 76) | 0, rand(6, 20) | 0, 1);
  g.font = '14px VT323, monospace';
  g.fillStyle = '#e8e4d4';
  g.textBaseline = 'top';
  const L = [
    ['ON TAP', ''],
    ['house lager', '6'],
    ['oatmeal stout', '7'],
    ['', ''],
    ['BY THE GLASS', ''],
    ['house red', '9'],
    ['whiskey, neat', '10'],
  ];
  L.forEach(([a, b], i) => {
    g.fillStyle = a === a.toUpperCase() && a ? '#f2c860' : '#e8e4d4';
    g.fillText(a, 8, 4 + i * 10.5);
    g.fillText(b, 112 - g.measureText(b).width, 4 + i * 10.5);
  });
});
put(box(0.06, 1.25, 1.95, M.mahog), -ROOM + 0.03, 1.9, -2.2, wW.g);
{
  const p = plane(1.8, 1.12, chalkTex);
  p.rotation.y = Math.PI / 2;
  put(p, -ROOM + 0.07, 1.9, -2.2, wW.g);
}
put(box(0.08, 1.3, 0.7, M.mahog), -ROOM + 0.04, 1.45, 2.2, wW.g);
for (let i = 0; i < 4; i++) put(cyl(0.012, 0.022, 1.45, toon(0xc8a46a), 5), -ROOM + 0.12, 1.45, 1.95 + i * 0.17, wW.g);
put(box(0.1, 2.3, 1.0, M.mahogDark), -ROOM + 0.03, 1.15, 5.2, wW.g);
put(box(0.12, 2.1, 0.85, M.mahog), -ROOM + 0.06, 1.05, 5.2, wW.g);
put(box(0.04, 0.14, 0.3, M.brass), -ROOM + 0.13, 1.75, 5.2, wW.g);
put(box(0.06, 0.06, 0.06, M.brass), -ROOM + 0.14, 1.05, 4.88, wW.g);
for (const z of [-4.8, 0.2]) {
  put(box(0.1, 0.2, 0.12, M.brass), -ROOM + 0.05, 2.3, z, wW.g);
  put(sph(0.09, M.bulb, 8), -ROOM + 0.12, 2.47, z, wW.g);
}
finalizeWall(wW);
baseStub(-E, 0, 0.32, 2 * ROOM + 0.5);
// furniture against the walls (stays solid)
// jukebox (east)
const juke = put(new THREE.Group(), ROOM - 0.45, 0, 0);
put(box(0.6, 1.25, 1.0, M.mahog), 0, 0.62, 0, juke);
const jukeTop = put(cyl(0.5, 0.5, 0.6, toon(0xd06a2a, { emissive: 0x3a1400 }), 14, false), 0, 1.25, 0, juke);
jukeTop.rotation.x = Math.PI / 2;
jukeTop.scale.set(1, 1, 0.6);
export const jukeGlow = toon(0xffb84a, { emissive: 0xff8a20, emissiveIntensity: 0.6 });
put(box(0.05, 0.5, 0.7, jukeGlow), -0.31, 0.85, 0, juke);
export const tubes = [];
for (const z of [-0.47, 0.47]) {
  tubes.push(put(cyl(0.05, 0.05, 1.2, toon(0x7ad0ff, { emissive: 0x2a6aa0 }), 8), -0.2, 0.7, z, juke));
}
export const jukeLight = new THREE.PointLight(0xff9a3a, 0.8, 4, 1);
jukeLight.position.set(ROOM - 1.1, 1.0, 0);
scene.add(jukeLight);
// pool table (west)
const pool = put(new THREE.Group(), -5.0, 0, 0.2);
for (const [x, z] of [
  [-0.55, -1.05],
  [0.55, -1.05],
  [-0.55, 1.05],
  [0.55, 1.05],
])
  put(box(0.14, 0.7, 0.14, M.mahogDark), x, 0.35, z, pool);
put(box(1.4, 0.18, 2.5, M.mahog), 0, 0.78, 0, pool);
put(box(1.2, 0.04, 2.3, M.felt), 0, 0.88, 0, pool);
for (const [x, z] of [
  [-0.62, 0],
  [0.62, 0],
])
  put(box(0.1, 0.08, 2.4, M.mahogTop), x, 0.91, z, pool);
for (const z of [-1.2, 1.2]) put(box(1.34, 0.08, 0.1, M.mahogTop), 0, 0.91, z, pool);
[0xf2f2e8, 0xe8c020, 0x2040b0, 0xc02020, 0x602080, 0xe06020, 0x206030, 0x202020].forEach((c, i) =>
  put(sph(0.045, toon(c), 8), rand(-0.45, 0.45), 0.94, i === 0 ? 0.8 : rand(-0.9, 0.2), pool),
);
put(cyl(0.012, 0.02, 1.4, toon(0xc8a46a), 5), 0.3, 0.95, 0.5, pool).rotation.set(Math.PI / 2, 0, 0.4);
const poolLamp = put(box(0.4, 0.12, 1.4, M.green), -5.0, 2.35, 0.2);
put(cyl(0.01, 0.01, 1.0, M.black, 4), -5.0, 2.9, 0.2);
const poolLight = new THREE.PointLight(0xffe0a0, 0.5, 3.5, 1);
poolLight.position.set(-5, 2.0, 0.2);
scene.add(poolLight);
