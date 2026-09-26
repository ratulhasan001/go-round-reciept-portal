import { cx } from "../ui";

// Static scenery for the big aquarium. Elements marked data-rest are where fish sleep at night;
// data-anemone, data-chest and data-airstone are measured by the engine.

/** Shared clip paths and gradients used by the creature art (see art.ts). */
export function TankDefs() {
  return (
    <svg className="absolute size-0" aria-hidden>
      <defs>
        <clipPath id="gr-clown-body">
          <ellipse cx="32" cy="17" rx="20" ry="12" />
        </clipPath>
        <clipPath id="gr-angel-body">
          <path d="M8 30 Q24 8 44 30 Q24 52 8 30 Z" />
        </clipPath>
        <clipPath id="gr-tetra-body">
          <ellipse cx="16" cy="6" rx="12" ry="4.5" />
        </clipPath>
        <clipPath id="gr-lion-body">
          <ellipse cx="36" cy="29" rx="22" ry="11" />
        </clipPath>
        <linearGradient id="gr-lucky" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fef9c3" />
          <stop offset="0.5" stopColor="#facc15" />
          <stop offset="1" stopColor="#d97706" />
        </linearGradient>
        <clipPath id="gr-discus-body">
          <circle cx="28" cy="26" r="21" />
        </clipPath>
        <linearGradient id="gr-guppy-tail" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#f472b6" />
          <stop offset="0.5" stopColor="#a78bfa" />
          <stop offset="1" stopColor="#22d3ee" />
        </linearGradient>
        <radialGradient id="gr-jelly-bell" cx="0.5" cy="0.35" r="0.7">
          <stop offset="0" stopColor="#fbe7ff" stopOpacity="0.95" />
          <stop offset="1" stopColor="#e879f9" stopOpacity="0.55" />
        </radialGradient>
      </defs>
    </svg>
  );
}

/** Sea anemone: the clownfish family's home, where they lay eggs and sleep. */
export function Anemone({ className }: { className?: string }) {
  const arms = Array.from({ length: 13 }, (_, i) => {
    const a = -150 + (i * 120) / 12; // fan from -150° to -30°
    const r = 34 + (i % 3) * 6;
    const x = 50 + Math.cos((a * Math.PI) / 180) * r;
    const y = 58 + Math.sin((a * Math.PI) / 180) * r;
    return { x, y, i };
  });
  return (
    <svg data-anemone viewBox="0 0 100 64" className={cx("block w-full overflow-visible", className)} aria-hidden>
      {arms.map(({ x, y, i }) => (
        <g key={i} className="tank-tuft" style={{ "--delay": `${-i * 0.23}s` } as React.CSSProperties}>
          <path d={`M50 58 Q ${(50 + x) / 2 + (i % 2 ? 6 : -6)} ${(58 + y) / 2}, ${x} ${y}`} stroke={i % 2 ? "#f472b6" : "#c084fc"} strokeWidth="5" strokeLinecap="round" fill="none" />
          <circle cx={x} cy={y} r="3.2" fill={i % 2 ? "#fbcfe8" : "#e9d5ff"} />
        </g>
      ))}
      <ellipse cx="50" cy="59" rx="22" ry="6" fill="#9d174d" />
    </svg>
  );
}

/** Treasure chest: glows through the crack, and flies open for pay-offs (the engine toggles .is-open). */
export function Chest({ className }: { className?: string }) {
  return (
    <div data-chest className={cx("tank-chest w-full", className)} aria-hidden>
      <svg viewBox="0 0 80 64" className="w-full overflow-visible">
        <ellipse className="chest-glow" cx="40" cy="26" rx="34" ry="16" fill="url(#gr-chest-glow)" />
        <defs>
          <radialGradient id="gr-chest-glow">
            <stop offset="0" stopColor="#fde68a" stopOpacity="0.95" />
            <stop offset="1" stopColor="#fde68a" stopOpacity="0" />
          </radialGradient>
        </defs>
        <g className="chest-coins" fill="#fbbf24" stroke="#b45309" strokeWidth="1">
          <circle cx="24" cy="27" r="5" />
          <circle cx="34" cy="25" r="5" />
          <circle cx="46" cy="26" r="5" />
          <circle cx="56" cy="27" r="5" />
          <circle cx="40" cy="21" r="5" />
        </g>
        <rect x="6" y="28" width="68" height="32" rx="4" fill="#7c4a1e" />
        <rect x="6" y="28" width="68" height="4" fill="#5b3413" />
        <rect x="6" y="44" width="68" height="4" fill="#d4a017" />
        <rect x="16" y="28" width="5" height="32" fill="#d4a017" />
        <rect x="59" y="28" width="5" height="32" fill="#d4a017" />
        <rect x="35" y="31" width="10" height="11" rx="2" fill="#fbbf24" stroke="#92400e" />
        <circle cx="40" cy="36" r="1.6" fill="#78350f" />
        <g className="chest-lid">
          <path d="M6 29 V19 Q40 0 74 19 V29 Z" fill="#8b5a2b" />
          <path d="M6 25 Q40 7 74 25" stroke="#d4a017" strokeWidth="3.5" fill="none" />
          <rect x="16" y="9" width="5" height="20" fill="#d4a017" />
          <rect x="59" y="9" width="5" height="20" fill="#d4a017" />
        </g>
        <path className="chest-crack" d="M8 29 H72" stroke="#fde68a" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    </div>
  );
}

