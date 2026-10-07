import * as THREE from 'three';
import './three-compat.ts';
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
