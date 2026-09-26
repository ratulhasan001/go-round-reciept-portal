"use client";

import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef } from "react";

const KEY = "gr-tank-cleaned"; // when the glass was last wiped clean
const FULL_MS = 72 * 3600_000; // fully green after three days
const read = () => {
  try {
    return Number(localStorage.getItem(KEY)) || 0;
  } catch {
    return 0;
  }
};
const write = (v: number) => {
  try {
    localStorage.setItem(KEY, String(v));
  } catch {
    /* private mode */
  }
};

/** Deterministic randomness so the algae looks the same between reloads. */
function seeded(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let r = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

export interface AlgaeHandle {
  wipe: (x: number, y: number, start: boolean) => void;
}

/**
 * Algae on the front glass: it builds up over the days since the last clean and is scrubbed off with the
 * Clean tool. Reports how dirty the glass is (0 … 1), and calls onClean once it is wiped spotless.
 */
export const Algae = forwardRef<AlgaeHandle, { onDirt: (d: number) => void; onClean: () => void }>(function Algae({ onDirt, onClean }, ref) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const sponge = useRef<HTMLDivElement>(null);
  const hideSponge = useRef(0);
  const state = useRef({ level: 0, baseline: 1, last: null as { x: number; y: number } | null, lastMeasure: 0 });

  const draw = useCallback(() => {
    const c = canvas.current;
    if (!c) return;
    let cleaned = read();
    if (!cleaned) {
      // first visit: start a little grubby so there is something to clean
      cleaned = Date.now() - 30 * 3600_000;
      write(cleaned);
    }
    const level = Math.min(1, Math.max(0, (Date.now() - cleaned) / FULL_MS));
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = c.clientWidth;
    const h = c.clientHeight;
    c.width = Math.round(w * dpr);
    c.height = Math.round(h * dpr);
    const g = c.getContext("2d")!;
    g.scale(dpr, dpr);
    g.clearRect(0, 0, w, h);
    const rnd = seeded(Math.floor(cleaned / 1000));
    // soft patches, thicker near the edges and the bottom, like real tank algae
    const patches = Math.round(70 * level);
    for (let i = 0; i < patches; i++) {
      const edge = rnd() < 0.6;
      const x = edge ? (rnd() < 0.5 ? rnd() * w * 0.2 : w - rnd() * w * 0.2) : rnd() * w;
      const y = rnd() < 0.55 ? h - rnd() * h * 0.45 : rnd() * h;
      const r = 14 + rnd() * 46;
      const grad = g.createRadialGradient(x, y, 0, x, y, r);
      const tone = rnd() < 0.7 ? "74 124 58" : "112 108 52";
      grad.addColorStop(0, `rgb(${tone} / ${0.2 + 0.3 * level})`);
      grad.addColorStop(1, `rgb(${tone} / 0)`);
      g.fillStyle = grad;
      g.beginPath();
      g.arc(x, y, r, 0, Math.PI * 2);
      g.fill();
    }
    for (let i = 0; i < 420 * level; i++) {
      g.fillStyle = `rgb(60 110 50 / ${0.25 + rnd() * 0.35})`;
      g.beginPath();
      g.arc(rnd() * w, rnd() * h, 0.6 + rnd() * 1.6, 0, Math.PI * 2);
      g.fill();
    }
    state.current.level = level;
    state.current.baseline = coverage() || 1;
    onDirt(level);
  }, [onDirt]);

  /** Total alpha left on the glass, measured on a small copy. */
  const coverage = () => {
    const c = canvas.current;
    if (!c || !c.width) return 0;
    const small = document.createElement("canvas");
    small.width = 64;
    small.height = 32;
    const g = small.getContext("2d", { willReadFrequently: true })!;
    g.drawImage(c, 0, 0, 64, 32);
    const d = g.getImageData(0, 0, 64, 32).data;
    let sum = 0;
    for (let i = 3; i < d.length; i += 4) sum += d[i]!;
    return sum;
  };

  useEffect(() => {
    draw();
    const ro = new ResizeObserver(() => draw());
    if (canvas.current) ro.observe(canvas.current);
    // it keeps growing while the page is open
    const id = window.setInterval(() => {
      const s = state.current;
      const fresh = Math.min(1, (Date.now() - read()) / FULL_MS);
      if (fresh - s.level > 0.04 && coverage() / s.baseline > 0.95) draw();
    }, 60_000);
    return () => {
      ro.disconnect();
      clearInterval(id);
    };
  }, [draw]);

  useImperativeHandle(ref, () => ({
    wipe(x, y, start) {
      const c = canvas.current;
      const s = state.current;
      if (!c || s.level === 0) return;
      // a big sponge: about 40% of the tank's height, so a few strokes clean the glass
      const brush = Math.max(110, c.clientHeight * 0.42);
      const ring = sponge.current;
      if (ring) {
        ring.style.width = ring.style.height = `${brush}px`;
        ring.style.transform = `translate3d(${x - brush / 2}px, ${y - brush / 2}px, 0)`;
        ring.style.opacity = "1";
        clearTimeout(hideSponge.current);
        hideSponge.current = window.setTimeout(() => ring && (ring.style.opacity = "0"), 450);
      }
      const g = c.getContext("2d")!;
      g.save();
      g.globalCompositeOperation = "destination-out";
      g.lineCap = "round";
      g.lineWidth = brush;
      g.beginPath();
      const from = start || !s.last ? { x, y } : s.last;
      g.moveTo(from.x, from.y);
      g.lineTo(x + 0.1, y);
      g.stroke();
      g.restore();
      s.last = { x, y };
      const now = performance.now();
      if (now - s.lastMeasure < 250) return;
      s.lastMeasure = now;
      const left = coverage() / s.baseline;
      if (left < 0.08) {
        g.clearRect(0, 0, c.width, c.height);
        write(Date.now());
        s.level = 0;
        onDirt(0);
        onClean();
      } else onDirt(s.level * left);
    },
  }));

  return (
    <>
      <canvas ref={canvas} className="pointer-events-none absolute inset-0 size-full" aria-hidden />
      {/* the sponge, shown while scrubbing */}
      <div
        ref={sponge}
        aria-hidden
        className="pointer-events-none absolute left-0 top-0 rounded-full border-2 border-dashed border-white/80 bg-white/15 opacity-0 shadow-[0_0_24px_rgb(255_255_255/0.5)] backdrop-brightness-110 transition-opacity duration-300"
      />
    </>
  );
});
