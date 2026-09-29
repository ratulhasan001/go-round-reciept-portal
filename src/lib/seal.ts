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

/** Seal image size in px; it is a landscape rectangle (width : height = SEAL_W : SEAL_H). */
export const SEAL_W = 720;
export const SEAL_H = 400;

/**
 * Draws a plain, professional rectangular rubber-stamp seal: a thick and a thin
 * border, the shop name across the top, PAID / DUE in the centre between two
 * rules, and the receipt number with the date or amount beneath.
 * Returns a transparent PNG data URL.
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

  const W = SEAL_W;
  const H = SEAL_H;
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const g = c.getContext("2d")!;
  const ink = COLORS[spec.kind];
  g.globalAlpha = 0.88;
  g.strokeStyle = ink;
  g.fillStyle = ink;
  g.textBaseline = "middle";

  const frame = (inset: number, w: number, r: number) => {
    g.beginPath();
    g.roundRect(inset, inset, W - inset * 2, H - inset * 2, r);
    g.lineWidth = w;
    g.stroke();
  };
  frame(8, 10, 22);
  frame(28, 3, 10);

  // evenly tracked, centred single line of text, shrunk to fit maxW
  const tracked = (text: string, y: number, size: number, maxW: number, track: number, family: string) => {
    const chars = [...text];
    const width = () => chars.reduce((a, ch) => a + g.measureText(ch).width + track, 0) - track;
    g.font = `700 ${size}px ${family}`;
    while (width() > maxW && size > 12) g.font = `700 ${(size -= 1)}px ${family}`;
    let x = (W - width()) / 2;
    g.textAlign = "left";
    for (const ch of chars) {
      g.fillText(ch, x, y);
      x += g.measureText(ch).width + track;
    }
  };

  const inner = W - 140;
  tracked(spec.shop.toUpperCase(), 78, 30, inner, 7, body);

  g.lineWidth = 2.5;
  for (const y of [112, 290]) {
    g.beginPath();
    g.moveTo(70, y);
    g.lineTo(W - 70, y);
    g.stroke();
  }

  // centre word
  const word = spec.kind;
  let size = 150;
  g.font = `700 ${size}px ${display}`;
  while (g.measureText(word).width > inner && size > 60) g.font = `700 ${(size -= 4)}px ${display}`;
  g.textAlign = "center";
  g.fillText(word, W / 2, 204);

  tracked(`RECEIPT ${spec.number}  ·  ${spec.detail}`, 328, 28, inner, 3, body);

  const url = c.toDataURL("image/png");
  cache.set(key, url);
  return url;
}

/** The authorised signatory printed on every receipt. */
export const SIGNATORY = { name: "Md. Fahim Ahmed", title: "CEO", image: "/sign.png" };

/** Year the business was founded, shown on the company seal. */
export const FOUNDED = 2023;

/** Signature block size in px (round company seal, signature across it, name and title beneath). */
export const SIGN_W = 720;
export const SIGN_H = 460;

const SEAL_INK = "#2A3F94"; // stamp-pad blue
const PEN_INK = "#101C4E"; // blue-black pen

/**
 * Re-inks a logo in one stamp colour: dark lines and strong colours print solid, pale blue fills
 * (like water) print as a light tint, white and transparent areas stay blank.
 */
function inkLogo(img: HTMLImageElement, size: number, ink: string) {
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const g = c.getContext("2d")!;
  g.drawImage(img, 0, 0, size, size);
  const data = g.getImageData(0, 0, size, size);
  const px = data.data;
  const [ir, ig, ib] = [1, 3, 5].map((i) => parseInt(ink.slice(i, i + 2), 16));
  for (let i = 0; i < px.length; i += 4) {
    const [r, gr, b, a] = [px[i], px[i + 1], px[i + 2], px[i + 3]];
    const lum = 0.299 * r + 0.587 * gr + 0.114 * b;
    const sat = Math.max(r, gr, b) - Math.min(r, gr, b);
    const strength = lum > 225 && sat < 30 ? 0 : lum < 90 ? 1 : b > r + 60 && b > gr ? 0.28 : 1;
    px[i] = ir;
    px[i + 1] = ig;
    px[i + 2] = ib;
    px[i + 3] = a * strength;
  }
  g.putImageData(data, 0, 0);
  return c;
}

/**
 * Draws the official signature block: the company seal (the shop logo re-inked in stamp-pad
 * blue inside a lettered ring), the CEO's signature running across it in pen ink, then a
 * signature line with name and title. Returns a transparent PNG data URL.
 */
