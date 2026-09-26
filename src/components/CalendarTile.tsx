"use client";

import { cx, useClientValue } from "./ui";

/** Height of the calendar page (below the binder rings); the home page sizes the flip clock to match it. */
export const CALENDAR_H = "8.5rem";

// a string snapshot keeps useSyncExternalStore stable; it changes only when the day does
const todayKey = () => new Date().toDateString();

/** Desk-calendar page: binder rings, month band, big day number, weekday, week and day of year. */
export function CalendarTile({ className }: { className?: string }) {
  const key = useClientValue(todayKey, "");
  const d = key ? new Date(key) : null;

  const month = d?.toLocaleDateString("en-GB", { month: "long" }) ?? "";
  const weekday = d?.toLocaleDateString("en-GB", { weekday: "long" }) ?? "";
  const full = d?.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" }) ?? "";
  const dayOfYear = d ? Math.round((d.getTime() - new Date(d.getFullYear(), 0, 1).getTime()) / 86_400_000) + 1 : 0;
  const week = d ? isoWeek(d) : 0;

  return (
    <div className={cx("relative w-[7.75rem] shrink-0 select-none pt-2", className)} role="img" aria-label={full}>
      {/* pad of pages underneath */}
      <div className="absolute inset-x-1.5 -bottom-1.5 top-4 rounded-2xl bg-white/25" />
      <div className="absolute inset-x-0.5 -bottom-[3px] top-3 rounded-2xl bg-white/50" />

      <div className="relative flex flex-col overflow-hidden rounded-2xl bg-white text-center shadow-[0_0.9rem_1.8rem_-0.6rem_rgb(0_0_0/0.5)]" style={{ height: CALENDAR_H }}>
        {/* month band */}
        <div className="bg-lime px-2 pb-1.5 pt-2.5 text-deep">
          <div className="font-display text-[12px] font-extrabold uppercase leading-none tracking-[0.14em]">{month || " "}</div>
          <div className="mt-1 text-[10.5px] font-bold leading-none tracking-[0.2em] text-deep/65">{d?.getFullYear() ?? " "}</div>
        </div>
        {/* day */}
        <div className="flex flex-1 flex-col justify-center px-2">
          <div className="font-display text-[2.6rem] font-extrabold leading-none tabular-nums tracking-tight text-ink">{d?.getDate() ?? " "}</div>
          <div className="mt-0.5 text-[10.5px] font-bold uppercase tracking-[0.16em] text-aqua-deep">{weekday || " "}</div>
          <div className="mx-auto mt-1.5 h-px w-3/4 bg-line" />
          <div className="mt-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-muted">{d ? `Week ${week} · Day ${dayOfYear}` : " "}</div>
        </div>
      </div>

      {/* binder rings */}
      <div className="absolute inset-x-0 top-0 flex justify-center gap-10">
        <span className="h-4 w-2 rounded-full bg-gradient-to-b from-white to-faint shadow-[0_1px_2px_rgb(0_0_0/0.4)] ring-1 ring-black/10" />
        <span className="h-4 w-2 rounded-full bg-gradient-to-b from-white to-faint shadow-[0_1px_2px_rgb(0_0_0/0.4)] ring-1 ring-black/10" />
      </div>
    </div>
  );
}

function isoWeek(date: Date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7)); // Thursday of this week decides the year
  const yearStart = Date.UTC(d.getUTCFullYear(), 0, 1);
  return Math.ceil(((d.getTime() - yearStart) / 86_400_000 + 1) / 7);
}
