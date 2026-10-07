import { state } from '../core/state.ts';
import { V3, clamp, reduce } from '../core/util.ts';
import { applyStageCap, camera, canvas } from './renderer.ts';
import { walls } from './wall-fade.ts';
import { floor } from '../scene/room.ts';
import { ceiling, fan } from '../scene/ceiling.ts';
import { hen } from '../scene/hen-model.ts';
import { say } from '../ui/bubbles.ts';
import { send } from '../brain/link.ts';
import { RH, SCALE, VH, VW, resize } from './post.ts';
import { GLASS } from './materials.ts';
import { debugShown, setDebug } from '../ui/debug/panels.ts';
import { byId } from '../core/dom.ts';
import { HEN } from '../content/dialogue.ts';

// Orbit camera, wall fading, and the mouse/touch/keyboard controls.
export const PITCH_MIN = -70,
  PITCH_MAX = 85;
let seenCeiling = false;
export const CAM = { yaw: 38, pitch: 36, zoom: 4.9 },
  TGT = new V3(0, 0.9, 0);
// ?cam=yaw,pitch,zoom pins the starting view and stops auto-orbit, for comparing renders
{
  const v = new URLSearchParams(location.search).get('cam')?.split(',').map(Number);
  if (v?.length === 3 && v.every(Number.isFinite)) {
    [CAM.yaw, CAM.pitch, CAM.zoom] = v;
    state.autoOrbit = false;
  }
}
const START = {
  ...CAM,
  autoOrbit: state.autoOrbit,
  idealAspect: state.idealAspect,
  maxAspect: state.maxAspect,
  artRows: state.artRows,
  glassOpacity: state.glassOpacity,
};
/** Puts back everything viewSettings() reports, as the page loaded (including URL parameters). */
export function resetView() {
  CAM.yaw = START.yaw;
  CAM.pitch = START.pitch;
  CAM.zoom = START.zoom;
  state.autoOrbit = START.autoOrbit;
  state.idealAspect = START.idealAspect;
  state.maxAspect = START.maxAspect;
  state.artRows = START.artRows;
  state.glassOpacity = GLASS.opacity = START.glassOpacity;
  applyStageCap();
  resize();
  state.idleT = 0;
}
/** The current view as URL parameters, plus the stage it was tuned on. */
export function viewSettings() {
  const yaw = ((CAM.yaw % 360) + 360) % 360,
    dpr = window.devicePixelRatio || 1;
  return (
    `?cam=${yaw.toFixed(1)},${CAM.pitch.toFixed(1)},${CAM.zoom.toFixed(2)}` +
    `&ideal=${state.idealAspect}&cap=${state.maxAspect}&rows=${state.artRows}&glass=${state.glassOpacity}` +
    `   (stage ${VW}x${VH} @${dpr}x, aspect ${(VW / VH).toFixed(2)}, ${SCALE}x, ${RH} rows)`
  );
}
export function updateCam(dt: number) {
  const under = CAM.pitch < 2;
  ceiling.visible = under;
  floor.visible = !under;
  fan.rotation.y += dt * 2.2;
  if (CAM.pitch < -12 && !seenCeiling) {
    seenCeiling = true;
    setTimeout(() => say(hen, HEN.underTheFloor, 3.2), 300);
    send({ type: 'event', event: 'easter', what: 'ceiling' });
  }
  state.idleT += dt;
  if (state.autoOrbit && !reduce && state.idleT > 8 && !drag) CAM.yaw += dt * 3;
  const asp = VW / VH;
  // show as much room as an idealAspect stage would at this zoom: wide windows zoom in, tall ones out
  let hh = state.idealAspect ? CAM.zoom * Math.sqrt(state.idealAspect / asp) : CAM.zoom;
  hh = Math.max(hh, 5.4 / asp);
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
let drag: { x: number; y: number; yaw: number; pitch: number } | null = null;
const hint = byId('hint');
const pointers = new Map<number, PointerEvent>();
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
const endP = (e: PointerEvent) => {
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
window.addEventListener('keydown', (e) => {
  if ((e.target as HTMLElement).tagName === 'INPUT') return;
  if (e.key === '`') {
    setDebug(!debugShown);
    return;
  }
  if (e.key === 'Home') {
    resetView();
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
