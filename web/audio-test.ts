// A standalone page for finding out why a phone plays no sound; not linked from the site.
const $ = (id: string) => document.getElementById(id)!;
const session = (navigator as Navigator & { audioSession?: { type: string } }).audioSession;
let ac: AudioContext | null = null;

function log(msg: string, cls = '') {
  const d = document.createElement('div');
  d.className = cls;
  d.textContent = `${new Date().toLocaleTimeString()}  ${msg}`;
  $('log').prepend(d);
}
function showState() {
  $('state').textContent = [
    `browser:      ${navigator.userAgent}`,
    `AudioContext: ${'AudioContext' in window ? 'yes' : 'webkitAudioContext' in window ? 'webkit only' : 'missing'}`,
    `context:      ${ac ? `${ac.state}, ${ac.sampleRate} Hz, latency ${(ac.baseLatency * 1000).toFixed(1)} ms` : 'not created yet'}`,
    `audioSession: ${session ? session.type : 'not supported'}`,
    `secure page:  ${window.isSecureContext}`,
  ].join('\n');
}
/** Creates or resumes the context; must run inside the tap. */
function context() {
  const AC =
    window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  if (!ac) {
    ac = new AC();
    ac.onstatechange = () => {
      log(`context is now ${ac!.state}`);
      showState();
    };
    log('context created');
  }
  ac.resume().then(
    () => log(`resume ok (${ac!.state})`, 'ok'),
    (e) => log(`resume failed: ${e}`, 'bad'),
  );
  return ac;
}
function beep(freq: number, out?: AudioNode) {
  const c = context();
  const o = c.createOscillator(),
    g = c.createGain(),
    t = c.currentTime;
  o.frequency.value = freq;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.3, t + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.6);
  o.connect(g).connect(out ?? c.destination);
  o.start(t);
  o.stop(t + 0.65);
  log(`Web Audio beep ${freq} Hz scheduled`);
  probe(c, g);
  showState();
}
/** Checks the graph is really producing signal, to tell "not running" from "running but not heard". */
function probe(c: AudioContext, node: AudioNode) {
  const an = c.createAnalyser();
  node.connect(an);
  const t0 = c.currentTime;
  setTimeout(() => log(`audio clock moved ${((c.currentTime - t0) * 1000).toFixed(0)} ms in 500 ms (${c.state})`), 500);
  setTimeout(() => {
    const d = new Float32Array(an.fftSize);
    an.getFloatTimeDomainData(d);
    const peak = d.reduce((m, v) => Math.max(m, Math.abs(v)), 0);
    log(
      `signal in the graph: peak ${peak.toFixed(3)} (${peak > 0.01 ? 'audio is being generated' : 'silent'})`,
      peak > 0.01 ? 'ok' : 'bad',
    );
  }, 200);
}
/** A short sine WAV as a data: URL, so the <audio> test needs no file. */
function wavBeep(freq: number, secs = 0.6, rate = 22050) {
  const n = Math.floor(secs * rate),
    buf = new DataView(new ArrayBuffer(44 + n * 2));
  const str = (o: number, s: string) => {
    for (let i = 0; i < s.length; i++) buf.setUint8(o + i, s.charCodeAt(i));
  };
  str(0, 'RIFF');
  buf.setUint32(4, 36 + n * 2, true);
  str(8, 'WAVEfmt ');
  buf.setUint32(16, 16, true);
  buf.setUint16(20, 1, true);
  buf.setUint16(22, 1, true);
  buf.setUint32(24, rate, true);
  buf.setUint32(28, rate * 2, true);
  buf.setUint16(32, 2, true);
  buf.setUint16(34, 16, true);
  str(36, 'data');
  buf.setUint32(40, n * 2, true);
  for (let i = 0; i < n; i++) {
    const env = Math.min(1, i / 400, (n - i) / 400);
    buf.setInt16(44 + i * 2, Math.sin((2 * Math.PI * freq * i) / rate) * 0.3 * env * 32767, true);
  }
  let bin = '';
  for (const b of new Uint8Array(buf.buffer)) bin += String.fromCharCode(b);
  return `data:audio/wav;base64,${btoa(bin)}`;
}
function playElement(freq: number) {
  const a = new Audio(wavBeep(freq));
  return a.play().then(
    () => log(`<audio> playing ${freq} Hz`, 'ok'),
    (e) => log(`<audio> play failed: ${e}`, 'bad'),
  );
}

