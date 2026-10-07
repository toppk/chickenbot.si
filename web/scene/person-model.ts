import * as THREE from 'three';
import { V3, rand } from '../core/util.ts';
import { scene } from '../render/renderer.ts';
import { M, toon } from '../render/materials.ts';
import { box, cyl, put } from '../render/mesh.ts';
import type { Person, PersonSpec } from '../core/model.ts';

// Blocky people: building and removing patron and waitress models.
export const JACKETS = [0x5a2a2a, 0x2f4a6a, 0x4a5a2f, 0x5a3a6a, 0x7a5a2a, 0x3a3a3a, 0x2f5a52, 0x6a4030],
  SKINS = [0xe0b48a, 0xb97e55, 0x7a4e32, 0xf0c9a0, 0x9a6a48],
  PANTS = [0x2b2b33, 0x3d2f22, 0x2a3a2a, 0x4a3a2a, 0x24304a],
  HAIR = [0x2a1a10, 0x5a3a1a, 0x8a6a3a, 0x1a1a1a, 0xa0a0a0, 0x7a2a10];
export const people: Person[] = [];
let nextId = 1;
export function buildPerson(o: PersonSpec): Person {
  const root = new THREE.Group();
  scene.add(root);
  const mJ = toon(o.jacket),
    mS = toon(o.skin),
    mP = toon(o.pants);
  const hips = put(new THREE.Group(), 0, 0.78, 0, root),
    legs: Person['legs'] = [];
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
  const arms: Person['arms'] = [];
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
  let trayObj: THREE.Group | null = null;
  if (o.tray) {
    trayObj = put(new THREE.Group(), 0, 0, 0, arms[1].hand);
    put(cyl(0.22, 0.22, 0.02, M.tray, 14), 0, 0.03, 0.1, trayObj);
    trayObj.visible = false;
  }
  const base: Omit<Person, keyof PersonSpec> = {
    id: `p${nextId++}`,
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
  };
  const p: Person = Object.assign(base, o);
  people.push(p);
  return p;
}
export function removePerson(p: Person) {
  scene.remove(p.root);
  p.root.traverse((x) => {
    if (x instanceof THREE.Mesh) x.geometry.dispose();
  });
  const i = people.indexOf(p);
  if (i >= 0) people.splice(i, 1);
}
