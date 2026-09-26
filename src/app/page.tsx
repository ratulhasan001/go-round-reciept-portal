"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowUpRight, Clock3, LogOut, ReceiptText, TrendingUp, Wallet } from "lucide-react";
import { useStore } from "@/lib/store";
import { computeTotals, money, todayISO } from "@/lib/calc";
import { couponStatus } from "@/lib/coupons";
import { WAVE_BACK, WAVE_FRONT } from "@/lib/theme";
import { Mark, SECTIONS, SectionIcon, SyncDot, syncLabel } from "@/components/nav";
import { cx, useClientValue } from "@/components/ui";
import { FlipClock } from "@/components/FlipClock";
import { Aquarium } from "@/components/Aquarium";
import { AquariumTank } from "@/components/AquariumTank";
import { CalendarTile } from "@/components/CalendarTile";

const greeting = () => {
  const hour = new Date().getHours();
  return hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
};
const plural = (n: number, one: string, many = one + "s") => `${n} ${n === 1 ? one : many}`;

// each tile's colour story
const TONE: Record<string, { badge: string; glow: string }> = {
  receipts: { badge: "bg-aqua-soft text-aqua-deep", glow: "rgb(86 202 238 / 0.18)" },
  new: { badge: "bg-deep text-lime", glow: "rgb(140 197 86 / 0.35)" },
  products: { badge: "bg-soft text-brand", glow: "rgb(140 197 86 / 0.2)" },
  customers: { badge: "bg-violet-50 text-violet-600", glow: "rgb(139 92 246 / 0.14)" },
  coupons: { badge: "bg-amber-50 text-amber-600", glow: "rgb(245 158 11 / 0.16)" },
  settings: { badge: "bg-canvas text-ink", glow: "rgb(14 42 35 / 0.1)" },
};

