// The drinks menu: names, colours and how each glass fills.
export const DRINKS = {
  lager: { name: 'house lager', liq: 0xe8a020, head: 0xfff1cc, h: 0.24, y0: 0.035, headH: 0.05 },
  stout: { name: 'oatmeal stout', liq: 0x2a140a, head: 0xeadbb8, h: 0.23, y0: 0.03, headH: 0.04 },
  wine: { name: 'house red', liq: 0x8c1030, head: null, h: 0.07, y0: 0.14, headH: 0 },
  whiskey: { name: 'whiskey, neat', liq: 0xc77818, head: null, h: 0.055, y0: 0.02, headH: 0 },
};
export const DRINK_KEYS = Object.keys(DRINKS);
