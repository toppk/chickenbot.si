import { state } from '../../core/state.ts';
import { applyStageCap, stage } from '../../render/renderer.ts';
import { GLASS } from '../../render/materials.ts';
import { CAM, PITCH_MAX, PITCH_MIN, resetView, viewSettings } from '../../render/camera.ts';
import { JOINTS, hen } from '../../scene/hen-model.ts';
import { liveP } from '../../scene/particles.ts';
import { glasses } from '../../scene/glasses.ts';
import { people } from '../../scene/person-model.ts';
import { orders } from '../../sim/orders.ts';
import { MOODS, type MoodKey } from '../../content/moods.ts';
import { hud } from '../hud.ts';
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
} from '../../brain/link.ts';
import { brain } from '../../brain/local-brain.ts';
import { RH, SCALE, VH, VW, resize } from '../../render/post.ts';
import { lofi, setLofi } from '../../audio/lofi.ts';
import { W, type WinId, check, ibtn, makeWin, rowIn, slider, toggleWin, winsEl } from './window.ts';
import { ftAvg, tris } from '../../main.ts';
import { byId } from '../../core/dom.ts';
import { EMOTE_NAMES, type ServerMessage } from '../../../shared/protocol.ts';

// The debug windows: stats, brain (hand-fired protocol messages) and wire (link log).
/** the deployed commit, stamped into index.html by scripts/build.ts */
const BUILD_REV = document.querySelector<HTMLMetaElement>('meta[name="revision"]')?.content ?? 'dev';
/** Fires a protocol message as if a server had sent it. */
function dbg(m: ServerMessage) {
  wireLog('dbg', m);
  handle(m);
}
export let debugShown = true;
/** windows that were open when the debug overlay was hidden */
let dbgSaved: WinId[] = [];
let narrowDbg: boolean, mini: HTMLElement, dMini: HTMLElement, dFt: HTMLElement, dTri: HTMLElement, dEnt: HTMLElement;
/** re-renders widgets whose values can change elsewhere */
const dbgRenders: (() => unknown)[] = [];

export function setDebug(show: boolean) {
  if (show === debugShown) return;
  debugShown = show;
  if (!show) {
    dbgSaved = (Object.keys(W) as WinId[]).filter((k) => !W[k].hidden);
    winsEl.hidden = true;
    mini.hidden = false;
  } else {
    winsEl.hidden = false;
    mini.hidden = true;
    (Object.keys(W) as WinId[]).forEach((k) => {
      if (dbgSaved.includes(k) || k === 'stats') W[k].hidden = false;
    });
    refreshDebug();
  }
}

function placeBrain() {
  if (!narrowDbg && W.stats.offsetHeight) W.brain.style.top = `${W.stats.offsetTop + W.stats.offsetHeight + 8}px`;
}

