// Artwork and colours from the Go Round "Aquascape Editorial" visiting card, laid out for an A4 page
// (595 x 842 pt). Shared by the receipt and the letterhead, in both the web preview and the PDF:
// fish and bubbles run along the top of the page, aquatic grass along the bottom.

/** Card palette. */
export const AQ = {
  paper: "#FFFFFF", // page (the card is cream; documents print on white)
  panel: "#FAFBF8", // boxes sitting on the page
  ink: "#113A2D", // headings
  blue: "#1F7FA8", // fish, italic accents
  blueSoft: "#E3EDEE",
  green: "#4C8C3A",
  sage: "#E6EADB", // table header, totals
  line: "#DFE4DC",
  muted: "#6B776F",
} as const;

/** Height of the fish band at the top and the grass band at the bottom, in pt. */
export const TOP_H = 48;
export const GRASS_H = 40;

// ---- fish ----
// one fish drawn in a local box (nose to the right), placed with translate / rotate / scale
const BODY: [number, number][][] = [
  [[4, 0]],
  [[20, -17], [50, -19], [72, -3]],
  [[75, 0], [75, 2], [72, 4]],
  [[50, 17], [20, 15], [4, 0]],
];
const TAIL: [number, number][] = [[6, 0], [-14, -13], [-8, 0], [-14, 13]];
const EYE: [number, number] = [60, -2];

type Place = { x: number; y: number; rot: number; scale: number };
const FISH_PLACES: Place[] = [
  { x: 368, y: 36, rot: -8, scale: 0.42 }, // the big one, bubbles rising ahead of it
  { x: 172, y: 22, rot: 6, scale: 0.27 },
  { x: 506, y: 25, rot: -3, scale: 0.25 },
];

const fx = (n: number) => Math.round(n * 100) / 100;
function placer({ x, y, rot, scale }: Place) {
  const r = (rot * Math.PI) / 180;
  const [c, s] = [Math.cos(r) * scale, Math.sin(r) * scale];
  return ([px, py]: [number, number]) => `${fx(x + px * c - py * s)},${fx(y + px * s + py * c)}`;
}

export interface FishArt {
  body: string;
  tail: string;
  eye: { cx: number; cy: number; r: number };
  stroke: number;
}

/** The three fish as plain page-space paths (no transforms, so react-pdf draws them exactly). */
export const FISH: FishArt[] = FISH_PLACES.map((p) => {
  const at = placer(p);
  const [m, ...curves] = BODY;
  const body = `M${at(m[0])} ${curves.map((pts) => `C${pts.map(at).join(" ")}`).join(" ")} Z`;
  const tail = `M${at(TAIL[0])} L${at(TAIL[1])} Q${at(TAIL[2])} ${at(TAIL[3])} Z`;
  const [ex, ey] = at(EYE).split(",").map(Number);
  return { body, tail, eye: { cx: ex, cy: ey, r: fx(2.4 * p.scale) }, stroke: p.scale > 0.3 ? 1.1 : 0.9 };
});

/** Bubbles rising from the big fish (the card's cluster, scaled down). */
export const BUBBLES = [
  [70, -36, 3.3, 0.78], [210, -64, 2.8, 0.5], [122, -48, 4.7, 0.58], [64, -62, 3.2, 0.73], [115, -25, 2.6, 0.51],
  [91, -20, 3.8, 0.45], [110, -39, 2.7, 0.65], [130, -39, 3.7, 0.68], [73, -72, 5.7, 0.63],
].map(([dx, dy, r, o]) => ({ cx: fx(368 + dx * 0.494), cy: fx(36 + dy * 0.36), r: fx(r * 0.494), opacity: o }));

// ---- grass ----
const GRASS_COLORS = ["#1E5A45", "#2F6B3A", "#4C8C3A", "#6FAE45", "#8CBF5A"];

/** Small seeded random, so the grass is the same on every render (and on the server). */
function rng(seed: number) {
  return () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 2 ** 32;
  };
}

export interface Blade {
  d: string;
  color: string;
  width: number;
  opacity: number;
}

/** Short aquatic grass along a 595 pt wide band, GRASS_H tall, rooted at its bottom edge. */
export const GRASS: Blade[] = (() => {
  const r = rng(20231105);
  const out: Blade[] = [];
  for (let i = 0; i < 120; i++) {
    const x = -6 + r() * 607;
    const h = 6 + Math.pow(r(), 1.6) * (GRASS_H - 10);
    const lean = (r() - 0.5) * h * 0.5;
    const b = GRASS_H + 2;
    out.push({
      d: `M${fx(x)},${b} C${fx(x - lean * 0.6)},${fx(b - h * 0.35)} ${fx(x + lean * 0.5)},${fx(b - h * 0.7)} ${fx(x + lean)},${fx(b - h)}`,
      color: GRASS_COLORS[Math.floor(r() * GRASS_COLORS.length)]!,
      width: fx(0.7 + r() * 0.8),
      opacity: fx(0.25 + r() * 0.5),
    });
  }
  return out;
})();
