import { STATION_A } from '../scene/layout.ts';
import { tables } from '../scene/bar.ts';
import { send } from '../brain/link.ts';
import { clock } from './world.ts';
import type { BarOrder, Order, Person, Table, TableOrder } from '../core/model.ts';
import type { DrinkKey } from './drinks.ts';

// Drink orders queued for chickenbot, from bar stools and tables.
export const orders: Order[] = [];
let orderSeq = 1;
export function makeOrder(kind: 'bar', drinks: DrinkKey[], who: Person): BarOrder;
export function makeOrder(kind: 'table', drinks: DrinkKey[], who: Table): TableOrder;
export function makeOrder(kind: Order['kind'], drinks: DrinkKey[], who: Person | Table): Order {
  const o = {
    id: `o${orderSeq++}`,
    kind,
    drinks,
    who,
    angle: kind === 'table' ? STATION_A : (who as Person).stool!.a,
    status: 'queued',
    made: 0,
    created: clock,
    glasses: [],
  } as Order;
  orders.push(o);
  send({
    type: 'event',
    event: 'order',
    order: o.id,
    kind,
    drinks,
    patron: o.kind === 'bar' ? { id: o.who.id, name: o.who.name, regular: !!o.who.regular } : null,
    table: o.kind === 'table' ? tables.indexOf(o.who) : null,
  });
  return o;
}
