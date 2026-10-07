import { state } from '../core/state.ts';
import { pick, rand } from '../core/util.ts';
import { hen } from '../scene/hen-model.ts';
import { clock } from '../sim/world.ts';
import { byId } from '../core/dom.ts';

// The Doom-style 32x32 chickenbot face in the status bar.
const faceC = byId<HTMLCanvasElement>('face'),
  fg = faceC.getContext('2d')!;
let faceLook = 0,
  faceLookT = 0,
  blinkT = 2;
export function drawFace(dt: number) {
  faceLookT -= dt;
  if (faceLookT <= 0) {
    faceLookT = rand(1.2, 3);
    faceLook = pick([-1, 0, 0, 1]);
  }
  blinkT -= dt;
  const blink = blinkT < 0.12;
  if (blinkT < 0) blinkT = rand(2, 5);
  const m = hen.mood,
    P = (c: string, x: number, y: number, w = 1, h = 1) => {
      fg.fillStyle = c;
      fg.fillRect(x, y, w, h);
    };
  P('#1a0e07', 0, 0, 32, 32);
  P('#24140a', 0, 24, 32, 8);
  const comb = {
    cheery: '#e83a2a',
    content: '#d0302a',
    grumpy: '#8a1a14',
    frazzled: '#ff4a2a',
    sleepy: '#8a4a40',
    smitten: '#ff6a8a',
  }[m];
  P(comb, 12, 3, 3, 4);
  P(comb, 15, 2, 3, 4);
  P(comb, 18, 3, 3, 4);
  P(comb, 11, 5, 10, 2);
  P('#f1ece2', 9, 7, 14, 15);
  P('#f1ece2', 8, 9, 16, 11);
  P('#d8d0c0', 8, 17, 16, 3);
  P('#c4baa8', 9, 20, 14, 2);
  P('#ffffff', 10, 8, 4, 2);
  P('#b8673a', 8, 21, 16, 2);
  P('#111', 13, 23, 6, 2);
  P('#111', 11, 24, 2, 2);
  P('#111', 19, 24, 2, 2);
  const ex = faceLook,
    ey = 12;
  const eye = (x: number) => {
    if (blink || m === 'sleepy') {
      P('#3a2a20', x, ey + 1, 3, 1);
      return;
    }
    if (m === 'cheery') {
      P('#111', x, ey + 1, 1, 1);
      P('#111', x + 1, ey, 1, 1);
      P('#111', x + 2, ey + 1, 1, 1);
      return;
    }
    if (m === 'smitten') {
      P('#e0305a', x, ey, 1, 1);
      P('#e0305a', x + 2, ey, 1, 1);
      P('#e0305a', x, ey + 1, 3, 1);
      P('#e0305a', x + 1, ey + 2, 1, 1);
      return;
    }
    P('#ffffff', x, ey, 3, 3);
    P('#111', x + 1 + ex, ey + (m === 'frazzled' ? 0 : 1), 1, m === 'frazzled' ? 1 : 2);
  };
  eye(11);
  eye(18);
  if (m === 'grumpy') {
    P('#5a4a40', 10, 10, 4, 1);
    P('#5a4a40', 13, 11, 1, 1);
    P('#5a4a40', 18, 11, 1, 1);
    P('#5a4a40', 18, 10, 4, 1);
  }
  if (m === 'frazzled') {
    P('#7ac8ff', 23, 9, 1, 2);
    P('#7ac8ff', 22, 11, 2, 2);
  }
  if (m === 'sleepy') {
    P('#9a8a70', 24, 4, 3, 1);
    P('#9a8a70', 26, 5, 1, 1);
    P('#9a8a70', 24, 6, 3, 1);
  }
  const talk = hen.talkT > 0 && Math.sin(clock * 18) > 0;
  P('#e8ae22', 14 + ex, 15, 4, 2);
  P('#c8901a', 14 + ex, 17, 4, talk ? 2 : 1);
  if (talk) P('#5a1a10', 15 + ex, 17, 2, 1);
  P(comb, 15 + ex, 18 + (talk ? 1 : 0), 2, 2);
  if (state.faceFlash > 0) {
    state.faceFlash -= dt;
    P('rgba(255,255,255,0.15)', 0, 0, 32, 32);
  }
}
