import { ART, type ArtKind, svg } from "./art";
import { sfx } from "./sound";

/**
 * The aquarium's simulation. Every creature, bubble, food flake and effect is a plain DOM element that this loop
 * moves each frame (React only renders the scenery and the controls around it). Coordinates are px inside the water.
 *
 * Behaviour in short: fish wander their depth band, school with their own kind, chase food, flee the shark and
 * startle away from a tap on the glass; a swipe makes a current; at night they rest near the plants. The shark
 * cruises, then hunts the yellow fish (never an adopted one) - unless a feeding frenzy has it chasing food instead.
 */

export type Tool = "explore" | "feed" | "clean";
export type Kind = ArtKind;

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
export interface EngineOpts {
  onSelect: (info: FishInfo | null) => void;
  onToast: (text: string) => void;
  onWipe: (x: number, y: number, start: boolean) => void;
  chestInfo: () => FishInfo;
}

type Vec = { x: number; y: number };
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
  flip: number;
  phase: number;
  puff: number; // pufferfish inflation, 1 = normal
  alive: boolean;
  respawn: number;
  info: Omit<FishInfo, "key" | "kind">;
  group?: string;
  transient?: { until: number }; // babies and visitors leave on their own
  fading?: number;
  pause?: number; // crab: stands still until
  loop?: Vec; // centre of the celebration loop
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

/** Who lives in the tank, and how each kind behaves. */
const SPECIES: Record<
  Kind,
  { species: string; names: string[]; fact: string; w: number; z: [number, number]; speed: number; band: [number, number]; eats?: boolean; flees?: boolean; group?: string }
