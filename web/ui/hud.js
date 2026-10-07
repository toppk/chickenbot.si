import { hen } from '../scene/hen-model.js';
import { people } from '../scene/person-model.js';
import { orders } from '../sim/orders.js';
import { regulars } from '../sim/patrons.js';
import { MOODS } from '../sim/hen-behaviour.js';

// The status bar along the bottom.
export const hud = {
  dirty: true,
  pours: document.getElementById('h-pours'),
  mood: document.getElementById('h-mood'),
  pips: [...document.querySelectorAll('#h-pips i')],
  orders: document.getElementById('h-orders'),
  patrons: document.getElementById('h-patrons'),
  regs: document.getElementById('h-regs'),
};
export function renderHud() {
  hud.pours.textContent = hen.pours;
  hud.mood.textContent = MOODS[hen.mood].hud;
  const n = Math.round(hen.moodI * 5);
  hud.pips.forEach((p, i) => p.classList.toggle('on', i < Math.max(1, n)));
  hud.orders.textContent = orders.filter((o) => o.status === 'queued' || o.status === 'pouring').length;
  hud.patrons.textContent = people.filter((p) => p.kind !== 'waitress').length;
  hud.regs.innerHTML = regulars
    .map(
      (r) =>
        `<i class="lamp ${r.glass && r.glass.fill > 0.02 ? 'full' : (r.state === 'waiting' || r.state === 'ordering') ? 'want' : ''}"></i><span>${r.name}</span>`,
    )
    .join('');
}
