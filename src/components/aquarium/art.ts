// SVG art for everything the aquarium engine spawns. All creatures face right; the engine mirrors them.
// Shared clip paths / gradients (gr-*) live once in <TankDefs> so these strings can be stamped out freely.

export type ArtKind =
  | "clown"
  | "tang"
  | "angel"
  | "gold"
  | "puffer"
  | "tetra"
  | "prey"
  | "turtle"
  | "shark"
  | "jelly"
  | "crab"
  | "receipt"
  | "customer"
  | "baby"
  | "octopus"
  | "seahorse"
  | "whale"
  | "goby"
  | "lucky"
  | "dolphin"
  | "manta"
  | "lionfish"
  | "diver";

/** [viewBox width, viewBox height, markup] */
export const ART: Record<ArtKind, [number, number, string]> = {
  clown: [
    60,
    34,
    `<path d="M14 17 L2 6 Q6 17 2 28 Z" fill="#f36b12" stroke="#1b1b1b" stroke-width="1.4" stroke-linejoin="round"/>
    <path d="M24 7 Q32 -1 42 7 Z" fill="#f36b12" stroke="#1b1b1b" stroke-width="1.4" stroke-linejoin="round"/>
    <path d="M26 27 Q30 34 36 28 Z" fill="#f36b12" stroke="#1b1b1b" stroke-width="1.2" stroke-linejoin="round"/>
    <ellipse cx="32" cy="17" rx="20" ry="12" fill="#ff8a2a"/>
    <g clip-path="url(#gr-clown-body)" stroke="#1b1b1b" stroke-width="1.2">
      <rect x="15" y="0" width="4" height="34" fill="#fff"/><rect x="28" y="0" width="5.5" height="34" fill="#fff"/><rect x="41" y="0" width="4.5" height="34" fill="#fff"/>
    </g>
    <ellipse cx="32" cy="17" rx="20" ry="12" fill="none" stroke="#1b1b1b" stroke-width="1.4"/>
    <circle cx="47" cy="14" r="2.3" fill="#111"/><circle cx="47.8" cy="13.3" r="0.7" fill="#fff"/>`,
  ],
  tang: [
    64,
    36,
    `<path d="M14 18 L3 7 L7 18 L3 29 Z" fill="#ffd21f"/>
    <path d="M22 7 Q36 0 50 8 Z" fill="#1e4fd6"/><path d="M22 29 Q36 36 48 28 Z" fill="#1e4fd6"/>
    <ellipse cx="34" cy="18" rx="22" ry="12.5" fill="#2f6bf2"/>
    <path d="M18 12 Q32 5 50 11 Q40 15 31 13 Q23 17 34 24 Q24 24 18 20" fill="#0b1b4a"/>
    <path d="M40 19 Q46 24 42 27 Q38 24 40 19 Z" fill="#ffd21f"/>
    <circle cx="50" cy="15" r="2.2" fill="#0b1b4a"/><circle cx="50.7" cy="14.4" r="0.7" fill="#fff"/>`,
  ],
  angel: [
    50,
    60,
    `<path d="M18 18 Q18 -2 32 1 Q29 10 30 22 Z" fill="#e2e8ee"/><path d="M18 42 Q18 62 32 59 Q29 50 30 38 Z" fill="#e2e8ee"/>
    <path d="M9 30 L0 22 L3 30 L0 38 Z" fill="#dfe6ec"/>
    <path d="M8 30 Q24 8 44 30 Q24 52 8 30 Z" fill="#f1f5f8"/>
    <g clip-path="url(#gr-angel-body)" fill="#1f2937" fill-opacity="0.85"><rect x="17" y="0" width="3" height="60"/><rect x="27" y="0" width="3.5" height="60"/><rect x="37" y="0" width="2.5" height="60"/></g>
    <path d="M30 20 Q40 22 44 30" stroke="#f5c542" stroke-width="1.5" fill="none" stroke-opacity="0.8"/>
    <circle cx="38" cy="27" r="2" fill="#b91c1c"/><circle cx="38" cy="27" r="1" fill="#111"/>`,
  ],
  gold: [
    64,
    40,
    `<path class="tank-tail" d="M26 20 C 16 8, 4 4, 2 11 C 8 15, 9 20, 2 29 C 6 36, 16 32, 26 20 Z" fill="#ffc15e" fill-opacity="0.9"/>
    <path d="M32 9 Q40 -1 48 9 Z" fill="#ff9d1c"/>
    <ellipse cx="40" cy="21" rx="17" ry="12.5" fill="#ffa11a"/><ellipse cx="44" cy="25" rx="10" ry="5" fill="#ffd08a" fill-opacity="0.7"/>
    <path d="M38 27 Q40 35 46 30 Z" fill="#ff9d1c"/>
    <circle cx="50" cy="17" r="2.4" fill="#111"/><circle cx="50.8" cy="16.3" r="0.8" fill="#fff"/>`,
  ],
  puffer: [
    48,
    38,
    `<path d="M11 19 L2 12 L4 19 L2 26 Z" fill="#e9c46a"/>
    <circle cx="26" cy="19" r="15" fill="#f3d27a"/><path d="M13 24 Q26 38 40 24 Q26 30 13 24 Z" fill="#fff4d6"/>
    <g fill="#8a6d1f" fill-opacity="0.55"><circle cx="20" cy="10" r="1.3"/><circle cx="27" cy="8" r="1.1"/><circle cx="16" cy="16" r="1.2"/><circle cx="24" cy="15" r="1"/><circle cx="31" cy="13" r="1.2"/></g>
    <g stroke="#b88a2a" stroke-width="1" stroke-linecap="round"><path d="M26 3 V1"/><path d="M15 7 L13.5 5.5"/><path d="M37 7 L38.5 5.5"/><path d="M11 17 H9"/><path d="M26 35 V37"/><path d="M16 31 L14.5 32.5"/></g>
    <path d="M24 22 Q28 20 26 26 Z" fill="#e9c46a"/>
    <circle cx="35" cy="16" r="3.2" fill="#fff"/><circle cx="36" cy="16" r="1.9" fill="#111"/>
    <path d="M40 21 Q42 22 40 23" stroke="#8a6d1f" stroke-width="1" fill="none"/>`,
  ],
  tetra: [
    30,
    12,
    `<path d="M5 6 L0 2 L1.2 6 L0 10 Z" fill="#dbe9ee" fill-opacity="0.8"/>
    <ellipse cx="16" cy="6" rx="12" ry="4.5" fill="#dbe9ee"/>
    <g clip-path="url(#gr-tetra-body)"><rect x="4" y="6.3" width="14" height="5" fill="#ef4444"/><path d="M4 4.8 L28 4.3" stroke="#22d3ee" stroke-width="2"/></g>
    <circle cx="24" cy="5" r="1" fill="#111"/>`,
  ],
  prey: [
    30,
    12,
    `<path d="M5 6 L0 1.5 L1.3 6 L0 10.5 Z" fill="#facc15"/>
    <ellipse cx="16" cy="6" rx="12" ry="4.6" fill="#fde047"/>
    <path d="M6 4.2 Q16 0.4 27 4.6 Q16 3 6 4.2 Z" fill="#2563eb"/>
    <circle cx="24" cy="5" r="1.1" fill="#111"/>`,
  ],
  receipt: [
    30,
    14,
    `<path d="M6 7 L0 2 L1.6 7 L0 12 Z" fill="#f59e0b"/>
    <ellipse cx="16" cy="7" rx="11" ry="5.4" fill="#fbbf24"/>
    <path d="M9 7 H23" stroke="#fff7d6" stroke-width="1.4" stroke-linecap="round"/>
    <path d="M13 2.2 Q16 0 19 2" fill="#f59e0b"/>
    <circle cx="23.5" cy="5.6" r="1.1" fill="#111"/>`,
  ],
  customer: [
    30,
    14,
    `<path d="M6 7 L0 2 L1.6 7 L0 12 Z" fill="#0f9f8f"/>
    <ellipse cx="16" cy="7" rx="11" ry="5.2" fill="#2dd4bf"/>
    <path d="M6 5 Q16 0.8 27 5.4 Q16 4 6 5 Z" fill="#0f766e"/>
    <circle cx="23.5" cy="5.6" r="1.1" fill="#111"/>`,
  ],
  baby: [
    60,
    34,
    `<path d="M14 17 L2 6 Q6 17 2 28 Z" fill="#f36b12"/>
    <ellipse cx="32" cy="17" rx="20" ry="13" fill="#ff8a2a"/>
    <g clip-path="url(#gr-clown-body)"><rect x="28" y="0" width="6" height="34" fill="#fff"/></g>
    <circle cx="46" cy="14" r="4" fill="#111"/><circle cx="47.3" cy="12.8" r="1.3" fill="#fff"/>`,
  ],
  turtle: [
    120,
    80,
    `<path class="tank-flipper" style="--delay:-0.6s" d="M72 30 C 84 14, 80 2, 66 2 C 70 12, 66 20, 62 30 Z" fill="#6f8f45"/>
    <path class="tank-flipper" style="--delay:-0.3s" d="M32 32 C 24 22, 16 20, 12 24 C 18 28, 22 32, 26 36 Z" fill="#6f8f45"/>
    <path d="M22 40 L10 44 L22 46 Z" fill="#9cb86a"/>
    <path d="M86 32 C 96 24, 112 26, 114 36 C 114 44, 100 48, 88 44 Z" fill="#a4bf72"/>
    <circle cx="104" cy="33" r="2.4" fill="#1a1a1a"/><path d="M106 41 Q110 41 112 39" stroke="#6f8f45" stroke-width="1.2" fill="none"/>
    <ellipse cx="56" cy="40" rx="36" ry="22" fill="#7a5a2f"/><ellipse cx="56" cy="38" rx="32" ry="18" fill="#9a7440"/>
    <g fill="none" stroke="#5e4424" stroke-width="1.6" stroke-linejoin="round">
      <path d="M44 26 L56 22 L68 26 L70 38 L56 44 L42 38 Z"/>
      <path d="M44 26 L32 30 L28 40 L42 38 M68 26 L80 30 L84 40 L70 38 M42 38 L36 50 M70 38 L76 50 M56 44 V56"/>
    </g>
    <path class="tank-flipper" d="M74 50 C 88 58, 88 76, 72 78 C 74 68, 70 60, 64 54 Z" fill="#8aa95a"/>
    <path class="tank-flipper" style="--delay:-0.9s" d="M34 52 C 26 60, 24 70, 30 72 C 34 66, 38 60, 42 56 Z" fill="#8aa95a"/>`,
  ],
  shark: [
    160,
    64,
    `<path class="shark-tail" d="M22 32 L4 6 Q12 26 10 32 Q12 40 6 54 Z" fill="#6b7f90"/>
    <path d="M66 16 L82 -6 L94 18 Z" fill="#62768a"/>
    <path d="M10 32 C 30 14, 80 8, 128 22 C 142 26, 154 30, 157 33 C 150 37, 136 41, 120 43 C 80 51, 34 47, 10 32 Z" fill="#7b8fa1"/>
    <path d="M18 34 C 50 44, 96 48, 124 42 C 138 40, 150 37, 157 33 C 146 44, 110 52, 70 50 C 44 48, 26 42, 18 34 Z" fill="#e7edf2"/>
    <path d="M86 42 L72 62 L102 44 Z" fill="#62768a"/><path d="M44 40 L40 50 L54 42 Z" fill="#62768a"/>
    <g stroke="#51667a" stroke-width="1.4" stroke-linecap="round" fill="none"><path d="M106 28 Q104 34 106 40"/><path d="M111 28 Q109 34 111 40"/><path d="M116 28 Q114 34 116 40"/></g>
    <circle cx="136" cy="27" r="2.3" fill="#0f172a"/><circle cx="136.7" cy="26.4" r="0.7" fill="#fff"/>
    <path class="shark-shut" d="M128 37 Q140 39 150 35" stroke="#51667a" stroke-width="1.4" fill="none" stroke-linecap="round"/>
    <g class="shark-jaw"><path d="M124 35 L156 32 L148 46 Q136 48 124 39 Z" fill="#4c0d0d"/>
    <path d="M128 35 L131 39 L134 34.7 L137 38.6 L140 34.3 L143 38 L146 34 L149 37.5 L152 33.5" stroke="#fff" stroke-width="1.2" fill="none" stroke-linejoin="round"/></g>`,
  ],
  jelly: [
    40,
    64,
    `<g class="tank-tentacles" fill="none" stroke="#f5d0fe" stroke-width="1.4" stroke-linecap="round" stroke-opacity="0.85">
      <path d="M10 22 C 6 32, 14 40, 9 52"/><path d="M16 23 C 13 36, 20 44, 15 60"/><path d="M24 23 C 27 36, 20 44, 25 60"/><path d="M30 22 C 34 32, 26 40, 31 52"/>
    </g>
    <path class="tank-bell" d="M3 21 Q20 -8 37 21 Q31 25 20 23 Q9 25 3 21 Z" fill="url(#gr-jelly-bell)"/>
    <path d="M11 12 Q16 6 22 6" stroke="#fff" stroke-opacity="0.7" stroke-width="1.6" fill="none" stroke-linecap="round"/>`,
  ],
  crab: [
    48,
    28,
    `<g class="tank-crab-step">
    <g stroke="#b91c1c" stroke-width="2" stroke-linecap="round" fill="none"><path d="M14 18 L6 24"/><path d="M16 20 L10 27"/><path d="M34 18 L42 24"/><path d="M32 20 L38 27"/><path d="M14 12 L8 6"/><path d="M34 12 L40 6"/></g>
    <ellipse cx="24" cy="16" rx="12" ry="7.5" fill="#ef4444"/>
    <path d="M4 3 Q8 -1 11 4 Q8 5 7 8 Q3 7 4 3 Z" fill="#ef4444"/><path d="M44 3 Q40 -1 37 4 Q40 5 41 8 Q45 7 44 3 Z" fill="#ef4444"/>
    <path d="M20 9 V5 M28 9 V5" stroke="#b91c1c" stroke-width="1.5"/>
    <circle cx="20" cy="4.5" r="2" fill="#fff"/><circle cx="28" cy="4.5" r="2" fill="#fff"/><circle cx="20.4" cy="4.8" r="1" fill="#111"/><circle cx="28.4" cy="4.8" r="1" fill="#111"/>
    <path d="M20 18 Q24 20 28 18" stroke="#991b1b" stroke-width="1.2" fill="none" stroke-linecap="round"/></g>`,
  ],
  octopus: [
    80,
    72,
    `<g class="tank-octo-arms" fill="none" stroke="#e8577a" stroke-width="5" stroke-linecap="round">
      <path d="M26 40 C 16 50, 22 60, 10 68"/><path d="M32 44 C 28 56, 34 62, 26 70"/><path d="M40 45 C 40 58, 46 62, 42 71"/>
      <path d="M48 44 C 52 56, 58 60, 56 70"/><path d="M54 40 C 64 50, 62 60, 72 66"/><path d="M58 36 C 70 42, 74 50, 78 56"/>
    </g>
    <path d="M60 30 C 62 12, 50 2, 38 2 C 22 2, 14 14, 16 28 C 17 38, 26 46, 40 46 C 52 46, 59 40, 60 30 Z" fill="#f06a8a"/>
    <g fill="#c2415f" fill-opacity="0.5"><circle cx="30" cy="12" r="2.4"/><circle cx="44" cy="9" r="2"/><circle cx="24" cy="22" r="1.8"/><circle cx="50" cy="18" r="1.6"/></g>
    <circle cx="36" cy="30" r="5" fill="#fff"/><circle cx="50" cy="29" r="4.4" fill="#fff"/>
    <circle cx="37.5" cy="31" r="2.4" fill="#111"/><circle cx="51.3" cy="30" r="2.1" fill="#111"/>`,
  ],
  seahorse: [
    40,
    72,
    `<path d="M22 8 C 30 6, 36 12, 32 18 L 40 20 L 34 24 C 30 30, 34 38, 30 46 C 26 54, 16 56, 16 64 C 16 70, 24 70, 24 64 C 24 60, 20 60, 20 63" fill="none" stroke="#f59e0b" stroke-width="3" stroke-linecap="round"/>
    <path d="M22 8 C 14 10, 12 18, 16 24 C 20 32, 14 40, 18 46 C 22 52, 30 48, 30 42 C 32 34, 28 28, 30 20 C 32 14, 28 8, 22 8 Z" fill="#fbbf24"/>
    <path d="M30 18 L40 20 L32 23 Z" fill="#fbbf24"/>
    <path class="tank-seahorse-fin" d="M16 28 C 8 28, 6 36, 14 38 Z" fill="#fde68a"/>
    <g stroke="#d97706" stroke-width="1" fill="none" stroke-linecap="round"><path d="M17 20 H23"/><path d="M16 26 H24"/><path d="M17 32 H26"/><path d="M18 38 H27"/><path d="M20 44 H28"/></g>
    <path d="M20 4 L22 8 L25 4" fill="#f59e0b"/>
    <circle cx="27" cy="13" r="1.8" fill="#111"/>`,
  ],
  goby: [
    40,
    20,
    `<path d="M9 10 L1 4 L3 10 L1 16 Z" fill="#a855f7"/>
    <path d="M14 4 Q20 -2 27 4 Z" fill="#facc15"/>
    <ellipse cx="22" cy="11" rx="14" ry="7.5" fill="#c084fc"/>
    <path d="M8 11 Q22 20 36 11 Q22 15 8 11 Z" fill="#fde047"/>
    <circle cx="31" cy="8" r="3.2" fill="#fff"/><circle cx="32" cy="8" r="1.8" fill="#111"/>
    <path d="M34 13 Q36 14 34 15" stroke="#6b21a8" stroke-width="1" fill="none"/>`,
  ],
  lucky: [
    64,
    40,
    `<path class="tank-tail" d="M26 20 C 16 8, 4 4, 2 11 C 8 15, 9 20, 2 29 C 6 36, 16 32, 26 20 Z" fill="#fde047"/>
    <path d="M32 9 Q40 -1 48 9 Z" fill="#facc15"/>
    <ellipse cx="40" cy="21" rx="17" ry="12.5" fill="url(#gr-lucky)"/>
    <g fill="#fff" opacity="0.9"><path d="M36 14 l1.2 2.4 2.4 1.2 -2.4 1.2 -1.2 2.4 -1.2 -2.4 -2.4 -1.2 2.4 -1.2 Z"/><circle cx="46" cy="26" r="1.2"/></g>
    <circle cx="50" cy="17" r="2.4" fill="#111"/><circle cx="50.8" cy="16.3" r="0.8" fill="#fff"/>`,
  ],
  dolphin: [
    120,
    50,
    `<path d="M20 26 L4 14 Q10 26 4 38 Z" fill="#7aa7c7"/>
    <path d="M56 12 L66 0 L72 14 Z" fill="#6b98b9"/>
    <path d="M16 27 C 34 10, 80 6, 104 20 C 112 24, 118 26, 119 28 C 112 30, 104 30, 100 31 C 80 42, 38 44, 16 27 Z" fill="#8fb9d6"/>
    <path d="M26 30 C 50 40, 84 38, 100 31 C 90 36, 60 42, 36 36 Z" fill="#e6f1f8"/>
    <path d="M62 34 L56 46 L72 36 Z" fill="#6b98b9"/>
    <circle cx="96" cy="22" r="2.2" fill="#0f172a"/><circle cx="96.7" cy="21.4" r="0.7" fill="#fff"/>
    <path d="M104 28 Q110 30 116 28" stroke="#5b86a6" stroke-width="1.2" fill="none" stroke-linecap="round"/>`,
  ],
  manta: [
    120,
    70,
    `<path class="tank-manta-wing" d="M60 30 C 40 10, 14 8, 2 22 C 20 26, 34 34, 46 44 Z" fill="#334155"/>
    <path class="tank-manta-wing" style="--delay:-0.1s" d="M60 30 C 80 10, 106 8, 118 22 C 100 26, 86 34, 74 44 Z" fill="#334155"/>
    <path d="M44 30 C 48 20, 72 20, 76 30 C 76 44, 66 52, 60 52 C 54 52, 44 44, 44 30 Z" fill="#475569"/>
    <path d="M60 52 C 60 60, 56 66, 50 70" stroke="#334155" stroke-width="2" fill="none" stroke-linecap="round"/>
    <path d="M48 26 C 46 20, 50 16, 52 20 M72 26 C 74 20, 70 16, 68 20" stroke="#334155" stroke-width="4" fill="none" stroke-linecap="round"/>
    <g fill="#e2e8f0" opacity="0.5"><circle cx="54" cy="36" r="1.5"/><circle cx="60" cy="40" r="1.5"/><circle cx="66" cy="36" r="1.5"/></g>`,
  ],
  lionfish: [
    70,
    56,
    `<g stroke="#b91c1c" stroke-width="2.2" stroke-linecap="round" fill="none">
      <path d="M22 22 L14 2"/><path d="M28 20 L24 0"/><path d="M34 19 L34 1"/><path d="M40 20 L44 2"/><path d="M46 22 L54 6"/>
      <path d="M24 36 L8 50"/><path d="M30 38 L20 54"/><path d="M38 38 L36 55"/>
    </g>
    <path d="M14 28 L2 20 L5 28 L2 36 Z" fill="#fecaca"/>
    <ellipse cx="36" cy="29" rx="22" ry="11" fill="#fef2f2"/>
    <g clip-path="url(#gr-lion-body)" fill="#dc2626"><rect x="18" y="0" width="4" height="60"/><rect x="27" y="0" width="4" height="60"/><rect x="36" y="0" width="4" height="60"/><rect x="45" y="0" width="4" height="60"/></g>
    <path d="M52 34 C 58 40, 60 48, 56 52" stroke="#f87171" stroke-width="3" fill="none" stroke-linecap="round"/>
    <circle cx="51" cy="26" r="2.2" fill="#111"/><circle cx="51.7" cy="25.4" r="0.7" fill="#fff"/>`,
  ],
  diver: [
    44,
    60,
    `<g class="tank-diver-walk">
    <rect x="6" y="18" width="10" height="22" rx="4" fill="#facc15" stroke="#a16207" stroke-width="1"/>
    <rect x="12" y="20" width="22" height="24" rx="8" fill="#2563eb"/>
    <path d="M16 44 L14 58 M28 44 L30 58" stroke="#1e3a8a" stroke-width="6" stroke-linecap="round"/>
    <path d="M10 58 H18 M26 58 H36" stroke="#111827" stroke-width="4" stroke-linecap="round"/>
    <path d="M32 26 L40 34" stroke="#1d4ed8" stroke-width="5" stroke-linecap="round"/>
    <circle cx="24" cy="12" r="11" fill="#d4d4d8" stroke="#71717a" stroke-width="1.5"/>
    <circle cx="27" cy="12" r="6" fill="#bae6fd" stroke="#52525b" stroke-width="1.5"/>
    <path d="M24 9 Q27 7 29 9" stroke="#fff" stroke-width="1" fill="none"/>
    </g>`,
  ],
  whale: [
    300,
    110,
    `<path d="M10 58 C 40 20, 130 10, 200 26 C 236 34, 262 50, 272 60 C 280 44, 292 30, 298 26 C 296 44, 290 58, 290 64 C 294 72, 298 88, 296 96 C 286 86, 276 78, 270 72 C 250 86, 200 98, 140 98 C 70 98, 22 84, 10 58 Z" fill="#06283a"/>
    <path d="M120 86 C 110 100, 96 108, 84 108 C 96 98, 104 90, 108 82 Z" fill="#06283a"/>`,
  ],
};

export const svg = (kind: ArtKind) => {
  const [w, h, body] = ART[kind];
  return `<svg viewBox="0 0 ${w} ${h}" width="100%" height="100%" style="overflow:visible;display:block">${body}</svg>`;
};
