// The card's fish (top) and grass (bottom) for the HTML previews - mirrors src/lib/pdfArt.tsx.
import { AQ, BUBBLES, FISH, GRASS, GRASS_H, TOP_H } from "@/lib/aquascape";

export function FishBand() {
  return (
    <svg width={595} height={TOP_H} viewBox={`0 0 595 ${TOP_H}`} style={{ position: "absolute", top: 0, left: 0 }} aria-hidden>
      {FISH.map((f, i) => (
        <g key={i} fill="none" stroke={AQ.blue} strokeWidth={f.stroke} strokeLinejoin="round">
          <path d={f.body} />
          <path d={f.tail} />
          <circle cx={f.eye.cx} cy={f.eye.cy} r={f.eye.r} fill={AQ.blue} stroke="none" />
        </g>
      ))}
      {BUBBLES.map((b, i) => (
        <circle key={i} cx={b.cx} cy={b.cy} r={b.r} fill="none" stroke={AQ.blue} strokeWidth={0.7} opacity={b.opacity} />
      ))}
    </svg>
  );
}

export function GrassBand() {
  return (
    <svg width={595} height={GRASS_H} viewBox={`0 0 595 ${GRASS_H}`} style={{ position: "absolute", bottom: 0, left: 0 }} aria-hidden>
      {GRASS.map((g, i) => (
        <path key={i} d={g.d} fill="none" stroke={g.color} strokeWidth={g.width} strokeLinecap="round" opacity={g.opacity} />
      ))}
    </svg>
  );
}
