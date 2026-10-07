// fonts first, so the canvas textures' redraw on VT323 load has a font to wait for
import './ui/fonts.ts';
import { BG, camera, renderer, scene } from './render/renderer.ts';
import { redraws } from './render/materials.ts';
import { walls } from './render/wall-fade.ts';
import { updateCam } from './render/camera.ts';
import { updateParticles, updatePuddles } from './scene/particles.ts';
import { updateGlasses } from './scene/glasses.ts';
import { people } from './scene/person-model.ts';
import { animatePerson } from './sim/people.ts';
import { updatePatrons } from './sim/patrons.ts';
import { juneTick } from './sim/waitress.ts';
import { updateHen } from './sim/hen-behaviour.ts';
import { updateBubbles } from './ui/bubbles.ts';
import { hud, renderHud } from './ui/hud.ts';
import { drawFace } from './ui/face.ts';
import { brain } from './brain/local-brain.ts';
import { normalMat, post, postCam, postScene, resize, rtColor, rtNormal } from './render/post.ts';
import { openBar, world } from './sim/world.ts';
import { lofiFrame } from './audio/lofi.ts';
import { initDebug, inkOn, refreshDebug } from './ui/debug/panels.ts';

// Entry point: opens the bar, builds the debug windows and runs the frame loop.
export let last = performance.now(),
  hudT = 0,
  ftAvg = 16.7,
  tris = 0,
  dbgT = 0;
function frame(now: number) {
  const dt = Math.min(0.05, (now - last) / 1000);
  ftAvg += (now - last - ftAvg) * 0.05;
  last = now;
  world(dt);
  brain.tick(dt);
  updatePatrons(dt);
  juneTick();
  updateHen(dt);
  for (const p of people) animatePerson(p, dt);
  updateGlasses(dt);
  updateParticles(dt);
  updatePuddles(dt);
  updateCam(dt);
  renderer.setClearColor(0x8080ff, 1);
  renderer.setRenderTarget(rtNormal);
  scene.overrideMaterial = normalMat;
  camera.layers.set(0);
  const hidden = walls.filter((w) => w.fade > 0.02 && w.g.visible);
  hidden.forEach((w) => {
    w.g.visible = false;
  });
  renderer.render(scene, camera);
  hidden.forEach((w) => {
    w.g.visible = true;
  });
  scene.overrideMaterial = null;
  camera.layers.enable(1);
  renderer.setClearColor(BG, 1);
  renderer.setRenderTarget(rtColor);
  renderer.render(scene, camera);
  tris = renderer.info.render.triangles;
  renderer.setRenderTarget(null);
  renderer.render(postScene, postCam);
  updateBubbles(dt);
  drawFace(dt);
  lofiFrame();
  hudT += dt;
  if (hudT > 0.25 || hud.dirty) {
    hudT = 0;
    hud.dirty = false;
    renderHud();
  }
  dbgT += dt;
  if (dbgT > 0.25) {
    dbgT = 0;
    refreshDebug();
  }
  post.uniforms.ink.value = inkOn ? 1 : 0;
  requestAnimationFrame(frame);
}
openBar();
initDebug();
resize();
if (document.fonts?.load)
  document.fonts
    .load('14px VT323')
    .then(() =>
      redraws.forEach((f) => {
        f();
      }),
    )
    .catch(() => {});
requestAnimationFrame(frame);