export default function Home() {
  const { shop, invoices, products, customers, coupons, mode, sync, authEnabled, logout } = useStore();
  const router = useRouter();
  const greet = useClientValue(greeting, "Welcome back");

  const month = todayISO().slice(0, 7);
  const stats = useMemo(() => {
    const all = invoices.map((inv) => ({ inv, t: computeTotals(inv) }));
    const thisMonth = all.filter((r) => r.inv.date.startsWith(month));
    return {
      billed: thisMonth.reduce((s, r) => s + r.t.grandTotal, 0),
      collected: thisMonth.reduce((s, r) => s + r.t.paid, 0),
      due: all.reduce((s, r) => s + Math.max(r.t.due, 0), 0),
      receipts: thisMonth.length,
      unpaid: all.filter((r) => r.t.status !== "PAID").length,
    };
  }, [invoices, month]);

  // one live line per tile
  const meta: Record<string, string> = {
    receipts: `${plural(invoices.length, "receipt")} · ${stats.unpaid} not fully paid`,
    new: `Next number ${shop.invoicePrefix}${String(shop.nextNumber).padStart(4, "0")}`,
    products: `${plural(products.length, "product")} · ${products.filter((p) => p.inStock === false).length} out of stock`,
    customers: plural(customers.length, "saved customer"),
    coupons: `${coupons.filter((c) => couponStatus(c) === "available").length} available · ${coupons.filter((c) => couponStatus(c) === "used").length} used`,
    settings: `${shop.name} · prefix ${shop.invoicePrefix}`,
  };

  // number keys 1-6 open a section
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || (e.target as HTMLElement).closest("input, textarea, select")) return;
      const s = SECTIONS[Number(e.key) - 1];
      if (s) router.push(s.href, { transitionTypes: ["nav-forward"] });
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [router]);

  return (
    <div className="min-h-dvh pb-16">
      {/* hero */}
      <section className="relative overflow-hidden bg-deep px-4 pb-36 pt-5 text-white sm:px-6 lg:px-10">
        <div className="animate-aurora pointer-events-none absolute -left-40 -top-40 size-[520px] rounded-full bg-aqua/25 blur-3xl" />
        <div className="animate-aurora-slow pointer-events-none absolute -right-32 top-10 size-[460px] rounded-full bg-lime/20 blur-3xl" />
        <div className="animate-aurora pointer-events-none absolute bottom-0 left-1/3 size-[380px] rounded-full bg-emerald-400/10 blur-3xl [animation-delay:-6s]" />
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.05]"
          style={{ backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)", backgroundSize: "24px 24px" }}
        />
        <svg viewBox="0 0 595 40" preserveAspectRatio="none" className="animate-wave pointer-events-none absolute inset-x-0 bottom-0 h-16 w-full" aria-hidden>
          <path d={WAVE_BACK} className="fill-aqua/20" />
          <path d={WAVE_FRONT} className="fill-canvas" />
        </svg>

        <div className="relative mx-auto max-w-[1300px]">
          {/* top bar */}
          <div className="animate-home-in flex items-center gap-3">
            <Mark className="size-14 text-[20px] sm:size-16 sm:text-[22px]" />
            <div className="mr-auto min-w-0">
              <div className="truncate font-display text-2xl font-extrabold leading-tight sm:text-3xl">{shop.name}</div>
              <div className="text-[13px] text-mint/85 sm:text-sm">Witness the Underwater World Through Us</div>
            </div>
            <span className="flex items-center gap-2 rounded-full bg-white/8 px-3 py-1.5 text-[12px] font-semibold text-mint/90 backdrop-blur" title={syncLabel(mode, sync)}>
              <SyncDot mode={mode} sync={sync} />
              <span className="hidden sm:inline">{syncLabel(mode, sync, true)}</span>
            </span>
            {authEnabled && (
              <button
                onClick={() => void logout()}
                className="grid size-9 place-items-center rounded-xl text-mint/70 transition hover:bg-white/10 hover:text-white active:scale-90"
                aria-label="Log out"
                title="Log out"
              >
                <LogOut className="size-[18px]" />
              </button>
            )}
          </div>

          {/* greeting, with the calendar and clock beside it once there is room (xl) */}
          <div className="mt-6 flex flex-col gap-6 sm:mt-8 xl:flex-row xl:items-center xl:justify-between xl:gap-8">
            <div className="min-w-0 flex-1">
              <h1 className="animate-home-in flex items-center gap-3 font-display text-4xl font-extrabold leading-[1.05] sm:text-5xl lg:text-6xl [animation-delay:80ms]">
                {greet}
                <Aquarium className="size-[1.15em] shrink-0" />
              </h1>
            </div>
            {/*
              --cal-h is the calendar page height; the clock cards are 2.3em tall, so size = --cal-h / 2.3 keeps them level.
              Phone: one row of calendar (0.91 x h) + hh:mm (2.3 x h) + 12px gap must fit 100vw - 2rem, and seconds are dropped.
            */}
            <div className="animate-home-in flex items-end justify-center gap-3 [--cal-h:min(6.5rem,calc((100vw_-_2rem_-_12px)_/_3.21))] sm:gap-5 sm:[--cal-h:7rem] md:[--cal-h:8.5rem] xl:justify-end [animation-delay:140ms]">
              <CalendarTile />
              <FlipClock size="calc(var(--cal-h) / 2.3)" secondsClassName="max-sm:hidden" />
            </div>
          </div>

          {/* this month */}
          <div className="mt-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Glance i={0} icon={<TrendingUp className="size-4" />} label="Billed this month" value={stats.billed} money />
            <Glance i={1} icon={<Wallet className="size-4" />} label="Collected this month" value={stats.collected} money />
            <Glance i={2} icon={<Clock3 className="size-4" />} label="Still due (all time)" value={stats.due} money warn={stats.due > 0} />
            <Glance i={3} icon={<ReceiptText className="size-4" />} label="Receipts this month" value={stats.receipts} />
          </div>
        </div>
      </section>

      {/* sections */}
      <section className="relative -mt-24 px-4 sm:px-6 lg:px-10">
        <div className="mx-auto grid max-w-[1300px] gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {SECTIONS.map((s, i) => (
            <Tile key={s.key} i={i} section={s} meta={meta[s.key]!} featured={s.key === "new"} />
          ))}
        </div>
        <div className="mx-auto mt-12 max-w-[1300px] sm:mt-16">
          <div className="mb-5 text-center">
            <p className="text-[12px] font-bold uppercase tracking-[0.2em] text-aqua-deep">Our aquarium</p>
            <h2 className="mt-1 font-display text-2xl font-extrabold text-ink sm:text-3xl">Witness the Underwater World Through Us</h2>
          </div>
          <AquariumTank />
        </div>
        <p className="animate-home-in mt-6 hidden text-center text-[12.5px] text-muted [animation-delay:700ms] sm:block">
          Tip: press <Kbd>1</Kbd>–<Kbd>6</Kbd> to jump straight to a section.
        </p>
      </section>
    </div>
  );
}

