import { state } from '../../core/state.ts';
import { clamp } from '../../core/util.ts';
import { stage } from '../../render/renderer.ts';
import { debugShown, setDebug } from './panels.ts';
import { byId } from '../../core/dom.ts';

// ImGui-style debug window kit: draggable windows, sliders, checkboxes, buttons.
export type WinId = 'stats' | 'camera' | 'brain' | 'wire';
export const winsEl = byId('wins'),
  W = {} as Record<WinId, HTMLElement>;
export let zTop = 10;
/** Adds a draggable, collapsible window and returns its body element. */
export function makeWin(
  id: WinId,
  {
    title,
    x,
    y,
    w,
    notitle,
    closable = true,
    collapsed = false,
  }: { title: string; x: number; y: number; w?: number; notitle?: boolean; closable?: boolean; collapsed?: boolean },
): HTMLElement {
  const el = document.createElement('section');
  el.className = `win${notitle ? ' notitle' : ''}${collapsed ? ' collapsed' : ''}`;
  el.style.left = `${x}px`;
  el.style.top = `${y}px`;
  if (w) el.style.width = `${w}px`;
  el.setAttribute('aria-label', title);
  el.innerHTML = `<div class="bar"><span class="tri" role="button" tabindex="0" aria-label="collapse"></span><span class="t">${title}</span>${closable ? '<button class="x" aria-label="close">×</button>' : ''}</div><div class="wbody"></div>`;
  winsEl.appendChild(el);
  const bar = el.querySelector<HTMLElement>('.bar')!;
  el.addEventListener('pointerdown', () => {
    document.querySelectorAll('.win.active').forEach((w) => {
      w.classList.remove('active');
    });
    el.classList.add('active');
    el.style.zIndex = String(++zTop);
  });
  const tri = el.querySelector<HTMLElement>('.tri')!,
    tg = (e: Event) => {
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
    if (e.target !== bar && !(e.target as HTMLElement).classList.contains('t')) return;
    bar.setPointerCapture(e.pointerId);
    const ox = e.clientX - el.offsetLeft,
      oy = e.clientY - el.offsetTop;
    const mv = (ev: PointerEvent) => {
      el.style.left = `${clamp(ev.clientX - ox, -el.offsetWidth + 60, stage.clientWidth - 60)}px`;
      el.style.top = `${clamp(ev.clientY - oy, 0, stage.clientHeight - 21)}px`;
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
  return el.querySelector<HTMLElement>('.wbody')!;
}
export function toggleWin(id: WinId) {
  const el = W[id];
  if (!debugShown) setDebug(true);
  if (el.hidden || el.classList.contains('collapsed')) {
    el.hidden = false;
    el.classList.remove('collapsed');
    el.style.zIndex = String(++zTop);
    if (id === 'wire' && state.wireEl) state.wireEl.scrollTop = state.wireEl.scrollHeight;
  } else el.hidden = true;
}
/** An ImGui drag slider; returns a function that re-renders it from get(). */
export function slider(
  parent: HTMLElement,
  id: string,
  label: string,
  min: number,
  max: number,
  get: () => number,
  set: (v: number) => void,
  fmt: (v: number) => string,
) {
  const row = document.createElement('div');
  row.className = 'row';
  row.innerHTML = `<div class="slider" id="${id}" role="slider" tabindex="0" aria-label="${label}"><span class="g"></span><span class="v"></span></div><span class="ilab">${label}</span>`;
  parent.appendChild(row);
  const fr = row.querySelector<HTMLElement>('.slider')!,
    g = row.querySelector<HTMLElement>('.g')!,
    v = row.querySelector<HTMLElement>('.v')!;
  const render = () => {
    const t = clamp((get() - min) / (max - min), 0, 1);
    g.style.left = `calc(${t * 100}% - ${t * 10}px)`;
    v.textContent = fmt(get());
  };
  const from = (cx: number) => {
    const r = fr.getBoundingClientRect();
    set(min + clamp((cx - r.left - 5) / (r.width - 10), 0, 1) * (max - min));
    render();
  };
  fr.addEventListener('pointerdown', (e) => {
    e.stopPropagation();
    fr.setPointerCapture(e.pointerId);
    from(e.clientX);
    const mv = (ev: PointerEvent) => from(ev.clientX),
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
/** A checkbox (or radio button when round); returns a function that re-renders it from get(). */
export function check(
  parent: HTMLElement,
  id: string,
  label: string,
  get: () => boolean,
  set: (v: boolean) => void,
  round?: boolean,
) {
  const b = document.createElement('button');
  b.type = 'button';
  b.id = id;
  b.className = `chk${round ? ' round' : ''}`;
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
export function ibtn(parent: HTMLElement, label: string, fn: () => void) {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'ibtn';
  b.textContent = label;
  b.addEventListener('click', fn);
  parent.appendChild(b);
  return b;
}
export function rowIn(parent: HTMLElement) {
  const r = document.createElement('div');
  r.className = 'row';
  parent.appendChild(r);
  return r;
}