> = {
  clown: { species: "Clownfish", names: ["Pip", "Coral"], fact: "Sleeps safely among the anemone's stinging tentacles.", w: 58, z: [0.05, 0.2], speed: 38, band: [0.35, 0.8], eats: true, flees: true },
  tang: { species: "Blue tang", names: ["Blue"], fact: "Hides a sharp little spine near its tail.", w: 74, z: [0.25, 0.3], speed: 46, band: [0.2, 0.75], eats: true, flees: true },
  angel: { species: "Angelfish", names: ["Stripe"], fact: "Its tall fins help it glide between the plants.", w: 54, z: [0.6, 0.65], speed: 26, band: [0.2, 0.7], eats: true, flees: true },
  gold: { species: "Goldfish", names: ["Mango"], fact: "Remembers things for months - not three seconds!", w: 70, z: [0.3, 0.35], speed: 34, band: [0.15, 0.7], eats: true, flees: true },
  puffer: { species: "Pufferfish", names: ["Puffy"], fact: "Blows up like a balloon when the shark swims close.", w: 50, z: [0.45, 0.5], speed: 22, band: [0.25, 0.75], eats: true },
  tetra: { species: "Neon tetra", names: ["Neon"], fact: "Its glowing stripe keeps the school together.", w: 26, z: [0.68, 0.78], speed: 50, band: [0.12, 0.6], eats: true, flees: true, group: "tetra" },
  prey: { species: "Yellow damsel", names: ["Sunny"], fact: "Quick and nervous - for good reason. Adopt one and the shark leaves it alone.", w: 26, z: [0.15, 0.4], speed: 44, band: [0.12, 0.75], eats: true, flees: true, group: "prey" },
  receipt: { species: "Receipt fish", names: [], fact: "", w: 18, z: [0.35, 0.5], speed: 48, band: [0.15, 0.7], eats: true, flees: true, group: "receipt" },
  customer: { species: "Customer fish", names: [], fact: "", w: 16, z: [0.75, 0.85], speed: 44, band: [0.15, 0.65], eats: true, flees: true, group: "customer" },
  baby: { species: "Baby clownfish", names: ["Tiny"], fact: "Hatched right here in the tank.", w: 20, z: [0.05, 0.12], speed: 30, band: [0.6, 0.85], eats: true, flees: true },
  turtle: { species: "Sea turtle", names: ["Shelly"], fact: "Can hold its breath for hours while it naps.", w: 104, z: [0.6, 0.62], speed: 16, band: [0.2, 0.6] },
  shark: { species: "Reef shark", names: ["Captain Chomp"], fact: "Always hungry - but it can't resist fish food.", w: 150, z: [0.3, 0.3], speed: 45, band: [0.15, 0.7] },
  jelly: { species: "Moon jellyfish", names: ["Glow"], fact: "No brain, no heart - and it glows at night.", w: 40, z: [0.7, 0.7], speed: 10, band: [0.08, 0.45] },
  crab: { species: "Red crab", names: ["Pincher"], fact: "Walks sideways and kicks up little puffs of sand.", w: 44, z: [0.1, 0.1], speed: 34, band: [1, 1] },
  octopus: { species: "Octopus · visitor", names: ["Ink"], fact: "Changes colour in a blink - tap it again!", w: 72, z: [0.2, 0.2], speed: 34, band: [0.3, 0.6] },
  seahorse: { species: "Seahorse · visitor", names: ["Twirl"], fact: "Seahorse dads are the ones who carry the babies.", w: 30, z: [0.25, 0.25], speed: 12, band: [0.3, 0.6] },
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
  ["shark", 1],
  ["crab", 1],
];

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
  let sales = { perSecond: 0.15, label: "" };
  let nextLabel = 6;
  let nextSales = 1;
  let nextAir = 0;
  let nextNest = 25;
  let nest: { stage: "gather" | "eggs"; at: number; el?: HTMLElement } | null = null;
  let nextVisitor = 18;
  let whale: { el: HTMLElement; x: number; y: number; w: number } | null = null;
  let chestOpenUntil = 0;
  const shark = { hunting: false, until: rand(5, 8), jaw: 0 };

  // ---------- scenery anchors (measured from the React-rendered scenery) ----------
  const anchor = (sel: string): Vec & { w: number; h: number } => {
    const el = root.querySelector<HTMLElement>(sel);
    if (!el) return { x: W / 2, y: sandY(), w: 0, h: 0 };
    const r = el.getBoundingClientRect();
    const o = root.getBoundingClientRect();
    return { x: r.left - o.left + r.width / 2, y: r.top - o.top + r.height / 2, w: r.width, h: r.height };
  };
  let spots = { chest: anchor("[data-chest]"), anemone: anchor("[data-anemone]"), air: anchor("[data-airstone]"), rest: [] as Vec[] };
  const measure = () => {
    W = root.clientWidth;
    H = root.clientHeight;
    k = clamp(W / 1000, 0.62, 1);
    spots = {
      chest: anchor("[data-chest]"),
      anemone: anchor("[data-anemone]"),
      air: anchor("[data-airstone]"),
      rest: [...root.querySelectorAll<HTMLElement>("[data-rest]")].map((el) => {
        const r = el.getBoundingClientRect();
        const o = root.getBoundingClientRect();
        return { x: r.left - o.left + r.width / 2, y: r.bottom - o.top };
      }),
    };
    for (const a of agents) size(a);
  };

  // ---------- creatures ----------
  const bandPoint = (a: Pick<Agent, "kind">): Vec => {
    const [lo, hi] = SPECIES[a.kind].band;
    return { x: rand(W * 0.06, W * 0.94), y: clamp(rand(H * lo, H * hi), surface + 20, sandY() - 24) };
  };
  const size = (a: Agent) => {
    const [vw, vh] = ART[a.kind].slice(0, 2) as [number, number];
    a.w = SPECIES[a.kind].w * k;
    a.h = (a.w * vh) / vw;
    a.el.style.width = `${a.w}px`;
    a.el.style.height = `${a.h}px`;
  };

  function spawn(kind: Kind, key: string, at?: Vec, extra?: Partial<Agent>) {
    const sp = SPECIES[kind];
    const el = document.createElement("div");
    el.className = `tank-agent tank-${kind}`;
    el.innerHTML = svg(kind);
    const z = rand(sp.z[0], sp.z[1]);
    // depth: far creatures are smaller, softer and paler
    if (z > 0.5) {
      el.style.filter = `blur(${((z - 0.5) * 2.2).toFixed(2)}px) saturate(${(1 - z * 0.35).toFixed(2)}) brightness(${(1 - z * 0.12).toFixed(2)})`;
      el.style.opacity = String(1 - z * 0.25);
    }
    (z > 0.55 ? layers.far : layers.near).appendChild(el);
    const idx = Number(key.split("-").pop()) || 0;
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
      flip: Math.random() < 0.5 ? -1 : 1,
      phase: rand(0, 6.28),
      puff: 1,
      alive: true,
      respawn: 0,
      info: { species: sp.species, name: sp.names.length > 1 ? sp.names[idx % sp.names.length]! : sp.names.length ? `${sp.names[0]}${["tetra", "prey"].includes(kind) ? ` ${idx + 1}` : ""}` : "", fact: sp.fact, adoptable: true },
      group: sp.group,
      ...extra,
    };
    size(a);
    const p = at ?? bandPoint(a);
    a.x = p.x;
    a.y = kind === "crab" ? H - 24 * k : p.y;
    a.goal = bandPoint(a);
    agents.push(a);
    return a;
  }
  const remove = (a: Agent) => {
    a.el.remove();
    tags.get(a.key)?.remove();
    tags.delete(a.key);
    glows.get(a.key)?.remove();
    glows.delete(a.key);
    agents.splice(agents.indexOf(a), 1);
    if (selected === a.key) select(null);
  };

  for (const [kind, n] of CAST) for (let i = 0; i < n; i++) spawn(kind, `${kind}-${i}`);
  const sharkA = () => agents.find((a) => a.kind === "shark")!;

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
    if (bubbles.length > 90) return;
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
  const chomp = (at: Vec) => {
    fx("tank-chomp", at.x, at.y, Array.from({ length: 6 }, (_, i) => `<i style="--a:${i * 60 + rand(-15, 15)}deg"></i>`).join(""), 900);
    sfx("chomp");
  };
  const toast = (text: string) => opts.onToast(text);

  // ---------- public controls ----------
  function select(key: string | null) {
    root.querySelector(".is-picked")?.classList.remove("is-picked");
    selected = key;
    const a = key ? agents.find((x) => x.key === key) : null;
    a?.el.classList.add("is-picked");
    if (!key) opts.onSelect(null);
    else if (key === "chest") opts.onSelect(opts.chestInfo());
    else if (a) opts.onSelect({ key: a.key, kind: a.kind, ...a.info, name: names[a.key] ?? a.info.name });
  }

  const dropFood = (x: number, y: number) => {
    for (let i = 0; i < 4 && food.length < 40; i++) {
      const el = document.createElement("span");
      el.className = "tank-food";
      layers.fx.appendChild(el);
      food.push({ x: x + rand(-16, 16), y: y + rand(-6, 6), seed: rand(0, 6), el, settled: 0 });
    }
    sfx("plop");
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
    sfx("tap");
    for (const a of agents) {
      if (a.kind === "whale" || a.kind === "crab") continue;
      const d = len(a.x - x, a.y - y);
      const R = 170 * k;
      if (d > R) continue;
      const push = (a.kind === "turtle" || a.kind === "shark" ? 60 : 260) * (1 - d / R);
      a.vx += ((a.x - x) / d) * push;
      a.vy += ((a.y - y) / d) * push;
    }
  };

  const hit = (x: number, y: number): string | null => {
    const c = spots.chest;
    const front = [...agents].filter((a) => a.alive && a.kind !== "whale").sort((a, b) => a.z - b.z);
    for (const a of front) {
      const s = (1 - a.z * 0.4) * a.puff;
      const hw = Math.max((a.w * s) / 2, 14);
      const hh = Math.max((a.h * s) / 2, 14);
      if (Math.abs(x - a.x) < hw && Math.abs(y - a.y) < hh) return a.key;
    }
    if (c.w && Math.abs(x - c.x) < c.w / 2 && Math.abs(y - c.y) < c.h / 2) return "chest";
    return null;
  };

  // ---------- pointer: tap / swipe / feed / scrub ----------
  const drag = { down: false, x: 0, y: 0, lx: 0, ly: 0, lt: 0, moved: false, id: -1 };
  const local = (e: PointerEvent): Vec => {
    const r = root.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };
  const onDown = (e: PointerEvent) => {
    if ((e.target as Element).closest("[data-tank-ui]")) return;
    const p = local(e);
    Object.assign(drag, { down: true, x: p.x, y: p.y, lx: p.x, ly: p.y, lt: performance.now(), moved: false, id: e.pointerId });
    if (tool === "clean") {
      try {
        root.setPointerCapture(e.pointerId); // keep scrubbing even when the finger leaves the glass
      } catch {
        /* pointer already gone */
      }
      opts.onWipe(p.x, p.y, true);
    } else if (tool === "feed") {
      dropFood(p.x, Math.min(p.y, sandY() - 10));
    }
  };
  const onMove = (e: PointerEvent) => {
    if (!drag.down || e.pointerId !== drag.id) return;
    const p = local(e);
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
    if (tool !== "explore" || drag.moved) return;
    const key = hit(drag.x, drag.y);
    if (key) {
      select(key);
      if (key === "chest") openChest(2.5);
      const a = agents.find((x) => x.key === key);
      if (a?.kind === "octopus") a.el.style.setProperty("--hue", `${Math.round(rand(40, 320))}deg`);
      if (a?.kind === "puffer") a.puff = 1.5;
    } else {
      select(null);
      tapGlass(drag.x, drag.y);
    }
  };
  root.addEventListener("pointerdown", onDown);
  root.addEventListener("pointermove", onMove);
  root.addEventListener("pointerup", onUp);
  root.addEventListener("pointercancel", onUp);

  // ---------- scoreboard schools ----------
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

  // ---------- frame ----------
  let raf = 0;
  let lastNow = 0;
  const frame = (now: number) => {
    const dt = Math.min(0.05, (now - (lastNow || now)) / 1000);
    lastNow = now;
    t += dt;
    step(dt);
    render();
    raf = requestAnimationFrame(frame);
  };

  function step(dt: number) {
    const asleep = night > 0.6;
    const sy = sandY();
    const sh = sharkA();
    const mouth: Vec = { x: sh.x + sh.flip * sh.w * 0.42, y: sh.y + sh.h * 0.08 };
    const frenzy = t < frenzyUntil;
    const celebrating = t < celebrateUntil;

    // the current fades; plants lean with it
    flow.x *= Math.exp(-dt * 1.1);
    flow.y *= Math.exp(-dt * 1.6);
    root.style.setProperty("--flow", (flow.x / 160).toFixed(3));

    // chest
    if (chestOpenUntil && t > chestOpenUntil) {
      chestOpenUntil = 0;
      root.querySelector("[data-chest]")?.classList.remove("is-open");
    }

    // bubbles: air stone, and today's sales rising from the chest
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
        if (Math.random() < 0.35) sfx("bubble");
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
      food[i]!.el.remove();
      food.splice(i, 1);
    };

    // clownfish family: every so often they lay eggs by the anemone, which hatch into babies
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
      sfx("chime");
    }

    // seasonal visitors
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
        const a = spawn(kind, `${kind}-${Math.round(t)}`, { x: fromLeft ? -40 : W + 40, y: H * rand(0.3, 0.55) }, { transient: { until: t + 90 } });
        a.goal = { x: fromLeft ? W + 80 : -80, y: a.y };
        a.info = { ...a.info, adoptable: false };
        toast(kind === "octopus" ? "🐙 An octopus is visiting - tap it!" : "🌊 A seahorse drifted in");
      }
    }
    if (whale) {
      const dir = Number(whale.el.dataset.dir);
      whale.x += dir * (W / 28) * dt;
      whale.el.style.transform = `translate3d(${whale.x - whale.w / 2}px, ${whale.y}px, 0) scaleX(${dir})`;
      if ((dir > 0 && whale.x > W + whale.w) || (dir < 0 && whale.x < -whale.w)) {
        whale.el.remove();
        whale = null;
      }
    }

    // shark: cruise a while, then hunt a yellow fish - not at night, not during a frenzy, never an adopted one
    const targets = agents.filter((a) => a.kind === "prey" && a.alive && !names[a.key]);
    if (!shark.hunting && t > shark.until && targets.length && !asleep && !frenzy && !celebrating) {
      shark.hunting = true;
      shark.until = t + 9;
    }
    if (shark.hunting && (t > shark.until || asleep || frenzy || !targets.length)) {
      shark.hunting = false;
      shark.until = t + rand(6, 10);
    }

    // everyone else
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
      // leaving
      if (a.fading !== undefined) {
        a.fading -= dt;
        a.el.style.opacity = String(Math.max(0, a.fading));
        if (a.fading <= 0) remove(a);
        continue;
      }
      if (a.transient && t > a.transient.until && a.kind === "baby") {
        a.fading = 1;
        bubble(a.x, a.y, 2);
        continue;
      }
      if (!a.alive) {
        if (t > a.respawn) {
          Object.assign(a, { alive: true, x: Math.random() < 0.5 ? -20 : W + 20, y: rand(H * 0.2, H * 0.6), vx: 0, vy: 0, goal: bandPoint(a) });
          a.el.style.opacity = "";
        }
        continue;
      }

      let want: Vec;
      let agility = 2.5;
      const sp = SPECIES[a.kind];
      if (Math.hypot(a.goal.x - a.x, a.goal.y - a.y) < 24) a.goal = bandPoint(a);

      if (a.kind === "crab") {
        // walks the sand, pausing now and then, and heads for food lying there
        const lying = food.find((f) => f.settled && Math.abs(f.x - a.x) < 200 * k);
        if (lying) a.goal = { x: lying.x, y: a.y };
        const moving = !asleep && (!a.pause || t > a.pause);
        const dx = a.goal.x - a.x;
        if (Math.abs(dx) < 6) {
          if (lying) eat(food.indexOf(lying));
          a.goal = { x: rand(W * 0.08, W * 0.92), y: a.y };
          a.pause = t + rand(1, 3.5);
        }
        a.vx = moving ? Math.sign(dx) * a.speed * k : 0;
        a.x += a.vx * dt;
        a.y = H - 24 * k;
        a.el.classList.toggle("is-walking", moving && Math.abs(dx) >= 6);
        if (moving && Math.random() < dt * 3) fx("tank-puff", a.x - Math.sign(a.vx) * a.w * 0.3, a.y + a.h * 0.35, "", 900);
        continue;
      }

      if (a.kind === "shark") {
        agility = 1.6;
        if (frenzy && food.length) {
          const f = food.reduce((b, x) => (len(x.x - mouth.x, x.y - mouth.y) < len(b.x - mouth.x, b.y - mouth.y) ? x : b));
          want = toward(mouth, f, 120 * k);
          if (len(f.x - mouth.x, f.y - mouth.y) < 16 * k) {
            eat(food.indexOf(f));
            shark.jaw = t + 0.25;
            sfx("chomp");
          }
        } else if (shark.hunting) {
          const target = targets.reduce((b, p) => (len(p.x - mouth.x, p.y - mouth.y) < len(b.x - mouth.x, b.y - mouth.y) ? p : b));
          want = toward(mouth, target, 125 * k);
          if (len(target.x - mouth.x, target.y - mouth.y) < 18 * k) {
            target.alive = false;
            target.respawn = t + rand(5, 8);
            target.el.style.opacity = "0";
            shark.jaw = t + 0.35;
            chomp(mouth);
            shark.hunting = false;
            shark.until = t + rand(6, 10);
          }
        } else {
          if (asleep) a.goal = { x: a.goal.x, y: clamp(a.goal.y, H * 0.45, sy - 40) };
          want = toward(a, a.goal, (asleep ? 18 : 42) * k);
        }
        a.el.dataset.open = t < shark.jaw || shark.hunting || (frenzy && food.length > 0) ? "1" : "";
      } else if (a.kind === "octopus" || a.kind === "seahorse") {
        // visitors cross the tank once; the octopus in jet pulses, the seahorse bobbing upright
        const pulse = a.kind === "octopus" ? 0.35 + Math.max(0, Math.sin(t * 2.4 + a.phase)) * 1.6 : 1;
        want = toward(a, a.goal, a.speed * k * pulse);
        want.y += Math.sin(t * 1.5 + a.phase) * 12;
        if ((a.goal.x > W && a.x > W + 60) || (a.goal.x < 0 && a.x < -60)) {
          remove(a);
          continue;
        }
      } else {
        // fish, turtle, jellyfish
        let speed = a.speed * k;
        if (asleep && a.kind !== "jelly") {
          // rest near the plants (clownfish in their anemone), barely moving
          const home = a.kind === "clown" || a.kind === "baby" ? spots.anemone : spots.rest[Math.abs(Math.floor(a.phase * 10)) % Math.max(1, spots.rest.length)] ?? { x: a.x, y: sy };
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
        const g = a.group ? groups.get(a.group) : undefined;
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
        // the shark
        const ds = len(a.x - mouth.x, a.y - mouth.y);
        if (a.kind === "puffer") a.puff += ((ds < 150 * k && !asleep ? 1.55 : 1) - a.puff) * Math.min(1, dt * 3);
        if (sp.flees && ds < 150 * k && !(a.kind === "prey" && names[a.key])) want = toward(mouth, a, speed * 2.8);
        // celebration: a happy loop-the-loop
        if (celebrating && a.kind !== "jelly" && a.kind !== "turtle") {
          a.loop ??= { x: a.x, y: a.y };
          const ang = t * 3.2 + a.phase;
          const r = 34 * k;
          want = toward(a, { x: a.loop.x + Math.cos(ang) * r, y: a.loop.y + Math.sin(ang) * r }, speed * 3);
        } else a.loop = undefined;
      }

      // walls, then steer
      if (a.y < surface + 24) want.y += 50;
      if (a.y > sy - 20) want.y -= 60;
      if (a.x < 12 && !a.transient) want.x += 50;
      if (a.x > W - 12 && !a.transient) want.x -= 50;
      const kk = Math.min(1, dt * agility);
      a.vx += (want.x - a.vx) * kk;
      a.vy += (want.y - a.vy) * kk;
      const drift = a.kind === "jelly" ? 1.3 : a.kind === "turtle" || a.kind === "shark" ? 0.3 : 0.8 * (1 - a.z * 0.3);
      a.x += (a.vx + flow.x * drift) * dt;
      a.y += (a.vy + flow.y * drift) * dt;
    }

    if (whale) whale.el.style.opacity = String(0.16 * (1 - night * 0.5));
  }

  function render() {
    for (const a of agents) {
      if (!a.alive) continue;
      if (Math.abs(a.vx) > 4 && a.kind !== "jelly" && a.kind !== "crab" && a.kind !== "seahorse") a.flip = a.vx < 0 ? -1 : 1;
      const s = (1 - a.z * 0.4) * a.puff;
      const tilt =
        a.kind === "jelly" || a.kind === "crab" || a.kind === "seahorse" ? 0 : clamp(Math.atan2(a.vy, Math.abs(a.vx) + 1), -0.45, 0.45) + Math.sin(t * 7 + a.phase) * 0.035;
      a.el.style.transform = `translate3d(${a.x - a.w / 2}px, ${a.y - a.h / 2}px, 0) scale(${a.flip * s}, ${s}) rotate(${tilt}rad)`;
      if (a.kind === "jelly") {
        let g = glows.get(a.key);
        if (!g) {
          g = document.createElement("span");
          g.className = "tank-glow";
          layers.ui.appendChild(g);
          glows.set(a.key, g);
        }
        g.style.opacity = (night * (0.75 + Math.sin(t * 2 + a.phase) * 0.25)).toFixed(2);
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
  if (reduce) window.setTimeout(render, 60);

  return {
    setTool(next: Tool) {
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
    /** Burst of bubbles and a loop-the-loop, for newly saved receipts. */
    celebrate() {
      celebrateUntil = t + 4.5;
      for (let i = 0; i < 40; i++) window.setTimeout(() => bubble(rand(W * 0.05, W * 0.95), H - rand(30, 60)), i * 40);
      sfx("chime");
    },
    /** The treasure chest bursts open with coins. */
    payoff() {
      openChest(4.5);
      for (let i = 0; i < 14; i++)
        fx("tank-coin", spots.chest.x, spots.chest.y - spots.chest.h * 0.2, "", 1700).style.cssText += `;--dx:${rand(-70, 70)}px;--dy:${rand(-150, -70)}px;animation-delay:${i * 50}ms`;
      sfx("coins");
    },
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
      for (const l of Object.values(layers)) l.replaceChildren();
    },
  };
}

export type Engine = ReturnType<typeof createEngine>;
