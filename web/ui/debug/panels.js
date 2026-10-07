import { state } from '../../core/state.js';
import { stage } from '../../render/renderer.js';
import { CAM, PITCH_MAX, PITCH_MIN } from '../../render/camera.js';
import { JOINTS, hen } from '../../scene/hen-model.js';
import { liveP } from '../../scene/particles.js';
import { glasses } from '../../scene/glasses.js';
import { people } from '../../scene/person-model.js';
import { orders } from '../../sim/orders.js';
import { MOODS } from '../../sim/hen-behaviour.js';
import { hud } from '../hud.js';
import {
  appendWire,
  connect,
  disconnect,
  handle,
  snapshot,
  wireBuf,
  wireLog,
  wsNote,
  wsUrl,
} from '../../brain/link.js';
import { brain } from '../../brain/local-brain.js';
import { resize } from '../../render/post.js';
import { lofi, setLofi } from '../../audio/lofi.js';
import { W, check, ibtn, makeWin, rowIn, slider, toggleWin, winsEl } from './window.js';
import { ftAvg, tris } from '../../main.js';

// The debug windows: stats, brain (hand-fired protocol messages) and wire (link log).
export let inkOn = true;
function dbg(m) {
  wireLog('dbg', m);
  handle(m);
}
export let debugShown = true;
let dbgSaved = [];
let narrowDbg, mini, dMini, dFt, dTri, dEnt;
const dbgRenders = [];

export function setDebug(show) {
  if (show === debugShown) return;
  debugShown = show;
  if (!show) {
    dbgSaved = Object.keys(W).filter((k) => !W[k].hidden);
    winsEl.hidden = true;
    mini.hidden = false;
  } else {
    winsEl.hidden = false;
    mini.hidden = true;
    Object.keys(W).forEach((k) => {
      if (dbgSaved.includes(k) || k === 'stats') W[k].hidden = false;
    });
    refreshDebug();
  }
}

function placeBrain() {
  if (!narrowDbg && W.stats.offsetHeight) W.brain.style.top = W.stats.offsetTop + W.stats.offsetHeight + 8 + 'px';
}

