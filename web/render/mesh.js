import * as THREE from 'three';
import { scene } from './renderer.js';
import { toon } from './materials.js';

// Shorthand mesh builders (box, cylinder, sphere, plane) and placement.
export function box(w, h, d, m) {
  return new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
}
export function cyl(rt, rb, h, m, s = 12, open = false) {
  return new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, s, 1, open), m);
}
export function sph(r, m, s = 12) {
  return new THREE.Mesh(new THREE.SphereGeometry(r, s, Math.max(6, (s * 0.6) | 0)), m);
}
export function put(o, x, y, z, p) {
  o.position.set(x, y, z);
  (p || scene).add(o);
  return o;
}
export const plane = (w, h, tex, basic) =>
  new THREE.Mesh(
    new THREE.PlaneGeometry(w, h),
    basic ? new THREE.MeshBasicMaterial({ map: tex, transparent: !!basic.transparent }) : toon(0xffffff, { map: tex }),
  );