$('t1').addEventListener('click', () => beep(440));
$('t5').addEventListener('click', async () => {
  const c = context();
  try {
    const data = await (await fetch(wavBeep(880))).arrayBuffer();
    const src = c.createBufferSource();
    src.buffer = await c.decodeAudioData(data);
    src.connect(c.destination);
    src.start();
    log('Web Audio decoded-sample beep 880 Hz started', 'ok');
  } catch (e) {
    log(`decoded sample failed: ${e}`, 'bad');
  }
});
$('t6').addEventListener('click', () => {
  const AC = window.AudioContext;
  const c2 = new AC({ latencyHint: 'playback' });
  c2.resume().then(() => log(`playback-latency context ${c2.state}, ${c2.sampleRate} Hz`, 'ok'));
  const o = c2.createOscillator(),
    g = c2.createGain(),
    t = c2.currentTime;
  o.frequency.value = 990;
  g.gain.setValueAtTime(0.3, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.6);
  o.connect(g).connect(c2.destination);
  o.start(t);
  o.stop(t + 0.65);
  log('beep 990 Hz on a second context (latencyHint playback)');
});
let streamEl: HTMLAudioElement | null = null;
$('t7').addEventListener('click', () => {
  const c = context();
  const dest = c.createMediaStreamDestination();
  if (!streamEl) streamEl = new Audio();
  streamEl.srcObject = dest.stream;
  streamEl.play().then(
    () => log('<audio> is playing the Web Audio stream', 'ok'),
    (e) => log(`<audio> stream play failed: ${e}`, 'bad'),
  );
  beep(1100, dest);
});
$('t2').addEventListener('click', () => {
  if (session) {
    session.type = 'playback';
    log('audioSession.type = playback');
  } else log('audioSession not supported here; plain beep', 'bad');
  beep(550);
});
$('t3').addEventListener('click', () => playElement(660));
$('t4').addEventListener('click', () => {
  playElement(330);
  beep(770);
});
/** Encodes rendered samples as a 16-bit mono WAV blob. */
function toWav(buf: AudioBuffer) {
  const d = buf.getChannelData(0),
    n = d.length,
    v = new DataView(new ArrayBuffer(44 + n * 2));
  const str = (o: number, t: string) => {
    for (let i = 0; i < t.length; i++) v.setUint8(o + i, t.charCodeAt(i));
  };
  str(0, 'RIFF');
  v.setUint32(4, 36 + n * 2, true);
  str(8, 'WAVEfmt ');
  v.setUint32(16, 16, true);
  v.setUint16(20, 1, true);
  v.setUint16(22, 1, true);
  v.setUint32(24, buf.sampleRate, true);
  v.setUint32(28, buf.sampleRate * 2, true);
  v.setUint16(32, 2, true);
  v.setUint16(34, 16, true);
  str(36, 'data');
  v.setUint32(40, n * 2, true);
  for (let i = 0; i < n; i++) v.setInt16(44 + i * 2, Math.max(-1, Math.min(1, d[i]!)) * 32767, true);
  return new Blob([v.buffer], { type: 'audio/wav' });
}
$('t8').addEventListener('click', async () => {
  // started inside the tap, so the element may play once the render is done
  const el = new Audio();
  el.play().catch(() => {});
  try {
    const off = new OfflineAudioContext(1, 44100 * 1.2, 44100);
    for (const [f, at] of [
      [523, 0],
      [659, 0.3],
      [784, 0.6],
    ] as const) {
      const o = off.createOscillator(),
        g = off.createGain();
      o.type = 'triangle';
      o.frequency.value = f;
      g.gain.setValueAtTime(0.0001, at);
      g.gain.exponentialRampToValueAtTime(0.3, at + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, at + 0.55);
      o.connect(g).connect(off.destination);
      o.start(at);
      o.stop(at + 0.6);
    }
    const t0 = performance.now();
    const rendered = await off.startRendering();
    log(`offline render took ${(performance.now() - t0).toFixed(0)} ms`, 'ok');
    el.src = URL.createObjectURL(toWav(rendered));
    await el.play();
    log('<audio> playing the offline-rendered chime', 'ok');
  } catch (e) {
    log(`offline render or playback failed: ${e}`, 'bad');
  }
});
showState();
