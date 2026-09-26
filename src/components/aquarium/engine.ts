import { ART, type ArtKind, svg } from "./art";
import { type Sfx, sfx } from "./sound";

/**
 * The aquarium's simulation. Every creature, bubble, food flake and effect is a plain DOM element that this loop
 * moves each frame (React only renders the scenery and the controls around it). Coordinates are px inside the water.
 *
 * Behaviour in short: fish wander their depth band, school with their own kind, chase food, flee the shark and
 * startle away from a tap on the glass; a swipe makes a current; at night they rest near the plants. The shark gets
 * hungrier over time and, once hungry, hunts the yellow fish (never an adopted one) - unless it is being fed, a
 * feeding frenzy is on, or someone is fishing (then it goes for the catch). Games and events: laser pointer, a
 * 30-second fishing round, a shy fish playing hide and seek, storms, shaking the tank, a heart formation, a lucky
 * golden fish, the treasure diver, visitors and clownfish babies.
 */

export type Tool = "explore" | "feed" | "clean" | "play" | "fish" | "decorate";
export type Kind = ArtKind;
export type ExtraKind = "dolphin" | "manta" | "lionfish" | "koi" | "stingray";

export interface FishInfo {
  key: string;
  kind: Kind | "chest";
  species: string;
  name: string;
  fact: string;
  adoptable: boolean;
}
export interface SchoolFish {
  key: string;
  name: string;
  fact: string;
}
export interface GameState {
  active: boolean;
  left: number; // seconds
  score: number;
  best: number;
}
export interface EngineOpts {
  onSelect: (info: FishInfo | null) => void;
  onToast: (text: string) => void;
  onWipe: (x: number, y: number, start: boolean) => void;
  onGame: (g: GameState) => void;
  onLuckySeen: () => void;
  chestInfo: () => FishInfo;
  storage: string; // localStorage key prefix: the shop's tank and the customer form's tank keep separate records
}

type Vec = { x: number; y: number };
type Rect = Vec & { w: number; h: number };
interface Agent extends Vec {
  key: string;
  kind: Kind;
  el: HTMLDivElement;
  vx: number;
  vy: number;
  w: number; // base width (px, before depth scale)
  h: number;
  z: number; // 0 near … 1 far
  speed: number;
  goal: Vec;
  flip: number; // which way it faces (±1)
  turn: number; // what's drawn: eases from one side to the other, so a turn is a quick swing, not a snap
  lastFlip: number;
  phase: number;
  puff: number; // pufferfish inflation, 1 = normal
  alive: boolean;
  respawn: number;
  info: Omit<FishInfo, "key" | "kind">;
  group?: string;
  transient?: { until: number }; // babies and visitors leave on their own
  leaving?: boolean; // swimming off-screen to be removed
  fading?: number;
  pause?: number; // walkers: stand still until
  loop?: Vec; // centre of the celebration loop
  hooked?: boolean;
  caught?: boolean; // the lucky fish, once tapped
}
interface Bubble {
  x: number;
  y: number;
  r: number;
  vy: number;
  phase: number;
  el: HTMLElement;
  label?: boolean;
}
interface Food extends Vec {
  el: HTMLElement;
  seed: number;
  settled: number; // time it reached the sand (0 = still falling)
}

type Spec = {
  species: string;
  names: string[];
  fact: string;
  w: number;
  z: [number, number];
  speed: number;
  band: [number, number];
  eats?: boolean;
  flees?: boolean;
  group?: string;
  catchable?: boolean;
  follows?: boolean; // chases the laser dot
};
/** Who lives in the tank, and how each kind behaves. */
const SPECIES: Record<Kind, Spec> = {
  clown: { species: "Clownfish", names: ["Pip", "Coral"], fact: "Sleeps safely among the anemone's stinging tentacles.", w: 58, z: [0.05, 0.2], speed: 38, band: [0.35, 0.8], eats: true, flees: true, catchable: true, follows: true },
  tang: { species: "Blue tang", names: ["Blue"], fact: "Hides a sharp little spine near its tail.", w: 74, z: [0.25, 0.3], speed: 46, band: [0.2, 0.75], eats: true, flees: true, catchable: true, follows: true },
  angel: { species: "Angelfish", names: ["Stripe"], fact: "Its tall fins help it glide between the plants.", w: 54, z: [0.6, 0.65], speed: 26, band: [0.2, 0.7], eats: true, flees: true, follows: true },
  gold: { species: "Goldfish", names: ["Mango"], fact: "Remembers things for months - not three seconds!", w: 70, z: [0.3, 0.35], speed: 34, band: [0.15, 0.7], eats: true, flees: true, catchable: true, follows: true },
  puffer: { species: "Pufferfish", names: ["Puffy"], fact: "Blows up like a balloon when the shark swims close.", w: 50, z: [0.45, 0.5], speed: 22, band: [0.25, 0.75], eats: true, follows: true },
  tetra: { species: "Neon tetra", names: ["Neon"], fact: "Its glowing stripe keeps the school together.", w: 26, z: [0.68, 0.78], speed: 50, band: [0.12, 0.6], eats: true, flees: true, group: "tetra", catchable: true, follows: true },
  prey: { species: "Yellow damsel", names: ["Sunny"], fact: "Quick and nervous - for good reason. Adopt one and the shark leaves it alone.", w: 26, z: [0.15, 0.4], speed: 44, band: [0.12, 0.75], eats: true, flees: true, group: "prey", catchable: true, follows: true },
  receipt: { species: "Receipt fish", names: [], fact: "", w: 18, z: [0.35, 0.5], speed: 48, band: [0.15, 0.7], eats: true, flees: true, group: "receipt", follows: true },
  customer: { species: "Customer fish", names: [], fact: "", w: 16, z: [0.75, 0.85], speed: 44, band: [0.15, 0.65], eats: true, flees: true, group: "customer", follows: true },
  baby: { species: "Baby clownfish", names: ["Tiny"], fact: "Hatched right here in the tank.", w: 20, z: [0.05, 0.12], speed: 30, band: [0.6, 0.85], eats: true, flees: true },
  turtle: { species: "Sea turtle", names: ["Shelly"], fact: "Can hold its breath for hours while it naps.", w: 104, z: [0.6, 0.62], speed: 16, band: [0.2, 0.6], follows: true },
  shark: { species: "Reef shark", names: ["Captain Chomp"], fact: "", w: 150, z: [0.3, 0.3], speed: 45, band: [0.15, 0.7] },
  jelly: { species: "Moon jellyfish", names: ["Glow"], fact: "No brain, no heart - and it glows at night.", w: 40, z: [0.7, 0.7], speed: 10, band: [0.08, 0.45] },
  crab: { species: "Red crab", names: ["Pincher"], fact: "Walks sideways and kicks up little puffs of sand.", w: 44, z: [0.1, 0.1], speed: 34, band: [1, 1] },
  diver: { species: "Treasure diver", names: ["Captain Deep"], fact: "Opens the treasure chest on days the shop hits its sales goal.", w: 40, z: [0.3, 0.3], speed: 16, band: [1, 1] },
  octopus: { species: "Octopus · visitor", names: ["Ink"], fact: "Changes colour in a blink - tap it again!", w: 72, z: [0.2, 0.2], speed: 34, band: [0.3, 0.6] },
  seahorse: { species: "Seahorse · visitor", names: ["Twirl"], fact: "Seahorse dads are the ones who carry the babies.", w: 30, z: [0.25, 0.25], speed: 12, band: [0.3, 0.6] },
  goby: { species: "Shy goby", names: ["Peekaboo"], fact: "Loves hide and seek - and you found it!", w: 30, z: [0.3, 0.3], speed: 40, band: [0.5, 0.85] },
  lucky: { species: "Lucky golden fish", names: ["Fortune"], fact: "Shows up about once a day. Tap it for luck!", w: 60, z: [0.15, 0.15], speed: 40, band: [0.2, 0.6] },
  dolphin: { species: "Baby dolphin", names: ["Splash"], fact: "Clicks and whistles to chat with its friends.", w: 110, z: [0.2, 0.25], speed: 70, band: [0.12, 0.6], eats: true, follows: true },
  manta: { species: "Manta ray", names: ["Glider"], fact: "Flies through the water on wide, slow wings.", w: 120, z: [0.55, 0.6], speed: 24, band: [0.15, 0.5], follows: true },
  lionfish: { species: "Lionfish", names: ["Leo"], fact: "Those frilly spines are venomous - look, don't touch!", w: 64, z: [0.3, 0.35], speed: 14, band: [0.3, 0.72], eats: true },
  butterfly: { species: "Butterflyfish", names: ["Flutter"], fact: "The fake eye-spot near its tail fools hungry predators.", w: 50, z: [0.2, 0.4], speed: 30, band: [0.25, 0.75], eats: true, flees: true, catchable: true, follows: true },
  parrot: { species: "Parrotfish", names: ["Rio"], fact: "Nibbles coral with its beak - and poops out white sand!", w: 72, z: [0.35, 0.45], speed: 32, band: [0.3, 0.75], eats: true, flees: true, follows: true },
  mandarin: { species: "Mandarin fish", names: ["Swirl"], fact: "One of the few fish that are truly blue.", w: 50, z: [0.1, 0.25], speed: 20, band: [0.6, 0.85], eats: true, flees: true, catchable: true, follows: true },
  betta: { species: "Betta", names: ["Ruby"], fact: "Shows off those flowing fins to anyone watching.", w: 64, z: [0.15, 0.3], speed: 18, band: [0.15, 0.5], eats: true, flees: true, follows: true },
  discus: { species: "Discus", names: ["Disco"], fact: "Round as a plate and the king of the aquarium.", w: 50, z: [0.4, 0.55], speed: 22, band: [0.3, 0.7], eats: true, flees: true, follows: true },
  guppy: { species: "Guppy", names: ["Gup"], fact: "Tiny, colourful and never stops moving.", w: 26, z: [0.2, 0.45], speed: 46, band: [0.15, 0.6], eats: true, flees: true, group: "guppy", catchable: true, follows: true },
  koi: { species: "Koi", names: ["Sakura"], fact: "Koi can live for more than 50 years.", w: 80, z: [0.3, 0.4], speed: 26, band: [0.2, 0.7], eats: true, follows: true },
  stingray: { species: "Stingray", names: ["Pebble"], fact: "Glides low over the sand, hunting for snacks.", w: 96, z: [0.25, 0.35], speed: 22, band: [0.78, 0.88] },
  whale: { species: "Whale", names: [], fact: "", w: 0, z: [1, 1], speed: 0, band: [0.3, 0.3] },
};
const CAST: [Kind, number][] = [
  ["tetra", 7],
  ["angel", 1],
  ["turtle", 1],
  ["jelly", 1],
  ["puffer", 1],
  ["gold", 1],
  ["tang", 1],
  ["prey", 7],
  ["clown", 2],
  ["butterfly", 1],
  ["parrot", 1],
  ["mandarin", 1],
  ["betta", 1],
  ["discus", 1],
  ["guppy", 6],
  ["shark", 1],
  ["crab", 1],
  ["diver", 1],
];
const WALKERS: Kind[] = ["crab", "diver"];
const SCENE_ONLY: Kind[] = ["shark", "crab", "diver", "jelly", "turtle", "octopus", "seahorse", "goby", "lucky", "whale"]; // not part of formations

