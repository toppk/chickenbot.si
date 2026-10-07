import type { MoodName } from '../../shared/protocol.ts';
import type { MusicStyle } from './music.ts';

// Everything about each of chickenbot's moods.
export interface Mood {
  /** status-bar label */
  hud: string;
  /** comb colour and glow on the 3D model */
  comb: number;
  glow: number;
  /** comb colour on the status-bar face */
  face: string;
  /** walk speed along the bar */
  walk: number;
  /** seconds to fill a glass */
  pour: number;
  /** chance of dropping a finished glass */
  spill?: number;
  music: { style: MusicStyle; bpm: number };
  /** things chickenbot says, unprompted, in this mood */
  lines: string[];
}
const MOOD_TABLE = {
  cheery: {
    hud: 'CHEERY',
    comb: 0xe83a2a,
    glow: 0x6a1410,
    face: '#e83a2a',
    walk: 1.7,
    pour: 1.0,
    music: { style: 'jazz', bpm: 78 },
    lines: ['Evening, all.', 'Good crowd tonight.', 'Somebody play something on that jukebox.'],
  },
  content: {
    hud: 'CONTENT',
    comb: 0xd8302a,
    glow: 0x300000,
    face: '#d0302a',
    walk: 1.4,
    pour: 1.15,
    music: { style: 'easy', bpm: 72 },
    lines: ['Mm.', 'Glasses won’t polish themselves.', 'Quiet one.'],
  },
  grumpy: {
    hud: 'GRUMPY',
    comb: 0x8a1a14,
    glow: 0x100000,
    face: '#8a1a14',
    walk: 1.15,
    pour: 1.4,
    music: { style: 'blue', bpm: 70 },
    lines: ['Mind the bar. It’s mahogany.', 'Somebody’s paying for that glass.', 'Hm.'],
  },
  frazzled: {
    hud: 'FRAZZLED',
    comb: 0xff4a2a,
    glow: 0x8a1a00,
    face: '#ff4a2a',
    walk: 2.3,
    pour: 0.75,
    spill: 0.14,
    music: { style: 'jazz', bpm: 86 },
    lines: ['One at a time.', 'Heard. Heard. Heard.', 'I have two wings.'],
  },
  sleepy: {
    hud: 'SLEEPY',
    comb: 0x8a4a40,
    glow: 0x000000,
    face: '#8a4a40',
    walk: 0.75,
    pour: 1.9,
    music: { style: 'easy', bpm: 62 },
    lines: ['...', 'Last call is a state of mind.', 'zz.'],
  },
  smitten: {
    hud: 'SMITTEN',
    comb: 0xff6a8a,
    glow: 0x6a1028,
    face: '#ff6a8a',
    walk: 1.5,
    pour: 1.0,
    music: { style: 'jazz', bpm: 74 },
    lines: ['Oh, stop.', 'You’re sweet. Still paying, though.'],
  },
} satisfies Record<MoodName, Mood>;

export type MoodKey = MoodName;
export const MOODS: Record<MoodKey, Mood> = MOOD_TABLE;
export const isMood = (m: unknown): m is MoodKey => typeof m === 'string' && Object.hasOwn(MOODS, m);
