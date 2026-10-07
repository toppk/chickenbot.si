import * as THREE from 'three';
import { TAU, V3, _v, clamp, rand } from '../core/util.js';
import { scene } from '../render/renderer.js';
import { GLASS, M, toon } from '../render/materials.js';
import { box, cyl, put } from '../render/mesh.js';
import { K, addPuddle, emit, hexRGB } from './particles.js';
import { DRINKS, DRINK_KEYS } from '../sim/drinks.js';
import { send } from '../brain/link.js';
import { sfxClink, sfxShatter } from '../audio/sfx.js';

// Glass models, their fill level, and how they move (lifted, held, carried, dropped).
const liqMats = {},
  headMats = {};
for (const k of DRINK_KEYS) {
  const d = DRINKS[k];
  liqMats[k] = toon(d.liq, { emissive: d.liq, emissiveIntensity: 0.18 });
  if (d.head) headMats[k] = toon(d.head, { emissive: 0x302818 });
}
export const glasses = [];
export function buildGlass(type) {
  const d = DRINKS[type],
    g = new THREE.Group();
  scene.add(g);
  let lg,
    hm = null;
  if (type === 'lager') {
    const b = cyl(0.12, 0.11, 0.3, GLASS, 10, true);
    b.position.y = 0.15;
    g.add(b);
    put(cyl(0.11, 0.11, 0.035, M.glassThick, 10), 0, 0.018, 0, g);
    const h = new THREE.Mesh(new THREE.TorusGeometry(0.075, 0.022, 4, 8, Math.PI), M.glassThick);
    h.rotation.z = -Math.PI / 2;
    put(h, 0.12, 0.15, 0, g);
    lg = new THREE.CylinderGeometry(0.104, 0.097, 1, 10);
  } else if (type === 'stout') {
    const b = cyl(0.105, 0.085, 0.3, GLASS, 10, true);
    b.position.y = 0.15;
    g.add(b);
    put(cyl(0.085, 0.085, 0.03, M.glassThick, 10), 0, 0.015, 0, g);
    lg = new THREE.CylinderGeometry(0.098, 0.08, 1, 10);
  } else if (type === 'wine') {
    put(cyl(0.07, 0.07, 0.012, M.glassThick, 10), 0, 0.006, 0, g);
    put(cyl(0.012, 0.012, 0.13, M.glassThick, 5), 0, 0.075, 0, g);
    const b = cyl(0.075, 0.05, 0.13, GLASS, 10, true);
    b.position.y = 0.2;
    g.add(b);
    lg = new THREE.CylinderGeometry(0.068, 0.05, 1, 10);
  } else {
    const b = cyl(0.085, 0.08, 0.11, GLASS, 10, true);
    b.position.y = 0.055;
    g.add(b);
    put(cyl(0.08, 0.08, 0.02, M.glassThick, 10), 0, 0.01, 0, g);
    lg = new THREE.CylinderGeometry(0.078, 0.075, 1, 10);
    for (const [x, z] of [
      [-0.02, 0.01],
      [0.025, -0.015],
    ])
      put(box(0.04, 0.04, 0.04, toon(0xe8f6f8)), x, 0.06, z, g).rotation.y = rand(0, 1);
  }
  lg.translate(0, 0.5, 0);
  const liquid = put(new THREE.Mesh(lg, liqMats[type]), 0, d.y0, 0, g);
  if (d.head) hm = put(cyl(0.11, 0.105, d.headH, headMats[type], 10), 0, 0, 0, g);
  const gl = {
    g,
    type,
    liquid,
    head: hm,
    state: 'well',
    pos: new V3(),
    fill: 0,
    owner: null,
    t: 0,
    from: new V3(),
    to: new V3(),
    blend: 0,
    rest: new V3(),
    tilt: 0,
    vel: new V3(),
    dead: false,
    id: 'g' + Math.random().toString(36).slice(2, 7),
  };
  glasses.push(gl);
  setFill(gl);
  return gl;
}
function setFill(gl) {
  const d = DRINKS[gl.type],
    f = clamp(gl.fill, 0, 1),
    h = Math.max(0.001, f * d.h);
  gl.liquid.scale.y = h;
  gl.liquid.visible = f > 0.02;
  if (gl.head) {
    gl.head.visible = f > 0.05;
    gl.head.position.y = d.y0 + h + d.headH / 2;
  }
}
export function liquidTop(gl) {
  const d = DRINKS[gl.type];
  return gl.pos.y + d.y0 + clamp(gl.fill, 0, 1) * d.h;
}
function killGlass(gl) {
  gl.dead = true;
  scene.remove(gl.g);
  gl.g.traverse((o) => {
    if (o.geometry) o.geometry.dispose();
  });
  const i = glasses.indexOf(gl);
  if (i >= 0) glasses.splice(i, 1);
}
function shatter(gl) {
  sfxShatter();
  const x = gl.pos.x,
    z = gl.pos.z,
    f = clamp(gl.fill, 0, 1),
    col = hexRGB(DRINKS[gl.type].liq),
    gc = hexRGB(0xc8eef0);
  for (let i = 0; i < 16; i++)
    emit(K.SHARD, gc, x, 0.08, z, rand(-1.5, 1.5), rand(0.6, 2.4), rand(-1.5, 1.5), rand(2.5, 4.5), 0.01);
  for (let i = 0; i < 60 * f + 4; i++) {
    const a = rand(0, TAU),
      s = rand(0.3, 2.2);
    emit(K.LIQ, col, x, 0.1, z, Math.cos(a) * s, rand(0.6, 2.8) * (0.5 + f), Math.sin(a) * s, 2, 0.005);
  }
  addPuddle(x, 0, z, 0.25 + 0.5 * f, DRINKS[gl.type].liq);
  killGlass(gl);
  send({ type: 'event', event: 'spill', drink: gl.type });
}
export function updateGlasses(dt) {
  for (const gl of [...glasses]) {
    switch (gl.state) {
      case 'lift': {
        gl.t += dt / 0.4;
        const t = Math.min(1, gl.t);
        gl.pos.lerpVectors(gl.from, gl.to, t);
        gl.pos.y += Math.sin(Math.PI * t) * 0.22;
        if (t >= 1) {
          if (gl.next !== 'fall') sfxClink();
          gl.state = gl.next || 'bar';
          if (gl.onLand) {
            const f = gl.onLand;
            gl.onLand = null;
            f(gl);
          }
        }
        break;
      }
      case 'fall': {
        gl.vel.y -= 9.8 * dt;
        gl.pos.addScaledVector(gl.vel, dt);
        gl.g.rotation.x += 5 * dt;
        gl.g.rotation.z += 3 * dt;
        if (gl.fill > 0.05 && Math.random() < 0.5)
          emit(
            K.LIQ,
            hexRGB(DRINKS[gl.type].liq),
            gl.pos.x,
            gl.pos.y + 0.1,
            gl.pos.z,
            rand(-0.3, 0.3),
            rand(-0.1, 0.4),
            rand(-0.3, 0.3),
            1.4,
            0.005,
          );
        if (gl.pos.y <= 0.03) {
          shatter(gl);
          continue;
        }
        break;
      }
      case 'hand': {
        const o = gl.owner;
        if (o) {
          o.arms[0].hand.getWorldPosition(_v);
          gl.blend = Math.min(1, gl.blend + dt / 0.3);
          gl.pos.lerpVectors(gl.rest, _v, gl.blend);
        }
        break;
      }
      case 'return': {
        gl.blend = Math.max(0, gl.blend - dt / 0.3);
        const o = gl.owner;
        if (o) o.arms[0].hand.getWorldPosition(_v);
        gl.pos.lerpVectors(gl.rest, _v, gl.blend);
        if (gl.blend <= 0) gl.state = gl.restState || 'bar';
        break;
      }
      case 'tray': {
        const o = gl.owner;
        if (o) {
          o.trayObj.localToWorld(_v.copy(gl.trayOff));
          gl.pos.copy(_v);
        }
        break;
      }
      case 'bus': {
        gl.t -= dt;
        gl.g.scale.setScalar(Math.max(0.01, gl.t / 0.3));
        gl.pos.y += dt * 0.4;
        if (gl.t <= 0) {
          killGlass(gl);
          continue;
        }
        break;
      }
    }
    gl.g.position.copy(gl.pos);
    if (gl.state === 'hand' || gl.state === 'return') {
      gl.g.rotation.set(0, 0, 0);
      gl.g.rotateY(gl.owner ? gl.owner.heading : 0);
      gl.g.rotateX(-gl.tilt * gl.blend);
    } else if (gl.state !== 'fall') gl.g.rotation.set(0, 0, 0);
    setFill(gl);
  }
}