export async function drawSignature(shop: { name: string; logo: string }): Promise<string> {
  const shopName = shop.name;
  const key = `sign:${shopName}:${shop.logo.length}:${shop.logo.slice(-64)}`;
  const hit = cache.get(key);
  if (hit) return hit;

  const display = cssFont("--font-bricolage", "'Bricolage Grotesque', sans-serif");
  const body = cssFont("--font-manrope", "'Manrope', sans-serif");
  const img = new Image();
  img.src = SIGNATORY.image;
  const logo = new Image();
  logo.src = shop.logo || "/logo.png";
  const [loaded, logoLoaded] = await Promise.allSettled([
    img.decode(),
    logo.decode(),
    document.fonts.load(`700 34px ${display}`),
    document.fonts.load(`700 30px ${body}`),
  ]);

  const c = document.createElement("canvas");
  c.width = SIGN_W;
  c.height = SIGN_H;
  const g = c.getContext("2d")!;
  g.textAlign = "center";
  g.textBaseline = "middle";

  // ---- round company seal, tilted a little like a hand-pressed stamp ----
  g.save();
  g.translate(240, 182);
  g.rotate((-10 * Math.PI) / 180);
  g.scale(0.9, 0.9);
  g.globalAlpha = 0.8;
  g.strokeStyle = SEAL_INK;
  g.fillStyle = SEAL_INK;
  const ring = (r: number, w: number) => {
    g.beginPath();
    g.arc(0, 0, r, 0, Math.PI * 2);
    g.lineWidth = w;
    g.stroke();
  };
  ring(175, 8);
  ring(162, 2.5);

  // evenly tracked lettering along an arc, shrunk to fit; top reads clockwise, bottom left-to-right
  const arcText = (text: string, radius: number, bottom: boolean) => {
    let size = 30;
    const track = 6;
    const chars = [...text];
    const total = () => chars.reduce((a, ch) => a + g.measureText(ch).width + track, 0) - track;
    g.font = `700 ${size}px ${body}`;
    while (total() > radius * 2.3 && size > 14) g.font = `700 ${(size -= 1)}px ${body}`;
    let a = ((bottom ? 1 : -1) * total()) / 2 / radius;
    for (const ch of chars) {
      const w = g.measureText(ch).width;
      const mid = a + ((bottom ? -1 : 1) * w) / 2 / radius;
      g.save();
      g.rotate(mid);
      g.translate(0, bottom ? radius : -radius);
      g.fillText(ch, 0, 0);
      g.restore();
      a += ((bottom ? -1 : 1) * (w + track)) / radius;
    }
  };
  arcText(shopName.toUpperCase(), 136, false);
  arcText(`EST. ${FOUNDED}`, 136, true);
  for (const x of [-136, 136]) {
    g.beginPath();
    g.arc(x, 0, 5, 0, Math.PI * 2);
    g.fill();
  }

  // centre: the real logo in stamp ink (or the shop name if the logo cannot be loaded)
  let inked: HTMLCanvasElement | null = null;
  try {
    if (logoLoaded.status === "fulfilled") inked = inkLogo(logo, 228, SEAL_INK);
  } catch {
    /* e.g. a logo from another site that the canvas may not read */
  }
  if (inked) {
    g.drawImage(inked, -inked.width / 2, -inked.height / 2);
  } else {
    ring(110, 2.5);
    g.font = `800 26px ${display}`;
    g.fillText(shopName.toUpperCase(), 0, 0);
  }
  g.restore();

  // ---- signature across the seal, recoloured to pen ink ----
  if (loaded.status === "fulfilled") {
    const sw = 520;
    const sh = Math.round((sw * img.naturalHeight) / img.naturalWidth);
    const ink = document.createElement("canvas");
    ink.width = sw;
    ink.height = sh;
    const ig = ink.getContext("2d")!;
    ig.drawImage(img, 0, 0, sw, sh);
    ig.globalCompositeOperation = "source-in";
    ig.fillStyle = PEN_INK;
    ig.fillRect(0, 0, sw, sh);
    g.drawImage(ink, 190, 350 - sh);
  }

  // ---- signature line, name and title ----
  g.strokeStyle = "#334155";
  g.lineWidth = 2;
  g.beginPath();
  g.moveTo(110, 368);
  g.lineTo(610, 368);
  g.stroke();
  g.fillStyle = "#0F172A";
  g.font = `700 34px ${display}`;
  g.fillText(SIGNATORY.name, 360, 402);
  g.fillStyle = "#475569";
  g.font = `600 22px ${body}`;
  g.fillText(`${SIGNATORY.title} · ${shopName}`, 360, 440);

  const url = c.toDataURL("image/png");
  cache.set(key, url);
  return url;
}
