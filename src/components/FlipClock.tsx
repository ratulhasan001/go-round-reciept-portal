"use client";

import { useEffect, useState } from "react";
import { cx } from "./ui";

const FLIP_MS = 600; // whole flip: top flap folds down (first half), bottom flap lands (second half)

/** Fliqlo-style flip clock: hh · mm · ss on deep-green cards, AM/PM tucked into the hour card. */
export function FlipClock({ size = 22, seconds = true, className }: { size?: number | string; seconds?: boolean; className?: string }) {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    let id = 0;
    const tick = () => {
      setNow(new Date());
      id = window.setTimeout(tick, 1000 - (Date.now() % 1000)); // stay on the second boundary
    };
    tick();
    return () => clearTimeout(id);
  }, []);

  const h = now ? now.getHours() % 12 || 12 : null;
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    <div className={cx("inline-flex items-center gap-[0.18em]", className)} style={{ fontSize: size }} role="timer" aria-label={now?.toLocaleTimeString("en-US") ?? ""}>
      <Card value={h === null ? "" : String(h)} label={now ? (now.getHours() < 12 ? "AM" : "PM") : ""} />
      <Card value={now ? pad(now.getMinutes()) : ""} />
      {seconds && <Card value={now ? pad(now.getSeconds()) : ""} />}
    </div>
  );
}

function Card({ value, label }: { value: string; label?: string }) {
  // what the card showed before the latest change; it stays until the falling flap has landed
  const [prev, setPrev] = useState(value);
  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const id = window.setTimeout(() => setPrev(value), reduce ? 0 : FLIP_MS);
    return () => clearTimeout(id);
  }, [value]);
  const flipping = prev !== value;

  return (
    <div className="relative h-[2.3em] w-[2.55em] rounded-[0.24em] bg-[#0b241e] shadow-[0_0.2em_0.5em_rgb(0_0_0/0.45)] ring-1 ring-lime/25 [perspective:16em]">
      {/* static halves: new number on top, old number underneath until the flap covers it */}
      <Half pos="top" text={value} />
      <Half pos="bottom" text={flipping ? prev : value} />
      {flipping && (
        <>
          <Half pos="top" text={prev} className="animate-flap-top z-10 origin-bottom" />
          <Half pos="bottom" text={value} className="animate-flap-bottom z-10 origin-top" />
        </>
      )}
      {/* the hinge */}
      <span className="absolute inset-x-0 top-1/2 z-20 h-[0.05em] -translate-y-1/2 bg-[#04120e]" />
      {label && <span className="absolute left-[0.3em] top-[0.22em] z-30 font-[Helvetica_Neue,Helvetica,Arial,sans-serif] text-[0.3em] font-bold leading-none text-lime">{label}</span>}
    </div>
  );
}

function Half({ pos, text, className }: { pos: "top" | "bottom"; text: string; className?: string }) {
  return (
    <div
      className={cx(
        "absolute inset-x-0 h-1/2 overflow-hidden [backface-visibility:hidden]",
        pos === "top" ? "top-0 rounded-t-[0.24em] bg-[#123c32]" : "bottom-0 rounded-b-[0.24em] bg-[#0e332a]",
        className,
      )}
    >
      <div
        className={cx(
          "absolute inset-x-0 grid h-[200%] place-items-center font-[Helvetica_Neue,Helvetica,Arial,sans-serif] text-[1.65em] font-bold tabular-nums leading-none tracking-[-0.02em] text-[#f2fbf6] [text-shadow:0_0.03em_0.06em_rgb(0_0_0/0.5)]",
          pos === "top" ? "top-0" : "bottom-0",
        )}
      >
        {text}
      </div>
    </div>
  );
}
