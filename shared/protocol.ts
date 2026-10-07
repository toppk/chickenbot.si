// Messages between the bar page and a brain server, as JSON over a WebSocket (see docs/protocol.md).
// The message types and the names they use, shared by web/ and the future server/.

export const MOOD_NAMES = ['cheery', 'content', 'grumpy', 'frazzled', 'sleepy', 'smitten'] as const;
export type MoodName = (typeof MOOD_NAMES)[number];
export const DRINK_NAMES = ['lager', 'stout', 'wine', 'whiskey'] as const;
export type DrinkName = (typeof DRINK_NAMES)[number];
export const EMOTE_NAMES = ['flap', 'peck', 'bob', 'shrug', 'spin'] as const;
export type EmoteName = (typeof EMOTE_NAMES)[number];

/** A patron is referred to by id ("p12") or, case-insensitively, by name. */
export type PatronRef = string;

// ---- server -> bar. Received JSON is untrusted: the bar re-checks every field.
export type ServerMessage =
  | { type: 'mood'; mood: MoodName; intensity?: number }
  | { type: 'say'; text: string; to?: PatronRef }
  | { type: 'chat'; from?: string; text: string }
  | { type: 'serve'; order?: string; to?: PatronRef; drink?: DrinkName }
  | { type: 'spawn'; kind: 'table'; size?: number }
  | { type: 'spawn'; kind?: 'patron'; name?: string; drink?: DrinkName }
  | { type: 'emote'; emote: EmoteName }
  | { type: 'look'; at: 'door' | 'station' | PatronRef; seconds?: number }
  | { type: 'lights'; level: number }
  | { type: 'music'; on: boolean }
  | { type: 'auto'; on: boolean }
  | { type: 'state' };

// ---- bar -> server
export interface StateSnapshot {
  type: 'state';
  mood: MoodName;
  intensity: number;
  auto: boolean;
  pours: number;
  orders: {
    id: string;
    kind: 'bar' | 'table';
    drinks: DrinkName[];
    status: 'queued' | 'pouring' | 'ready' | 'delivering';
    patron: string | null;
  }[];
  patrons: { id: string; name: string; kind: string; state: string; drink?: DrinkName; regular: boolean }[];
}

export type BarEvent =
  | {
      event: 'order';
      order: string;
      kind: 'bar' | 'table';
      drinks: DrinkName[];
      patron: { id: string; name: string; regular: boolean } | null;
      table: number | null;
    }
  | { event: 'served'; order: string; patron?: { id: string; name: string }; drink?: DrinkName }
  | { event: 'spill'; drink: DrinkName }
  | { event: 'arrive'; patron: { id: string; name: string } }
  | { event: 'arrive'; table: number; size: number }
  | { event: 'leave'; patron: { id: string; name: string } }
  | { event: 'mood'; mood: MoodName; intensity: number; source: 'local' | 'remote' | 'chat' }
  | { event: 'said'; text: string }
  | { event: 'lofi'; on: boolean }
  | { event: 'easter'; what: 'ceiling' };

export type BarMessage =
  | { type: 'hello'; client: 'chickenbot-bar'; v: 1 }
  | StateSnapshot
  | { type: 'chat'; from: 'you'; text: string }
  | ({ type: 'event' } & BarEvent);
