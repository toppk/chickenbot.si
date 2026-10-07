import { STATION_A } from '../scene/layout.js';
import { tables } from '../scene/bar.js';
import { send } from '../brain/link.js';
import { clock } from './world.js';

// Drink orders queued for chickenbot, from bar stools and tables.
export const orders = [];
let orderSeq = 1;
export function makeOrder(kind, drinks, who) {
  const o = {
    id: `o${orderSeq++}`,
    kind,
    drinks,
    who,
    angle: kind === 'table' ? STATION_A : who.stool.a,
    status: 'queued',
    made: 0,
    created: clock,
    glasses: [],
  };
  orders.push(o);
  send({
    type: 'event',
    event: 'order',
    order: o.id,
    kind,
    drinks,
    patron: kind === 'bar' ? { id: who.id, name: who.name, regular: !!who.regular } : null,
    table: kind === 'table' ? tables.indexOf(who) : null,
  });
  return o;
}
