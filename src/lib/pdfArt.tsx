"use client";

// The card's fish (top) and grass (bottom) for react-pdf pages - mirrors src/components/AquascapeArt.tsx.
import { Circle, Path, Svg } from "@react-pdf/renderer";
import { AQ, BUBBLES, FISH, GRASS, GRASS_H, TOP_H } from "./aquascape";

export function PdfFishBand() {
  return (
    <Svg width={595} height={TOP_H} viewBox={`0 0 595 ${TOP_H}`} style={{ position: "absolute", top: 0, left: 0 }} fixed>
      {FISH.flatMap((f, i) => [
        <Path key={`b${i}`} d={f.body} fill="none" stroke={AQ.blue} strokeWidth={f.stroke} strokeLinejoin="round" />,
        <Path key={`t${i}`} d={f.tail} fill="none" stroke={AQ.blue} strokeWidth={f.stroke} strokeLinejoin="round" />,
        <Circle key={`e${i}`} cx={f.eye.cx} cy={f.eye.cy} r={f.eye.r} fill={AQ.blue} />,
      ])}
      {BUBBLES.map((b, i) => (
        <Circle key={i} cx={b.cx} cy={b.cy} r={b.r} fill="none" stroke={AQ.blue} strokeWidth={0.7} strokeOpacity={b.opacity} />
      ))}
    </Svg>
  );
}

export function PdfGrassBand() {
  return (
    <Svg width={595} height={GRASS_H} viewBox={`0 0 595 ${GRASS_H}`} style={{ position: "absolute", bottom: 0, left: 0 }} fixed>
      {GRASS.map((g, i) => (
        <Path key={i} d={g.d} fill="none" stroke={g.color} strokeWidth={g.width} strokeLinecap="round" strokeOpacity={g.opacity} />
      ))}
    </Svg>
  );
}
