import * as THREE from 'three';
import { scene } from './renderer.ts';
import { toon } from './materials.ts';

// Shorthand mesh builders (box, cylinder, sphere, plane) and placement.
export function box(w: number, h: number, d: number, m: THREE.Material) {
  return new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
}
export function cyl(rt: number, rb: number, h: number, m: THREE.Material, s = 12, open = false) {
  return new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, s, 1, open), m);
}
export function sph(r: number, m: THREE.Material, s = 12) {
  return new THREE.Mesh(new THREE.SphereGeometry(r, s, Math.max(6, (s * 0.6) | 0)), m);
}
/** Positions o and adds it to p (default: the scene). */
export function put<T extends THREE.Object3D>(o: T, x: number, y: number, z: number, p?: THREE.Object3D): T {
  o.position.set(x, y, z);
  (p || scene).add(o);
  return o;
}
export const plane = (w: number, h: number, tex: THREE.Texture, basic?: { transparent?: boolean }) =>
  new THREE.Mesh(
    new THREE.PlaneGeometry(w, h),
    basic ? new THREE.MeshBasicMaterial({ map: tex, transparent: !!basic.transparent }) : toon(0xffffff, { map: tex }),
  );
