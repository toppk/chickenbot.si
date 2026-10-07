import { state } from '../core/state.js';
import { V3, clamp, reduce } from '../core/util.js';
import { camera, canvas } from './renderer.js';
import { walls } from './wall-fade.js';
import { floor } from '../scene/room.js';
import { ceiling, fan } from '../scene/ceiling.js';
import { hen } from '../scene/hen-model.js';
import { say } from '../ui/bubbles.js';
import { send } from '../brain/link.js';
import { VH, VW } from './post.js';
import { debugShown, setDebug } from '../ui/debug/panels.js';

// Orbit camera, wall fading, and the mouse/touch/keyboard controls.
export const PITCH_MIN = -70,
  PITCH_MAX = 85;
let seenCeiling = false;
export const CAM = { yaw: 38, pitch: 36, zoom: 4.9 },
  TGT = new V3(0, 0.9, 0);
export function updateCam(dt) {
  const under = CAM.pitch < 2;
  ceiling.visible = under;
  floor.visible = !under;
  fan.rotation.y += dt * 2.2;
  if (CAM.pitch < -12 && !seenCeiling) {
    seenCeiling = true;
    setTimeout(() => say(hen, '...are you under the floor?', 3.2), 300);
    send({ type: 'event', event: 'easter', what: 'ceiling' });
  }
  state.idleT += dt;
  if (state.autoOrbit && !reduce && state.idleT > 8 && !drag) CAM.yaw += dt * 3;
  const asp = VW / VH,
    hh = Math.max(CAM.zoom, 5.4 / asp);
  camera.left = -hh * asp;
  camera.right = hh * asp;
  camera.top = hh;
  camera.bottom = -hh;
  camera.updateProjectionMatrix();
  const y = (CAM.yaw * Math.PI) / 180,
    p = (CAM.pitch * Math.PI) / 180;
  camera.position.set(
    TGT.x + Math.sin(y) * Math.cos(p) * 45,
    TGT.y + Math.sin(p) * 45,
    TGT.z + Math.cos(y) * Math.cos(p) * 45,
  );
  camera.lookAt(TGT);
  const cx = Math.sin(y),
    cz = Math.cos(y);
  for (const w of walls) {
    const tgt = w.n.x * cx + w.n.z * cz > 0.22 ? 1 : 0;
    w.fade += (tgt - w.fade) * Math.min(1, dt * 5);
    if (Math.abs(w.fade - tgt) < 0.01) w.fade = tgt;
    w.uni.value = w.fade;
    w.g.visible = w.fade < 0.995;
  }
}
let drag = null;
const hint = document.getElementById('hint');
const pointers = new Map();
let pinch0 = 0,
  zoom0 = 0;
canvas.addEventListener('pointerdown', (e) => {
  pointers.set(e.pointerId, e);
  canvas.setPointerCapture(e.pointerId);
  hint.classList.add('gone');
  if (pointers.size === 2) {
    const [a, b] = [...pointers.values()];
    pinch0 = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
    zoom0 = CAM.zoom;
    drag = null;
  } else {
    state.idleT = 0;
    drag = { x: e.clientX, y: e.clientY, yaw: CAM.yaw, pitch: CAM.pitch };
    canvas.classList.add('dragging');
  }
});
canvas.addEventListener('pointermove', (e) => {
  if (!pointers.has(e.pointerId)) return;
  pointers.set(e.pointerId, e);
  if (pointers.size === 2 && pinch0) {
    const [a, b] = [...pointers.values()];
    const d = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
    CAM.zoom = clamp((zoom0 * pinch0) / d, 2.5, 9);
    return;
  }
  if (!drag) return;
  state.idleT = 0;
  CAM.yaw = drag.yaw - (e.clientX - drag.x) * 0.3;
  CAM.pitch = clamp(drag.pitch + (e.clientY - drag.y) * 0.2, PITCH_MIN, PITCH_MAX);
});
const endP = (e) => {
  pointers.delete(e.pointerId);
  if (pointers.size < 2) pinch0 = 0;
  if (!pointers.size) {
    drag = null;
    canvas.classList.remove('dragging');
  }
};
canvas.addEventListener('pointerup', endP);
canvas.addEventListener('pointercancel', endP);
canvas.addEventListener(
  'wheel',
  (e) => {
    e.preventDefault();
    CAM.zoom = clamp(CAM.zoom * Math.exp(e.deltaY * 0.001), 2.5, 9);
  },
  { passive: false },
);
addEventListener('keydown', (e) => {
  if (e.target.tagName === 'INPUT') return;
  if (e.key === '`') {
    setDebug(!debugShown);
    return;
  }
  if (e.key === 'ArrowLeft') {
    CAM.yaw += 6;
    state.idleT = 0;
  }
  if (e.key === 'ArrowRight') {
    CAM.yaw -= 6;
    state.idleT = 0;
  }
});
