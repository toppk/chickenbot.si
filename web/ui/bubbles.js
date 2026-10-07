import { _v } from '../core/util.js';
import { camera } from '../render/renderer.js';
import { hen } from '../scene/hen-model.js';
import { people } from '../scene/person-model.js';
import { chatLine } from './chat.js';
import { send } from '../brain/link.js';
import { VH, VW } from '../render/post.js';

// Speech bubbles projected over heads; lines also go to the chat log.
const bubEl = document.getElementById('bubbles'),
  bubbles = [];
export function say(who, html, dur, isHtml, isHen) {
  for (const b of bubbles)
    if (b.who === who) {
      b.el.remove();
      bubbles.splice(bubbles.indexOf(b), 1);
      break;
    }
  const el = document.createElement('div');
  el.className = 'bub' + (who === hen ? ' hen' : '');
  if (isHtml) el.innerHTML = html;
  else el.textContent = html;
  bubEl.appendChild(el);
  bubbles.push({ who, el, t: dur || 2.5 });
  if (who === hen) {
    hen.talkT = Math.min(2, 0.25 + html.length * 0.04);
    chatLine('CHICKENBOT', html, 'hen');
    send({ type: 'event', event: 'said', text: html });
  } else if (!isHtml) {
    who.talk = 1.2;
    chatLine(who.name, html, who.regular ? 'reg' : '');
  }
}
export function updateBubbles(dt) {
  for (let i = bubbles.length - 1; i >= 0; i--) {
    const b = bubbles[i];
    b.t -= dt;
    if (b.t <= 0 || (b.who !== hen && !people.includes(b.who))) {
      b.el.remove();
      bubbles.splice(i, 1);
      continue;
    }
    const head = b.who === hen ? hen.head : b.who.head;
    head.getWorldPosition(_v);
    _v.y += b.who === hen ? 0.35 : 0.4;
    _v.project(camera);
    const x = ((_v.x + 1) / 2) * VW,
      y = ((1 - _v.y) / 2) * VH;
    b.el.style.left = x + 'px';
    b.el.style.top = y + 'px';
    b.el.style.visibility = _v.z > 1 || x < -50 || x > VW + 50 ? 'hidden' : 'visible';
  }
}
export const ICONS = {};
(() => {
  const draw = {
    lager: (g) => {
      g.fillStyle = '#cfeaec';
      g.fillRect(2, 2, 7, 10);
      g.fillRect(9, 4, 2, 1);
      g.fillRect(10, 4, 1, 5);
      g.fillRect(9, 8, 2, 1);
      g.fillStyle = '#e8a020';
      g.fillRect(3, 4, 5, 7);
      g.fillStyle = '#fff1cc';
      g.fillRect(2, 1, 7, 3);
    },
    stout: (g) => {
      g.fillStyle = '#cfeaec';
      g.fillRect(3, 1, 6, 11);
      g.fillStyle = '#2a140a';
      g.fillRect(4, 4, 4, 7);
      g.fillStyle = '#eadbb8';
      g.fillRect(3, 1, 6, 3);
    },
    wine: (g) => {
      g.fillStyle = '#cfeaec';
      g.fillRect(3, 1, 6, 5);
      g.fillRect(5, 6, 2, 4);
      g.fillRect(3, 10, 6, 1);
      g.fillStyle = '#8c1030';
      g.fillRect(4, 3, 4, 3);
    },
    whiskey: (g) => {
      g.fillStyle = '#cfeaec';
      g.fillRect(2, 5, 8, 6);
      g.fillStyle = '#c77818';
      g.fillRect(3, 7, 6, 3);
      g.fillStyle = '#ffffff';
      g.fillRect(4, 6, 2, 2);
    },
  };
  for (const k in draw) {
    const c = document.createElement('canvas');
    c.width = 12;
    c.height = 12;
    draw[k](c.getContext('2d'));
    ICONS[k] = c.toDataURL();
  }
})();