function Tile({ i, section, meta, featured }: { i: number; section: (typeof SECTIONS)[number]; meta: string; featured: boolean }) {
  const tone = TONE[section.key]!;
  return (
    <Link
      href={section.href}
      transitionTypes={["nav-forward"]}
      onPointerMove={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        e.currentTarget.style.setProperty("--x", `${e.clientX - r.left}px`);
        e.currentTarget.style.setProperty("--y", `${e.clientY - r.top}px`);
      }}
      style={{ animationDelay: `${260 + i * 70}ms`, "--glow": tone.glow } as React.CSSProperties}
      className={cx(
        "animate-tile-in group relative isolate flex min-h-44 flex-col overflow-hidden rounded-3xl border p-5 shadow-[0_1px_2px_rgba(20,32,26,0.05)] transition-[transform,box-shadow,border-color] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-1.5 hover:shadow-2xl hover:shadow-deep/10 active:translate-y-0 active:scale-[0.985] sm:p-6",
        featured ? "border-lime/60 bg-gradient-to-br from-lime to-[#b6e27f] text-deep" : "border-line bg-white hover:border-transparent",
      )}
    >
      {/* cursor spotlight */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 opacity-0 transition-opacity duration-500 group-hover:opacity-100"
        style={{ background: "radial-gradient(420px circle at var(--x, 50%) var(--y, 50%), var(--glow), transparent 60%)" }}
      />
      {featured && <span aria-hidden className="animate-shine pointer-events-none absolute inset-y-0 -left-1/2 -z-10 w-1/3 skew-x-[-20deg] bg-white/35 blur-md" />}

      <div className="flex items-start justify-between">
        <SectionIcon
          section={section.key}
          className={cx("size-12 rounded-2xl shadow-sm transition-transform duration-500 group-hover:-rotate-6 group-hover:scale-110", tone.badge)}
          iconClass="size-6"
        />
        <span className="flex items-center gap-2">
          <Kbd className={featured ? "border-deep/15 bg-white/40 text-deep/70" : undefined}>{i + 1}</Kbd>
          <span
            className={cx(
              "grid size-9 place-items-center rounded-full transition-all duration-500 group-hover:rotate-45",
              featured ? "bg-deep text-lime" : "bg-canvas text-muted group-hover:bg-deep group-hover:text-lime",
            )}
          >
            <ArrowUpRight className="size-4" />
          </span>
        </span>
      </div>
      <div className="mt-auto pt-8">
        <h2 className="font-display text-xl font-extrabold sm:text-[22px]">{section.label}</h2>
        <p className={cx("mt-1 text-[13.5px]", featured ? "text-deep/75" : "text-muted")}>{section.blurb}</p>
        <p className={cx("mt-3 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] font-bold", featured ? "bg-deep/10 text-deep" : "bg-canvas text-body")}>{meta}</p>
      </div>
    </Link>
  );
}

function Glance({ i, icon, label, value, money: isMoney, warn }: { i: number; icon: React.ReactNode; label: string; value: number; money?: boolean; warn?: boolean }) {
  const n = useCountUp(value);
  return (
    <div
      className="animate-home-in rounded-2xl border border-white/10 bg-white/[0.06] p-4 backdrop-blur-md transition-colors duration-300 hover:bg-white/[0.1]"
      style={{ animationDelay: `${260 + i * 60}ms` }}
    >
      <div className="flex items-center gap-2 text-[12px] font-semibold text-mint/80">
        <span className={cx("grid size-7 place-items-center rounded-lg", warn ? "bg-red-400/20 text-red-200" : "bg-lime/15 text-lime")}>{icon}</span>
        {label}
      </div>
      <div className="mt-2 font-display text-xl font-extrabold tabular-nums sm:text-2xl">
        {isMoney && <span className="mr-1 text-[0.7em] font-bold text-mint/70">৳</span>}
        {isMoney ? money(n) : Math.round(n)}
      </div>
    </div>
  );
}

function Kbd({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <kbd className={cx("hidden h-6 min-w-6 place-items-center rounded-md border border-line bg-canvas px-1.5 font-sans text-[11px] font-bold text-muted sm:inline-grid", className)}>
      {children}
    </kbd>
  );
}

/** Eases a number up to `target` (and on to new values as data loads). */
function useCountUp(target: number, ms = 900) {
  const [n, setN] = useState(0);
  const shown = useRef(0); // the value on screen, so a new target animates on from there
  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const from = shown.current;
    const start = performance.now();
    let id = 0;
    const tick = (t: number) => {
      const p = reduce ? 1 : Math.min(1, (t - start) / ms);
      shown.current = from + (target - from) * (1 - Math.pow(1 - p, 4));
      setN(shown.current);
      if (p < 1) id = requestAnimationFrame(tick);
    };
    id = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(id);
  }, [target, ms]);
  return n;
}
