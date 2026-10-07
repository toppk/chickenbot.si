import * as THREE from 'three';
import { V3, clamp } from '../core/util.js';
import { scene } from '../render/renderer.js';
import { M, toon } from '../render/materials.js';
import { box, cyl, put, sph } from '../render/mesh.js';

// Chickenbot's model, its joints, and the leg IK used for walking.
export let JOINTS = 0;
const jnt = (p) => {
  const j = new THREE.Group();
  p.add(j);
  JOINTS++;
  return j;
};
export const L1 = 0.22,
  L2 = 0.25,
  ANK = 0.03,
  HIP = 0.45;
export const hen = {
  angle: Math.PI * 0.75,
  targetAngle: Math.PI * 0.75,
  state: 'idle',
  task: null,
  t: 0,
  heading: 0,
  phase: 0,
  speed: 0,
  mood: 'content',
  moodI: 0.5,
  look: { yaw: 0, pitch: 0, ty: 0, tp: 0, t: 0 },
  talkT: 0,
  emote: null,
  emoteT: 0,
  pours: 0,
  auto: true,
  forced: null,
  spin: 0,
};
(function buildHen() {
  const root = new THREE.Group();
  scene.add(root);
  root.scale.setScalar(1.3);
  hen.root = root;
  const pelvis = jnt(root);
  hen.pelvis = pelvis;
  const body = jnt(pelvis);
  body.position.y = 0.2;
  body.rotation.x = -0.25;
  hen.body = body;
  put(sph(0.23, M.shell, 16), 0, 0, 0, body).scale.set(1, 0.88, 1.25);
  const band = new THREE.Mesh(new THREE.TorusGeometry(0.212, 0.018, 4, 20), M.copper);
  band.rotation.y = Math.PI / 2;
  put(band, 0, 0, 0, body);
  put(sph(0.17, M.shell, 12), 0, 0.06, 0.2, body).scale.set(1, 1.1, 0.8);
  for (let i = -1; i <= 1; i++) {
    const p = put(new THREE.Group(), 0, 0.08, -0.26, body);
    p.rotation.set(-0.8, 0, i * 0.32);
    put(box(0.02, 0.3, 0.08, i ? M.copper : toon(0x8a4a2a)), 0, 0.15, 0, p);
  }
  const neck = jnt(body);
  neck.position.set(0, 0.16, 0.24);
  neck.rotation.x = 0.25;
  hen.neck = neck;
  put(cyl(0.06, 0.08, 0.26, M.shell, 10), 0, 0.13, 0, neck);
  const tie = put(new THREE.Group(), 0, 0.04, 0.08, neck);
  put(box(0.07, 0.05, 0.03, M.tie), -0.04, 0, 0, tie).rotation.z = 0.3;
  put(box(0.07, 0.05, 0.03, M.tie), 0.04, 0, 0, tie).rotation.z = -0.3;
  put(box(0.03, 0.03, 0.035, M.tie), 0, 0, 0, tie);
  const head = jnt(neck);
  head.position.y = 0.27;
  hen.head = head;
  put(sph(0.115, M.shell, 12), 0, 0, 0, head).scale.set(0.9, 1, 1.12);
  hen.combMat = toon(0xd8302a, { emissive: 0x300000 });
  for (const [y, z] of [
    [0.105, -0.045],
    [0.125, 0.015],
    [0.11, 0.07],
  ])
    put(sph(0.045, hen.combMat, 8), 0, y, z, head).scale.set(0.6, 1.1, 1);
  const bk = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.11, 6), M.beak);
  bk.rotation.x = Math.PI / 2;
  put(bk, 0, -0.01, 0.155, head);
  put(sph(0.035, hen.combMat, 8), 0, -0.08, 0.1, head).scale.set(0.7, 1.4, 0.8);
  hen.lids = [];
  for (const s of [-1, 1]) {
    put(box(0.014, 0.03, 0.03, M.black), s * 0.104, 0.025, 0.05, head);
    const lid = put(box(0.02, 0.036, 0.036, M.shell), s * 0.106, 0.045, 0.05, head);
    lid.scale.y = 0.01;
    hen.lids.push(lid);
  }
  hen.wings = {};
  hen.grip = {};
  for (const s of [-1, 1]) {
    const w = jnt(body);
    w.position.set(s * 0.21, 0.05, 0.04);
    put(sph(0.1, M.shell, 10), 0, -0.02, -0.06, w).scale.set(0.42, 0.9, 1.8);
    put(box(0.05, 0.05, 0.07, M.copper), 0, -0.07, 0.09, w);
    hen.grip[s] = put(new THREE.Group(), 0, -0.1, 0.12, w);
    hen.wings[s] = w;
  }
  const towel = put(box(0.012, 0.16, 0.12, toon(0xe8e0cc)), 0.235, -0.06, -0.02, body);
  put(box(0.013, 0.02, 0.122, toon(0x9a2a1a)), 0, 0.05, 0, towel);
  hen.legs = [];
  for (const s of [-1, 1]) {
    const roll = jnt(pelvis);
    roll.position.x = s * 0.09;
    const hip = jnt(roll);
    put(sph(0.07, M.shell, 8), 0, -0.02, 0, hip).scale.set(1, 1.3, 1.1);
    put(box(0.04, L1, 0.04, M.beak), 0, -L1 / 2, 0, hip);
    const knee = jnt(hip);
    knee.position.y = -L1;
    put(box(0.04, L2, 0.04, M.beak), 0, -L2 / 2, 0, knee);
    const ankle = jnt(knee);
    ankle.position.y = -L2;
    for (const a of [-0.45, 0, 0.45]) {
      const p = put(new THREE.Group(), 0, 0, 0, ankle);
      p.rotation.y = a;
      put(box(0.026, 0.022, 0.15, M.beak), 0, -0.018, 0.075, p);
    }
    put(box(0.024, 0.02, 0.07, M.beak), 0, -0.018, -0.04, ankle);
    hen.legs.push({ roll, hip, knee, ankle });
  }
  // pour vessels held in the left gripper
  const g = hen.grip[-1];
  hen.vessels = {};
  const pitcher = put(new THREE.Group(), 0, 0, 0, g);
  put(cyl(0.07, 0.08, 0.2, M.brass, 10), 0, 0.1, 0, pitcher);
  put(box(0.04, 0.04, 0.06, M.brass), 0, 0.19, 0.08, pitcher);
  pitcher.userData.spout = new V3(0, 0.2, 0.11);
  const wine = put(new THREE.Group(), 0, 0, 0, g);
  put(cyl(0.045, 0.045, 0.2, toon(0x1e3a22), 8), 0, 0.1, 0, wine);
  put(cyl(0.016, 0.022, 0.1, toon(0x1e3a22), 6), 0, 0.25, 0, wine);
  wine.userData.spout = new V3(0, 0.3, 0);
  const whis = put(new THREE.Group(), 0, 0, 0, g);
  put(box(0.08, 0.17, 0.06, toon(0x8a4a14, { emissive: 0x1a0800 })), 0, 0.09, 0, whis);
  put(cyl(0.015, 0.02, 0.08, toon(0x8a4a14), 6), 0, 0.22, 0, whis);
  whis.userData.spout = new V3(0, 0.26, 0);
  hen.vessels = { lager: pitcher, stout: pitcher, wine, whiskey: whis };
  for (const v of [pitcher, wine, whis]) v.visible = false;
})();
export function legIK(leg, p, stride, lift, hipY) {
  let z, y;
  if (p < 0.5) {
    const t = p / 0.5;
    z = stride / 2 - stride * t;
    y = 0;
  } else {
    const t = (p - 0.5) / 0.5,
      s = t * t * (3 - 2 * t);
    z = -stride / 2 + stride * s;
    y = lift * Math.sin(Math.PI * t);
  }
  const dz = z,
    dy = y + ANK - hipY;
  let d = Math.min(Math.hypot(dz, dy), L1 + L2 - 1e-4);
  const a = Math.atan2(dz, -dy),
    b = Math.acos(clamp((L1 * L1 + d * d - L2 * L2) / (2 * L1 * d), -1, 1));
  const th1 = a - b,
    kz = L1 * Math.sin(th1),
    ky = -L1 * Math.cos(th1),
    th2 = Math.atan2(dz - kz, -(dy - ky));
  leg.hip.rotation.x = -th1;
  leg.knee.rotation.x = -(th2 - th1);
  leg.ankle.rotation.x = th2;
}
