import { rand } from '../core/util.js';
import { lofi, noiseHit } from './lofi.js';

// Glass clink and shatter sound effects (only while lofi audio is on).
export function sfxClink() {
  const ac = lofi.ctx;
  if (!ac || !lofi.on) return;
  const t = ac.currentTime;
  for (const [f, v] of [
    [rand(2300, 2700), 0.05],
    [rand(3500, 4100), 0.025],
  ]) {
    const o = ac.createOscillator(),
      g = ac.createGain();
    o.frequency.value = f;
    g.gain.setValueAtTime(v, t);
    g.gain.exponentialRampToValueAtTime(0.0005, t + 0.3);
    o.connect(g);
    g.connect(lofi.sfx);
    o.start(t);
    o.stop(t + 0.32);
  }
}
export function sfxShatter() {
  const ac = lofi.ctx;
  if (!ac || !lofi.on) return;
  const t = ac.currentTime;
  noiseHit(t, 'highpass', 3200, 0.5, 0.14, 0.35, lofi.sfx);
  for (let i = 0; i < 4; i++) setTimeout(sfxClink, 40 + i * 55);
}
