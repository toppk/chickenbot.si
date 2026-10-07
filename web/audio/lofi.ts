import { state } from '../core/state.ts';
import { pick, rand } from '../core/util.ts';
import { wS } from '../scene/room.ts';
import { hen } from '../scene/hen-model.ts';
import { send } from '../brain/link.ts';
import { byId } from '../core/dom.ts';
import type { MoodKey } from '../sim/hen-behaviour.ts';

// Lofi music generated live with Web Audio, off until asked for.
type ProgName = 'easy' | 'jazz' | 'blue';
/** a four-chord loop: chord names, voicings (MIDI notes) and bass roots */
interface Prog {
  names: string[];
  ch: number[][];
  root: number[];
}
interface Lofi {
  ctx: AudioContext | null;
  on: boolean;
  vol: number;
  bpm: number;
  style: ProgName | '';
  /** when the next record-revolution pop is due */
  revNext: number;
  /** sixteenth-note counter and when the next one is due */
  step: number;
  next: number;
  timer: number | null;
  /** jukebox glow kick, decays per frame */
  pulse: number;
  chordName: string;
  prog: Prog | null;
  pourOn: boolean;
  // the audio graph, built by lofiInit; only touched once ctx is set
  master: GainNode;
  bus: BiquadFilterNode;
  sfx: GainNode;
  keys: GainNode;
  wow: GainNode;
  noise: AudioBuffer;
  perc: BiquadFilterNode;
  needleOut: GainNode;
  rain: GainNode;
  pour: GainNode;
}
export const lofi = {
  ctx: null,
  on: false,
  vol: 0.5,
  bpm: 72,
  style: '',
  revNext: 0,
  step: 0,
  next: 0,
  timer: null,
  pulse: 0,
  chordName: '',
  prog: null,
  pourOn: false,
} as Lofi;
const mtof = (m: number) => 440 * 2 ** ((m - 69) / 12);
const PROGS: Record<ProgName, Prog> = {
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
const MOOD_MUSIC: Record<MoodKey, [ProgName, number]> = {
  cheery: ['jazz', 78],
  content: ['easy', 72],
  grumpy: ['blue', 70],
  frazzled: ['jazz', 86],
  sleepy: ['easy', 62],
  smitten: ['jazz', 74],
};
function lofiInit() {
  const AC =
    window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return false;
  const ac = new AC();
  lofi.ctx = ac;
  const master = ac.createGain();
  master.gain.value = 0;
  master.connect(ac.destination);
  lofi.master = master;
  const comp = ac.createDynamicsCompressor();
  comp.threshold.value = -20;
  comp.ratio.value = 3;
  comp.connect(master);
  const muffle = ac.createBiquadFilter();
  muffle.type = 'lowpass';
  muffle.frequency.value = 3000;
  muffle.Q.value = 0.4;
  muffle.connect(comp);
  lofi.bus = muffle;
  const sfx = ac.createGain();
  sfx.gain.value = 0.7;
  sfx.connect(comp);
  lofi.sfx = sfx;
  // electric piano bus with tremolo
  const trem = ac.createGain();
  trem.gain.value = 0.85;
  trem.connect(muffle);
  lofi.keys = trem;
  const tl = ac.createOscillator();
  tl.frequency.value = 4.2;
  const tg = ac.createGain();
  tg.gain.value = 0.15;
  tl.connect(tg);
  tg.connect(trem.gain);
  tl.start();
  // tape wow: slow pitch drift on every voice
  const wow = ac.createOscillator();
  wow.frequency.value = 0.45;
  const wg = ac.createGain();
  wg.gain.value = 9;
  wow.connect(wg);
  wow.start();
  lofi.wow = wg;
  const nb = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate),
    d = nb.getChannelData(0);
  let b = 0;
  for (let i = 0; i < d.length; i++) {
    const w = Math.random() * 2 - 1;
    b = 0.97 * b + 0.03 * w;
    d[i] = w * 0.6 + b * 2;
  }
  lofi.noise = nb;
  const loop = (type: BiquadFilterType, f: number, q: number, g: number, dest: AudioNode) => {
    const src = ac.createBufferSource();
    src.buffer = nb;
    src.loop = true;
    const flt = ac.createBiquadFilter();
    flt.type = type;
    flt.frequency.value = f;
    flt.Q.value = q;
    const gn = ac.createGain();
    gn.gain.value = g;
    src.connect(flt);
    flt.connect(gn);
    gn.connect(dest);
    src.start();
    return gn;
  };
  loop('lowpass', 5000, 0.3, 0.012, muffle); // vinyl hiss
  loop('lowpass', 55, 0.7, 0.05, comp); // turntable rumble
  const perc = ac.createBiquadFilter();
  perc.type = 'lowpass';
  perc.frequency.value = 7500;
  perc.connect(comp);
  lofi.perc = perc;
  const needle = ac.createGain();
  needle.gain.value = 1;
  needle.connect(ac.destination);
  lofi.needleOut = needle;
  lofi.rain = loop('bandpass', 1100, 0.6, 0.0, sfx); // rain at the window
  lofi.pour = loop('bandpass', 650, 1.2, 0.0, sfx); // the pour
  lofi.next = ac.currentTime + 0.15;
  lofi.step = 0;
  lofi.revNext = ac.currentTime + 0.5;
  lofi.timer = window.setInterval(lofiTick, 30);
  return true;
}
/** attack to peak, decay towards peak*sus, release at end */
function env(g: GainNode, t: number, a: number, peak: number, dec: number, sus: number, end: number) {
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(peak, t + a);
  g.gain.setTargetAtTime(peak * sus, t + a, dec);
  g.gain.setTargetAtTime(0.0001, end, 0.12);
}
/** electric piano note */
function epNote(m: number, t: number, dur: number, v: number) {
  const ac = lofi.ctx!,
    f = mtof(m),
    g = ac.createGain();
  g.connect(lofi.keys);
  const o1 = ac.createOscillator();
  o1.type = 'sine';
  o1.frequency.value = f;
  const o2 = ac.createOscillator();
  o2.type = 'triangle';
  o2.frequency.value = f * 2;
  const g2 = ac.createGain();
  g2.gain.value = 0.12;
  lofi.wow.connect(o1.detune);
  lofi.wow.connect(o2.detune);
  o1.connect(g);
  o2.connect(g2);
  g2.connect(g);
  env(g, t, 0.008, v, 0.5, 0.35, t + dur);
  o1.start(t);
  o2.start(t);
  o1.stop(t + dur + 0.8);
  o2.stop(t + dur + 0.8);
}
function bassNote(m: number, t: number, dur: number) {
  const ac = lofi.ctx!,
    o = ac.createOscillator();
  o.type = 'triangle';
  o.frequency.value = mtof(m);
  const f = ac.createBiquadFilter();
  f.type = 'lowpass';
  f.frequency.value = 420;
  const g = ac.createGain();
  lofi.wow.connect(o.detune);
  o.connect(f);
  f.connect(g);
  g.connect(lofi.bus);
  env(g, t, 0.015, 0.22, 0.4, 0.6, t + dur);
  o.start(t);
  o.stop(t + dur + 0.6);
}
function kick(t: number) {
  const ac = lofi.ctx!,
    o = ac.createOscillator(),
    g = ac.createGain();
  o.frequency.setValueAtTime(115, t);
  o.frequency.exponentialRampToValueAtTime(42, t + 0.12);
  g.gain.setValueAtTime(0.55, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.32);
  o.connect(g);
  g.connect(lofi.bus);
  o.start(t);
  o.stop(t + 0.35);
  setTimeout(
    () => {
      lofi.pulse = 1;
    },
    Math.max(0, (t - ac.currentTime) * 1000),
  );
}
export function noiseHit(
  t: number,
  type: BiquadFilterType,
  f: number,
  q: number,
  v: number,
  dec: number,
  dest?: AudioNode,
) {
  const ac = lofi.ctx!,
    s = ac.createBufferSource();
  s.buffer = lofi.noise;
  const fl = ac.createBiquadFilter();
  fl.type = type;
  fl.frequency.value = f;
  fl.Q.value = q;
  const g = ac.createGain();
  g.gain.setValueAtTime(v, t);
  g.gain.exponentialRampToValueAtTime(0.0008, t + dec);
  s.connect(fl);
  fl.connect(g);
  g.connect(dest || lofi.bus);
  s.start(t, Math.random() * 1.5);
  s.stop(t + dec + 0.05);
}
function snare(t: number) {
  noiseHit(t, 'bandpass', 1900, 0.7, 0.2, 0.2);
  const ac = lofi.ctx!,
    o = ac.createOscillator(),
    g = ac.createGain();
  o.frequency.value = 185;
  g.gain.setValueAtTime(0.12, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.09);
  o.connect(g);
  g.connect(lofi.bus);
  o.start(t);
  o.stop(t + 0.1);
}
function lofiTick() {
  const ac = lofi.ctx;
  if (ac?.state !== 'running') return;
  while (lofi.next < ac.currentTime + 0.2) {
    lofiStep(lofi.step, lofi.next);
    lofi.next += 60 / lofi.bpm / 4;
    lofi.step++;
  }
  while (lofi.revNext < ac.currentTime + 0.2) {
    pop(lofi.revNext, 0.045, 1300);
    lofi.revNext += 60 / 33.333;
  }
}
function lofiStep(step: number, t0: number) {
  const s = step % 16,
    bar = Math.floor(step / 16),
    s16 = 60 / lofi.bpm / 4,
    t = t0 + (s % 2 ? s16 * 0.2 : 0);
  if (s === 0 && (bar % 4 === 0 || !lofi.prog)) {
    const [pk, bpm] = MOOD_MUSIC[hen.mood] || MOOD_MUSIC.content;
    lofi.prog = PROGS[pk];
    lofi.bpm = bpm;
    lofi.style = pk;
  }
  const P = lofi.prog!,
    ci = bar % 4,
    ch = P.ch[ci];
  if (s === 0) {
    lofi.chordName = P.names[ci];
    ch.forEach((m, i) => {
      epNote(m, t + i * 0.014 + Math.random() * 0.01, s16 * 14, 0.055);
    });
    bassNote(P.root[ci], t, s16 * 6);
  }
  if (s === 10) {
    if (Math.random() < 0.45)
      ch.forEach((m, i) => {
        epNote(m, t + i * 0.012, s16 * 5, 0.035);
      });
    bassNote(P.root[ci] + (Math.random() < 0.5 ? 7 : 0), t, s16 * 4);
  }
  const sleepy = hen.mood === 'sleepy',
    busy = hen.mood === 'frazzled';
  if (s === 0 || s === 10 || (s === 7 && Math.random() < 0.3)) kick(t);
  if (s === 4 || s === 12) snare(t + 0.022);
  if (s % 2 === 0 && !(sleepy && s % 4))
    noiseHit(t, 'highpass', 7000, 0.5, (s % 4 ? 0.03 : 0.05) * rand(0.6, 1), 0.045);
  if (busy && s % 2 === 1 && Math.random() < 0.5) noiseHit(t, 'highpass', 8000, 0.5, 0.02, 0.03);
  if ((s === 2 || s === 6 || s === 14) && Math.random() < 0.16) {
    const top = ch[ch.length - 1] + 12,
      sc = [0, 2, 4, 7, 9];
    epNote(top + pick(sc) - (Math.random() < 0.5 ? 12 : 0), t, s16 * 3, 0.03);
  }
  // record surface: fine crackle every step, a bigger pop now and then
  const n = 1 + ((Math.random() * 3) | 0);
  for (let i = 0; i < n; i++)
    noiseHit(t0 + Math.random() * s16, 'bandpass', rand(2200, 4200), 0.6, rand(0.006, 0.028), 0.0025);
  if (Math.random() < 0.05) pop(t0 + Math.random() * s16, rand(0.05, 0.11), rand(700, 1000));
  if (lofi.style === 'jazz') barPerc(step, t);
}
function pop(t: number, v: number, f: number) {
  const ac = lofi.ctx!;
  noiseHit(t, 'lowpass', f, 0.7, v, 0.012);
  const o = ac.createOscillator(),
    g = ac.createGain();
  o.frequency.value = 70;
  g.gain.setValueAtTime(v * 0.5, t);
  g.gain.exponentialRampToValueAtTime(0.0005, t + 0.05);
  o.connect(g);
  g.connect(lofi.bus);
  o.start(t);
  o.stop(t + 0.06);
}
// bar percussion for the jazzy style: ice in a glass, a bottle-tap clave, soft bongos
function ice(t: number, v: number) {
  for (let i = 0; i < 3; i++)
    noiseHit(t + i * rand(0.006, 0.014), 'bandpass', rand(5500, 9000), 2.5, v * rand(0.5, 1), 0.012, lofi.perc);
}
function bottle(t: number, f: number, v: number) {
  const ac = lofi.ctx!;
  for (const [m, a] of [
    [1, 1],
    [2.76, 0.25],
  ]) {
    const o = ac.createOscillator(),
      g = ac.createGain();
    o.frequency.value = f * m;
    g.gain.setValueAtTime(v * a, t);
    g.gain.exponentialRampToValueAtTime(0.0005, t + 0.07 / m + 0.02);
    o.connect(g);
    g.connect(lofi.perc);
    o.start(t);
    o.stop(t + 0.12);
  }
}
function bongo(t: number, f: number, v: number) {
  const ac = lofi.ctx!,
    o = ac.createOscillator(),
    g = ac.createGain();
  o.frequency.setValueAtTime(f * 1.35, t);
  o.frequency.exponentialRampToValueAtTime(f, t + 0.025);
  g.gain.setValueAtTime(v, t);
  g.gain.exponentialRampToValueAtTime(0.0005, t + 0.14);
  o.connect(g);
  g.connect(lofi.perc);
  o.start(t);
  o.stop(t + 0.16);
}
function barPerc(step: number, t: number) {
  const s = step % 16,
    s32 = step % 32;
  ice(t, s % 4 === 2 ? 0.05 : 0.022);
  if ([0, 6, 12, 20, 24].includes(s32)) bottle(t, s32 < 16 ? rand(1120, 1180) : rand(860, 900), 0.05);
  if (s === 3 && Math.random() < 0.7) bongo(t, 340, 0.07);
  if (s === 7 && Math.random() < 0.6) bongo(t, 232, 0.08);
  if (s === 11 && Math.random() < 0.5) bongo(t, 340, 0.05);
  if (s === 14 && Math.random() < 0.6) bongo(t, 232, 0.06);
}
/** the stylus going down (true) or lifting off */
function needle(down: boolean) {
  const ac = lofi.ctx;
  if (!ac) return;
  const t = ac.currentTime + 0.02,
    out = lofi.needleOut;
  out.gain.value = Math.max(0.15, lofi.vol);
  if (down) {
    const o = ac.createOscillator(),
      g = ac.createGain();
    o.frequency.setValueAtTime(90, t);
    o.frequency.exponentialRampToValueAtTime(40, t + 0.15);
    g.gain.setValueAtTime(0.25, t);
    g.gain.exponentialRampToValueAtTime(0.0005, t + 0.25);
    o.connect(g);
    g.connect(out);
    o.start(t);
    o.stop(t + 0.3);
    for (let i = 0; i < 10; i++)
      noiseHit(t + i * 0.03 + Math.random() * 0.02, 'bandpass', rand(1500, 3500), 0.6, rand(0.03, 0.08), 0.004, out);
  } else {
    const sr = ac.createBufferSource();
    sr.buffer = lofi.noise;
    const f = ac.createBiquadFilter();
    f.type = 'bandpass';
    f.Q.value = 2;
    f.frequency.setValueAtTime(2400, t);
    f.frequency.exponentialRampToValueAtTime(700, t + 0.18);
    const g = ac.createGain();
    g.gain.setValueAtTime(0.09, t);
    g.gain.exponentialRampToValueAtTime(0.0005, t + 0.22);
    sr.connect(f);
    f.connect(g);
    g.connect(out);
    sr.start(t);
    sr.stop(t + 0.25);
  }
}
export function setLofi(on: boolean) {
  if (on && !lofi.ctx && !lofiInit()) return;
  lofi.on = on;
  const ac = lofi.ctx;
  if (!ac) return;
  if (on) {
    ac.resume().then(() => {
      needle(true);
      if (lofi.next < ac.currentTime) lofi.next = ac.currentTime + 0.35;
      if (lofi.revNext < ac.currentTime) lofi.revNext = ac.currentTime + 0.5;
    });
  } else {
    needle(false);
  }
  if (!on)
    setTimeout(() => {
      if (!lofi.on && ac.state === 'running') ac.suspend();
    }, 1600);
  byId('lofilamp').classList.toggle('on', on);
  byId('lofibtn').setAttribute('aria-pressed', String(on));
  send({ type: 'event', event: 'lofi', on });
}
export function lofiFrame() {
  const ac = lofi.ctx;
  if (!ac) return;
  const t = ac.currentTime;
  lofi.master.gain.setTargetAtTime(lofi.on ? lofi.vol * (state.music ? 1 : 0.25) : 0, t, 0.5);
  lofi.rain.gain.setTargetAtTime(lofi.on ? (wS.fade < 0.5 ? 0.05 : 0.012) : 0, t, 0.4);
  const pouring = hen.state === 'pour' && lofi.on;
  if (pouring !== lofi.pourOn) {
    lofi.pourOn = pouring;
    lofi.pour.gain.setTargetAtTime(pouring ? 0.06 : 0, t, 0.06);
  }
}
byId('lofibtn').addEventListener('click', () => setLofi(!lofi.on));
