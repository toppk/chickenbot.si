import { V3 } from '../core/util.ts';

// Room dimensions and fixed positions everything else is placed against.
export const ROOM = 7.5,
  WALL_H = 3.3,
  TOP = 1.1,
  BAR_IN = 1.72,
  BAR_OUT = 2.48,
  STOOL_R = 2.95,
  RING_R = 3.7,
  HEN_R = 1.22,
  ISLAND_R = 0.85,
  STATION_A = 0;
export const DOOR = new V3(0, 0, -ROOM + 0.5);