// builds the debug windows: called once by main after every module has loaded
export function initDebug() {
  narrowDbg = stage.clientWidth < 700;
  // stats
  const sb = makeWin('stats', { title: 'stats', x: 0, y: 8, w: 290, notitle: true, closable: false });
  W.stats.style.left = 'auto';
  W.stats.style.right = '8px';
  sb.innerHTML = `<div class="statsTop"><div class="stat" id="d-ft"></div><button type="button" class="ibtn" id="d-hide" aria-label="hide debug windows">Hide</button></div><div class="stat" id="d-tri"></div><div class="stat">Num Skinning Joints: ${JOINTS}</div><div class="stat" id="d-ent"></div><div class="sep"></div><div>Camera Controls:</div><div class="dim">&nbsp; LMB + Mouse Move: Orbit</div><div class="dim">&nbsp; Mouse Wheel: Zoom</div>`;
  dbgRenders.push(
    slider(
      sb,
      'd-zoom',
      'Zoom',
      2.5,
      9,
      () => CAM.zoom,
      (v) => (CAM.zoom = v),
      (v) => v.toFixed(2),
    ),
  );
  dbgRenders.push(
    slider(
      sb,
      'd-yaw',
      'Yaw',
      0,
      360,
      () => ((CAM.yaw % 360) + 360) % 360,
      (v) => {
        CAM.yaw = v;
        state.idleT = 0;
      },
      (v) => v.toFixed(1),
    ),
  );
  dbgRenders.push(
    slider(
      sb,
      'd-pitch',
      'Pitch',
      PITCH_MIN,
      PITCH_MAX,
      () => CAM.pitch,
      (v) => (CAM.pitch = v),
      (v) => v.toFixed(1),
    ),
  );
  sb.appendChild(Object.assign(document.createElement('div'), { className: 'sep' }));
  slider(
    sb,
    'd-pix',
    'Pixel Size',
    1,
    6,
    () => state.PIX,
    (v) => {
      const n = Math.round(v);
      if (n !== state.PIX) {
        state.PIX = n;
        resize();
      }
    },
    (v) => String(Math.round(v)),
  );
  {
    const r = rowIn(sb);
    r.style.gap = '14px';
    check(
      r,
      'd-ink',
      'Ink Lines',
      () => inkOn,
      (v) => (inkOn = v),
    );
    dbgRenders.push(
      check(
        r,
        'd-orbit',
        'Auto Orbit',
        () => state.autoOrbit,
        (v) => (state.autoOrbit = v),
      ),
    );
  }
  sb.appendChild(Object.assign(document.createElement('div'), { className: 'sep' }));
  sb.insertAdjacentHTML('beforeend', '<div class="stat" id="d-lofi"></div>');
  {
    const r = rowIn(sb);
    dbgRenders.push(
      check(
        r,
        'd-lofion',
        'Lofi',
        () => lofi.on,
        (v) => setLofi(v),
      ),
    );
  }
  slider(
    sb,
    'd-lofivol',
    'Lofi Vol',
    0,
    1,
    () => lofi.vol,
    (v) => {
      lofi.vol = v;
    },
    (v) => v.toFixed(2),
  );
  {
    const r = rowIn(sb);
    ibtn(r, 'Toggle Brain', () => toggleWin('brain'));
    ibtn(r, 'Toggle Wire', () => toggleWin('wire'));
  }
  // brain: fire any protocol command by hand
  const bb = makeWin('brain', {
    title: 'brain',
    x: Math.max(8, stage.clientWidth - 308),
    y: narrowDbg ? 8 : W.stats.offsetHeight + 16,
    w: 300,
    collapsed: true,
  });
  bb.insertAdjacentHTML('beforeend', '<div class="dim">sends the same messages a server would</div><div>mood</div>');
  const rad = document.createElement('div');
  rad.className = 'radios';
  bb.appendChild(rad);
  const moodR = Object.keys(MOODS).map((m) =>
    check(
      rad,
      'd-m-' + m,
      m,
      () => hen.mood === m,
      () => {
        brain.override = 20;
        dbg({ type: 'mood', mood: m, intensity: hen.moodI });
        moodR.forEach((f) => f());
      },
      true,
    ),
  );
  dbgRenders.push(...moodR);
  {
    const r = rowIn(bb);
    check(r, 'd-moodflash', 'flash face on mood change', () => state.moodFlash, (v) => (state.moodFlash = v));
  }
  dbgRenders.push(
    slider(
      bb,
      'd-int',
      'intensity',
      0,
      1,
      () => hen.moodI,
      (v) => {
        hen.moodI = v;
        hud.dirty = true;
      },
      (v) => v.toFixed(2),
    ),
  );
  bb.appendChild(Object.assign(document.createElement('div'), { className: 'sep' }));
  bb.insertAdjacentHTML('beforeend', '<div>emote</div>');
  {
    const r = rowIn(bb);
    for (const e of ['flap', 'peck', 'bob', 'shrug', 'spin']) ibtn(r, e, () => dbg({ type: 'emote', emote: e }));
  }
  {
    const r = rowIn(bb);
    ibtn(r, 'spawn walk-in', () => dbg({ type: 'spawn', kind: 'patron' }));
    ibtn(r, 'seat a table', () => dbg({ type: 'spawn', kind: 'table' }));
  }
  {
    const r = rowIn(bb);
    r.style.gap = '14px';
    dbgRenders.push(
      check(
        r,
        'd-auto',
        'autopilot',
        () => hen.auto,
        (v) => dbg({ type: 'auto', on: v }),
      ),
    );
    dbgRenders.push(
      check(
        r,
        'd-music',
        'jukebox',
        () => state.music,
        (v) => dbg({ type: 'music', on: v }),
      ),
    );
  }
  dbgRenders.push(
    slider(
      bb,
      'd-lights',
      'lights',
      0,
      1,
      () => state.lightLevel,
      (v) => {
        state.lightLevel = v;
      },
      (v) => v.toFixed(2),
    ),
  );
  {
    const r = rowIn(bb);
    const inp = document.createElement('input');
    inp.className = 'iin';
    inp.id = 'd-say';
    inp.placeholder = 'make chickenbot say...';
    inp.maxLength = 140;
    r.appendChild(inp);
    const go = () => {
      const t = inp.value.trim();
      if (!t) return;
      inp.value = '';
      dbg({ type: 'say', text: t });
    };
    ibtn(r, 'say', go);
    inp.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        go();
      }
    });
  }
  {
    const r = rowIn(bb);
    ibtn(r, 'serve next order', () => {
      const o = orders.find((x) => x.status === 'queued');
      if (o) dbg({ type: 'serve', order: o.id });
    });
    ibtn(r, 'request state', () => wireLog('sim', snapshot()));
  }
  // wire: link settings and message log
  const wb = makeWin('wire', { title: 'wire', x: 8, y: 8, w: Math.min(460, stage.clientWidth - 16) });
  {
    const r = rowIn(wb);
    r.appendChild(wsUrl);
    ibtn(r, 'Connect', () => {
      const u = wsUrl.value.trim();
      if (/^wss?:\/\//.test(u)) connect(u);
      else wsNote.textContent = 'Use a ws:// or wss:// address.';
    });
    ibtn(r, 'Local', () => disconnect(true));
    wsUrl.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        r.querySelector('.ibtn').click();
      }
    });
  }
  wb.appendChild(wsNote);
  {
    const r = rowIn(wb);
    r.style.gap = '14px';
    check(
      r,
      'd-wstate',
      'show state snapshots',
      () => state.wireState,
      (v) => (state.wireState = v),
    );
    ibtn(r, 'Clear', () => {
      wireBuf.length = 0;
      state.wireEl.innerHTML = '';
    });
  }
  wb.insertAdjacentHTML('beforeend', '<div class="dim">→ sent · ← received · · would send (no link)</div>');
  state.wireEl = document.createElement('div');
  state.wireEl.className = 'wlog';
  wb.appendChild(state.wireEl);
  wireBuf.forEach(appendWire);
  W.wire.hidden = true;
  // shrink / show: the stats panel folds down to a small permanent tab in the same corner
  mini = document.createElement('section');
  mini.className = 'win';
  mini.id = 'dbgmini';
  mini.hidden = true;
  mini.setAttribute('aria-label', 'debug');
  mini.innerHTML =
    '<span class="stat" id="d-mini-ft"></span><button type="button" class="ibtn" id="d-show">Show</button>';
  stage.appendChild(mini);
  document.getElementById('d-hide').addEventListener('click', () => setDebug(false));
  document.getElementById('d-show').addEventListener('click', () => setDebug(true));
  dMini = document.getElementById('d-mini-ft');
  requestAnimationFrame(placeBrain);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(placeBrain);
  if (narrowDbg) setDebug(false);
  dFt = document.getElementById('d-ft');
  dTri = document.getElementById('d-tri');
  dEnt = document.getElementById('d-ent');
}

export function refreshDebug() {
  dFt.textContent = `Frame Time: ${ftAvg.toFixed(3)}ms`;
  dTri.textContent = `Num Triangles: ${tris}`;
  const dl = document.getElementById('d-lofi');
  if (dl)
    dl.textContent = lofi.on
      ? `Lofi: ${lofi.style} · ${Math.round(lofi.bpm)} bpm · ${lofi.chordName || '...'}${state.music ? '' : ' (jukebox off)'}`
      : 'Lofi: off';
  dEnt.textContent = `Particles: ${liveP}  Glasses: ${glasses.length}  People: ${people.length}`;
  dMini.textContent = `${ftAvg.toFixed(1)}ms`;
  if (debugShown) dbgRenders.forEach((f) => f());
}
