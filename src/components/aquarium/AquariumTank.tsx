"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  CloudLightning,
  Cookie,
  Droplet,
  Hand,
  Heart,
  Moon,
  Palette,
  RotateCcw,
  Sparkles,
  SprayCan,
  Store,
  Sun,
  SunMoon,
  Target,
  Thermometer,
  Trophy,
  Vibrate,
  Volume2,
  VolumeX,
  Wand2,
  X,
} from "lucide-react";
import { useStore } from "@/lib/store";
import { computeTotals, money, todayISO } from "@/lib/calc";
import { cx } from "../ui";
import { type Engine, type ExtraKind, type FishInfo, type GameState, type SchoolFish, type Tool, createEngine } from "./engine";
import { setSound } from "./sound";
import { Algae, type AlgaeHandle } from "./Algae";
import { Anemone, Castle, Chest, Coral, DiverStatue, Grass, Kelp, Pebbles, Sword, TankDefs } from "./scenery";

const load = <T,>(k: string, fallback: T): T => {
  try {
    const v = localStorage.getItem(k);
    return v === null ? fallback : (JSON.parse(v) as T);
  } catch {
    return fallback;
  }
};
const keep = (k: string, v: unknown) => {
  try {
    localStorage.setItem(k, JSON.stringify(v));
  } catch {
    /* private mode */
  }
};

/** 0 = day … 1 = night, easing through dusk (18-20h) and dawn (5-7h). */
const nightFromClock = () => {
  const d = new Date();
  const h = d.getHours() + d.getMinutes() / 60;
  if (h >= 20 || h < 5) return 1;
  if (h >= 18) return (h - 18) / 2;
  if (h < 7) return 1 - (h - 5) / 2;
  return 0;
};

const TOOL_HINT: Record<Tool, string> = {
  explore: "Tap a fish to meet it · tap the glass to startle them · swipe to stir up a current",
  feed: "Tap to drop food - feed quickly and the shark forgets to hunt",
  play: "Move your finger or mouse - the fish chase the laser dot, and the shark gets curious",
  clean: "Scrub the glass to wipe off the algae",
  fish: "Move the hook next to a fish to catch it - then keep it away from the shark!",
  decorate: "Drag the decorations along the sand - your layout is saved",
};

/** Movable decorations: default spot (% across the tank), how high they sit, and their size. */
const DECOR = [
  { id: "sword-a", x: 13, bottom: 16, w: "w-20 sm:w-28", hide: true, el: () => <Sword rest /> },
  { id: "anemone", x: 24, bottom: 12, w: "w-20 sm:w-28", el: () => <Anemone /> },
  { id: "diver", x: 33, bottom: 12, w: "w-8 sm:w-11", el: () => <DiverStatue /> },
  { id: "rock", x: 42, bottom: 12, w: "w-24 sm:w-36", hide: true, el: () => <Rock /> },
  { id: "coral-pink", x: 51, bottom: 20, w: "w-14 sm:w-20", el: () => <Coral /> },
  { id: "chest", x: 67, bottom: 12, w: "w-16 sm:w-20", el: () => <Chest /> },
  { id: "castle", x: 79, bottom: 10, w: "w-20 sm:w-28", hide: true, el: () => <Castle /> },
  { id: "coral-orange", x: 87, bottom: 16, w: "w-10 sm:w-14", el: () => <Coral tone="#f59e0b" className="-scale-x-100 [--delay:-1.5s]" /> },
  { id: "sword-b", x: 93, bottom: 16, w: "w-16 sm:w-24", hide: true, el: () => <Sword rest className="[--delay:-2s]" /> },
] as const;
type DecorId = (typeof DECOR)[number]["id"];

/** Extra fish anyone can add to the tank - nothing is locked. */
const SHOP: { kind: ExtraKind; name: string; blurb: string; emoji: string }[] = [
  { kind: "lionfish", name: "Lionfish", blurb: "Frilly, spiky and very slow", emoji: "🦁" },
  { kind: "manta", name: "Manta ray", blurb: "Glides on huge wings", emoji: "🪽" },
  { kind: "dolphin", name: "Baby dolphin", blurb: "Fast, playful, chatty", emoji: "🐬" },
  { kind: "koi", name: "Koi", blurb: "Calm, lucky, lives for decades", emoji: "🎏" },
  { kind: "stingray", name: "Stingray", blurb: "Glides low over the sand", emoji: "🌊" },
];

/**
 * The aquarium. React draws the scenery, controls and cards; the engine (engine.ts) runs every creature.
 *
 * In the shop (default) it is tied to the business: a fish for every receipt and customer, bubbles from the chest for
 * today's sales, celebrations, the fish shop, the daily goal and the anniversary. With `guest` (the public customer
 * form) none of that is read or shown - only the fish, games and events - and it keeps its own records on the device.
 */
