"use client";

import { cx, useClientValue } from "./ui";

// a string snapshot keeps useSyncExternalStore stable; it changes only when the day does
const todayKey = () => new Date().toDateString();

/**
 * Desk-calendar page: binder rings, month band, big day number, weekday, week and day of year.
 * Sized entirely in em from the page height `--cal-h` (the page is 8.5em tall), so the home page can scale it and the flip clock together.
 */
export function CalendarTile({ className }: { className?: string }) {
  const key = useClientValue(todayKey, "");
  const d = key ? new Date(key) : null;

  const month = d?.toLocaleDateString("en-GB", { month: "long" }) ?? "";
  const weekday = d?.toLocaleDateString("en-GB", { weekday: "long" }) ?? "";
  const full = d?.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" }) ?? "";
  const dayOfYear = d ? Math.round((d.getTime() - new Date(d.getFullYear(), 0, 1).getTime()) / 86_400_000) + 1 : 0;
  const week = d ? isoWeek(d) : 0;

  return (
    <div
      className={cx("relative w-[7.75em] shrink-0 select-none pt-[0.5em]", className)}
      style={{ fontSize: "calc(var(--cal-h, 8.5rem) / 8.5)" }}
      role="img"
      aria-label={full}
    >
      {/* pad of pages underneath */}
      <div className="absolute inset-x-[0.375em] -bottom-[0.375em] top-[1em] rounded-[1em] bg-white/25" />
      <div className="absolute inset-x-[0.125em] -bottom-[0.19em] top-[0.75em] rounded-[1em] bg-white/50" />

      <div className="relative flex h-[8.5em] flex-col overflow-hidden rounded-[1em] bg-white text-center shadow-[0_0.9em_1.8em_-0.6em_rgb(0_0_0/0.5)]">
        {/* month band */}
        <div className="bg-lime px-[0.5em] pb-[0.375em] pt-[0.625em] text-deep">
          <div className="font-display text-[0.75em] font-extrabold uppercase leading-none tracking-[0.14em]">{month || " "}</div>
          <div className="mt-[0.38em] text-[0.656em] font-bold leading-none tracking-[0.2em] text-deep/65">{d?.getFullYear() ?? " "}</div>
        </div>
        {/* day */}
        <div className="flex flex-1 flex-col justify-center px-[0.5em]">
          <div className="font-display text-[2.6em] font-extrabold leading-none tabular-nums tracking-tight text-ink">{d?.getDate() ?? " "}</div>
          <div className="mt-[0.19em] text-[0.656em] font-bold uppercase tracking-[0.16em] text-aqua-deep">{weekday || " "}</div>
          {/* too small to read on a phone-sized page */}
          <div className="mx-auto mt-[0.375em] h-px w-3/4 bg-line max-sm:hidden" />
          <div className="mt-[0.4em] text-[0.625em] font-semibold uppercase tracking-[0.08em] text-muted max-sm:hidden">{d ? `Week ${week} · Day ${dayOfYear}` : " "}</div>
        </div>
      </div>

      {/* binder rings */}
      <div className="absolute inset-x-0 top-0 flex justify-center gap-[2.5em]">
        <span className="h-[1em] w-[0.5em] rounded-full bg-gradient-to-b from-white to-faint shadow-[0_1px_2px_rgb(0_0_0/0.4)] ring-1 ring-black/10" />
        <span className="h-[1em] w-[0.5em] rounded-full bg-gradient-to-b from-white to-faint shadow-[0_1px_2px_rgb(0_0_0/0.4)] ring-1 ring-black/10" />
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
