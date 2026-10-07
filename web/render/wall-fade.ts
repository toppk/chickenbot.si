import * as THREE from 'three';
import { V3 } from '../core/util.ts';
import { scene } from './renderer.ts';

/* dithered wall fade: walls between camera and bar dissolve in a 4x4 Bayer pattern */
export interface Wall {
  g: THREE.Group;
  /** outward normal: the wall fades when the camera looks at it from outside */
  n: THREE.Vector3;
  uni: { value: number };
  fade: number;
}
function fadeClone(mat: THREE.Material, uni: { value: number }) {
  const m = mat.clone();
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uFade = uni;
    sh.fragmentShader =
      'uniform float uFade;\nfloat bay2(vec2 a){a=floor(a);return fract(a.x/2.+a.y*a.y*.75);}\nfloat bay4(vec2 a){return bay2(.5*a)*.25+bay2(a);}\n' +
      sh.fragmentShader.replace('void main() {', 'void main() {\n\tif(bay4(gl_FragCoord.xy)<uFade) discard;');
  };
  return m;
}
export const walls: Wall[] = [];
export function makeWall(nx: number, nz: number): Wall {
  const g = new THREE.Group();
  scene.add(g);
  const w = { g, n: new V3(nx, 0, nz), uni: { value: 0 }, fade: 0 };
  walls.push(w);
  return w;
}
export function finalizeWall(w: Wall) {
  const cache = new Map<THREE.Material, THREE.Material>();
  w.g.traverse((o) => {
    if (o instanceof THREE.Mesh) {
      const mat = o.material as THREE.Material;
      if (!cache.has(mat)) cache.set(mat, fadeClone(mat, w.uni));
      o.material = cache.get(mat)!;
    }
  });
}
