import { hen } from '../scene/hen-model.ts';
import { people } from '../scene/person-model.ts';
import { orders } from '../sim/orders.ts';
import { regulars } from '../sim/patrons.ts';
import { MOODS } from '../content/moods.ts';
import { byId } from '../core/dom.ts';

// The status bar along the bottom.
export const hud = {
  dirty: true,
  pours: byId('h-pours'),
  mood: byId('h-mood'),
  pips: [...document.querySelectorAll('#h-pips i')],
  orders: byId('h-orders'),
  patrons: byId('h-patrons'),
  regs: byId('h-regs'),
};
export function renderHud() {
  hud.pours.textContent = String(hen.pours);
  hud.mood.textContent = MOODS[hen.mood].hud;
  const n = Math.round(hen.moodI * 5);
  hud.pips.forEach((p, i) => {
    p.classList.toggle('on', i < Math.max(1, n));
  });
  hud.orders.textContent = String(orders.filter((o) => o.status === 'queued' || o.status === 'pouring').length);
  hud.patrons.textContent = String(people.filter((p) => p.kind !== 'waitress').length);
  hud.regs.innerHTML = regulars
    .map(
      (r) =>
        `<i class="lamp ${r.glass && r.glass.fill > 0.02 ? 'full' : (r.state === 'waiting' || r.state === 'ordering') ? 'want' : ''}"></i><span>${r.name}</span>`,
    )
    .join('');
}
