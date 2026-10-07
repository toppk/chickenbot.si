import type { Look } from '../core/model.ts';
import type { DrinkKey } from './drinks.ts';

// Who drinks here: the regulars, walk-in names, what people wear, and June the waitress.
export const REGULARS: { name: string; stoolIdx: number; drink: DrinkKey; look: Look }[] = [
  {
    name: 'Gus',
    stoolIdx: 5,
    drink: 'stout',
    look: { jacket: 0x4a5a2f, skin: 0xe0b48a, pants: 0x3d2f22, hair: 0x8a8a8a, cap: 0x5a4028, beard: 0x9a9a9a },
  },
  {
    name: 'Marla',
    stoolIdx: 4,
    drink: 'wine',
    look: { jacket: 0x2f3a5a, skin: 0xf0c9a0, pants: 0x2b2b33, hair: 0x7a2a10, bun: true, scarf: 0xa0281c },
  },
  {
    name: 'Otis',
    stoolIdx: 6,
    drink: 'whiskey',
    look: {
      jacket: 0xe8dcc0,
      vest: 0x7a5a2a,
      skin: 0x9a6a48,
      pants: 0x24304a,
      hair: 0x1a1a1a,
      bald: true,
      specs: true,
    },
  },
];
export const WALKIN_NAMES = [
  'Rosa',
  'Dev',
  'Hank',
  'Priya',
  'Theo',
  'Lena',
  'Marco',
  'Ines',
  'Sully',
  'Bea',
  'Kofi',
  'Nadia',
  'Walt',
  'Yuki',
  'Frank',
  'Opal',
];
/** colours random walk-ins and tables are dressed from */
export const PALETTE = {
  jackets: [0x5a2a2a, 0x2f4a6a, 0x4a5a2f, 0x5a3a6a, 0x7a5a2a, 0x3a3a3a, 0x2f5a52, 0x6a4030],
  skins: [0xe0b48a, 0xb97e55, 0x7a4e32, 0xf0c9a0, 0x9a6a48],
  pants: [0x2b2b33, 0x3d2f22, 0x2a3a2a, 0x4a3a2a, 0x24304a],
  hair: [0x2a1a10, 0x5a3a1a, 0x8a6a3a, 0x1a1a1a, 0xa0a0a0, 0x7a2a10],
  beanies: [0xa0281c, 0x2a4a6a, 0xc8a040],
  scarves: [0xa0281c, 0x2a6a5a, 0xd8b048],
};
export const JUNE: Look = {
  jacket: 0x1e1e22,
  skin: 0xc89070,
  pants: 0x1e1e22,
  hair: 0x2a1408,
  ponytail: true,
  apron: true,
  tray: true,
};
