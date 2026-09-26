// Tank sounds, synthesised with Web Audio (no files): a soft filter hum and small effects.
// Everything stays silent until setSound(true) is called from a tap (browsers require a gesture).

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let noise: AudioBuffer | null = null;
let hum: { src: AudioBufferSourceNode; lfo: OscillatorNode } | null = null;
let enabled = false;
const last: Record<string, number> = {};

function audio() {
  if (!ctx) {
    ctx = new AudioContext();
    master = ctx.createGain();
    master.gain.value = 0;
    master.connect(ctx.destination);
    // one second of white noise, reused by every noisy effect
    noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const d = noise.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

function startHum(c: AudioContext) {
  if (hum) return;
  // brown noise through a low-pass filter sounds like a running filter pump
  const buf = c.createBuffer(1, c.sampleRate * 3, c.sampleRate);
  const d = buf.getChannelData(0);
  let v = 0;
  for (let i = 0; i < d.length; i++) {
    v = (v + 0.02 * (Math.random() * 2 - 1)) / 1.02;
    d[i] = v * 3.5;
  }
  const src = c.createBufferSource();
  src.buffer = buf;
  src.loop = true;
  const lp = c.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.value = 260;
  const g = c.createGain();
  g.gain.value = 0.16;
  // slow swell
  const lfo = c.createOscillator();
  lfo.frequency.value = 0.12;
  const depth = c.createGain();
  depth.gain.value = 0.05;
  lfo.connect(depth).connect(g.gain);
  src.connect(lp).connect(g).connect(master!);
  src.start();
  lfo.start();
  hum = { src, lfo };
}

export function setSound(on: boolean) {
  enabled = on;
  if (on) {
    const c = audio();
    startHum(c);
    master!.gain.setTargetAtTime(0.7, c.currentTime, 0.3);
  } else if (ctx && master) {
    master.gain.setTargetAtTime(0, ctx.currentTime, 0.15);
    const h = hum;
    hum = null;
    window.setTimeout(() => {
      h?.src.stop();
      h?.lfo.stop();
    }, 800);
  }
}

export type Sfx = "bubble" | "splash" | "tap" | "plop" | "chomp" | "chime" | "coins" | "thunder" | "rumble" | "sparkle" | "catch";

/** Plays an effect (quietly, and not too often). */
export function sfx(name: Sfx) {
  if (!enabled || !ctx || !master) return;
  const c = ctx;
  const t = c.currentTime;
  const gap = { bubble: 0.09, splash: 0.12, tap: 0.08, plop: 0.05, chomp: 0.2, chime: 0.5, coins: 0.5, thunder: 1.5, rumble: 0.6, sparkle: 0.3, catch: 0.3 }[name];
  if (t - (last[name] ?? -1) < gap) return;
  last[name] = t;

  const tone = (type: OscillatorType, f0: number, f1: number, dur: number, vol: number, at = t) => {
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f0, at);
    o.frequency.exponentialRampToValueAtTime(f1, at + dur);
    g.gain.setValueAtTime(0.0001, at);
    g.gain.exponentialRampToValueAtTime(vol, at + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
    o.connect(g).connect(master!);
    o.start(at);
    o.stop(at + dur + 0.02);
  };
  const hiss = (type: BiquadFilterType, freq: number, dur: number, vol: number) => {
    const s = c.createBufferSource();
    s.buffer = noise;
    const f = c.createBiquadFilter();
    f.type = type;
    f.frequency.value = freq;
    const g = c.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f).connect(g).connect(master!);
    s.start(t);
    s.stop(t + dur);
  };

  switch (name) {
    case "bubble": {
      const f = 380 + Math.random() * 420;
      tone("sine", f, f * 2.6, 0.07, 0.07);
      break;
    }
    case "splash":
      hiss("highpass", 1800, 0.12, 0.05);
      break;
    case "tap":
      tone("triangle", 2300, 1900, 0.14, 0.12);
      tone("sine", 3400, 3100, 0.09, 0.05);
      break;
    case "plop":
      tone("sine", 220, 90, 0.12, 0.12);
      break;
    case "chomp":
      hiss("lowpass", 420, 0.14, 0.3);
      tone("sine", 110, 60, 0.12, 0.2);
      break;
    case "chime":
      [523, 659, 784, 1047].forEach((f, i) => tone("sine", f, f, 0.5, 0.07, t + i * 0.11));
      break;
    case "thunder":
      hiss("lowpass", 140, 2.2, 0.6);
      hiss("lowpass", 600, 0.35, 0.25);
      break;
    case "rumble":
      hiss("lowpass", 220, 0.7, 0.4);
      tone("sine", 70, 45, 0.6, 0.2);
      break;
    case "sparkle":
      [1568, 2093, 2637, 3136].forEach((f, i) => tone("sine", f, f, 0.25, 0.05, t + i * 0.06));
      break;
    case "catch":
      tone("triangle", 660, 990, 0.18, 0.1);
      tone("sine", 990, 1320, 0.25, 0.07, t + 0.12);
      break;
    case "coins":
      for (let i = 0; i < 7; i++) {
        const f = 1800 + Math.random() * 900;
        tone("triangle", f, f * 1.05, 0.12, 0.05, t + i * 0.07);
      }
      break;
  }
}