export function AquariumTank({
  className,
  guest = false,
  guestFish = null,
  dark = false,
}: {
  className?: string;
  guest?: boolean;
  /** Customer form: the name of the fish that joins after the form is sent. */
  guestFish?: string | null;
  /** Controls sit on a dark page. */
  dark?: boolean;
}) {
  const storeData = useStore();
  // a guest never gets the shop's data - not even the demo data a logged-out browser holds
  const invoices = useMemo(() => (guest ? [] : storeData.invoices), [guest, storeData.invoices]);
  const customers = useMemo(() => (guest ? [] : storeData.customers), [guest, storeData.customers]);
  const ready = guest || storeData.ready;
  const shopName = guest ? "" : storeData.shop.name;
  const K = guest ? "gr-guest-tank-" : "gr-tank-";

  const root = useRef<HTMLDivElement>(null);
  const shadowLayer = useRef<HTMLDivElement>(null);
  const farLayer = useRef<HTMLDivElement>(null);
  const nearLayer = useRef<HTMLDivElement>(null);
  const fxLayer = useRef<HTMLDivElement>(null);
  const uiLayer = useRef<HTMLDivElement>(null);
  const engine = useRef<Engine | null>(null);
  const algae = useRef<AlgaeHandle>(null);

  const [tool, setTool] = useState<Tool>("explore");
  const [soundOn, setSoundOn] = useState(false);
  const [light, setLight] = useState<"auto" | "day" | "night">("auto");
  const [clockNight, setClockNight] = useState(0);
  const [hour, setHour] = useState(12);
  const [tick, setTick] = useState(0);
  const [names, setNames] = useState<Record<string, string>>({});
  const [card, setCard] = useState<FishInfo | null>(null);
  const [toasts, setToasts] = useState<{ id: number; text: string }[]>([]);
  const [dirt, setDirt] = useState(0);
  const [game, setGame] = useState<GameState | null>(null);
  const [layout, setLayout] = useState<Partial<Record<DecorId, number>>>({});
  const [extras, setExtras] = useState<ExtraKind[]>([]);
  const [shopOpen, setShopOpen] = useState(false);
  const [shaking, setShaking] = useState(false);
  const night = light === "auto" ? clockNight : light === "night" ? 1 : 0;
  const decorating = tool === "decorate";

  // ---------- shop numbers (never for guests) ----------
  const today = todayISO();
  const totals = useMemo(() => {
    const byDay = new Map<string, number>();
    for (const inv of invoices) {
      const g = computeTotals(inv).grandTotal;
      byDay.set(inv.date, (byDay.get(inv.date) ?? 0) + g);
    }
    const count = invoices.filter((i) => i.date === today).length;
    // daily goal: a bit above the average selling day of the last 30 days
    const cutoff = new Date(Date.parse(`${today}T00:00:00Z`) - 30 * 86_400_000).toISOString().slice(0, 10);
    const recent = [...byDay].filter(([d]) => d >= cutoff && d < today).map(([, v]) => v);
    const avg = recent.length ? recent.reduce((a, b) => a + b, 0) / recent.length : 0;
    const first = invoices.reduce<string | null>((m, i) => (!m || i.date < m ? i.date : m), null);
    return { today: byDay.get(today) ?? 0, count, goal: Math.max(2000, Math.round((avg * 1.2) / 500) * 500), first };
  }, [invoices, today]);
  const receiptFish = useMemo<SchoolFish[]>(
    () =>
      [...invoices]
        .sort((a, b) => a.date.localeCompare(b.date) || a.number.localeCompare(b.number))
        .slice(-30)
        .map((i) => ({ key: `receipt-${i.id}`, name: i.number, fact: `Joined the school when receipt ${i.number}${i.customer.name ? ` for ${i.customer.name}` : ""} was saved.` })),
    [invoices],
  );
  const customerFish = useMemo<SchoolFish[]>(
    () =>
      customers
        .filter((c) => c.name.trim())
        .slice(-20)
        .map((c) => ({ key: `customer-${c.id}`, name: c.name.trim(), fact: `Joined when ${c.name.trim()} became a customer.` })),
    [customers],
  );

  const toast = useCallback((text: string) => {
    const id = Date.now() + Math.random();
    setToasts((l) => [...l.slice(-1), { id, text }]);
    window.setTimeout(() => setToasts((l) => l.filter((x) => x.id !== id)), 4200);
  }, []);

  // latest values the engine asks for
  const live = useRef({ totals, toast, guest, K });
  useEffect(() => {
    live.current = { totals, toast, guest, K };
  });

  // ---------- engine ----------
  useEffect(() => {
    const e = createEngine(
      root.current!,
      { shadow: shadowLayer.current!, far: farLayer.current!, near: nearLayer.current!, fx: fxLayer.current!, ui: uiLayer.current! },
      {
        onSelect: setCard,
        onToast: (text) => live.current.toast(text),
        onWipe: (x, y, start) => algae.current?.wipe(x, y, start),
        onGame: (g) => {
          setGame(g.active ? g : null);
          if (!g.active) setTool("explore");
        },
        onLuckySeen: () => keep(`${live.current.K}lucky-day`, todayISO()),
        chestInfo: () => {
          const s = live.current.totals;
          if (live.current.guest) return { key: "chest", kind: "chest", species: "Treasure chest", name: "Sunken treasure", fact: "Full of surprises - keep exploring the tank!", adoptable: false };
          return {
            key: "chest",
            kind: "chest",
            species: "Treasure chest",
            name: s.count ? `৳ ${money(s.today)} today` : "No sales yet today",
            fact: s.count ? `${s.count} receipt${s.count === 1 ? "" : "s"} so far today - the bubbles rise faster the more you sell.` : "Save a receipt and watch the bubbles start rising.",
            adoptable: false,
          };
        },
        storage: K,
      },
    );
    engine.current = e;
    return () => {
      e.destroy();
      engine.current = null;
    };
  }, [K]);

  // saved preferences and the clock (after mount, so the server render matches)
  useEffect(() => {
    const id = window.setTimeout(() => {
      setNames(load(`${K}names`, {}));
      setLight(load(`${K}light`, "auto"));
      setLayout(load(`${K}layout`, {}));
      setExtras(load(`${K}extras`, []));
      setClockNight(nightFromClock());
      setHour(new Date().getHours());
      // once a day this device gets a chance to meet the lucky fish
      if (load(`${K}lucky-day`, "") !== todayISO()) engine.current?.scheduleLucky(20 + Math.random() * 100);
    }, 0);
    const clock = window.setInterval(() => {
      setClockNight(nightFromClock());
      setHour(new Date().getHours());
    }, 30_000);
    const ticker = window.setInterval(() => setTick((n) => n + 1), 4000);
    return () => {
      clearTimeout(id);
      clearInterval(clock);
      clearInterval(ticker);
    };
  }, [K, guest]);

  useEffect(() => engine.current?.setTool(tool), [tool]);
  useEffect(() => engine.current?.setNight(night), [night]);
  useEffect(() => engine.current?.setExtras(extras), [extras]);
  useEffect(() => {
    const first = guestFish?.trim().split(/\s+/)[0];
    engine.current?.setNames(first ? { ...names, "guest-you": first } : names);
  }, [names, guestFish]);
  useEffect(() => {
    if (guestFish) engine.current?.addGuest(guestFish);
  }, [guestFish]);
  useEffect(() => {
    if (!guest) engine.current?.setSales(0.15 + Math.min(2.5, totals.today / 4000), totals.count ? `৳ ${money(totals.today)} today` : "");
  }, [guest, totals]);
  // decorations moved: let the engine find the chest, anemone and hiding places again
  useEffect(() => {
    const id = window.setTimeout(() => engine.current?.measure(), 60);
    return () => clearTimeout(id);
  }, [layout]);

  // the scoreboard schools; members added later swim in from the side
  const placed = useRef(false);
  useEffect(() => {
    if (guest || !ready || !engine.current) return;
    engine.current.setSchool("receipt", receiptFish, placed.current);
    engine.current.setSchool("customer", customerFish, placed.current);
    placed.current = true;
  }, [guest, ready, receiptFish, customerFish]);

  // celebrations: new receipts since the last visit, customers whose dues are now fully paid, and the anniversary
  const celebrated = useRef(false);
  useEffect(() => {
    if (guest || !ready || celebrated.current || !engine.current) return;
    celebrated.current = true;
    const e = engine.current;
    const dues: Record<string, number> = {};
    for (const inv of invoices) {
      const name = inv.customer.name.trim();
      if (name) dues[name] = (dues[name] ?? 0) + Math.max(0, computeTotals(inv).due);
    }
    const seen = load<{ invoices: number; dues: Record<string, number> } | null>(`${K}seen`, null);
    keep(`${K}seen`, { invoices: invoices.length, dues });
    if (totals.first && totals.first.slice(5) === today.slice(5) && totals.first.slice(0, 4) < today.slice(0, 4)) {
      const years = Number(today.slice(0, 4)) - Number(totals.first.slice(0, 4));
      window.setTimeout(() => {
        e.heart(12);
        toast(`🎂 Happy ${years}-year anniversary, ${shopName}! The fish made you a heart`);
      }, 2500);
    }
    if (!seen) return;
    const fresh = invoices.length - seen.invoices;
    const cleared = Object.entries(seen.dues)
      .filter(([name, was]) => was > 0.5 && name in dues && dues[name]! <= 0.5)
      .map(([name]) => name);
    window.setTimeout(() => {
      if (fresh > 0) {
        e.celebrate();
        toast(`🎉 ${fresh} new receipt${fresh === 1 ? "" : "s"} - ${fresh === 1 ? "a new fish has" : `${fresh} new fish have`} joined the school!`);
      }
      cleared.forEach((name, i) =>
        window.setTimeout(() => {
          e.payoff();
          toast(`💰 ${name} has paid in full!`);
        }, (fresh > 0 ? 4500 : 0) + i * 5000),
      );
    }, 1200);
  }, [guest, ready, invoices, toast, K, totals.first, today, shopName]);

  // the treasure diver opens the chest once a day, when today's sales reach the goal
  useEffect(() => {
    if (guest || !ready || !engine.current || totals.today < totals.goal) return;
    if (load(`${K}goal-day`, "") === today) return;
    keep(`${K}goal-day`, today);
    engine.current.diverToChest();
  }, [guest, ready, totals.today, totals.goal, today, K]);

  // anniversary: the heart comes back every minute that day
  useEffect(() => {
    if (guest || !totals.first || totals.first.slice(5) !== today.slice(5) || totals.first.slice(0, 4) >= today.slice(0, 4)) return;
    const id = window.setInterval(() => engine.current?.heart(12), 60_000);
    return () => clearInterval(id);
  }, [guest, totals.first, today]);

  // ---------- controls ----------
  const toggleSound = () => {
    const on = !soundOn;
    setSoundOn(on);
    setSound(on);
  };
  const cycleLight = () => {
    const next = light === "auto" ? "day" : light === "day" ? "night" : "auto";
    setLight(next);
    keep(`${K}light`, next);
    toast(next === "auto" ? "💡 Lights follow your clock" : next === "day" ? "☀️ Daylight on" : "🌙 Night mode - the tank goes to sleep");
  };
  const adopt = (key: string, name: string | null) => {
    setNames((n) => {
      const next = { ...n };
      if (name) next[key] = name;
      else delete next[key];
      keep(`${K}names`, next);
      return next;
    });
    if (name) toast(`♥ You adopted ${name}!`);
  };
  const fishing = () => {
    if (game?.active) return engine.current?.stopGame();
    setShopOpen(false);
    setTool("fish");
    engine.current?.startGame();
  };
  const shake = () => {
    setShaking(true);
    window.setTimeout(() => setShaking(false), 700);
    engine.current?.shake();
  };
  const toggleExtra = (kind: ExtraKind) => {
    setExtras((x) => {
      const next = x.includes(kind) ? x.filter((k) => k !== kind) : [...x, kind];
      keep(`${K}extras`, next);
      return next;
    });
  };
  const closeCard = useCallback(() => engine.current?.select(null), []);

  // decorate: drag along the sand
  const dragging = useRef<DecorId | null>(null);
  const moveDecor = (e: React.PointerEvent) => {
    const id = dragging.current; // read now: the state update below runs later, after a drop may have cleared it
    if (!id || !root.current) return;
    const r = root.current.getBoundingClientRect();
    const x = Math.max(4, Math.min(96, ((e.clientX - r.left) / r.width) * 100));
    setLayout((l) => ({ ...l, [id]: Math.round(x * 10) / 10 }));
  };
  const endDecor = () => {
    if (!dragging.current) return;
    dragging.current = null;
    setLayout((l) => {
      keep(`${K}layout`, l);
      return l;
    });
  };

  // care readings drift gently with the time of day; the heater kicks in below 25.8°
  const temp = 25.7 + Math.sin(((hour - 9) / 24) * Math.PI * 2) * 0.45 + Math.sin(tick * 0.9) * 0.05;
  const ph = 7.45 - dirt * 0.4 + Math.sin(tick * 0.7) * 0.02;
  const clean = Math.round((1 - dirt) * 100);
  const chip = cx(
    "flex h-10 shrink-0 items-center gap-1.5 rounded-2xl px-3 text-[13px] font-bold shadow-sm ring-1 transition active:scale-95",
    dark ? "bg-white/10 text-mint ring-white/15 hover:bg-white/15 hover:text-white" : "bg-white text-muted ring-line hover:text-ink",
  );

  return (
    <div className={cx("relative select-none", className)}>
      <TankDefs />
      {/* lid with its LED light bar (moonlight blue at night) */}
      <div className="absolute inset-x-6 -top-2 z-10 h-4 rounded-t-xl bg-gradient-to-b from-[#a6d873] to-lime shadow-[0_2px_6px_rgb(0_0_0/0.25)] sm:inset-x-10">
        <div
          className="absolute inset-x-8 -bottom-1 h-1 rounded-full transition-all duration-[2000ms]"
          style={{ background: night > 0.5 ? "#93c5fd" : "#ffffff", boxShadow: `0 0 12px 4px ${night > 0.5 ? "rgb(147 197 253 / 0.6)" : "rgb(255 255 255 / 0.7)"}` }}
        />
      </div>

      {/* frame */}
      <div className={cx("rounded-[1.75rem] bg-deep p-2 shadow-[0_24px_60px_-20px_rgb(14_42_35/0.6)] sm:p-2.5", shaking && "tank-shake")}>
        <div
          ref={root}
          data-tool={tool}
          role="application"
          aria-label="Interactive aquarium"
          className="tank-root relative h-72 overflow-hidden rounded-[1.3rem] bg-[linear-gradient(180deg,#8fe0f7_0%,#3fb4dc_22%,#1d8fbb_55%,#11698c_80%,#0b4e68_100%)] sm:h-[26rem]"
          style={{ "--night": night } as React.CSSProperties}
        >
          {/* daylight: rays, surface glints and caustics fade out at night */}
          <div className="pointer-events-none absolute inset-0 transition-opacity duration-[2000ms]" style={{ opacity: 1 - night * 0.9 }}>
            <div className="tank-ray absolute -top-10 left-[8%] h-[120%] w-16 origin-top rotate-[18deg] bg-gradient-to-b from-white/35 to-transparent blur-md sm:w-24" />
            <div className="tank-ray absolute -top-10 left-[36%] h-[120%] w-10 origin-top rotate-[14deg] bg-gradient-to-b from-white/25 to-transparent blur-md [--delay:-2s] sm:w-16" />
            <div className="tank-ray absolute -top-10 left-[62%] h-[120%] w-20 origin-top rotate-[20deg] bg-gradient-to-b from-white/30 to-transparent blur-md [--delay:-4s] sm:w-28" />
            <div className="tank-ray absolute -top-10 left-[86%] h-[120%] w-12 origin-top rotate-[16deg] bg-gradient-to-b from-white/20 to-transparent blur-md [--delay:-1s]" />
            <div className="tank-caustics absolute inset-0 opacity-40 mix-blend-overlay [mask-image:linear-gradient(to_bottom,black,transparent_85%)]" />
          </div>
          <div className="pointer-events-none absolute inset-x-0 top-0 h-3 bg-gradient-to-b from-white/60 to-transparent" />
          <div className="pond-shimmer pointer-events-none absolute left-[10%] top-3 h-1 w-1/5 rounded-full bg-white/50 blur-[1px]" />
          <div className="pond-shimmer pointer-events-none absolute left-[55%] top-4 h-1 w-1/4 rounded-full bg-white/40 blur-[1px] [--delay:-2s]" />

          {/* far: the whale's shadow, distant fish (and the shy fish), background plants */}
          <div ref={shadowLayer} className="pointer-events-none absolute inset-0" />
          <div ref={farLayer} className="pointer-events-none absolute inset-0" />
          <svg viewBox="0 0 200 70" className="pointer-events-none absolute bottom-6 left-[50%] w-40 opacity-90 sm:w-56">
            <path d="M4 66 C 30 50, 60 52, 90 40 C 110 32, 120 14, 140 6 C 136 20, 128 30, 122 40 C 150 36, 176 40, 196 30 C 180 48, 150 54, 120 56 C 90 60, 50 68, 4 66 Z" fill="#6d4c32" />
            <path d="M30 60 C 60 54, 90 50, 118 44 M126 30 C 130 22, 134 16, 138 10" stroke="#4f3522" strokeWidth="2" fill="none" strokeLinecap="round" />
          </svg>
          <Kelp className="absolute bottom-6 left-[4%] h-[70%] opacity-60 [--delay:-1s]" tone="#3c7a2a" rest />
          <Kelp className="absolute bottom-6 left-[58%] h-[62%] opacity-50 [--delay:-3s] max-sm:hidden" tone="#3c7a2a" />
          <Kelp className="absolute bottom-6 right-[3%] h-[78%] opacity-60 [--delay:-2s]" tone="#3c7a2a" rest />

          {/* sand */}
          <svg viewBox="0 0 400 40" preserveAspectRatio="none" className="pointer-events-none absolute inset-x-0 bottom-0 h-14 w-full sm:h-16">
            <path d="M0 16 C 60 6, 120 20, 190 12 S 320 4, 400 14 V40 H0 Z" fill="#d4bd83" />
            <path d="M0 24 C 70 16, 150 30, 230 22 S 350 16, 400 22 V40 H0 Z" fill="#e8d6a4" />
          </svg>
          <Pebbles />
          <Kelp className="absolute bottom-4 left-[29%] h-[55%]" tone="#6fae3b" rest />

          {/* decorations (draggable in Decorate) */}
          {DECOR.map((d) => (
            <div
              key={d.id}
              data-hide={"hide" in d && d.hide ? true : undefined}
              className={cx("absolute -translate-x-1/2", d.w, decorating ? "tank-decor-edit z-10 cursor-grab touch-none active:cursor-grabbing" : "pointer-events-none")}
              style={{ left: `${layout[d.id] ?? d.x}%`, bottom: d.bottom }}
              onPointerDown={
                decorating
                  ? (e) => {
                      dragging.current = d.id;
                      try {
                        e.currentTarget.setPointerCapture(e.pointerId);
                      } catch {
                        /* pointer already gone */
                      }
                    }
                  : undefined
              }
              onPointerMove={decorating ? moveDecor : undefined}
              onPointerUp={decorating ? endDecor : undefined}
              onPointerCancel={decorating ? endDecor : undefined}
            >
              {d.el()}
            </div>
          ))}

          {/* near creatures, their bubbles and food */}
          <div ref={nearLayer} className="pointer-events-none absolute inset-0" />
          <div ref={fxLayer} className="pointer-events-none absolute inset-0" />

          {/* front grass */}
          <Grass className="bottom-2 left-[2%] w-24 sm:w-32" />
          <Grass className="bottom-2 left-[58%] w-20 sm:w-28 [--delay:-1s]" />
          <Grass className="bottom-2 right-[1%] w-20 sm:w-28 [--delay:-2s]" />

          <Equipment temp={temp} />

          {/* night shade, storm clouds and lightning, plankton that glows in the dark */}
          <div className="pointer-events-none absolute inset-0 bg-[#03182b] transition-opacity duration-[2000ms]" style={{ opacity: night * 0.55 }} />
          <div className="tank-storm pointer-events-none absolute inset-0 bg-[#1e293b]" />
          <div data-flash className="tank-flash pointer-events-none absolute inset-0 bg-white" />
          <div className="pointer-events-none absolute inset-0 transition-opacity duration-[2000ms]" style={{ opacity: night }}>
            {Array.from({ length: 16 }, (_, i) => (
              <span
                key={i}
                className="tank-plankton absolute size-1 rounded-full bg-cyan-200"
                style={{ left: `${(i * 37) % 100}%`, top: `${12 + ((i * 53) % 70)}%`, animationDelay: `${-i * 0.7}s` }}
              />
            ))}
          </div>

          {/* the glass: algae, reflections */}
          <Algae ref={algae} storage={K} onDirt={setDirt} onClean={() => toast("✨ Sparkling clean! The fish can see you again")} />
          <div className="pointer-events-none absolute -left-10 top-0 h-full w-40 -skew-x-12 bg-gradient-to-r from-white/0 via-white/15 to-white/0" />
          <div className="pointer-events-none absolute left-40 top-0 h-full w-8 -skew-x-12 bg-white/10" />
          <div className="pointer-events-none absolute inset-0 rounded-[1.3rem] shadow-[inset_0_0_40px_rgb(0_0_0/0.25),inset_0_0_0_1px_rgb(255_255_255/0.2)]" />

          {/* name tags, glows, laser, fishing line */}
          <div ref={uiLayer} className="pointer-events-none absolute inset-0" />

          {/* on-glass HUD: announcements, game, decorate, closing countdown */}
          <div className="pointer-events-none absolute inset-x-0 top-3 z-20 flex flex-col items-center gap-2 px-3">
            {toasts.map((t) => (
              <div key={t.id} className="tank-toast rounded-full bg-deep/80 px-3.5 py-1.5 text-center text-[12.5px] font-semibold text-white shadow-lg ring-1 ring-white/15 backdrop-blur-md sm:text-[13px]">
                {t.text}
              </div>
            ))}
          </div>
          {game?.active && (
            <div data-tank-ui className="tank-card absolute bottom-3 left-3 z-20 flex items-center gap-2 rounded-2xl bg-deep/85 py-1.5 pl-3 pr-1.5 text-white shadow-xl ring-1 ring-white/15 backdrop-blur-md">
              <span className={cx("font-display text-[18px] font-extrabold tabular-nums", game.left < 6 && "animate-pulse text-amber-300")}>0:{String(Math.ceil(game.left)).padStart(2, "0")}</span>
              <span className="text-[12.5px] font-bold text-lime">🎣 {game.score}</span>
              <span className="flex items-center gap-1 text-[11.5px] text-mint/70">
                <Trophy className="size-3" /> {game.best}
              </span>
              <button onClick={() => engine.current?.stopGame()} className="ml-1 grid size-7 place-items-center rounded-xl bg-white/10 hover:bg-white/20" aria-label="Stop fishing">
                <X className="size-3.5" />
              </button>
            </div>
          )}
          {decorating && (
            <div data-tank-ui className="tank-card absolute left-1/2 top-3 z-20 flex -translate-x-1/2 items-center gap-2 rounded-2xl bg-white/95 py-1.5 pl-3 pr-1.5 text-[12.5px] font-semibold text-ink shadow-xl">
              <Palette className="size-4 text-brand" /> Drag along the sand
              <button
                onClick={() => {
                  setLayout({});
                  keep(`${K}layout`, {});
                }}
                className="flex items-center gap-1 rounded-xl px-2 py-1 text-muted hover:bg-canvas hover:text-ink"
              >
                <RotateCcw className="size-3.5" /> Reset
              </button>
              <button onClick={() => setTool("explore")} className="rounded-xl bg-deep px-3 py-1 font-bold text-lime">
                Done
              </button>
            </div>
          )}
          {card && <FishCard key={card.key} info={card} engine={engine} root={root} adopted={names[card.key]} onAdopt={adopt} onClose={closeCard} />}
        </div>
      </div>
      {/* stand */}
      <div className="mx-auto h-3 w-[92%] rounded-b-2xl bg-gradient-to-b from-deep to-[#081a15]" />

      {/* controls */}
      <div className="mt-4 flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-center gap-2">
          <div role="radiogroup" aria-label="Aquarium tool" className={cx("relative grid grid-cols-4 rounded-2xl p-1 shadow-sm ring-1", dark ? "bg-white/10 ring-white/15" : "bg-white ring-line")}>
            {(["explore", "feed", "play", "clean"] as const).includes(tool as "explore") && (
              <span
                aria-hidden
                className="absolute inset-y-1 left-1 w-[calc((100%-0.5rem)/4)] rounded-xl bg-deep shadow ring-1 ring-lime/30 transition-transform duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)]"
                style={{ transform: `translateX(${["explore", "feed", "play", "clean"].indexOf(tool) * 100}%)` }}
              />
            )}
            {(
              [
                ["explore", "Explore", <Hand key="h" className="size-4" />],
                ["feed", "Feed", <Cookie key="c" className="size-4" />],
                ["play", "Play", <Wand2 key="p" className="size-4" />],
                ["clean", "Clean", <SprayCan key="s" className="size-4" />],
              ] as const
            ).map(([id, label, icon]) => (
              <button
                key={id}
                role="radio"
                aria-checked={tool === id}
                onClick={() => {
                  engine.current?.stopGame();
                  setTool(id);
                }}
                className={cx(
                  "relative z-10 flex items-center justify-center gap-1.5 px-2.5 py-2 text-[13px] font-bold transition-colors sm:px-3.5",
                  tool === id ? "text-lime" : dark ? "text-mint/80 hover:text-white" : "text-muted hover:text-ink",
                )}
              >
                {icon}
                {label}
              </button>
            ))}
          </div>

          <div className="flex max-w-full flex-wrap items-center justify-center gap-2">
            <button onClick={fishing} className={cx(chip, game?.active && "!bg-deep !text-lime ring-lime/40")}>
              <Target className="size-4" /> {game?.active ? "Stop" : "Fishing"}
            </button>
            <button onClick={() => setTool(decorating ? "explore" : "decorate")} className={cx(chip, decorating && "!bg-deep !text-lime ring-lime/40")}>
              <Palette className="size-4" /> Decorate
            </button>
            <button onClick={() => setShopOpen((o) => !o)} className={cx(chip, shopOpen && "!bg-deep !text-lime")}>
              <Store className="size-4" /> Fish shop
            </button>
            <button onClick={shake} className={chip} title="Shake the tank">
              <Vibrate className="size-4" /> Shake
            </button>
            <button onClick={() => engine.current?.storm()} className={chip} title="Call a storm">
              <CloudLightning className="size-4" /> Storm
            </button>
            <button onClick={() => engine.current?.heart(10)} className={chip} title="The fish make a heart">
              <Heart className="size-4" /> Heart
            </button>
            <button onClick={toggleSound} aria-pressed={soundOn} title={soundOn ? "Mute" : "Turn on water sounds"} className={cx(chip, soundOn && "!text-aqua-deep")}>
              {soundOn ? <Volume2 className="size-[18px]" /> : <VolumeX className="size-[18px]" />}
            </button>
            <button onClick={cycleLight} title={light === "auto" ? "Lights follow the clock" : light === "day" ? "Always day" : "Always night"} className={chip}>
              {light === "auto" ? <SunMoon className="size-[18px]" /> : light === "day" ? <Sun className="size-[18px] text-amber-500" /> : <Moon className="size-[18px] text-indigo-400" />}
              {light === "auto" ? "Auto" : light === "day" ? "Day" : "Night"}
            </button>
          </div>
        </div>

        {shopOpen && <FishShop owned={extras} onToggle={toggleExtra} onClose={() => setShopOpen(false)} />}

        <div className="flex flex-wrap items-center justify-center gap-2">
          <Meter dark={dark} icon={<Thermometer className="size-4" />} label="Temp" value={`${temp.toFixed(1)}°C`} frac={(temp - 24) / 4} tone={temp < 25.8 ? "bg-orange-400" : "bg-lime"} />
          <Meter dark={dark} icon={<Droplet className="size-4" />} label="pH" value={ph.toFixed(1)} frac={(ph - 6.6) / 1.2} tone={ph < 7.1 ? "bg-amber-400" : "bg-aqua"} />
          <Meter
            dark={dark}
            icon={<Sparkles className="size-4" />}
            label="Clean"
            value={`${clean}%`}
            frac={clean / 100}
            tone={clean < 35 ? "bg-red-400" : clean < 65 ? "bg-amber-400" : "bg-lime"}
            onClick={clean < 90 ? () => setTool("clean") : undefined}
          />
          {!guest && (
            <Meter
              dark={dark}
              icon={<Target className="size-4" />}
              label="Daily goal"
              value={`৳ ${money(totals.today)} / ${money(totals.goal)}`}
              frac={totals.today / totals.goal}
              tone={totals.today >= totals.goal ? "bg-amber-400" : "bg-lime"}
            />
          )}
        </div>
      </div>
      <p key={tool} className={cx("animate-fade-up mt-3 text-center text-[12.5px]", dark ? "text-mint/75" : "text-muted")}>
        {TOOL_HINT[tool]}
      </p>
      {!guest && (
        <p className="mt-1 text-center text-[12px] text-faint">
          <span className="font-semibold text-amber-600">{invoices.length}</span> receipt fish ·{" "}
          <span className="font-semibold text-teal-600">{customers.filter((c) => c.name.trim()).length}</span> customer fish · chest bubbles:{" "}
          <span className="font-semibold text-body">{totals.count ? `৳ ${money(totals.today)} sold today` : "no sales yet today"}</span>
        </p>
      )}
    </div>
  );
}

