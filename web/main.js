import { BG, camera, renderer, scene } from './render/renderer.js';
import { redraws } from './render/materials.js';
import { walls } from './render/wall-fade.js';
import { updateCam } from './render/camera.js';
import { updateParticles, updatePuddles } from './scene/particles.js';
import { updateGlasses } from './scene/glasses.js';
import { people } from './scene/person-model.js';
import { animatePerson } from './sim/people.js';
import { updatePatrons } from './sim/patrons.js';
import { juneTick } from './sim/waitress.js';
import { updateHen } from './sim/hen-behaviour.js';
import { updateBubbles } from './ui/bubbles.js';
import { hud, renderHud } from './ui/hud.js';
import { drawFace } from './ui/face.js';
import { brain } from './brain/local-brain.js';
import { normalMat, post, postCam, postScene, resize, rtColor, rtNormal } from './render/post.js';
import { openBar, world } from './sim/world.js';
import { lofiFrame } from './audio/lofi.js';
import { initDebug, inkOn, refreshDebug } from './ui/debug/panels.js';

// Entry point: opens the bar, builds the debug windows and runs the frame loop.
export let last = performance.now(),
  hudT = 0,
  ftAvg = 16.7,
  tris = 0,
  dbgT = 0;
function frame(now) {
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
