// Chord loops for the lofi music; each mood picks one (content/moods.ts).
export type MusicStyle = 'easy' | 'jazz' | 'blue';
/** four chords: names, voicings and bass roots as MIDI notes */
export interface Prog {
  names: string[];
  ch: number[][];
  root: number[];
}
export const PROGS: Record<MusicStyle, Prog> = {
  easy: {
    names: ['Fmaj9', 'Em7', 'Dm9', 'Cmaj9'],
    ch: [
      [53, 57, 60, 64, 67],
      [52, 55, 59, 62],
      [50, 53, 57, 60, 64],
      [48, 52, 55, 59, 62],
    ],
    root: [41, 40, 38, 36],
  },
  jazz: {
    names: ['Dm9', 'G13', 'Cmaj9', 'Am9'],
    ch: [
      [50, 53, 57, 60, 64],
      [53, 57, 59, 64],
      [48, 52, 55, 59, 62],
      [45, 48, 52, 55, 59],
    ],
    root: [38, 43, 36, 33],
  },
  blue: {
    names: ['Am9', 'Fmaj7', 'Dm9', 'Esus'],
    ch: [
      [45, 48, 52, 55, 59],
      [53, 57, 60, 64],
      [50, 53, 57, 60, 64],
      [52, 57, 59, 62],
    ],
    root: [33, 41, 38, 40],
  },
};