function Rock() {
  return (
    <svg viewBox="0 0 120 60" className="block w-full">
      <path d="M6 58 C 2 40, 18 26, 38 30 C 50 18, 76 20, 82 36 C 100 34, 116 46, 114 58 Z" fill="#5b6b66" />
      <path d="M38 30 C 50 18, 76 20, 82 36 C 70 30, 52 30, 38 30 Z" fill="#7d8e88" />
      <path d="M20 44 C 26 40, 34 42, 36 46" stroke="#48554f" strokeWidth="2" fill="none" strokeLinecap="round" />
    </svg>
  );
}

function FishShop({ owned, onToggle, onClose }: { owned: ExtraKind[]; onToggle: (k: ExtraKind) => void; onClose: () => void }) {
  return (
    <div className="animate-fade-up mx-auto w-full max-w-2xl rounded-3xl bg-white p-4 text-ink shadow-lg ring-1 ring-line">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="flex items-center gap-2 font-display text-[16px] font-extrabold">
            <Store className="size-4 text-brand" /> Fish shop
          </h3>
          <p className="text-[12.5px] text-muted">Tap a fish to add it to the tank - tap again to let it go.</p>
        </div>
        <button onClick={onClose} className="grid size-8 place-items-center rounded-xl text-muted hover:rotate-90 hover:bg-canvas" aria-label="Close shop">
          <X className="size-4" />
        </button>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-5">
        {SHOP.map((s) => {
          const have = owned.includes(s.kind);
          return (
            <button
              key={s.kind}
              onClick={() => onToggle(s.kind)}
              className={cx("flex flex-col items-start rounded-2xl p-3 text-left ring-1 transition active:scale-95", have ? "bg-soft ring-lime" : "bg-canvas ring-line hover:-translate-y-0.5 hover:shadow-md")}
            >
              <span className="text-2xl">{s.emoji}</span>
              <span className="mt-1 text-[13.5px] font-extrabold text-ink">{s.name}</span>
              <span className="text-[11.5px] text-muted">{s.blurb}</span>
              <span className={cx("mt-2 rounded-full px-2 py-0.5 text-[11px] font-bold", have ? "bg-lime/30 text-brand" : "bg-deep text-lime")}>{have ? "In the tank ✓" : "Add to tank"}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function Meter({ icon, label, value, frac, tone, onClick, dark }: { icon: React.ReactNode; label: string; value: string; frac: number; tone: string; onClick?: () => void; dark?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      className={cx(
        "flex h-11 items-center gap-2 rounded-2xl px-3 shadow-sm ring-1 transition enabled:hover:-translate-y-0.5 enabled:hover:shadow-md disabled:cursor-default",
        dark ? "bg-white/10 ring-white/15" : "bg-white ring-line",
      )}
      title={onClick ? "The glass needs a clean - tap to pick up the sponge" : undefined}
    >
      <span className={dark ? "text-mint/70" : "text-muted"}>{icon}</span>
      <span className="text-left">
        <span className={cx("block text-[10px] font-bold uppercase leading-none tracking-wider", dark ? "text-mint/60" : "text-faint")}>{label}</span>
        <span className={cx("block text-[13px] font-extrabold tabular-nums leading-tight", dark ? "text-white" : "text-ink")}>{value}</span>
      </span>
      <span className={cx("h-1.5 w-12 overflow-hidden rounded-full", dark ? "bg-white/15" : "bg-line")}>
        <span className={cx("block h-full rounded-full transition-all duration-700", tone)} style={{ width: `${Math.max(4, Math.min(100, frac * 100))}%` }} />
      </span>
    </button>
  );
}

/** Live hunger bar on the shark's card. */
function SharkMood({ engine }: { engine: React.RefObject<Engine | null> }) {
  const [mood, setMood] = useState<{ hunger: number; label: string; emoji: string } | null>(null);
  useEffect(() => {
    const read = () => setMood(engine.current?.sharkMood() ?? null);
    const id = window.setInterval(read, 400);
    const first = window.setTimeout(read, 0);
    return () => {
      clearInterval(id);
      clearTimeout(first);
    };
  }, [engine]);
  if (!mood) return null;
  return (
    <div className="mt-2">
      <div className="flex items-center justify-between text-[12px] font-bold">
        <span>
          {mood.emoji} {mood.label}
        </span>
        <span className="tabular-nums text-muted">hunger {mood.hunger}%</span>
      </div>
      <div className="mt-1 h-2 overflow-hidden rounded-full bg-line">
        <div
          className={cx("h-full rounded-full transition-all duration-500", mood.hunger < 25 ? "bg-lime" : mood.hunger < 45 ? "bg-aqua" : mood.hunger < 75 ? "bg-amber-400" : "bg-red-500")}
          style={{ width: `${mood.hunger}%` }}
        />
      </div>
      <p className="mt-1.5 text-[12px] leading-snug text-muted">{mood.hunger < 45 ? "Too full to hunt right now." : "Hungry sharks hunt - feed it to calm it down."}</p>
      <button
        onClick={() => engine.current?.feedShark()}
        className="mt-2 flex h-9 w-full items-center justify-center gap-1.5 rounded-xl bg-deep text-[12.5px] font-bold text-lime transition active:scale-95"
      >
        <Cookie className="size-3.5" /> Feed the shark
      </button>
    </div>
  );
}

/** Card that floats above the tapped creature and follows it; adopt it with a name. */
function FishCard({
  info,
  engine,
  root,
  adopted,
  onAdopt,
  onClose,
}: {
  info: FishInfo;
  engine: React.RefObject<Engine | null>;
  root: React.RefObject<HTMLDivElement | null>;
  adopted?: string;
  onAdopt: (key: string, name: string | null) => void;
  onClose: () => void;
}) {
  const el = useRef<HTMLDivElement>(null);
  const [naming, setNaming] = useState(false);
  const [draft, setDraft] = useState(adopted ?? info.name);

  useEffect(() => {
    let raf = 0;
    const follow = () => {
      const p = engine.current?.where(info.key);
      const box = el.current;
      const w = root.current?.clientWidth ?? 0;
      if (!p) return onClose();
      if (box) {
        const cw = box.offsetWidth;
        const ch = box.offsetHeight;
        const x = Math.max(8, Math.min(w - cw - 8, p.x - cw / 2));
        const below = p.y - ch - 16 < 8; // no room above: show it underneath
        box.style.transform = `translate3d(${x}px, ${below ? p.y + 40 : p.y - ch - 14}px, 0)`;
      }
      raf = requestAnimationFrame(follow);
    };
    raf = requestAnimationFrame(follow);
    return () => cancelAnimationFrame(raf);
  }, [info.key, engine, root, onClose]);

  const shown = adopted ?? info.name;
  return (
    <div ref={el} data-tank-ui className="absolute left-0 top-0 z-30 w-60" onPointerDown={(e) => e.stopPropagation()}>
      <div className="tank-card rounded-2xl bg-white/95 p-3.5 text-ink shadow-2xl ring-1 ring-black/5 backdrop-blur">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[10.5px] font-bold uppercase tracking-wider text-aqua-deep">{info.species}</p>
            <p className="flex items-center gap-1.5 truncate font-display text-[17px] font-extrabold">
              {adopted && <Heart className="size-4 shrink-0 fill-rose-500 text-rose-500" />}
              {shown}
            </p>
          </div>
          <button onClick={onClose} className="grid size-7 shrink-0 place-items-center rounded-lg text-muted transition hover:rotate-90 hover:bg-canvas" aria-label="Close">
            <X className="size-4" />
          </button>
        </div>
        {info.fact && <p className="mt-1.5 text-[12.5px] leading-snug text-muted">{info.fact}</p>}
        {info.kind === "shark" && <SharkMood engine={engine} />}
        {info.adoptable &&
          (naming ? (
            <form
              className="mt-3 flex gap-1.5"
              onSubmit={(e) => {
                e.preventDefault();
                const n = draft.trim().slice(0, 20);
                if (n) onAdopt(info.key, n);
                setNaming(false);
              }}
            >
              <input
                autoFocus
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                maxLength={20}
                placeholder="Give it a name"
                className="h-9 min-w-0 flex-1 rounded-xl border border-line bg-canvas px-2.5 text-[13px] font-semibold outline-none focus:border-lime focus:bg-white"
              />
              <button className="h-9 rounded-xl bg-deep px-3 text-[12.5px] font-bold text-lime active:scale-95">Save</button>
            </form>
          ) : (
            <div className="mt-3 flex gap-1.5">
              <button
                onClick={() => setNaming(true)}
                className="flex h-9 flex-1 items-center justify-center gap-1.5 rounded-xl bg-rose-50 text-[12.5px] font-bold text-rose-600 transition hover:bg-rose-100 active:scale-95"
              >
                <Heart className="size-3.5" /> {adopted ? "Rename" : "Adopt & name"}
              </button>
              {adopted && (
                <button onClick={() => onAdopt(info.key, null)} className="h-9 rounded-xl px-2.5 text-[12px] font-semibold text-muted transition hover:bg-canvas">
                  Release
                </button>
              )}
            </div>
          ))}
      </div>
    </div>
  );
}

/** Hang-on filter, heater (on when the water is below 25.8°), thermometer and the airline to the air stone. */
function Equipment({ temp }: { temp: number }) {
  const heating = temp < 25.8;
  return (
    <>
      <div className="pointer-events-none absolute right-3 top-2 w-9 sm:right-5 sm:w-12">
        <div className="relative h-20 rounded-lg bg-gradient-to-b from-[#3b4844] to-[#26302d] shadow-[0_4px_10px_rgb(0_0_0/0.35)] ring-1 ring-white/10 sm:h-24">
          <div className="absolute inset-x-1.5 top-3 h-8 rounded bg-[repeating-linear-gradient(0deg,#1a2220_0_2px,#34413d_2px_5px)] sm:h-10" />
          <span className="absolute bottom-2 left-1/2 size-1.5 -translate-x-1/2 rounded-full bg-lime shadow-[0_0_6px_#8cc556]" />
          <div className="absolute -left-3 top-1.5 h-2 w-4 rounded-l bg-[#2f3a37]" />
          {[0, 1, 2, 3].map((i) => (
            <span key={i} className="tank-jet absolute -left-3 top-2 size-1.5 rounded-full border border-white/80" style={{ "--delay": `${-i * 0.35}s` } as React.CSSProperties} />
          ))}
        </div>
        <div className="mx-auto h-[7.5rem] w-2 bg-gradient-to-r from-white/25 via-white/45 to-white/20 sm:h-[13rem]" />
        <div className="mx-auto h-6 w-3.5 rounded-sm bg-[repeating-linear-gradient(0deg,#26302d_0_2px,transparent_2px_4px)] ring-1 ring-[#26302d]" />
      </div>

      <div className="pointer-events-none absolute left-2 top-5 flex w-3.5 flex-col items-center sm:left-4 sm:w-4">
        <div className="relative h-3 w-full rounded-t bg-[#1f2725]">
          <span className={cx("absolute left-1/2 top-1 size-1 -translate-x-1/2 rounded-full", heating ? "tank-pilot bg-red-500" : "bg-red-900")} />
        </div>
        <div className="relative h-32 w-full rounded-b-full border border-white/40 bg-white/15 sm:h-44">
          <div className={cx("absolute inset-x-[3px] bottom-2 top-2 rounded-full bg-[repeating-linear-gradient(0deg,#f97316_0_1.5px,transparent_1.5px_4px)] transition-opacity duration-1000", heating ? "opacity-80" : "opacity-30")} />
          <div className={cx("absolute inset-x-0 bottom-0 h-1/3 rounded-b-full bg-gradient-to-t from-orange-400/40 to-transparent transition-opacity duration-1000", heating ? "opacity-100" : "opacity-0")} />
          <span className="absolute -right-1.5 top-6 size-2 rounded-full bg-white/40" />
          <span className="absolute -right-1.5 bottom-8 size-2 rounded-full bg-white/40" />
        </div>
      </div>

      <div className="pointer-events-none absolute left-8 top-5 flex h-16 w-5 flex-col items-center justify-end overflow-hidden rounded-full bg-white/85 pb-1 shadow sm:left-12 sm:h-20 sm:w-6">
        <span className="absolute top-1 text-[6px] font-bold tabular-nums text-ink sm:text-[7px]">{temp.toFixed(1)}°</span>
        <span className="w-1 rounded-full bg-gradient-to-t from-red-500 to-red-400 transition-all duration-1000" style={{ height: `${30 + (temp - 24) * 12}%` }} />
        <span className="mt-0.5 size-2 rounded-full bg-red-500" />
      </div>

      {/* airline down to the air stone */}
      <div className="pointer-events-none absolute bottom-7 left-[60.4%] top-0 w-[2px] bg-white/30" />
      <div data-airstone className="pointer-events-none absolute bottom-5 left-[59.5%] h-2.5 w-7 rounded-full bg-[#4a5a55]" />
    </>
  );
}
