// Mutable values written from more than one module (ES module imports are read-only).
export interface State {
  doorSwing: number;
  music: boolean;
  lightLevel: number;
  faceFlash: number;
  moodFlash: boolean;
  /** render pixel size */
  PIX: number;
  autoOrbit: boolean;
  /** seconds since the visitor last touched the camera */
  idleT: number;
  /** the wire debug window's log element, once built */
  wireEl: HTMLDivElement | null;
  /** log state snapshots in the wire window too */
  wireState: boolean;
}
export const state: State = {
  doorSwing: 0,
  music: true,
  lightLevel: 0.8,
  faceFlash: 0,
  moodFlash: true,
  PIX: 3,
  autoOrbit: true,
  idleT: 0,
  wireEl: null,
  wireState: false,
};
