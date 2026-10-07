import { state } from '../../core/state.js';
import { clamp } from '../../core/util.js';
import { stage } from '../../render/renderer.js';
import { debugShown, setDebug } from './panels.js';

// ImGui-style debug window kit: draggable windows, sliders, checkboxes, buttons.
export const winsEl = document.getElementById('wins'),
  W = {};
export let zTop = 10;
export function makeWin(id, { title, x, y, w, notitle, closable = true, collapsed = false }) {
  const el = document.createElement('section');
  el.className = 'win' + (notitle ? ' notitle' : '') + (collapsed ? ' collapsed' : '');
  el.style.left = x + 'px';
  el.style.top = y + 'px';
  if (w) el.style.width = w + 'px';
  el.setAttribute('aria-label', title);
  el.innerHTML = `<div class="bar"><span class="tri" role="button" tabindex="0" aria-label="collapse"></span><span class="t">${title}</span>${closable ? '<button class="x" aria-label="close">×</button>' : ''}</div><div class="wbody"></div>`;
  winsEl.appendChild(el);
  const bar = el.querySelector('.bar');
  el.addEventListener('pointerdown', () => {
    document.querySelectorAll('.win.active').forEach((w) => w.classList.remove('active'));
    el.classList.add('active');
    el.style.zIndex = ++zTop;
  });
  const tri = el.querySelector('.tri'),
    tg = (e) => {
      e.stopPropagation();
      el.classList.toggle('collapsed');
    };
  tri.addEventListener('click', tg);
  tri.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      tg(e);
    }
  });
  bar.addEventListener('dblclick', tg);
  const xb = el.querySelector('.x');
  if (xb)
    xb.addEventListener('click', (e) => {
      e.stopPropagation();
      el.hidden = true;
    });
  bar.addEventListener('pointerdown', (e) => {
    if (e.target !== bar && !e.target.classList.contains('t')) return;
    bar.setPointerCapture(e.pointerId);
    const ox = e.clientX - el.offsetLeft,
      oy = e.clientY - el.offsetTop;
    const mv = (ev) => {
      el.style.left = clamp(ev.clientX - ox, -el.offsetWidth + 60, stage.clientWidth - 60) + 'px';
      el.style.top = clamp(ev.clientY - oy, 0, stage.clientHeight - 21) + 'px';
    };
    const up = () => {
      bar.removeEventListener('pointermove', mv);
      bar.removeEventListener('pointerup', up);
      bar.removeEventListener('pointercancel', up);
    };
    bar.addEventListener('pointermove', mv);
    bar.addEventListener('pointerup', up);
    bar.addEventListener('pointercancel', up);
  });
  W[id] = el;
  return el.querySelector('.wbody');
}
export function toggleWin(id) {
  const el = W[id];
  if (!debugShown) setDebug(true);
  if (el.hidden || el.classList.contains('collapsed')) {
    el.hidden = false;
    el.classList.remove('collapsed');
    el.style.zIndex = ++zTop;
    if (id === 'wire' && state.wireEl) state.wireEl.scrollTop = state.wireEl.scrollHeight;
  } else el.hidden = true;
}
export function slider(parent, id, label, min, max, get, set, fmt) {
  const row = document.createElement('div');
  row.className = 'row';
  row.innerHTML = `<div class="slider" id="${id}" role="slider" tabindex="0" aria-label="${label}"><span class="g"></span><span class="v"></span></div><span class="ilab">${label}</span>`;
  parent.appendChild(row);
  const fr = row.querySelector('.slider'),
    g = row.querySelector('.g'),
    v = row.querySelector('.v');
  const render = () => {
    const t = clamp((get() - min) / (max - min), 0, 1);
    g.style.left = `calc(${t * 100}% - ${t * 10}px)`;
    v.textContent = fmt(get());
  };
  const from = (cx) => {
    const r = fr.getBoundingClientRect();
    set(min + clamp((cx - r.left - 5) / (r.width - 10), 0, 1) * (max - min));
    render();
  };
  fr.addEventListener('pointerdown', (e) => {
    e.stopPropagation();
    fr.setPointerCapture(e.pointerId);
    from(e.clientX);
    const mv = (ev) => from(ev.clientX),
      up = () => {
        fr.removeEventListener('pointermove', mv);
        fr.removeEventListener('pointerup', up);
      };
    fr.addEventListener('pointermove', mv);
    fr.addEventListener('pointerup', up);
  });
  fr.addEventListener('keydown', (e) => {
    const st = (max - min) / 50;
    if (e.key === 'ArrowRight') {
      set(Math.min(max, get() + st));
      render();
      e.preventDefault();
      e.stopPropagation();
    }
    if (e.key === 'ArrowLeft') {
      set(Math.max(min, get() - st));
      render();
      e.preventDefault();
      e.stopPropagation();
    }
  });
  render();
  return render;
}
export function check(parent, id, label, get, set, round) {
  const b = document.createElement('button');
  b.type = 'button';
  b.id = id;
  b.className = 'chk' + (round ? ' round' : '');
  b.innerHTML = `<span class="b"></span><span>${label}</span>`;
  const r = () => b.classList.toggle('on', !!get());
  b.addEventListener('click', () => {
    set(!get());
    r();
  });
  parent.appendChild(b);
  r();
  return r;
}
export function ibtn(parent, label, fn) {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'ibtn';
  b.textContent = label;
  b.addEventListener('click', fn);
  parent.appendChild(b);
  return b;
}
export function rowIn(parent) {
  const r = document.createElement('div');
  r.className = 'row';
  parent.appendChild(r);
  return r;
}
