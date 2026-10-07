import * as THREE from 'three';
import { V3 } from '../core/util.js';
import { scene } from './renderer.js';

/* dithered wall fade: walls between camera and bar dissolve in a 4x4 Bayer pattern */
function fadeClone(mat, uni) {
  const m = mat.clone();
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uFade = uni;
    sh.fragmentShader =
      'uniform float uFade;\nfloat bay2(vec2 a){a=floor(a);return fract(a.x/2.+a.y*a.y*.75);}\nfloat bay4(vec2 a){return bay2(.5*a)*.25+bay2(a);}\n' +
      sh.fragmentShader.replace('void main() {', 'void main() {\n\tif(bay4(gl_FragCoord.xy)<uFade) discard;');
  };
  return m;
}
export const walls = [];
export function makeWall(nx, nz) {
  const g = new THREE.Group();
  scene.add(g);
  const w = { g, n: new V3(nx, 0, nz), uni: { value: 0 }, fade: 0 };
  walls.push(w);
  return w;
}
export function finalizeWall(w) {
  const cache = new Map();
  w.g.traverse((o) => {
    if (o.material) {
      if (!cache.has(o.material)) cache.set(o.material, fadeClone(o.material, w.uni));
      o.material = cache.get(o.material);
    }
  });
}
