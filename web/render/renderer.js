import * as THREE from 'three';

// WebGL renderer, scene and orthographic camera shared by everything.
export const stage = document.getElementById('stage'),
  canvas = document.getElementById('view');
export const renderer = new THREE.WebGLRenderer({ canvas, antialias: false });
renderer.setPixelRatio(1);
export const scene = new THREE.Scene(),
  BG = 0x120b07;
export const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 100);
camera.layers.enable(1);