// builds the debug windows: called once by main after every module has loaded
export function initDebug() {
  narrowDbg = stage.clientWidth < 700;
  // stats
  const sb = makeWin('stats', { title: 'stats', x: 0, y: 8, w: 290, notitle: true, closable: false });
  W.stats.style.left = 'auto';
  W.stats.style.right = '8px';
  sb.innerHTML = `<div class="statsTop"><div class="stat" id="d-ft"></div><button type="button" class="ibtn" id="d-hide" aria-label="hide debug windows">Hide</button></div><div class="stat" id="d-tri"></div><div class="stat">Num Skinning Joints: ${JOINTS}</div><div class="stat">Build: ${BUILD_REV}</div><div class="stat" id="d-ent"></div><div class="sep"></div><div>Camera Controls:</div><div class="dim">&nbsp; LMB + Mouse Move: Orbit</div><div class="dim">&nbsp; Mouse Wheel: Zoom</div><div class="dim">&nbsp; Home: Reset</div>`;
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
  {
    const r = rowIn(sb);
    ibtn(r, 'Reset', () => {
      resetView();
      dbgRenders.forEach((f) => {
        f();
      });
    }).title = 'Home key';
    const copy = ibtn(r, 'Copy Settings', () => {
      const text = viewSettings();
      console.log(`chickenbot settings: ${text}`);
      const done = (label: string) => {
        copy.textContent = label;
        setTimeout(() => (copy.textContent = 'Copy Settings'), 1500);
      };
      navigator.clipboard?.writeText(text).then(
        () => done('Copied'),
        () => window.prompt('Copy these settings:', text),
      ) ?? window.prompt('Copy these settings:', text);
    });
  }
  // framing: the low end of Ideal Aspect and the high end of Max Aspect mean off
  dbgRenders.push(
    slider(
      sb,
      'd-ideal',
      'Ideal Aspect',
      0.7,
      3,
      () => state.idealAspect || 0.7,
      (v) => (state.idealAspect = v < 0.75 ? 0 : Math.round(v * 40) / 40),
      () => (state.idealAspect ? `${state.idealAspect.toFixed(3)} · now ${(VW / VH).toFixed(2)}` : 'off'),
    ),
  );
  dbgRenders.push(
    slider(
      sb,
      'd-maxasp',
      'Max Aspect',
      1.2,
      3.6,
      () => state.maxAspect || 3.6,
      (v) => {
        state.maxAspect = v > 3.5 ? 0 : Math.round(v * 20) / 20;
        applyStageCap();
      },
      () => (state.maxAspect ? state.maxAspect.toFixed(2) : 'off'),
    ),
  );
  sb.appendChild(Object.assign(document.createElement('div'), { className: 'sep' }));
  dbgRenders.push(
    slider(
      sb,
      'd-rows',
      'Art Rows',
      120,
      480,
      () => state.artRows,
      (v) => {
        const n = Math.round(v);
        if (n !== state.artRows) {
          state.artRows = n;
          resize();
        }
      },
      (v) => `${Math.round(v)} · ${SCALE}x · ${RH}`,
    ),
  );
  dbgRenders.push(
    slider(
      sb,
      'd-glass',
      'Glass Opacity',
      0,
      1,
      () => state.glassOpacity,
      (v) => {
        state.glassOpacity = GLASS.opacity = Math.round(v * 100) / 100;
      },
      (v) => v.toFixed(2),
    ),
  );
  {
    const r = rowIn(sb);
    r.style.gap = '14px';
    dbgRenders.push(
      check(
        r,
        'd-ink',
        'Ink Lines',
        () => state.inkLines,
        (v) => (state.inkLines = v),
      ),
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
  const moodR = (Object.keys(MOODS) as MoodKey[]).map((m) =>
    check(
      rad,
      `d-m-${m}`,
      m,
      () => hen.mood === m,
      () => {
        brain.override = 20;
        dbg({ type: 'mood', mood: m, intensity: hen.moodI });
        moodR.forEach((f) => {
          f();
        });
      },
      true,
    ),
  );
  dbgRenders.push(...moodR);
  {
    const r = rowIn(bb);
    check(
      r,
      'd-moodflash',
      'flash face on mood change',
      () => state.moodFlash,
      (v) => (state.moodFlash = v),
    );
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
    for (const e of EMOTE_NAMES) ibtn(r, e, () => dbg({ type: 'emote', emote: e }));
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
        r.querySelector<HTMLButtonElement>('.ibtn')!.click();
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
      state.wireEl!.innerHTML = '';
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
    '<span class="stat" id="d-mini-ft"></span><button type="button" class="ibtn" id="d-show" aria-label="show debug windows">Show</button>';
  stage.appendChild(mini);
  byId('d-hide').addEventListener('click', () => setDebug(false));
  byId('d-show').addEventListener('click', () => setDebug(true));
  dMini = byId('d-mini-ft');
  requestAnimationFrame(placeBrain);
  if (document.fonts?.ready) document.fonts.ready.then(placeBrain);
  // visitors start with the windows folded into the small Show tab; ` or ?debug=1 opens them
  if (new URLSearchParams(location.search).get('debug') !== '1') setDebug(false);
  dFt = byId('d-ft');
  dTri = byId('d-tri');
  dEnt = byId('d-ent');
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
  if (debugShown)
    dbgRenders.forEach((f) => {
      f();
    });
}