const rand = (a: number, b: number) => a + Math.random() * (b - a);
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const len = (x: number, y: number) => Math.hypot(x, y) || 1;
const toward = (from: Vec, to: Vec, speed: number): Vec => {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const l = len(dx, dy);
  return { x: (dx / l) * speed, y: (dy / l) * speed };
};

export function createEngine(
  root: HTMLElement,
  layers: { shadow: HTMLElement; far: HTMLElement; near: HTMLElement; fx: HTMLElement; ui: HTMLElement },
  opts: EngineOpts,
) {
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const saved = (k: string) => {
    try {
      return Number(localStorage.getItem(opts.storage + k)) || 0;
    } catch {
      return 0;
    }
  };
  const save = (k: string, v: number) => {
    try {
      localStorage.setItem(opts.storage + k, String(v));
    } catch {
      /* private mode */
    }
  };

  let W = root.clientWidth;
  let H = root.clientHeight;
  let k = clamp(W / 1000, 0.62, 1); // creature size for this tank width
  const sandY = () => H - (W >= 640 ? 50 : 44);
  const surface = 12;

  const agents: Agent[] = [];
  const bubbles: Bubble[] = [];
  const food: Food[] = [];
  const tags = new Map<string, HTMLElement>();
  const glows = new Map<string, HTMLElement>(); // jellyfish glow, drawn above the night shade
  let names: Record<string, string> = {};
  let tool: Tool = "explore";
  let night = 0;
  let t = 0;
  let selected: string | null = null;

  const flow = { x: 0, y: 0 }; // the current, px/s
  let frenzyUntil = 0;
  const feedTaps: number[] = [];
  let celebrateUntil = 0;
  let heartUntil = 0;
  let stormUntil = 0;
  let storm = 0; // 0 … 1, eases in and out
  let nextStorm = rand(240, 480);
  let nextFlash = 0;
  let nextRain = 0;
  let sales = { perSecond: 0.15, label: "" };
  let nextLabel = 6;
  let nextSales = 1;
  let nextAir = 0;
  let nextNest = 25;
  let nest: { stage: "gather" | "eggs"; at: number; el?: HTMLElement } | null = null;
  let nextVisitor = 18;
  let whale: { el: HTMLElement; x: number; y: number; w: number } | null = null;
  let chestOpenUntil = 0;
  const shark = { hunting: false, until: rand(5, 8), jaw: 0, hunger: 55, feedingUntil: 0 };
  const laser = { x: 0, y: 0, on: false };
  const game = { active: false, until: 0, score: 0, best: saved("fishing-best"), hook: { x: 0, y: 0 }, aim: { x: 0, y: 0 }, reel: null as Agent | null, lastReport: 0 };
  let shy: { a: Agent; spot: Rect; found: boolean } | null = null;
  let nextShy = rand(30, 45);
  let luckyAt: number | null = null;
  let nextSparkle = 0;
  let diverTask: "chest" | null = null;

  // ---------- scenery anchors (measured from the React-rendered scenery) ----------
  const rectOf = (el: Element): Rect => {
    const r = el.getBoundingClientRect();
    const o = root.getBoundingClientRect();
    return { x: r.left - o.left + r.width / 2, y: r.top - o.top + r.height / 2, w: r.width, h: r.height };
  };
  const anchor = (sel: string): Rect => {
    const el = root.querySelector(sel);
    return el ? rectOf(el) : { x: W / 2, y: sandY(), w: 0, h: 0 };
  };
  let spots = { chest: anchor("[data-chest]"), anemone: anchor("[data-anemone]"), air: anchor("[data-airstone]"), rest: [] as Vec[], hide: [] as Rect[] };
  const measure = () => {
    W = root.clientWidth;
    H = root.clientHeight;
    k = clamp(W / 1000, 0.62, 1);
    spots = {
      chest: anchor("[data-chest]"),
      anemone: anchor("[data-anemone]"),
      air: anchor("[data-airstone]"),
      rest: [...root.querySelectorAll("[data-rest]")].map((el) => {
        const r = rectOf(el);
        return { x: r.x, y: r.y + r.h / 2 };
      }),
      hide: [...root.querySelectorAll("[data-hide]")].map(rectOf),
    };
    for (const a of agents) size(a);
  };

  // ---------- creatures ----------
  const bandPoint = (a: Pick<Agent, "kind">): Vec => {
    const [lo, hi] = SPECIES[a.kind].band;
    return { x: rand(W * 0.06, W * 0.94), y: clamp(rand(H * lo, H * hi), surface + 20, sandY() - 24) };
  };
  const size = (a: Agent) => {
    const [vw, vh] = ART[a.kind];
    a.w = SPECIES[a.kind].w * k;
    a.h = (a.w * vh) / vw;
    a.el.style.width = `${a.w}px`;
    a.el.style.height = `${a.h}px`;
  };
  const walkY = (a: Agent) => H - (a.kind === "diver" ? 30 : 24) * k;

  function spawn(kind: Kind, key: string, at?: Vec, extra?: Partial<Agent>, layer?: "far" | "near") {
    const sp = SPECIES[kind];
    const el = document.createElement("div");
    el.className = `tank-agent tank-${kind}`;
    el.innerHTML = svg(kind);
    const z = rand(sp.z[0], sp.z[1]);
    // depth: far creatures are smaller, softer and paler
    if (z > 0.5 && !layer) {
      el.style.filter = `blur(${((z - 0.5) * 2.2).toFixed(2)}px) saturate(${(1 - z * 0.35).toFixed(2)}) brightness(${(1 - z * 0.12).toFixed(2)})`;
      el.style.opacity = String(1 - z * 0.25);
    }
    (layer ? layers[layer] : z > 0.55 ? layers.far : layers.near).appendChild(el);
    const idx = Number(key.split("-").pop()) || 0;
    const name = sp.names.length > 1 ? sp.names[idx % sp.names.length]! : sp.names.length ? `${sp.names[0]}${["tetra", "prey", "guppy"].includes(kind) ? ` ${idx + 1}` : ""}` : "";
    const a: Agent = {
      key,
      kind,
      el,
      x: 0,
      y: 0,
      vx: rand(-10, 10),
      vy: 0,
      w: 0,
      h: 0,
      z,
      speed: sp.speed * rand(0.85, 1.15),
      goal: { x: 0, y: 0 },
      flip: 1,
      turn: 1,
      lastFlip: -9,
      phase: rand(0, 6.28),
      puff: 1,
      alive: true,
      respawn: 0,
      info: { species: sp.species, name, fact: sp.fact, adoptable: true },
      group: sp.group,
      ...extra,
    };
    size(a);
    const p = at ?? bandPoint(a);
    a.x = p.x;
    a.y = WALKERS.includes(kind) ? walkY(a) : p.y;
    a.goal = WALKERS.includes(kind) ? { x: rand(W * 0.1, W * 0.9), y: a.y } : bandPoint(a);
    agents.push(a);
    return a;
  }
  const remove = (a: Agent) => {
    a.el.remove();
    for (const m of [tags, glows]) {
      m.get(a.key)?.remove();
      m.delete(a.key);
    }
    const i = agents.indexOf(a);
    if (i >= 0) agents.splice(i, 1);
    if (selected === a.key) select(null);
    if (game.reel === a) game.reel = null;
    if (shy?.a === a) shy = null;
  };
  const leave = (a: Agent, fast = 2) => {
    a.leaving = true;
    a.speed *= fast;
    a.goal = { x: a.x < W / 2 ? -120 : W + 120, y: a.y };
  };

  for (const [kind, n] of CAST) for (let i = 0; i < n; i++) spawn(kind, `${kind}-${i}`);
  const sharkA = () => agents.find((a) => a.kind === "shark")!;
  const diverA = () => agents.find((a) => a.kind === "diver");

  // ---------- effects ----------
  const fx = (cls: string, x: number, y: number, html = "", life = 1000, parent = layers.fx) => {
    const el = document.createElement("span");
    el.className = cls;
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
    el.innerHTML = html;
    parent.appendChild(el);
    window.setTimeout(() => el.remove(), life);
    return el;
  };
  const bubble = (x: number, y: number, r = rand(2.5, 5), label?: string) => {
    if (bubbles.length > 110) return;
    const el = document.createElement("span");
    el.className = label ? "tank-label" : "tank-bubble-dot";
    if (label) el.textContent = label;
    else {
      el.style.width = `${r * 2}px`;
      el.style.height = `${r * 2}px`;
    }
    layers.fx.appendChild(el);
    bubbles.push({ x, y, r, vy: label ? 22 : rand(38, 60) * (r / 4), phase: rand(0, 6.28), el, label: !!label });
  };
  const burst = (cls: string, at: Vec, n: number, spread: [number, number], life = 1700) => {
    for (let i = 0; i < n; i++) {
      const el = fx(cls, at.x, at.y, "", life);
      el.style.setProperty("--dx", `${rand(-spread[0], spread[0])}px`);
      el.style.setProperty("--dy", `${rand(-spread[1], -spread[1] / 3)}px`);
      el.style.animationDelay = `${i * 40}ms`;
    }
  };
  const chomp = (at: Vec) => {
    fx("tank-chomp", at.x, at.y, Array.from({ length: 6 }, (_, i) => `<i style="--a:${i * 60 + rand(-15, 15)}deg"></i>`).join(""), 900);
    sfx("chomp");
  };
  const toast = (text: string) => opts.onToast(text);
  const play = (s: Sfx) => sfx(s);

  // ---------- selection ----------
  function select(key: string | null) {
    root.querySelector(".is-picked")?.classList.remove("is-picked");
    selected = key;
    const a = key ? agents.find((x) => x.key === key) : null;
    a?.el.classList.add("is-picked");
    if (!key) opts.onSelect(null);
    else if (key === "chest") opts.onSelect(opts.chestInfo());
    else if (a) opts.onSelect({ key: a.key, kind: a.kind, ...a.info, name: names[a.key] ?? a.info.name });
  }

  // ---------- actions ----------
  const dropFood = (x: number, y: number, n = 4, frenzyCount = true) => {
    for (let i = 0; i < n && food.length < 50; i++) {
      const el = document.createElement("span");
      el.className = "tank-food";
      layers.fx.appendChild(el);
      food.push({ x: x + rand(-16, 16), y: y + rand(-6, 6), seed: rand(0, 6), el, settled: 0 });
    }
    play("plop");
    if (!frenzyCount) return;
    feedTaps.push(t);
    while (feedTaps.length && t - feedTaps[0]! > 8) feedTaps.shift();
    if (feedTaps.length >= 5 && t > frenzyUntil && night < 0.5) {
      frenzyUntil = t + 15;
      shark.hunting = false;
      toast("🦈 Feeding frenzy! The shark forgot all about hunting");
    }
  };

  const tapGlass = (x: number, y: number) => {
    fx("tank-ripple", x, y, "", 900);
    play("tap");
    for (const a of agents) {
      if (a.kind === "whale" || WALKERS.includes(a.kind) || a.hooked) continue;
      const d = len(a.x - x, a.y - y);
      const R = 170 * k;
      if (d > R) continue;
      const push = (a.kind === "turtle" || a.kind === "shark" || a.kind === "manta" ? 60 : 260) * (1 - d / R);
      a.vx += ((a.x - x) / d) * push;
      a.vy += ((a.y - y) / d) * push;
    }
  };

  const hit = (x: number, y: number): string | null => {
    const c = spots.chest;
    const front = agents.filter((a) => a.alive && a.kind !== "whale").sort((a, b) => a.z - b.z);
    // the shy and the lucky fish get a generous target - they're meant to be found
    for (const a of front) {
      const s = (1 - a.z * 0.4) * a.puff;
      const pad = a.kind === "goby" || a.kind === "lucky" ? 26 : 14;
      const hw = Math.max((a.w * s) / 2, pad);
      const hh = Math.max((a.h * s) / 2, pad);
      if (Math.abs(x - a.x) < hw && Math.abs(y - a.y) < hh) return a.key;
    }
    if (c.w && Math.abs(x - c.x) < c.w / 2 && Math.abs(y - c.y) < c.h / 2) return "chest";
    return null;
  };

  const found = (a: Agent) => {
    if (a.kind === "goby" && shy && !shy.found) {
      shy.found = true;
      const n = saved("found") + 1;
      save("found", n);
      burst("tank-star", a, 12, [60, 90]);
      play("sparkle");
      toast(`🎉 You found Peekaboo! ${n === 1 ? "First find!" : `That's ${n} finds so far`}`);
      leave(a, 3);
    } else if (a.kind === "lucky" && !a.caught) {
      a.caught = true;
      burst("tank-coin", a, 14, [70, 140]);
      play("coins");
      toast("✨ You found the lucky fish! Good fortune is coming your way");
      leave(a, 4);
    }
  };

  // ---------- pointer ----------
  const drag = { down: false, x: 0, y: 0, lx: 0, ly: 0, lt: 0, moved: false, id: -1 };
  const local = (e: PointerEvent): Vec => {
    const r = root.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };
  const aimAt = (p: Vec) => {
    if (tool === "play") Object.assign(laser, p, { on: true });
    if (tool === "fish") game.aim = { x: clamp(p.x, 10, W - 10), y: clamp(p.y, surface + 30, sandY() - 10) };
  };
  const onDown = (e: PointerEvent) => {
    if ((e.target as Element).closest("[data-tank-ui]") || tool === "decorate") return;
    const p = local(e);
    Object.assign(drag, { down: true, x: p.x, y: p.y, lx: p.x, ly: p.y, lt: performance.now(), moved: false, id: e.pointerId });
    aimAt(p);
    if (tool === "clean") {
      try {
        root.setPointerCapture(e.pointerId); // keep scrubbing even when the finger leaves the glass
      } catch {
        /* pointer already gone */
      }
      opts.onWipe(p.x, p.y, true);
    } else if (tool === "feed") dropFood(p.x, Math.min(p.y, sandY() - 10));
  };
  const onMove = (e: PointerEvent) => {
    const p = local(e);
    aimAt(p); // the laser and the hook follow a hovering mouse too
    if (!drag.down || e.pointerId !== drag.id) return;
    if (tool === "clean") return opts.onWipe(p.x, p.y, false);
    if (tool !== "explore") return;
    const now = performance.now();
    const dt = Math.max(0.008, (now - drag.lt) / 1000);
    if (!drag.moved && len(p.x - drag.x, p.y - drag.y) > 10) drag.moved = true;
    if (drag.moved) {
      // a swipe stirs the water in its direction
      flow.x = clamp(flow.x * 0.7 + ((p.x - drag.lx) / dt) * 0.12, -240, 240);
      flow.y = clamp(flow.y * 0.7 + ((p.y - drag.ly) / dt) * 0.05, -70, 70);
    }
    Object.assign(drag, { lx: p.x, ly: p.y, lt: now });
  };
  const onUp = (e: PointerEvent) => {
    if (!drag.down || e.pointerId !== drag.id) return;
    drag.down = false;
    if (e.pointerType !== "mouse" && tool === "play") laser.on = false; // a finger lifting takes the dot away
    if (tool !== "explore" || drag.moved) return;
    const key = hit(drag.x, drag.y);
    const a = key ? agents.find((x) => x.key === key) : undefined;
    if (a && (a.kind === "goby" || a.kind === "lucky")) return found(a);
    if (key) {
      select(key);
      if (key === "chest") openChest(2.5);
      if (a?.kind === "octopus") a.el.style.setProperty("--hue", `${Math.round(rand(40, 320))}deg`);
      if (a?.kind === "puffer") a.puff = 1.5;
    } else {
      select(null);
      tapGlass(drag.x, drag.y);
    }
  };
  const onLeave = () => {
    laser.on = false;
  };
  root.addEventListener("pointerdown", onDown);
  root.addEventListener("pointermove", onMove);
  root.addEventListener("pointerup", onUp);
  root.addEventListener("pointercancel", onUp);
  root.addEventListener("pointerleave", onLeave);

  // laser dot and fishing line live in the ui layer
  const laserEl = document.createElement("span");
  laserEl.className = "tank-laser";
  const lineEl = document.createElement("span");
  lineEl.className = "tank-line";
  const hookEl = document.createElement("span");
  hookEl.className = "tank-hook";
  hookEl.innerHTML = `<svg viewBox="0 0 16 24" width="100%" height="100%"><path d="M8 0 V14 a5 5 0 0 1 -10 0" transform="translate(4 0)" fill="none" stroke="#e5e7eb" stroke-width="2.2" stroke-linecap="round"/><circle cx="12" cy="2" r="2" fill="#ef4444"/></svg>`;
  layers.ui.append(laserEl, lineEl, hookEl);

  // ---------- scoreboard schools and shop fish ----------
  const setSchool = (kind: "receipt" | "customer", list: SchoolFish[], arrive: boolean) => {
    const want = new Map(list.map((f) => [f.key, f]));
    for (const a of agents.filter((x) => x.kind === kind && !want.has(x.key))) remove(a);
    for (const f of list) {
      const have = agents.find((x) => x.key === f.key);
      if (have) {
        have.info = { ...have.info, name: f.name, fact: f.fact };
        continue;
      }
      // new members swim in from the side; the first load just places them
      const a = spawn(kind, f.key, arrive ? { x: Math.random() < 0.5 ? -20 : W + 20, y: rand(H * 0.2, H * 0.6) } : undefined);
      a.info = { ...a.info, name: f.name, fact: f.fact, adoptable: false };
    }
  };

  const openChest = (secs: number) => {
    chestOpenUntil = Math.max(chestOpenUntil, t + secs);
    root.querySelector("[data-chest]")?.classList.add("is-open");
  };
  const coins = () => {
    openChest(4.5);
    burst("tank-coin", { x: spots.chest.x, y: spots.chest.y - spots.chest.h * 0.2 }, 14, [70, 150]);
    play("coins");
  };

  const endGame = () => {
    game.active = false;
    game.reel = null;
    for (const a of agents) a.hooked = false;
    const best = Math.max(game.best, game.score);
    const record = game.score > game.best && game.score > 0;
    game.best = best;
    save("fishing-best", best);
    toast(record ? `🏆 New record: ${game.score} fish in 30 seconds!` : `🎣 Time's up - you caught ${game.score} fish (best ${best})`);
    if (record) play("chime");
    opts.onGame({ active: false, left: 0, score: game.score, best });
  };

  // ---------- frame ----------
  let raf = 0;
  let lastNow = 0;
  const frame = (now: number) => {
    const dt = Math.min(0.05, (now - (lastNow || now)) / 1000);
    lastNow = now;
    t += dt;
    step(dt);
    render(dt);
    raf = requestAnimationFrame(frame);
  };

  function step(dt: number) {
    const asleep = night > 0.6;
    const sy = sandY();
    const sh = sharkA();
    const mouth: Vec = { x: sh.x + sh.flip * sh.w * 0.42, y: sh.y + sh.h * 0.08 };
    const frenzy = t < frenzyUntil;
    const feeding = t < shark.feedingUntil;
    const celebrating = t < celebrateUntil;
    const hearting = t < heartUntil;

    // the current fades; plants lean with it
    flow.x *= Math.exp(-dt * 1.1);
    flow.y *= Math.exp(-dt * 1.6);
    root.style.setProperty("--flow", (flow.x / 160).toFixed(3));

    // storms: now and then on their own, flashes of lightning and rain on the surface
    if (t > nextStorm && !stormUntil) startStorm();
    const stormy = t < stormUntil;
    storm += ((stormy ? 1 : 0) - storm) * Math.min(1, dt * 0.8);
    root.style.setProperty("--storm", storm.toFixed(3));
    if (stormUntil && !stormy) {
      stormUntil = 0;
      nextStorm = t + rand(300, 600);
    }
    if (stormy && t > nextFlash) {
      nextFlash = t + rand(2.5, 6);
      const flash = root.querySelector<HTMLElement>("[data-flash]");
      if (flash) {
        flash.classList.remove("is-flash");
        void flash.offsetWidth; // restart the animation
        flash.classList.add("is-flash");
      }
      window.setTimeout(() => play("thunder"), rand(200, 900));
    }
    if (storm > 0.3 && t > nextRain) {
      nextRain = t + 0.05 / storm;
      fx("tank-splash", rand(0, W), surface + 2, "", 600);
    }

    if (chestOpenUntil && t > chestOpenUntil) {
      chestOpenUntil = 0;
      root.querySelector("[data-chest]")?.classList.remove("is-open");
    }

    // shark gets hungrier
    shark.hunger = clamp(shark.hunger + dt * (asleep ? 0.3 : 1.1), 0, 100);

    // bubbles: air stone, and (for the shop) today's sales rising from the chest
    if (t > nextAir) {
      nextAir = t + rand(0.25, 0.5);
      bubble(spots.air.x + rand(-4, 4), spots.air.y - 4);
    }
    if (t > nextSales) {
      nextSales = t + 1 / Math.max(0.05, sales.perSecond);
      bubble(spots.chest.x + rand(-10, 10), spots.chest.y - spots.chest.h * 0.3, rand(2, 4));
    }
    if (t > nextLabel && sales.label) {
      nextLabel = t + 14;
      bubble(spots.chest.x, spots.chest.y - spots.chest.h * 0.5, 0, sales.label);
    }
    for (let i = bubbles.length - 1; i >= 0; i--) {
      const b = bubbles[i]!;
      b.y -= b.vy * dt;
      b.x += Math.sin(t * 3 + b.phase) * (b.label ? 6 : 14) * dt + flow.x * 0.7 * dt;
      if (b.y < surface + b.r) {
        // pop at the surface
        b.el.remove();
        bubbles.splice(i, 1);
        fx("tank-splash", b.x, surface + 2, "", 600);
        if (Math.random() < 0.35) play("bubble");
      }
    }

    // food falls, drifts with the current, and settles on the sand for a while
    for (let i = food.length - 1; i >= 0; i--) {
      const f = food[i]!;
      if (!f.settled) {
        f.y += 24 * dt;
        f.x += (Math.sin(t * 2 + f.seed) * 8 + flow.x * 0.6) * dt;
        if (f.y >= sy - 4) f.settled = t;
      } else if (t - f.settled > 8) {
        f.el.remove();
        food.splice(i, 1);
      }
    }
    const eat = (i: number) => {
      food[i]?.el.remove();
      food.splice(i, 1);
    };

    // ---- games ----
    if (tool === "play" && laser.on) laserEl.style.transform = `translate3d(${laser.x}px, ${laser.y}px, 0) translate(-50%, -50%)`;
    laserEl.style.opacity = tool === "play" && laser.on ? "1" : "0";
    if (game.active) {
      if (game.reel) {
        // reel in: the hook rises with the fish on it
        game.hook.y -= 95 * k * dt;
        game.hook.x += (game.aim.x - game.hook.x) * Math.min(1, dt * 1.5);
        const f = game.reel;
        f.x = game.hook.x + Math.sin(t * 22) * 3;
        f.y = game.hook.y + f.h * 0.4;
        f.vx = Math.sin(t * 9) * 30;
        f.vy = -40;
        if (game.hook.y < surface + 4) {
          game.score++;
          f.hooked = false;
          f.alive = false;
          f.respawn = t + rand(4, 7);
          f.el.style.opacity = "0";
          fx("tank-splash", f.x, surface + 2, "", 600);
          burst("tank-star", { x: f.x, y: surface + 10 }, 6, [40, 30], 900);
          play("catch");
          toast(`🎣 Caught ${names[f.key] ?? f.info.name}! That's ${game.score}`);
          game.reel = null;
          game.hook.y = surface + 40;
        }
      } else {
        game.hook.x += (game.aim.x - game.hook.x) * Math.min(1, dt * 6);
        game.hook.y += (game.aim.y - game.hook.y) * Math.min(1, dt * 6);
      }
      lineEl.style.transform = `translate3d(${game.hook.x}px, 0, 0)`;
      lineEl.style.height = `${game.hook.y}px`;
      hookEl.style.transform = `translate3d(${game.hook.x}px, ${game.hook.y}px, 0) translate(-50%, -10%)`;
      if (t - game.lastReport > 0.25) {
        game.lastReport = t;
        opts.onGame({ active: true, left: Math.max(0, game.until - t), score: game.score, best: game.best });
      }
      if (t > game.until) endGame();
    }
    lineEl.style.opacity = hookEl.style.opacity = game.active ? "1" : "0";

    // ---- clownfish family: eggs by the anemone, which hatch into babies ----
    if (!nest && t > nextNest && !asleep && agents.filter((a) => a.kind === "baby").length < 6) nest = { stage: "gather", at: t + 7 };
    if (nest?.stage === "gather" && t > nest.at) {
      nest = { stage: "eggs", at: t + 12, el: fx("tank-eggs", spots.anemone.x + 10 * k, spots.anemone.y + spots.anemone.h * 0.25, "<i></i>".repeat(7), 13000) };
      toast("🥚 The clownfish laid eggs by the anemone");
    }
    if (nest?.stage === "eggs" && t > nest.at) {
      for (let i = 0; i < 3; i++) {
        const b = spawn("baby", `baby-${Math.round(t * 10)}-${i}`, { x: spots.anemone.x + rand(-10, 10), y: spots.anemone.y }, { transient: { until: t + 240 } });
        b.info = { ...b.info, adoptable: false };
        bubble(b.x, b.y, 2);
      }
      nest.el?.remove();
      nest = null;
      nextNest = t + rand(80, 130);
      toast("🐣 Three baby clownfish just hatched!");
      play("chime");
    }

    // ---- hide and seek ----
    if (!shy && t > nextShy && !asleep && spots.hide.length) {
      nextShy = t + rand(60, 100);
      const spot = spots.hide[Math.floor(Math.random() * spots.hide.length)]!;
      // in the far layer, so the decoration hides it until it peeks out
      const a = spawn("goby", `goby-${Math.round(t)}`, { x: spot.x, y: clamp(spot.y + spot.h * 0.15, H * 0.4, sy - 16) }, { transient: { until: t + 45 } }, "far");
      a.info = { ...a.info, adoptable: false };
      shy = { a, spot, found: false };
      toast("👀 Someone shy is hiding behind the decorations - can you spot them?");
    }

    // ---- lucky golden fish ----
    if (luckyAt !== null && t > luckyAt && !asleep) {
      luckyAt = null;
      const fromLeft = Math.random() < 0.5;
      const a = spawn("lucky", `lucky-${Math.round(t)}`, { x: fromLeft ? -40 : W + 40, y: H * rand(0.25, 0.55) }, { leaving: true });
      a.goal = { x: fromLeft ? W + 140 : -140, y: a.y };
      a.info = { ...a.info, adoptable: false };
      opts.onLuckySeen();
      toast("🌟 Something golden just swam in…");
    }

    // ---- seasonal visitors ----
    if (t > nextVisitor && !agents.some((a) => a.kind === "octopus" || a.kind === "seahorse") && !whale) {
      nextVisitor = t + rand(45, 80);
      const kind = pickVisitor();
      const fromLeft = Math.random() < 0.5;
      if (kind === "whale") {
        const el = document.createElement("div");
        el.className = "tank-whale";
        el.innerHTML = svg("whale");
        const w = W * 0.8;
        el.style.width = `${w}px`;
        layers.shadow.appendChild(el);
        whale = { el, x: fromLeft ? -w : W + w, y: H * rand(0.18, 0.35), w };
        el.dataset.dir = fromLeft ? "1" : "-1";
        toast("🐋 Something huge is passing behind the tank…");
      } else {
        const a = spawn(kind, `${kind}-${Math.round(t)}`, { x: fromLeft ? -40 : W + 40, y: H * rand(0.3, 0.55) }, { leaving: true });
        a.goal = { x: fromLeft ? W + 140 : -140, y: a.y };
        a.info = { ...a.info, adoptable: false };
        toast(kind === "octopus" ? "🐙 An octopus is visiting - tap it!" : "🌊 A seahorse drifted in");
      }
    }
    if (whale) {
      const dir = Number(whale.el.dataset.dir);
      whale.x += dir * (W / 28) * dt;
      whale.el.style.transform = `translate3d(${whale.x - whale.w / 2}px, ${whale.y}px, 0) scaleX(${dir})`;
      whale.el.style.opacity = String(0.16 * (1 - night * 0.5));
      if ((dir > 0 && whale.x > W + whale.w) || (dir < 0 && whale.x < -whale.w)) {
        whale.el.remove();
        whale = null;
      }
    }

    // ---- shark: hunts only when hungry, never at night, never an adopted fish ----
    const targets = agents.filter((a) => a.kind === "prey" && a.alive && !names[a.key] && !a.hooked);
    const busy = frenzy || feeding || !!game.reel || celebrating || hearting;
    if (!shark.hunting && t > shark.until && targets.length && !asleep && !busy && shark.hunger >= 45) {
      shark.hunting = true;
      shark.until = t + 9;
    }
    if (shark.hunting && (t > shark.until || asleep || busy || !targets.length)) {
      shark.hunting = false;
      shark.until = t + rand(6, 10);
    }

    // formation slots (heart)
    const formation = hearting ? agents.filter((a) => a.alive && !SCENE_ONLY.includes(a.kind) && !a.hooked) : [];
    const heartScale = Math.min(W, H) * 0.024;

    // schools
    const groups = new Map<string, { x: number; y: number; vx: number; vy: number; n: number }>();
    for (const a of agents) {
      if (!a.group || !a.alive) continue;
      const g = groups.get(a.group) ?? { x: 0, y: 0, vx: 0, vy: 0, n: 0 };
      g.x += a.x;
      g.y += a.y;
      g.vx += a.vx;
      g.vy += a.vy;
      g.n++;
      groups.set(a.group, g);
    }

    for (const a of [...agents]) {
      if (a.fading !== undefined) {
        a.fading -= dt;
        a.el.style.opacity = String(Math.max(0, a.fading));
        if (a.fading <= 0) remove(a);
        continue;
      }
      if (a.transient && t > a.transient.until && !a.leaving) {
        if (a.kind === "baby") {
          a.fading = 1;
          bubble(a.x, a.y, 2);
          continue;
        }
        leave(a);
      }
      if (a.leaving && (a.x < -100 || a.x > W + 100)) {
        remove(a);
        continue;
      }
      if (!a.alive) {
        if (t > a.respawn) {
          Object.assign(a, { alive: true, x: Math.random() < 0.5 ? -20 : W + 20, y: rand(H * 0.2, H * 0.6), vx: 0, vy: 0, goal: bandPoint(a) });
          a.el.style.opacity = "";
        }
        continue;
      }
      if (a.hooked) continue; // moved by the fishing line

      const sp = SPECIES[a.kind];
      let want: Vec;
      let agility = 2.5;
      if (!a.leaving && Math.hypot(a.goal.x - a.x, a.goal.y - a.y) < 24) a.goal = WALKERS.includes(a.kind) ? { x: rand(W * 0.08, W * 0.92), y: a.y } : bandPoint(a);

      // walkers: the crab and the treasure diver stroll the sand
      if (WALKERS.includes(a.kind)) {
        const isCrab = a.kind === "crab";
        const lying = isCrab ? food.find((f) => f.settled && Math.abs(f.x - a.x) < 200 * k) : undefined;
        if (lying) a.goal = { x: lying.x, y: a.y };
        if (a.kind === "diver" && diverTask === "chest") a.goal = { x: spots.chest.x - spots.chest.w * 0.7, y: a.y };
        const moving = (!asleep || diverTask !== null) && (!a.pause || t > a.pause);
        const dx = a.goal.x - a.x;
        if (Math.abs(dx) < 6) {
          if (lying) eat(food.indexOf(lying));
          if (a.kind === "diver" && diverTask === "chest") {
            diverTask = null;
            coins();
            toast("🤿 Daily goal reached! The diver opened the treasure chest");
            a.pause = t + 4;
          } else a.pause = t + rand(1, 3.5);
          a.goal = { x: rand(W * 0.08, W * 0.92), y: a.y };
        }
        a.vx = moving ? Math.sign(dx) * a.speed * k * (a.kind === "diver" && diverTask ? 2.2 : 1) : 0;
        a.x += a.vx * dt;
        a.y = walkY(a);
        a.el.classList.toggle("is-walking", moving && Math.abs(dx) >= 6);
        if (moving && isCrab && Math.random() < dt * 3) fx("tank-puff", a.x - Math.sign(a.vx) * a.w * 0.3, a.y + a.h * 0.35, "", 900);
        if (a.kind === "diver" && Math.random() < dt * 0.7) bubble(a.x + a.flip * a.w * 0.1, a.y - a.h * 0.45, rand(1.5, 3));
        continue;
      }

      if (a.kind === "shark") {
        agility = 1.6;
        if (game.reel && !asleep) {
          // a fish on the line is irresistible
          want = toward(a, game.hook, 118 * k);
          if (len(game.hook.x - mouth.x, game.hook.y - mouth.y) < 26 * k) {
            const f = game.reel;
            f.hooked = false;
            f.alive = false;
            f.respawn = t + rand(5, 8);
            f.el.style.opacity = "0";
            game.reel = null;
            game.hook.y = sy - 40 * k;
            shark.jaw = t + 0.35;
            shark.hunger = clamp(shark.hunger - 40, 0, 100);
            chomp(mouth);
            toast("🦈 The shark stole your catch!");
          }
        } else if ((frenzy || feeding) && food.length) {
          const f = food.reduce((b, x) => (len(x.x - mouth.x, x.y - mouth.y) < len(b.x - mouth.x, b.y - mouth.y) ? x : b));
          want = toward(a, f, 120 * k);
        } else if (tool === "play" && laser.on && len(laser.x - a.x, laser.y - a.y) < 320 * k && !asleep) {
          // curious: circles the dot at a respectful distance
          const d = len(laser.x - a.x, laser.y - a.y);
          want = d > 110 * k ? toward(a, laser, 55 * k) : { x: -(laser.y - a.y) * 0.4, y: (laser.x - a.x) * 0.4 };
        } else if (shark.hunting) {
          const target = targets.reduce((b, p) => (len(p.x - mouth.x, p.y - mouth.y) < len(b.x - mouth.x, b.y - mouth.y) ? p : b));
          want = toward(a, target, 125 * k);
          if (len(target.x - mouth.x, target.y - mouth.y) < 18 * k) {
            target.alive = false;
            target.respawn = t + rand(5, 8);
            target.el.style.opacity = "0";
            shark.jaw = t + 0.35;
            shark.hunger = clamp(shark.hunger - 45, 0, 100);
            chomp(mouth);
            shark.hunting = false;
            shark.until = t + rand(6, 10);
          }
        } else {
          if (asleep) a.goal = { x: a.goal.x, y: clamp(a.goal.y, H * 0.45, sy - 40) };
          want = toward(a, a.goal, (asleep ? 18 : 42) * k);
        }
        // anything edible right by its mouth goes down
        if (food.length && shark.hunger > 10) {
          const i = food.findIndex((f) => len(f.x - mouth.x, f.y - mouth.y) < 16 * k);
          if (i >= 0) {
            eat(i);
            shark.hunger = clamp(shark.hunger - 6, 0, 100);
            shark.jaw = t + 0.25;
            play("chomp");
          }
        }
        a.el.dataset.open = t < shark.jaw || shark.hunting || !!game.reel || ((frenzy || feeding) && food.length > 0) ? "1" : "";
      } else if (a.kind === "goby" && shy && shy.a === a && !shy.found && !a.leaving) {
        // peeks out from behind its hiding place, then ducks back
        const s = shy.spot;
        const peek = Math.sin(t * 0.9 + a.phase);
        a.x = s.x + peek * s.w * 0.55;
        a.y = clamp(s.y + s.h * 0.1, H * 0.35, sy - 14) + Math.sin(t * 1.7) * 4;
        a.vx = Math.cos(t * 0.9 + a.phase) * 30;
        a.vy = 0;
        continue;
      } else if (a.kind === "octopus" || a.kind === "seahorse" || a.kind === "lucky") {
        // visitors cross the tank once; the octopus in jet pulses, the seahorse bobbing upright, the lucky fish sparkling
        const pulse = a.kind === "octopus" ? 0.35 + Math.max(0, Math.sin(t * 2.4 + a.phase)) * 1.6 : 1;
        want = toward(a, a.goal, a.speed * k * pulse);
        want.y += Math.sin(t * 1.5 + a.phase) * 12;
        if (a.kind === "lucky" && t > nextSparkle) {
          nextSparkle = t + 0.15;
          fx("tank-sparkle", a.x - a.flip * a.w * 0.4, a.y + rand(-6, 6), "", 900);
        }
      } else {
        // fish, turtle, jellyfish, shop fish
        let speed = a.speed * k;
        const slot = formation.indexOf(a);
        if (a.leaving) {
          // heading off-screen
        } else if (slot >= 0) {
          // heart: x = 16 sin³θ, y = 13 cos θ − 5 cos 2θ − 2 cos 3θ − cos 4θ
          const th = (slot / formation.length) * Math.PI * 2;
          a.goal = {
            x: W / 2 + 16 * Math.sin(th) ** 3 * heartScale,
            y: H * 0.42 - (13 * Math.cos(th) - 5 * Math.cos(2 * th) - 2 * Math.cos(3 * th) - Math.cos(4 * th)) * heartScale,
          };
          speed *= 3;
        } else if (stormy && a.kind !== "jelly") {
          // huddle together low in the tank
          a.goal = { x: W * 0.5 + Math.sin(a.phase * 3) * 80 * k, y: sy - 50 * k - (a.phase % 1) * 60 * k };
          speed *= 1.4;
        } else if (asleep && a.kind !== "jelly") {
          // rest near the plants (clownfish in their anemone), barely moving
          const home = a.kind === "clown" || a.kind === "baby" ? spots.anemone : (spots.rest[Math.abs(Math.floor(a.phase * 10)) % Math.max(1, spots.rest.length)] ?? { x: a.x, y: sy });
          a.goal = { x: home.x + Math.sin(a.phase) * 30 * k, y: clamp(home.y - 30 * k - (a.phase % 1) * 50 * k, H * 0.3, sy - 20) };
          speed *= 0.3;
        } else if (a.kind === "baby") {
          if (Math.hypot(a.goal.x - spots.anemone.x, a.goal.y - spots.anemone.y) > 90 * k) a.goal = { x: spots.anemone.x + rand(-70, 70) * k, y: spots.anemone.y - rand(10, 70) * k };
        } else if (a.kind === "clown" && nest?.stage === "gather") {
          a.goal = { x: spots.anemone.x + (a.phase > 3 ? 20 : -20) * k, y: spots.anemone.y - 10 * k };
        }
        want = toward(a, a.goal, speed);
        if (a.kind === "jelly") want.y += Math.sin(t * 1.2 + a.phase) * 10;

        // schooling
        const g = a.group && slot < 0 ? groups.get(a.group) : undefined;
        if (g && g.n > 1) {
          want.x += (g.x / g.n - a.x) * 0.25 + (g.vx / g.n) * 0.3;
          want.y += (g.y / g.n - a.y) * 0.25 + (g.vy / g.n) * 0.3;
          for (const o of agents) {
            if (o === a || o.group !== a.group) continue;
            const d = len(a.x - o.x, a.y - o.y);
            if (d < 16 * k) {
              want.x += ((a.x - o.x) / d) * 40;
              want.y += ((a.y - o.y) / d) * 40;
            }
          }
        }
        if (slot < 0 && !a.leaving) {
          // the laser dot: fish chase it like cats
          if (tool === "play" && laser.on && sp.follows && !asleep && len(laser.x - a.x, laser.y - a.y) < 380 * k) {
            want = toward(a, { x: laser.x + Math.sin(t * 5 + a.phase) * 18, y: laser.y + Math.cos(t * 4 + a.phase) * 14 }, a.speed * k * 2.4);
          }
          // bait on the fishing hook
          if (game.active && !game.reel && sp.catchable && !names[a.key]) {
            const d = len(game.hook.x - a.x, game.hook.y - a.y);
            if (d < 170 * k) want = toward(a, game.hook, speed * 1.8);
            if (d < 11 * k) {
              a.hooked = true;
              game.reel = a;
              play("tap");
              continue;
            }
          }
          // food
          if (sp.eats && !asleep && food.length) {
            let best = -1;
            let bd = 240 * k;
            food.forEach((f, i) => {
              const d = len(f.x - a.x, f.y - a.y);
              if (d < bd) [best, bd] = [i, d];
            });
            if (best >= 0) {
              want = toward(a, food[best]!, speed * 2.2);
              if (bd < 9 * k) eat(best);
            }
          }
          // celebration: a happy loop-the-loop
          if (celebrating && a.kind !== "jelly" && a.kind !== "turtle") {
            a.loop ??= { x: a.x, y: a.y };
            const ang = t * 3.2 + a.phase;
            want = toward(a, { x: a.loop.x + Math.cos(ang) * 34 * k, y: a.loop.y + Math.sin(ang) * 34 * k }, speed * 3);
          } else a.loop = undefined;
        }
        // the shark
        const ds = len(a.x - mouth.x, a.y - mouth.y);
        if (a.kind === "puffer") a.puff += ((ds < 150 * k && !asleep ? 1.55 : 1) - a.puff) * Math.min(1, dt * 3);
        if (sp.flees && ds < 150 * k && !(a.kind === "prey" && names[a.key]) && !a.leaving) want = toward(mouth, a, speed * 2.8);
      }

      // walls, then steer
      if (a.y < surface + 24) want.y += 50;
      if (a.y > sy - 20) want.y -= 60;
      if (!a.leaving && !a.transient) {
        if (a.x < 12) want.x += 50;
        if (a.x > W - 12) want.x -= 50;
      }
      const kk = Math.min(1, dt * agility);
      a.vx += (want.x - a.vx) * kk;
      a.vy += (want.y - a.vy) * kk;
      const drift = a.kind === "jelly" ? 1.3 : a.kind === "turtle" || a.kind === "shark" || a.kind === "manta" ? 0.3 : 0.8 * (1 - a.z * 0.3);
      a.x += (a.vx + flow.x * drift) * dt;
      a.y += (a.vy + flow.y * drift) * dt;
    }
  }

  function render(dt = 0) {
    for (const a of agents) {
      if (!a.alive) continue;
      const upright = a.kind === "jelly" || WALKERS.includes(a.kind) || a.kind === "seahorse";
      // turn around only when clearly swimming the other way, and not again straight after a turn -
      // otherwise a fish hovering at a spot (or the shark lining up a bite) flips left-right every frame
      const side = a.vx < 0 ? -1 : 1;
      if (a.kind !== "jelly" && !a.hooked && side !== a.flip && Math.abs(a.vx) > 18 * k && t - a.lastFlip > 0.9) {
        a.flip = side;
        a.lastFlip = t;
      }
      a.turn = dt ? a.turn + (a.flip - a.turn) * Math.min(1, dt * 11) : a.flip;
      const s = (1 - a.z * 0.4) * a.puff;
      const tilt = upright ? 0 : a.hooked ? Math.sin(t * 20) * 0.4 - 0.9 : clamp(Math.atan2(a.vy, Math.abs(a.vx) + 1), -0.45, 0.45) + Math.sin(t * 7 + a.phase) * 0.035;
      a.el.style.transform = `translate3d(${a.x - a.w / 2}px, ${a.y - a.h / 2}px, 0) scale(${a.turn * s}, ${s}) rotate(${tilt}rad)`;
      if (a.kind === "jelly") {
        let g = glows.get(a.key);
        if (!g) {
          g = document.createElement("span");
          g.className = "tank-glow";
          layers.ui.appendChild(g);
          glows.set(a.key, g);
        }
        g.style.opacity = (Math.max(night, storm * 0.6) * (0.75 + Math.sin(t * 2 + a.phase) * 0.25)).toFixed(2);
        g.style.transform = `translate3d(${a.x}px, ${a.y - a.h * 0.25}px, 0) translate(-50%, -50%)`;
      }
      const tag = tags.get(a.key);
      if (tag) tag.style.transform = `translate3d(${a.x}px, ${a.y - (a.h * s) / 2 - 10}px, 0) translate(-50%, -100%)`;
    }
    for (const b of bubbles) b.el.style.transform = `translate3d(${b.x}px, ${b.y}px, 0) translate(-50%, -50%)`;
    for (const f of food) f.el.style.transform = `translate3d(${f.x}px, ${f.y}px, 0)`;
  }

  const pickVisitor = (): Kind => {
    // what shows up depends on the season
    const m = new Date().getMonth();
    const w: [Kind, number][] =
      m >= 5 && m <= 8
        ? [["whale", 0.5], ["octopus", 0.3], ["seahorse", 0.2]]
        : m >= 9 && m <= 10
          ? [["octopus", 0.5], ["seahorse", 0.3], ["whale", 0.2]]
          : m <= 1 || m === 11
            ? [["seahorse", 0.5], ["octopus", 0.3], ["whale", 0.2]]
            : [["seahorse", 0.4], ["octopus", 0.4], ["whale", 0.2]];
    let r = Math.random();
    for (const [kind, p] of w) if ((r -= p) <= 0) return kind;
    return "octopus";
  };

  function startStorm() {
    stormUntil = t + 24;
    nextFlash = t + 1.5;
    toast("⛈️ A storm is rolling in outside - the fish are huddling together");
  }

  // ---------- run only while visible ----------
  const ro = new ResizeObserver(measure);
  ro.observe(root);
  window.setTimeout(measure, 50); // after the scenery has laid out
  const io = new IntersectionObserver(([e]) => {
    cancelAnimationFrame(raf);
    lastNow = 0;
    if (e?.isIntersecting && !reduce) raf = requestAnimationFrame(frame);
  });
  io.observe(root);
  if (reduce) window.setTimeout(() => render(), 60);

  return {
    setTool(next: Tool) {
      if (tool === "play" && next !== "play") laser.on = false;
      tool = next;
      root.dataset.tool = next;
    },
    setNight(n: number) {
      night = n;
    },
    setNames(next: Record<string, string>) {
      names = next;
      for (const [key, el] of tags) {
        if (names[key]) continue;
        el.remove();
        tags.delete(key);
      }
      for (const [key, name] of Object.entries(names)) {
        let el = tags.get(key);
        if (!el) {
          el = document.createElement("span");
          el.className = "tank-tag";
          layers.ui.appendChild(el);
          tags.set(key, el);
        }
        el.textContent = `♥ ${name}`;
      }
    },
    setSchool,
    setSales(perSecond: number, label: string) {
      sales = { perSecond, label };
    },
    /** Fish from the shop that the owner has put in the tank. */
    setExtras(kinds: ExtraKind[]) {
      for (const a of agents.filter((x) => x.key.startsWith("extra-") && !kinds.includes(x.kind as ExtraKind))) remove(a);
      for (const kind of kinds)
        if (!agents.some((x) => x.key === `extra-${kind}`)) {
          const a = spawn(kind, `extra-${kind}`, { x: Math.random() < 0.5 ? -60 : W + 60, y: H * rand(0.25, 0.5) });
          a.goal = bandPoint(a);
        }
    },
    /** The customer's own fish on the form page. */
    addGuest(name: string) {
      if (agents.some((a) => a.key === "guest-you")) return;
      const a = spawn("gold", "guest-you", { x: -40, y: H * 0.4 });
      a.info = { species: "Your fish", name, fact: "Joined the tank the moment you sent your details. Welcome aboard!", adoptable: false };
      a.goal = { x: W * 0.5, y: H * 0.4 };
      burst("tank-star", { x: 30, y: H * 0.4 }, 10, [60, 60]);
      play("chime");
    },
    celebrate() {
      celebrateUntil = t + 4.5;
      for (let i = 0; i < 40; i++) window.setTimeout(() => bubble(rand(W * 0.05, W * 0.95), H - rand(30, 60)), i * 40);
      play("chime");
    },
    payoff: coins,
    /** The treasure diver walks over and opens the chest. */
    diverToChest() {
      if (diverA()) diverTask = "chest";
      else coins();
    },
    heart(seconds = 10) {
      heartUntil = t + seconds;
      play("chime");
    },
    storm: startStorm,
    /** Everything wobbles: fish tumble, bubbles burst out, sand swirls up. */
    shake() {
      for (const a of agents) {
        if (WALKERS.includes(a.kind) || a.hooked) continue;
        const m = a.kind === "turtle" || a.kind === "manta" || a.kind === "shark" ? 0.4 : 1;
        a.vx += rand(-320, 320) * m * k;
        a.vy += rand(-220, 220) * m * k;
      }
      for (let i = 0; i < 30; i++) bubble(rand(0, W), rand(H * 0.3, H - 30), rand(2, 6));
      for (let i = 0; i < 22; i++) fx("tank-puff tank-puff-big", rand(0, W), sandY() + rand(0, 20), "", 1200);
      flow.x = rand(-200, 200);
      play("rumble");
    },
    startGame() {
      Object.assign(game, { active: true, until: t + 30, score: 0, reel: null, hook: { x: W / 2, y: H * 0.4 }, aim: { x: W / 2, y: H * 0.4 } });
      toast("🎣 Fishing time! Move the hook next to a fish - 30 seconds, watch out for the shark");
      opts.onGame({ active: true, left: 30, score: 0, best: game.best });
    },
    stopGame() {
      if (game.active) endGame();
    },
    /** A golden fish swims by after `seconds` (the page decides it's this device's once-a-day chance). */
    scheduleLucky(seconds: number) {
      luckyAt = t + seconds;
    },
    sharkMood() {
      const h = Math.round(shark.hunger);
      return { hunger: h, label: h < 25 ? "Full and calm" : h < 45 ? "Content" : h < 75 ? "Peckish" : "Starving", emoji: h < 25 ? "😌" : h < 45 ? "🙂" : h < 75 ? "😬" : "😈" };
    },
    feedShark() {
      const sh = sharkA();
      shark.feedingUntil = t + 6;
      shark.hunting = false;
      dropFood(sh.x + sh.flip * sh.w * 0.5, Math.max(surface + 30, sh.y - 30 * k), 7, false);
    },
    measure,
    select,
    /** Where a creature (or the chest) is now, for the name card. */
    where(key: string): { x: number; y: number } | null {
      if (key === "chest") return { x: spots.chest.x, y: spots.chest.y - spots.chest.h / 2 };
      const a = agents.find((x) => x.key === key);
      if (!a || !a.alive) return null;
      return { x: a.x, y: a.y - (a.h * (1 - a.z * 0.4) * a.puff) / 2 };
    },
    destroy() {
      cancelAnimationFrame(raf);
      io.disconnect();
      ro.disconnect();
      root.removeEventListener("pointerdown", onDown);
      root.removeEventListener("pointermove", onMove);
      root.removeEventListener("pointerup", onUp);
      root.removeEventListener("pointercancel", onUp);
      root.removeEventListener("pointerleave", onLeave);
      for (const l of Object.values(layers)) l.replaceChildren();
    },
  };
}

export type Engine = ReturnType<typeof createEngine>;
