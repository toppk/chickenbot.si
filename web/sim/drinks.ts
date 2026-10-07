// The drinks menu: names, colours and how each glass fills.
import type { DrinkName } from '../../shared/protocol.ts';

export interface Drink {
  name: string;
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
  lager: { name: 'house lager', liq: 0xe8a020, head: 0xfff1cc, h: 0.24, y0: 0.035, headH: 0.05 },
  stout: { name: 'oatmeal stout', liq: 0x2a140a, head: 0xeadbb8, h: 0.23, y0: 0.03, headH: 0.04 },
  wine: { name: 'house red', liq: 0x8c1030, head: null, h: 0.07, y0: 0.14, headH: 0 },
  whiskey: { name: 'whiskey, neat', liq: 0xc77818, head: null, h: 0.055, y0: 0.02, headH: 0 },
} satisfies Record<DrinkName, Drink>;
export type DrinkKey = DrinkName;
export const DRINK_KEYS = Object.keys(DRINKS) as DrinkKey[];
export const isDrink = (k: unknown): k is DrinkKey => typeof k === 'string' && Object.hasOwn(DRINKS, k);
