import * as THREE from 'three';
import { TAU, rand } from '../core/util.js';
import { scene } from '../render/renderer.js';
import { M, ctex, toon } from '../render/materials.js';
import { box, cyl, put } from '../render/mesh.js';
import { ROOM, WALL_H } from './layout.js';

// The ceiling, only shown when you drag the camera below the floor.
export const ceiling = new THREE.Group();
scene.add(ceiling);
ceiling.visible = false;
const tinTex = ctex(
  16,
  16,
  (g) => {
    g.fillStyle = '#a8925e';
    g.fillRect(0, 0, 16, 16);
    g.fillStyle = '#c4ad74';
    g.fillRect(2, 2, 12, 1);
    g.fillRect(2, 2, 1, 12);
    g.fillStyle = '#7a6640';
    g.fillRect(2, 13, 12, 1);
    g.fillRect(13, 2, 1, 12);
    g.fillStyle = '#c4ad74';
    g.fillRect(6, 5, 4, 1);
    g.fillRect(5, 6, 1, 4);
    g.fillStyle = '#7a6640';
    g.fillRect(6, 10, 4, 1);
    g.fillRect(10, 6, 1, 4);
    g.fillStyle = '#8e7a4c';
    g.fillRect(7, 7, 2, 2);
  },
  [30, 30],
);
{
  const c = new THREE.Mesh(new THREE.PlaneGeometry(2 * ROOM, 2 * ROOM), toon(0xffffff, { map: tinTex }));
  c.rotation.x = Math.PI / 2;
  put(c, 0, WALL_H, 0, ceiling);
}
const decal = (w, h, tex, x, z, rot) => {
  const m = new THREE.Mesh(
    new THREE.PlaneGeometry(w, h),
    new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false }),
  );
  m.rotation.set(Math.PI / 2, 0, rot || 0);
  m.layers.set(1);
  put(m, x, WALL_H - 0.01, z, ceiling);
  return m;
};
// a water stain
decal(
  1.6,
  1.2,
  ctex(32, 24, (g) => {
    for (let i = 0; i < 70; i++) {
      const a = rand(0, TAU),
        r = Math.sqrt(Math.random()) * 10;
      g.fillStyle = `rgba(90,60,30,${rand(0.15, 0.35)})`;
      g.fillRect((16 + Math.cos(a) * r * 1.3) | 0, (12 + Math.sin(a) * r) | 0, 2, 2);
    }
  }),
  -3.2,
  3.6,
  0.4,
);
// chicken footprints walking across the ceiling
decal(
  5.5,
  1.4,
  ctex(110, 28, (g) => {
    g.fillStyle = 'rgba(40,24,12,0.8)';
    for (let i = 0; i < 9; i++) {
      const x = 6 + i * 12,
        y = i % 2 ? 8 : 18;
      g.fillRect(x, y, 1, 4);
      g.fillRect(x - 2, y - 2, 1, 2);
      g.fillRect(x, y - 3, 1, 3);
      g.fillRect(x + 2, y - 2, 1, 2);
      g.fillRect(x, y + 4, 1, 1);
    }
  }),
  1.8,
  -3.4,
  -0.35,
);
// marker scrawl over Otis's stool
const scrawl = decal(
  1.6,
  0.4,
  ctex(64, 16, (g) => {
    g.font = '14px VT323, monospace';
    g.textBaseline = 'middle';
    g.fillStyle = '#2a140a';
    g.fillText('OTIS OWES $40', 3, 8);
  }),
  Math.cos((7 / 12) * TAU) * 3.2,
  Math.sin((7 / 12) * TAU) * 3.2,
  (7 / 12) * TAU + Math.PI / 2,
);
// a dart that missed the board by a lot
{
  const d = put(new THREE.Group(), 5.6, WALL_H, -2.4, ceiling);
  put(cyl(0.008, 0.008, 0.14, M.steel, 4), 0, -0.07, 0, d);
  put(cyl(0.014, 0.014, 0.08, M.brass, 6), 0, -0.16, 0, d);
  const fl = put(box(0.06, 0.06, 0.005, toon(0xb02a20)), 0, -0.22, 0, d);
  put(box(0.005, 0.06, 0.06, toon(0xb02a20)), 0, -0.22, 0, d);
  d.rotation.z = 0.25;
}
// ceiling fan over the bar
export const fan = put(new THREE.Group(), 3.7, WALL_H - 0.25, 3.3, ceiling);
put(cyl(0.02, 0.02, 0.25, M.brass, 6), 0, 0.12, 0, fan);
put(cyl(0.12, 0.1, 0.1, M.brass, 10), 0, 0, 0, fan);
for (let i = 0; i < 4; i++) {
  const b = put(new THREE.Group(), 0, -0.02, 0, fan);
  b.rotation.y = (i * Math.PI) / 2;
  put(box(0.95, 0.02, 0.2, M.mahog), 0.55, 0, 0, b);
}
