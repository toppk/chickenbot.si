import * as THREE from 'three';
import './three-compat.ts';
import { state } from '../core/state.ts';
import { byId } from '../core/dom.ts';

// WebGL renderer, scene and orthographic camera shared by everything.
export const stage = byId('stage'),
  canvas = byId<HTMLCanvasElement>('view');
export const renderer = new THREE.WebGLRenderer({ canvas, antialias: false });
renderer.setPixelRatio(1);
renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
export const scene = new THREE.Scene(),
  BG = 0x120b07;
export const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 100);
camera.layers.enable(1);

/** Stops the stage widening past state.maxAspect; the extra width becomes the page's dark frame. */
export function applyStageCap() {
  stage.style.maxWidth = state.maxAspect ? `${Math.round(state.maxAspect * stage.clientHeight)}px` : '';
}
window.addEventListener('resize', applyStageCap);
// ?ideal=1.6&cap=1.6 set the framing from the URL (0 = off), for comparing settings side by side
{
  const q = new URLSearchParams(location.search);
  for (const [key, field] of [
    ['ideal', 'idealAspect'],
    ['cap', 'maxAspect'],
  ] as const) {
    const v = Number(q.get(key) ?? Number.NaN);
    if (Number.isFinite(v) && v >= 0) state[field] = v;
  }
  applyStageCap();
}
