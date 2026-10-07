import type { DrinkName } from '../../shared/protocol.ts';

// The drinks menu. Also drawn on the chalkboard, by section, in this order.
export interface Drink {
  name: string;
  price: number;
  section: 'tap' | 'glass';
  /** liquid colour */
  liq: number;
  /** foam colour, if it pours with a head */
  head: number | null;
  /** liquid height when full, from y0 */
  h: number;
  /** liquid bottom inside the glass */
  y0: number;
  headH: number;
}
export const DRINKS = {
  lager: {
    name: 'house lager',
    price: 6,
    section: 'tap',
    liq: 0xe8a020,
    head: 0xfff1cc,
    h: 0.24,
    y0: 0.035,
    headH: 0.05,
  },
  stout: {
    name: 'oatmeal stout',
    price: 7,
    section: 'tap',
    liq: 0x2a140a,
    head: 0xeadbb8,
    h: 0.23,
    y0: 0.03,
    headH: 0.04,
  },
  wine: { name: 'house red', price: 9, section: 'glass', liq: 0x8c1030, head: null, h: 0.07, y0: 0.14, headH: 0 },
  whiskey: {
    name: 'whiskey, neat',
    price: 10,
    section: 'glass',
    liq: 0xc77818,
    head: null,
    h: 0.055,
    y0: 0.02,
    headH: 0,
  },
} satisfies Record<DrinkName, Drink>;
export const MENU_SECTIONS: { id: Drink['section']; title: string }[] = [
  { id: 'tap', title: 'ON TAP' },
  { id: 'glass', title: 'BY THE GLASS' },
];

export type DrinkKey = DrinkName;
export const DRINK_KEYS = Object.keys(DRINKS) as DrinkKey[];
export const isDrink = (k: unknown): k is DrinkKey => typeof k === 'string' && Object.hasOwn(DRINKS, k);
