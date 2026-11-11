// The visiting card's artwork: aquatic grass, line-drawn fish and bubbles. Deterministic, so server and browser agree.

const GREENS = ["#1E5A45", "#2F6B3A", "#4C8C3A", "#5E9E39", "#6FAE45", "#8CBF5A"];

function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/** A meadow of swaying grass blades along the bottom of its box (stretches to any width). */
export function Grass({ blades = 70, seed = 7, height = 220, className, still = false }: { blades?: number; seed?: number; height?: number; className?: string; still?: boolean }) {
  const r = rng(seed);
  const W = 1200;
  const paths = Array.from({ length: blades }, (_, i) => {
    const x = (i / blades) * W + (r() - 0.5) * 30;
    const h = height * (0.35 + r() * 0.65);
    const lean = (r() - 0.5) * 70;
    const c1 = (r() - 0.5) * 40;
    const d = `M${x.toFixed(1)},${height + 4} C${(x + c1).toFixed(1)},${(height - h * 0.4).toFixed(1)} ${(x - c1 + lean * 0.5).toFixed(1)},${(height - h * 0.7).toFixed(1)} ${(x + lean).toFixed(1)},${(height - h).toFixed(1)}`;
    return {
      d,
      color: GREENS[Math.floor(r() * GREENS.length)],
      width: (2.6 + r() * 2.8).toFixed(1),
      opacity: (0.45 + r() * 0.5).toFixed(2),
      dur: (5 + r() * 4).toFixed(1),
      delay: (-r() * 8).toFixed(1),
      amp: (1.2 + r() * 2.4).toFixed(1),
    };
  });
  return (
    <svg viewBox={`0 0 ${W} ${height}`} preserveAspectRatio="none" className={className} aria-hidden>
      {paths.map((p, i) => (
        <path
          key={i}
          d={p.d}
          fill="none"
          stroke={p.color}
          strokeWidth={p.width}
          strokeLinecap="round"
          opacity={p.opacity}
          vectorEffect="non-scaling-stroke"
          className={still ? undefined : "sea-blade"}
          style={still ? undefined : ({ "--dur": `${p.dur}s`, "--delay": `${p.delay}s`, "--amp": `${p.amp}deg` } as React.CSSProperties)}
        />
      ))}
    </svg>
  );
}

/** The card's line fish (faces right). */
export function Fish({ className, stroke = "#1F7FA8", width = 2.6 }: { className?: string; stroke?: string; width?: number }) {
  return (
    <svg viewBox="-18 -20 96 40" className={className} aria-hidden>
      <g fill="none" stroke={stroke} strokeWidth={width} strokeLinejoin="round">
        <path d="M4,0 C20,-17 50,-19 72,-3 C75,0 75,2 72,4 C50,17 20,15 4,0Z" />
        <path d="M6,0 L-14,-13 Q-8,0 -14,13Z" />
        <circle cx="60" cy="-2" r="2.4" fill={stroke} />
      </g>
    </svg>
  );
}

export function Bubbles({ className }: { className?: string }) {
  const r = rng(3);
  return (
    <svg viewBox="0 0 80 140" className={className} aria-hidden>
      {Array.from({ length: 7 }, (_, i) => (
        <circle
          key={i}
          cx={10 + r() * 60}
          cy={130}
          r={2 + r() * 3.5}
          fill="none"
          stroke="#1F7FA8"
          strokeWidth="1.4"
          className="sea-bubble"
          style={{ "--dur": `${5 + r() * 4}s`, "--delay": `${-r() * 8}s`, transformBox: "fill-box" } as React.CSSProperties}
        />
      ))}
    </svg>
  );
}

/** The green accent rule under headings on the card. */
export const Rule = ({ className = "" }: { className?: string }) => <span className={`block h-0.5 w-11 bg-sea-leaf ${className}`} aria-hidden />;
