// The shapes of everything in the bar. Type-only: importing this adds no runtime dependency.
import type * as THREE from 'three';
import type { DrinkKey } from '../content/drinks.ts';
import type { MoodKey } from '../content/moods.ts';
import type { EmoteName } from '../../shared/protocol.ts';

export type Vec3 = THREE.Vector3;

/** How a person looks; colours are hex. */
export interface Look {
  jacket: number;
  skin: number;
  pants: number;
  hair: number;
  cap?: number;
  beanie?: number;
  beard?: number;
  scarf?: number;
  vest?: number;
  specs?: boolean;
  ponytail?: boolean;
  bun?: boolean;
  bald?: boolean;
  apron?: boolean;
  tray?: boolean;
}

export type PersonKind = 'regular' | 'walkup' | 'table' | 'waitress';
export type PersonState =
  // patrons
  | 'idle'
  | 'arriving'
  | 'ordering'
  | 'waiting'
  | 'drinking'
  | 'seated'
  | 'done'
  | 'leaving'
  // the waitress
  | 'pickup'
  | 'taking'
  | 'bussing'
  | 'return';

export interface PersonSpec extends Look {
  name: string;
  kind: PersonKind;
  drink?: DrinkKey;
  regular?: boolean;
}

export interface Person extends PersonSpec {
  id: string;
  root: THREE.Group;
  hips: THREE.Group;
  legs: { th: THREE.Group; kn: THREE.Group }[];
  torso: THREE.Group;
  arms: { p: THREE.Group; hand: THREE.Group }[];
  head: THREE.Group;
  trayObj: THREE.Group | null;
  pos: Vec3;
  heading: number;
  wantHeading: number;
  path: Vec3[];
  onArrive?: (() => void) | null;
  speed: number;
  walking: boolean;
  /** walk-cycle phase */
  ph: number;
  /** 0 standing .. 1 seated, eased towards sitTarget */
  sit: number;
  sitTarget: number;
  seatY: number;
  glass: Glass | null;
  sipT: number;
  sipping: number;
  sipRate?: number;
  state: PersonState;
  /** seconds left of the talking head-bob */
  talk: number;
  /** general countdown, e.g. before ordering */
  t?: number;
  stool?: Stool | null;
  seat?: Seat;
  table?: Table;
  waitSince?: number;
  grumbled?: boolean;
  refillT?: number;
  wave?: number;
  rounds?: number;
  carrying?: boolean;
  writing?: boolean;
}

export interface Stool {
  a: number;
  seat: Vec3;
  approach: Vec3;
  /** where this stool's glass sits on the bar */
  spot: Vec3;
  occupant: Person | null;
}

export interface Seat {
  pos: Vec3;
  heading: number;
  /** where this seat's glass sits on the table */
  place: Vec3;
  occupant: Person | null;
  seatY: number;
}

export type TableState = 'free' | 'arriving' | 'waiting' | 'taking' | 'ordered' | 'drinking' | 'dirty' | 'bussing';

export interface Table {
  pos: Vec3;
  seats: Seat[];
  state: TableState;
  group: Person[];
  angle: number;
  waitSince?: number;
}

export type GlassState = 'well' | 'lift' | 'bar' | 'table' | 'station' | 'fall' | 'hand' | 'return' | 'tray' | 'bus';

export interface Glass {
  id: string;
  g: THREE.Group;
  type: DrinkKey;
  liquid: THREE.Mesh;
  head: THREE.Mesh | null;
  state: GlassState;
  pos: Vec3;
  fill: number;
  owner: Person | null;
  t: number;
  from: Vec3;
  to: Vec3;
  next?: GlassState;
  onLand?: ((g: Glass) => void) | null;
  /** 0..1 blend between rest position and the drinker's hand */
  blend: number;
  rest: Vec3;
  restState?: GlassState;
  tilt: number;
  vel: Vec3;
  trayOff?: Vec3;
  claimed?: boolean;
  dead: boolean;
}

export type OrderStatus = 'queued' | 'pouring' | 'ready' | 'delivering' | 'done';

interface OrderBase {
  id: string;
  drinks: DrinkKey[];
  angle: number;
  status: OrderStatus;
  /** drinks poured so far */
  made: number;
  created: number;
  glasses: Glass[];
}
export interface BarOrder extends OrderBase {
  kind: 'bar';
  who: Person;
}
export interface TableOrder extends OrderBase {
  kind: 'table';
  who: Table;
}
export type Order = BarOrder | TableOrder;

export type Emote = EmoteName;
export type HenState = 'idle' | 'move' | 'pour' | 'bus' | 'spilled';
/** glass is set once the pour starts */
export type PourTask = { kind: 'pour'; order: Order; angle: number; glass?: Glass };
export type BusTask = { kind: 'bus'; glass: Glass; angle: number };
export type HenTask = PourTask | BusTask;

export interface Hen {
  angle: number;
  targetAngle: number;
  state: HenState;
  task: HenTask | null;
  t: number;
  idleT?: number;
  dir?: number;
  heading: number;
  phase: number;
  speed: number;
  mood: MoodKey;
  moodI: number;
  look: { yaw: number; pitch: number; ty: number; tp: number; t: number };
  lookAt?: { pos: Vec3 } | null;
  lookT?: number;
  talkT: number;
  emote: Emote | null;
  emoteT: number;
  pours: number;
  auto: boolean;
  /** order id the brain asked to be poured next */
  forced: string | null;
  spin: number;
  root: THREE.Group;
  pelvis: THREE.Group;
  body: THREE.Group;
  neck: THREE.Group;
  head: THREE.Group;
  combMat: THREE.MeshToonMaterial;
  lids: THREE.Mesh[];
  wings: Record<number, THREE.Group>;
  grip: Record<number, THREE.Group>;
  legs: { roll: THREE.Group; hip: THREE.Group; knee: THREE.Group; ankle: THREE.Group }[];
  vessels: Record<DrinkKey, THREE.Group>;
}
