// Mutable values written from more than one module (ES module imports are read-only).
export interface State {
  doorSwing: number;
  music: boolean;
  lightLevel: number;
  faceFlash: number;
  moodFlash: boolean;
  /** target height of the scene in art pixels; the pixel scale is worked out from it */
  artRows: number;
  /** opacity of the glassware shells */
  glassOpacity: number;
  /** stage shape whose framing every window gets at the same zoom; 0 = fixed height */
  idealAspect: number;
  /** widest stage aspect before the rest becomes a dark frame; 0 = no cap */
  maxAspect: number;
  autoOrbit: boolean;
  /** the post pass's outline (ink) lines */
  inkLines: boolean;
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
  artRows: 414,
  glassOpacity: 0.2,
  idealAspect: 1.6,
  maxAspect: 0,
  autoOrbit: true,
  inkLines: true,
  idleT: 0,
  wireEl: null,
  wireState: false,
};
