import * as THREE from 'three';

// Toon materials, the shared palette and pixel-art canvas textures.
const GRAD = (() => {
  const d = new Uint8Array([86, 86, 86, 255, 175, 175, 175, 255, 255, 255, 255, 255]);
  const t = new THREE.DataTexture(d, 3, 1, THREE.RGBAFormat);
  t.minFilter = t.magFilter = THREE.NearestFilter;
  t.generateMipmaps = false;
  t.needsUpdate = true;
  return t;
})();
export const toon = (c, o) => new THREE.MeshToonMaterial(Object.assign({ color: c, gradientMap: GRAD }, o || {}));
export const M = {
  mahog: toon(0x4a2416),
  mahogTop: toon(0x5e2f1a),
  mahogDark: toon(0x2a140b),
  brass: toon(0xc89a3e, { emissive: 0x1e1200 }),
  leather: toon(0x6a1c18),
  green: toon(0x2f5a3a),
  felt: toon(0x2a6a44),
  cream: toon(0xe8dcc0),
  black: toon(0x161210),
  boot: toon(0x231710),
  bulb: new THREE.MeshBasicMaterial({ color: 0xffe6b0 }),
  shell: toon(0xf1ece2),
  copper: toon(0xb8673a, { emissive: 0x1a0800 }),
  comb: toon(0xd8302a, { emissive: 0x300000 }),
  beak: toon(0xe8ae22),
  tie: toon(0x111111),
  glassThick: toon(0xb8e0e2, { emissive: 0x0a1a1a }),
  iron: toon(0x3a3a3a),
  steel: toon(0x8e979e),
  apron: toon(0xf2efe6),
  tray: toon(0x9aa2a8),
};
export const GLASS = toon(0xd0eef0, { transparent: true, opacity: 0.38, side: THREE.DoubleSide });
export const redraws = [];
export function ctex(w, h, draw, rep) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const g = c.getContext('2d');
  const t = new THREE.CanvasTexture(c);
  t.magFilter = t.minFilter = THREE.NearestFilter;
  t.generateMipmaps = false;
  if (rep) {
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(rep[0], rep[1]);
  }
  const run = () => {
    g.clearRect(0, 0, w, h);
    draw(g, w, h);
    t.needsUpdate = true;
  };
  run();
  redraws.push(run);
  return t;
}