export function Kelp({ className, tone, rest }: { className?: string; tone: string; rest?: boolean }) {
  return (
    <svg data-rest={rest || undefined} viewBox="0 0 40 200" preserveAspectRatio="xMidYMax meet" className={cx("tank-sway absolute aspect-[1/5] overflow-visible", className)}>
      <path d="M20 200 C 8 160, 32 130, 18 90 C 8 60, 28 30, 20 0" fill="none" stroke={tone} strokeWidth="7" strokeLinecap="round" />
      <path d="M20 170 C 34 160, 36 150, 30 140 M19 120 C 6 112, 4 100, 10 92 M20 60 C 34 52, 34 40, 28 34" fill="none" stroke={tone} strokeWidth="5" strokeLinecap="round" />
    </svg>
  );
}

/** Broad-leaved sword plant. */
export function Sword({ className, rest }: { className?: string; rest?: boolean }) {
  const leaves = [
    { d: "M50 100 C 30 70, 10 50, 6 20 C 24 40, 40 60, 50 100 Z", fill: "#4e8a23" },
    { d: "M50 100 C 36 60, 30 30, 38 0 C 48 30, 52 60, 50 100 Z", fill: "#6fae3b" },
    { d: "M50 100 C 60 60, 70 30, 88 10 C 84 40, 70 70, 50 100 Z", fill: "#5c9a2c" },
    { d: "M50 100 C 64 80, 80 64, 98 58 C 86 76, 70 90, 50 100 Z", fill: "#8cc556" },
    { d: "M50 100 C 36 84, 18 76, 0 74 C 16 90, 34 98, 50 100 Z", fill: "#8cc556" },
  ];
  return (
    <svg data-rest={rest || undefined} viewBox="0 0 100 100" className={cx("tank-sway block w-full overflow-visible", className)}>
      {leaves.map((l, i) => (
        <path key={i} d={l.d} fill={l.fill} />
      ))}
    </svg>
  );
}

/** Tuft of fine grass along the front glass. */
export function Grass({ className }: { className?: string }) {
  const blades = [8, 16, 22, 30, 38, 44, 52, 60, 68, 74, 82, 90];
  return (
    <svg viewBox="0 0 100 40" className={cx("absolute overflow-visible", className)}>
      {blades.map((x, i) => (
        <path
          key={x}
          className="tank-tuft"
          style={{ "--delay": `${-i * 0.25}s` } as React.CSSProperties}
          d={`M${x} 40 Q ${x + (i % 2 ? 6 : -6)} ${22 - (i % 3) * 4}, ${x + (i % 2 ? 2 : -3)} ${6 + (i % 4) * 3}`}
          fill="none"
          stroke={["#6fae3b", "#8cc556", "#4e8a23"][i % 3]}
          strokeWidth="2.4"
          strokeLinecap="round"
        />
      ))}
    </svg>
  );
}

export function Coral({ className, tone = "#fb7185" }: { className?: string; tone?: string }) {
  return (
    <svg viewBox="0 0 60 60" className={cx("tank-sway block w-full overflow-visible [--sway:2deg]", className)}>
      <g fill="none" stroke={tone} strokeWidth="6" strokeLinecap="round">
        <path d="M30 60 V36 C 30 26, 20 24, 18 12" />
        <path d="M30 40 C 38 34, 44 28, 42 14" />
        <path d="M24 30 C 16 28, 10 26, 8 18" />
        <path d="M42 26 C 50 24, 54 20, 54 12" />
      </g>
      <g fill={tone}>
        <circle cx="18" cy="11" r="4" />
        <circle cx="42" cy="13" r="4" />
        <circle cx="8" cy="17" r="3.5" />
        <circle cx="54" cy="11" r="3.5" />
      </g>
    </svg>
  );
}

