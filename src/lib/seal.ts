"use client";

import type { Invoice, Shop } from "./types";
import { computeTotals, fmtDate, money } from "./calc";

export type SealKind = "PAID" | "DUE";

const COLORS: Record<SealKind, string> = {
  PAID: "#3E7A18",
  DUE: "#B0301F",
};

export interface SealSpec {
  kind: SealKind;
  shop: string;
  number: string;
  detail: string; // date for PAID, amount for DUE
}

/** Which seal (if any) a receipt gets - fully automatic from its payments. */
export function sealFor(inv: Invoice, shop: Shop): SealSpec | null {
  const t = computeTotals(inv);
  if (t.grandTotal <= 0) return null;
  if (t.status === "PAID") return { kind: "PAID", shop: shop.name, number: inv.number, detail: fmtDate(t.lastPayment).toUpperCase() };
  return { kind: "DUE", shop: shop.name, number: inv.number, detail: `BDT ${money(t.due)}` };
}

const cssFont = (v: string, fallback: string) =>
  (typeof document !== "undefined" && getComputedStyle(document.documentElement).getPropertyValue(v).trim()) || fallback;

const cache = new Map<string, string>();

/**
 * Draws a plain, professional rubber-stamp seal: two thin rings, the shop name
 * around the top, the receipt number around the bottom, and PAID / DUE in the
 * centre with the date or amount beneath. Returns a transparent PNG data URL.
 */
export async function drawSeal(spec: SealSpec): Promise<string> {
  const key = JSON.stringify(spec);
  const hit = cache.get(key);
  if (hit) return hit;

  const display = cssFont("--font-bricolage", "'Bricolage Grotesque', sans-serif");
  const body = cssFont("--font-manrope", "'Manrope', sans-serif");
  try {
    await Promise.all([document.fonts.load(`700 100px ${display}`), document.fonts.load(`700 30px ${body}`)]);
  } catch {
    /* fall back to whatever is available */
  }

  const S = 640;
  const c = document.createElement("canvas");
  c.width = c.height = S;
  const g = c.getContext("2d")!;
  const ink = COLORS[spec.kind];
  g.translate(S / 2, S / 2);
  g.globalAlpha = 0.88;
  g.strokeStyle = ink;
  g.fillStyle = ink;
  g.textAlign = "center";
  g.textBaseline = "middle";

  const ring = (r: number, w: number) => {
    g.beginPath();
    g.arc(0, 0, r, 0, Math.PI * 2);
    g.lineWidth = w;
    g.stroke();
  };
  ring(300, 9);
  ring(284, 2.5);
  ring(196, 2.5);

  // evenly tracked lettering along an arc; top reads clockwise, bottom reads left-to-right
  const arcText = (text: string, radius: number, center: number, bottom: boolean) => {
    g.font = `700 30px ${body}`;
    const track = 7;
    const chars = [...text];
    const widths = chars.map((ch) => g.measureText(ch).width + track);
    const total = widths.reduce((a, b) => a + b, 0) - track;
    let a = center + ((bottom ? 1 : -1) * total) / 2 / radius;
    chars.forEach((ch, i) => {
      const w = widths[i];
      const step = (w - (i === chars.length - 1 ? track : 0)) / radius;
      const mid = a + ((bottom ? -1 : 1) * (w - track)) / 2 / radius;
      g.save();
      g.rotate(mid);
      g.translate(0, bottom ? radius : -radius);
      g.fillText(ch, 0, 0);
      g.restore();
      a += (bottom ? -1 : 1) * (step + (i === chars.length - 1 ? 0 : 0));
    });
  };
  arcText(spec.shop.toUpperCase(), 240, 0, false);
  arcText(`RECEIPT  ${spec.number}`, 240, 0, true);

  // small dividers at 9 and 3 o'clock
  for (const x of [-240, 240]) {
    g.beginPath();
    g.arc(x, 0, 6, 0, Math.PI * 2);
    g.fill();
  }

  // centre: rule, word, rule, detail
  const word = spec.kind;
  let size = 128;
  g.font = `700 ${size}px ${display}`;
  while (g.measureText(word).width > 300 && size > 60) g.font = `700 ${(size -= 4)}px ${display}`;
  g.fillText(word, 0, -8);

  g.lineWidth = 2.5;
  for (const y of [-86, 62]) {
    g.beginPath();
    g.moveTo(-120, y);
    g.lineTo(120, y);
    g.stroke();
  }

  let ds = 26;
  g.font = `700 ${ds}px ${body}`;
  while (g.measureText(spec.detail).width > 250 && ds > 14) g.font = `700 ${(ds -= 1)}px ${body}`;
  g.fillText(spec.detail, 0, 100);

  const url = c.toDataURL("image/png");
  cache.set(key, url);
  return url;
}