export function Pebbles() {
  const stones = [
    ["6%", 10, "#9aa59f"],
    ["19%", 7, "#c9b27a"],
    ["41%", 9, "#7c8a84"],
    ["55%", 6, "#b4a06c"],
    ["67%", 11, "#8f9b95"],
    ["79%", 7, "#a8966a"],
    ["92%", 9, "#7c8a84"],
  ] as const;
  return (
    <>
      {stones.map(([left, s, c]) => (
        <span key={left} className="absolute bottom-2 rounded-[50%]" style={{ left, width: s * 1.6, height: s, background: c }} />
      ))}
    </>
  );
}

/** Hang-on filter, heater, thermometer and the airline feeding the air stone. */

/** Little sand castle with towers, flags and an arched door fish can dart through. */
export function Castle({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 90" className={cx("block w-full overflow-visible", className)} aria-hidden>
      <path className="tank-flag" d="M22 6 L34 10 L22 14 Z" fill="#ef4444" />
      <path className="tank-flag" style={{ "--delay": "-0.4s" } as React.CSSProperties} d="M78 6 L90 10 L78 14 Z" fill="#8cc556" />
      <path d="M22 6 V26 M78 6 V26" stroke="#57534e" strokeWidth="1.5" />
      <rect x="12" y="26" width="20" height="62" fill="#a8a29e" />
      <rect x="68" y="26" width="20" height="62" fill="#a8a29e" />
      <rect x="30" y="44" width="40" height="44" fill="#d6d3d1" />
      <path d="M12 26 h4 v-5 h4 v5 h4 v-5 h4 v5 h4 v6 H12 Z M68 26 h4 v-5 h4 v5 h4 v-5 h4 v5 h4 v6 H68 Z M30 44 h5 v-5 h5 v5 h5 v-5 h5 v5 h5 v-5 h5 v5 h5 v6 H30 Z" fill="#78716c" />
      <path d="M42 88 V70 a8 8 0 0 1 16 0 V88 Z" fill="#1c1917" fillOpacity="0.85" />
      <rect x="18" y="40" width="7" height="10" rx="3.5" fill="#1c1917" fillOpacity="0.8" />
      <rect x="74" y="40" width="7" height="10" rx="3.5" fill="#1c1917" fillOpacity="0.8" />
      <g fill="#8cc556" fillOpacity="0.8">
        <circle cx="14" cy="86" r="4" />
        <circle cx="86" cy="85" r="5" />
        <circle cx="33" cy="87" r="3" />
      </g>
    </svg>
  );
}

/** Ornament: an old-school diver in a brass helmet, bubbles rising from the valve. */
export function DiverStatue({ className }: { className?: string }) {
  return (
    <div className={cx("relative w-full", className)} aria-hidden>
      {[0, 1, 2].map((i) => (
        <span key={i} className="tank-statue-bubble absolute left-[58%] top-0 size-1.5 rounded-full border border-white/80" style={{ animationDelay: `${i * 0.9}s` }} />
      ))}
      <svg viewBox="0 0 50 80" className="block w-full overflow-visible">
        <ellipse cx="25" cy="77" rx="20" ry="3" fill="#000" fillOpacity="0.2" />
        <rect x="12" y="36" width="26" height="30" rx="8" fill="#78716c" />
        <path d="M16 66 V78 M34 66 V78" stroke="#57534e" strokeWidth="7" strokeLinecap="round" />
        <path d="M12 42 L4 58 M38 42 L46 56" stroke="#78716c" strokeWidth="6" strokeLinecap="round" />
        <circle cx="25" cy="22" r="16" fill="#d97706" stroke="#92400e" strokeWidth="2" />
        <circle cx="25" cy="22" r="8" fill="#7dd3fc" stroke="#92400e" strokeWidth="2.5" />
        <circle cx="13" cy="22" r="3.5" fill="#fbbf24" stroke="#92400e" />
        <circle cx="37" cy="22" r="3.5" fill="#fbbf24" stroke="#92400e" />
        <rect x="27" y="3" width="4" height="5" fill="#92400e" />
      </svg>
    </div>
  );
}
