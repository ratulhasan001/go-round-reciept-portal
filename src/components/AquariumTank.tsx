import { SharkChase } from "./SharkChase";
import { cx } from "./ui";

/**
 * The big home-page aquarium: a glass tank with light rays, swaying plants, coral, rocks,
 * a school of tetras, several kinds of fish, a turtle, a jellyfish, a crab, a hunting shark (see SharkChase) and the kit a
 * real tank runs on: LED light, filter, heater, thermometer and an airline to the air stone.
 * Per-element timing comes from --dur / --delay / --dir (see the tank-* rules in globals.css).
 */
export function AquariumTank({ className }: { className?: string }) {
  return (
    <div className={cx("relative select-none", className)}>
      <FishSymbols />
      {/* lid with its LED light bar */}
      <div className="absolute inset-x-6 -top-2 z-10 h-4 rounded-t-xl bg-gradient-to-b from-[#a6d873] to-lime shadow-[0_2px_6px_rgb(0_0_0/0.25)] sm:inset-x-10">
        <div className="absolute inset-x-8 -bottom-1 h-1 rounded-full bg-white shadow-[0_0_12px_4px_rgb(255_255_255/0.7)]" />
      </div>

      {/* frame */}
      <div className="rounded-[1.75rem] bg-deep p-2 shadow-[0_24px_60px_-20px_rgb(14_42_35/0.6)] sm:p-2.5">
        <div aria-label="Aquarium. Tap the water to feed the fish." role="img" className="relative h-72 cursor-pointer touch-manipulation overflow-hidden rounded-[1.3rem] bg-[linear-gradient(180deg,#8fe0f7_0%,#3fb4dc_22%,#1d8fbb_55%,#11698c_80%,#0b4e68_100%)] sm:h-[26rem]">
          {/* light rays from the surface */}
          <div className="tank-ray absolute -top-10 left-[8%] h-[120%] w-16 origin-top rotate-[18deg] bg-gradient-to-b from-white/35 to-transparent blur-md sm:w-24" />
          <div className="tank-ray absolute -top-10 left-[36%] h-[120%] w-10 origin-top rotate-[14deg] bg-gradient-to-b from-white/25 to-transparent blur-md [--delay:-2s] sm:w-16" />
          <div className="tank-ray absolute -top-10 left-[62%] h-[120%] w-20 origin-top rotate-[20deg] bg-gradient-to-b from-white/30 to-transparent blur-md [--delay:-4s] sm:w-28" />
          <div className="tank-ray absolute -top-10 left-[86%] h-[120%] w-12 origin-top rotate-[16deg] bg-gradient-to-b from-white/20 to-transparent blur-md [--delay:-1s]" />

          {/* surface */}
          <div className="absolute inset-x-0 top-0 h-3 bg-gradient-to-b from-white/60 to-transparent" />
          <div className="pond-shimmer absolute left-[10%] top-3 h-1 w-1/5 rounded-full bg-white/50 blur-[1px]" />
          <div className="pond-shimmer absolute left-[55%] top-4 h-1 w-1/4 rounded-full bg-white/40 blur-[1px] [--delay:-2s]" />

          {/* sunlight patterns rippling through the water */}
          <div className="tank-caustics pointer-events-none absolute inset-0 opacity-40 mix-blend-overlay [mask-image:linear-gradient(to_bottom,black,transparent_85%)]" />

          {/* driftwood behind the plants */}
          <svg viewBox="0 0 200 70" className="absolute bottom-6 left-[52%] w-40 opacity-90 sm:w-56">
            <path d="M4 66 C 30 50, 60 52, 90 40 C 110 32, 120 14, 140 6 C 136 20, 128 30, 122 40 C 150 36, 176 40, 196 30 C 180 48, 150 54, 120 56 C 90 60, 50 68, 4 66 Z" fill="#6d4c32" />
            <path d="M30 60 C 60 54, 90 50, 118 44 M126 30 C 130 22, 134 16, 138 10" stroke="#4f3522" strokeWidth="2" fill="none" strokeLinecap="round" />
          </svg>

          {/* far plants, softened by the water */}
          <Kelp className="bottom-6 left-[4%] h-[70%] opacity-60 [--delay:-1s]" tone="#3c7a2a" />
          <Kelp className="bottom-6 left-[58%] h-[62%] opacity-50 [--delay:-3s] max-sm:hidden" tone="#3c7a2a" />
          <Kelp className="bottom-6 right-[3%] h-[78%] opacity-60 [--delay:-2s]" tone="#3c7a2a" />

          {/* jellyfish */}
          <div className="tank-jelly absolute left-[72%] top-[12%] w-8 sm:w-11">
            <svg viewBox="0 0 40 64" className="w-full overflow-visible">
              <use href="#gr-jelly" />
            </svg>
          </div>

          {/* sea turtle */}
          <div className="tank-swim absolute inset-x-0 top-[26%] [--dir:reverse] [--dur:52s] [--delay:-12s]">
            <Turtle className="pond-bob w-20 -scale-x-100 sm:w-28" />
          </div>

          {/* swimmers (back to front) */}
          <Swim fish="tetra-school" className="top-[20%] [--dur:24s] [--delay:-4s]" width="w-24 sm:w-32" />
          <Swim fish="angel" className="top-[30%] [--dur:34s] [--delay:-20s]" width="w-12 sm:w-16" reverse />
          <Swim fish="tang" className="top-[46%] [--dur:22s] [--delay:-9s]" width="w-14 sm:w-20" />
          <Swim fish="gold" className="top-[14%] [--dur:28s] [--delay:-16s]" width="w-14 sm:w-20" reverse />
          <Swim fish="clown" className="top-[58%] [--dur:18s]" width="w-12 sm:w-16" />
          <Swim fish="puffer" className="top-[38%] [--dur:40s] [--delay:-30s]" width="w-10 sm:w-14" reverse />
          <Swim fish="clown" className="top-[62%] [--dur:18s] [--delay:-1.4s]" width="w-9 sm:w-12" />

          <SharkChase />

          {/* sand */}
          <svg viewBox="0 0 400 40" preserveAspectRatio="none" className="absolute inset-x-0 bottom-0 h-14 w-full sm:h-16">
            <path d="M0 16 C 60 6, 120 20, 190 12 S 320 4, 400 14 V40 H0 Z" fill="#d4bd83" />
            <path d="M0 24 C 70 16, 150 30, 230 22 S 350 16, 400 22 V40 H0 Z" fill="#e8d6a4" />
          </svg>
          <Pebbles />

          {/* rocks, coral and near plants */}
          <svg viewBox="0 0 120 60" className="absolute bottom-3 left-[30%] w-24 sm:w-36">
            <path d="M6 58 C 2 40, 18 26, 38 30 C 50 18, 76 20, 82 36 C 100 34, 116 46, 114 58 Z" fill="#5b6b66" />
            <path d="M38 30 C 50 18, 76 20, 82 36 C 70 30, 52 30, 38 30 Z" fill="#7d8e88" />
            <path d="M20 44 C 26 40, 34 42, 36 46" stroke="#48554f" strokeWidth="2" fill="none" strokeLinecap="round" />
          </svg>
          <Coral className="bottom-5 left-[46%] w-14 sm:w-20" />
          <Coral className="bottom-4 right-[22%] w-10 -scale-x-100 sm:w-14 [--delay:-1.5s]" tone="#f59e0b" />
          <Sword className="bottom-4 left-[13%] w-20 sm:w-28" />
          <Sword className="bottom-4 right-[8%] w-16 sm:w-24 [--delay:-2s]" />
          <Kelp className="bottom-4 left-[24%] h-[55%]" tone="#6fae3b" />
          <Kelp className="bottom-4 right-[30%] h-[48%] [--delay:-1.2s]" tone="#8cc556" />
          <Grass className="bottom-2 left-[2%] w-24 sm:w-32" />
          <Grass className="bottom-2 left-[60%] w-20 sm:w-28 [--delay:-1s]" />
          <Grass className="bottom-2 right-[1%] w-20 sm:w-28 [--delay:-2s]" />

          {/* crab strolling on the sand */}
          <div className="tank-crab absolute bottom-3 inset-x-0">
            <div className="w-10 sm:w-12">
              <svg viewBox="0 0 48 28" className="tank-crab-step w-full">
                <use href="#gr-crab" />
              </svg>
            </div>
          </div>

          {/* bubbles from an air stone */}
          <div className="absolute bottom-5 right-[40%] h-2.5 w-7 rounded-full bg-[#4a5a55]" />
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="tank-bubble absolute bottom-6 right-[41%] h-full" style={{ "--delay": `${-i * 0.7}s`, marginRight: `${(i % 3) * 5}px` } as React.CSSProperties}>
              <span className="tank-wobble absolute bottom-0 block rounded-full border border-white/80 bg-white/15" style={{ width: 6 + (i % 3) * 3, height: 6 + (i % 3) * 3 }} />
            </div>
          ))}
          {[0, 1, 2].map((i) => (
            <div key={i} className="tank-bubble absolute bottom-24 left-[9%] h-full [--dur:5s]" style={{ "--delay": `${-i * 1.6}s` } as React.CSSProperties}>
              <span className="tank-wobble absolute bottom-0 block size-1.5 rounded-full border border-white/70" />
            </div>
          ))}

          <Equipment />

          {/* glass: reflections and a soft inner edge */}
          <div className="pointer-events-none absolute -left-10 top-0 h-full w-40 -skew-x-12 bg-gradient-to-r from-white/0 via-white/15 to-white/0" />
          <div className="pointer-events-none absolute left-40 top-0 h-full w-8 -skew-x-12 bg-white/10" />
          <div className="pointer-events-none absolute inset-0 rounded-[1.3rem] shadow-[inset_0_0_40px_rgb(0_0_0/0.25),inset_0_0_0_1px_rgb(255_255_255/0.2)]" />
        </div>
      </div>
      {/* stand */}
      <div className="mx-auto h-3 w-[92%] rounded-b-2xl bg-gradient-to-b from-deep to-[#081a15]" />
      <p className="mt-3 text-center text-[12.5px] text-muted">Tap the water to feed the fish, and watch out for the shark.</p>
    </div>
  );
}

type FishKind = "clown" | "tang" | "angel" | "gold" | "puffer" | "tetra-school";
const VIEWBOX: Record<FishKind, string> = {
  clown: "0 0 60 34",
  tang: "0 0 64 36",
  angel: "0 0 50 60",
  gold: "0 0 64 40",
  puffer: "0 0 48 38",
  "tetra-school": "0 0 120 50",
};

/** A fish crossing the tank; the wrapper spans the tank so translating it by % crosses the whole width. */
function Swim({ fish, className, width, reverse }: { fish: FishKind; className?: string; width: string; reverse?: boolean }) {
  return (
    <div className={cx("tank-swim absolute inset-x-0", reverse && "[--dir:reverse]", className)}>
      <div className={cx("pond-bob drop-shadow-[0_4px_4px_rgb(0_0_0/0.2)]", width, reverse && "-scale-x-100")}>
        <svg viewBox={VIEWBOX[fish]} className="w-full overflow-visible">
          {fish === "tetra-school" ? (
            // a loose school of neon tetras
            <>
              {[
                [0, 18],
                [22, 6],
                [30, 28],
                [52, 14],
                [64, 34],
                [80, 4],
                [90, 22],
              ].map(([x, y], i) => (
                <use key={i} href="#gr-tetra" x={x} y={y} width="30" height="12" />
              ))}
            </>
          ) : (
            <use href={`#gr-${fish}`} />
          )}
        </svg>
      </div>
    </div>
  );
}

/** Every creature is drawn once here (all facing right) and reused with <use>. */
function FishSymbols() {
  return (
    <svg className="absolute size-0">
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
        <radialGradient id="gr-jelly-bell" cx="0.5" cy="0.35" r="0.7">
          <stop offset="0" stopColor="#fbe7ff" stopOpacity="0.95" />
          <stop offset="1" stopColor="#e879f9" stopOpacity="0.55" />
        </radialGradient>
      </defs>

      {/* clownfish */}
      <symbol id="gr-clown" viewBox="0 0 60 34">
        <path d="M14 17 L2 6 Q6 17 2 28 Z" fill="#f36b12" stroke="#1b1b1b" strokeWidth="1.4" strokeLinejoin="round" />
        <path d="M24 7 Q32 -1 42 7 Z" fill="#f36b12" stroke="#1b1b1b" strokeWidth="1.4" strokeLinejoin="round" />
        <path d="M26 27 Q30 34 36 28 Z" fill="#f36b12" stroke="#1b1b1b" strokeWidth="1.2" strokeLinejoin="round" />
        <ellipse cx="32" cy="17" rx="20" ry="12" fill="#ff8a2a" />
        <g clipPath="url(#gr-clown-body)" stroke="#1b1b1b" strokeWidth="1.2">
          <rect x="15" y="0" width="4" height="34" fill="#fff" />
          <rect x="28" y="0" width="5.5" height="34" fill="#fff" />
          <rect x="41" y="0" width="4.5" height="34" fill="#fff" />
        </g>
        <ellipse cx="32" cy="17" rx="20" ry="12" fill="none" stroke="#1b1b1b" strokeWidth="1.4" />
        <circle cx="47" cy="14" r="2.3" fill="#111" />
        <circle cx="47.8" cy="13.3" r="0.7" fill="#fff" />
      </symbol>

      {/* blue tang */}
      <symbol id="gr-tang" viewBox="0 0 64 36">
        <path d="M14 18 L3 7 L7 18 L3 29 Z" fill="#ffd21f" />
        <path d="M22 7 Q36 0 50 8 Z" fill="#1e4fd6" />
        <path d="M22 29 Q36 36 48 28 Z" fill="#1e4fd6" />
        <ellipse cx="34" cy="18" rx="22" ry="12.5" fill="#2f6bf2" />
        <path d="M18 12 Q32 5 50 11 Q40 15 31 13 Q23 17 34 24 Q24 24 18 20" fill="#0b1b4a" />
        <path d="M40 19 Q46 24 42 27 Q38 24 40 19 Z" fill="#ffd21f" />
        <circle cx="50" cy="15" r="2.2" fill="#0b1b4a" />
        <circle cx="50.7" cy="14.4" r="0.7" fill="#fff" />
      </symbol>

      {/* angelfish */}
      <symbol id="gr-angel" viewBox="0 0 50 60">
        <path d="M18 18 Q18 -2 32 1 Q29 10 30 22 Z" fill="#e2e8ee" />
        <path d="M18 42 Q18 62 32 59 Q29 50 30 38 Z" fill="#e2e8ee" />
        <path d="M9 30 L0 22 L3 30 L0 38 Z" fill="#dfe6ec" />
        <path d="M8 30 Q24 8 44 30 Q24 52 8 30 Z" fill="#f1f5f8" />
        <g clipPath="url(#gr-angel-body)" fill="#1f2937" fillOpacity="0.85">
          <rect x="17" y="0" width="3" height="60" />
          <rect x="27" y="0" width="3.5" height="60" />
          <rect x="37" y="0" width="2.5" height="60" />
        </g>
        <path d="M30 20 Q40 22 44 30" stroke="#f5c542" strokeWidth="1.5" fill="none" strokeOpacity="0.8" />
        <circle cx="38" cy="27" r="2" fill="#b91c1c" />
        <circle cx="38" cy="27" r="1" fill="#111" />
      </symbol>

      {/* goldfish */}
      <symbol id="gr-gold" viewBox="0 0 64 40">
        <path className="tank-tail" d="M26 20 C 16 8, 4 4, 2 11 C 8 15, 9 20, 2 29 C 6 36, 16 32, 26 20 Z" fill="#ffc15e" fillOpacity="0.9" />
        <path d="M32 9 Q40 -1 48 9 Z" fill="#ff9d1c" />
        <ellipse cx="40" cy="21" rx="17" ry="12.5" fill="#ffa11a" />
        <ellipse cx="44" cy="25" rx="10" ry="5" fill="#ffd08a" fillOpacity="0.7" />
        <path d="M38 27 Q40 35 46 30 Z" fill="#ff9d1c" />
        <circle cx="50" cy="17" r="2.4" fill="#111" />
        <circle cx="50.8" cy="16.3" r="0.8" fill="#fff" />
      </symbol>

      {/* pufferfish */}
      <symbol id="gr-puffer" viewBox="0 0 48 38">
        <path d="M11 19 L2 12 L4 19 L2 26 Z" fill="#e9c46a" />
        <circle cx="26" cy="19" r="15" fill="#f3d27a" />
        <path d="M13 24 Q26 38 40 24 Q26 30 13 24 Z" fill="#fff4d6" />
        <g fill="#8a6d1f" fillOpacity="0.55">
          <circle cx="20" cy="10" r="1.3" />
          <circle cx="27" cy="8" r="1.1" />
          <circle cx="16" cy="16" r="1.2" />
          <circle cx="24" cy="15" r="1" />
          <circle cx="31" cy="13" r="1.2" />
        </g>
        <g stroke="#b88a2a" strokeWidth="1" strokeLinecap="round">
          <path d="M26 3 V1" />
          <path d="M15 7 L13.5 5.5" />
          <path d="M37 7 L38.5 5.5" />
          <path d="M11 17 H9" />
        </g>
        <path d="M24 22 Q28 20 26 26 Z" fill="#e9c46a" />
        <circle cx="35" cy="16" r="3.2" fill="#fff" />
        <circle cx="36" cy="16" r="1.9" fill="#111" />
        <path d="M40 21 Q42 22 40 23" stroke="#8a6d1f" strokeWidth="1" fill="none" />
      </symbol>

      {/* neon tetra */}
      <symbol id="gr-tetra" viewBox="0 0 30 12">
        <path d="M5 6 L0 2 L1.2 6 L0 10 Z" fill="#dbe9ee" fillOpacity="0.8" />
        <ellipse cx="16" cy="6" rx="12" ry="4.5" fill="#dbe9ee" />
        <g clipPath="url(#gr-tetra-body)">
          <rect x="4" y="6.3" width="14" height="5" fill="#ef4444" />
          <path d="M4 4.8 L28 4.3" stroke="#22d3ee" strokeWidth="2" />
        </g>
        <circle cx="24" cy="5" r="1" fill="#111" />
      </symbol>

      {/* jellyfish */}
      <symbol id="gr-jelly" viewBox="0 0 40 64">
        <g className="tank-tentacles" fill="none" stroke="#f5d0fe" strokeWidth="1.4" strokeLinecap="round" strokeOpacity="0.85">
          <path d="M10 22 C 6 32, 14 40, 9 52" />
          <path d="M16 23 C 13 36, 20 44, 15 60" />
          <path d="M24 23 C 27 36, 20 44, 25 60" />
          <path d="M30 22 C 34 32, 26 40, 31 52" />
        </g>
        <path className="tank-bell" d="M3 21 Q20 -8 37 21 Q31 25 20 23 Q9 25 3 21 Z" fill="url(#gr-jelly-bell)" />
        <path d="M11 12 Q16 6 22 6" stroke="#fff" strokeOpacity="0.7" strokeWidth="1.6" fill="none" strokeLinecap="round" />
      </symbol>

      {/* crab */}
      <symbol id="gr-crab" viewBox="0 0 48 28">
        <g stroke="#b91c1c" strokeWidth="2" strokeLinecap="round" fill="none">
          <path d="M14 18 L6 24" />
          <path d="M16 20 L10 27" />
          <path d="M34 18 L42 24" />
          <path d="M32 20 L38 27" />
          <path d="M14 12 L8 6" />
          <path d="M34 12 L40 6" />
        </g>
        <ellipse cx="24" cy="16" rx="12" ry="7.5" fill="#ef4444" />
        <path d="M4 3 Q8 -1 11 4 Q8 5 7 8 Q3 7 4 3 Z" fill="#ef4444" />
        <path d="M44 3 Q40 -1 37 4 Q40 5 41 8 Q45 7 44 3 Z" fill="#ef4444" />
        <path d="M20 9 V5 M28 9 V5" stroke="#b91c1c" strokeWidth="1.5" />
        <circle cx="20" cy="4.5" r="2" fill="#fff" />
        <circle cx="28" cy="4.5" r="2" fill="#fff" />
        <circle cx="20.4" cy="4.8" r="1" fill="#111" />
        <circle cx="28.4" cy="4.8" r="1" fill="#111" />
        <path d="M20 18 Q24 20 28 18" stroke="#991b1b" strokeWidth="1.2" fill="none" strokeLinecap="round" />
      </symbol>
    </svg>
  );
}

/** Tall ribbon weed; `h-*` in className sets its height. */
function Kelp({ className, tone }: { className?: string; tone: string }) {
  return (
    <svg viewBox="0 0 40 200" preserveAspectRatio="xMidYMax meet" className={cx("tank-sway absolute aspect-[1/5] overflow-visible", className)}>
      <path d="M20 200 C 8 160, 32 130, 18 90 C 8 60, 28 30, 20 0" fill="none" stroke={tone} strokeWidth="7" strokeLinecap="round" />
      <path d="M20 170 C 34 160, 36 150, 30 140 M19 120 C 6 112, 4 100, 10 92 M20 60 C 34 52, 34 40, 28 34" fill="none" stroke={tone} strokeWidth="5" strokeLinecap="round" />
    </svg>
  );
}

/** Broad-leaved sword plant. */
function Sword({ className }: { className?: string }) {
  const leaves = [
    { d: "M50 100 C 30 70, 10 50, 6 20 C 24 40, 40 60, 50 100 Z", fill: "#4e8a23" },
    { d: "M50 100 C 36 60, 30 30, 38 0 C 48 30, 52 60, 50 100 Z", fill: "#6fae3b" },
    { d: "M50 100 C 60 60, 70 30, 88 10 C 84 40, 70 70, 50 100 Z", fill: "#5c9a2c" },
    { d: "M50 100 C 64 80, 80 64, 98 58 C 86 76, 70 90, 50 100 Z", fill: "#8cc556" },
    { d: "M50 100 C 36 84, 18 76, 0 74 C 16 90, 34 98, 50 100 Z", fill: "#8cc556" },
  ];
  return (
    <svg viewBox="0 0 100 100" className={cx("tank-sway absolute overflow-visible", className)}>
      {leaves.map((l, i) => (
        <path key={i} d={l.d} fill={l.fill} />
      ))}
    </svg>
  );
}

/** Tuft of fine grass along the front glass. */
function Grass({ className }: { className?: string }) {
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

function Coral({ className, tone = "#fb7185" }: { className?: string; tone?: string }) {
  return (
    <svg viewBox="0 0 60 60" className={cx("tank-sway absolute overflow-visible [--sway:2deg]", className)}>
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

function Pebbles() {
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
function Equipment() {
  return (
    <>
      {/* filter: box at the top right, intake tube down to a strainer, outflow jet at the surface */}
      <div className="pointer-events-none absolute right-3 top-2 w-9 sm:right-5 sm:w-12">
        <div className="relative h-20 rounded-lg bg-gradient-to-b from-[#3b4844] to-[#26302d] shadow-[0_4px_10px_rgb(0_0_0/0.35)] ring-1 ring-white/10 sm:h-24">
          <div className="absolute inset-x-1.5 top-3 h-8 rounded bg-[repeating-linear-gradient(0deg,#1a2220_0_2px,#34413d_2px_5px)] sm:h-10" />
          <span className="absolute bottom-2 left-1/2 size-1.5 -translate-x-1/2 rounded-full bg-lime shadow-[0_0_6px_#8cc556]" />
          {/* outflow spout and its jet */}
          <div className="absolute -left-3 top-1.5 h-2 w-4 rounded-l bg-[#2f3a37]" />
          {[0, 1, 2, 3].map((i) => (
            <span key={i} className="tank-jet absolute -left-3 top-2 size-1.5 rounded-full border border-white/80" style={{ "--delay": `${-i * 0.35}s` } as React.CSSProperties} />
          ))}
        </div>
        <div className="mx-auto h-[7.5rem] w-2 bg-gradient-to-r from-white/25 via-white/45 to-white/20 sm:h-[13rem]" />
        <div className="mx-auto h-6 w-3.5 rounded-sm bg-[repeating-linear-gradient(0deg,#26302d_0_2px,transparent_2px_4px)] ring-1 ring-[#26302d]" />
      </div>

      {/* heater: glass tube with its coil, suction cups and a pilot light */}
      <div className="pointer-events-none absolute left-2 top-5 flex w-3.5 flex-col items-center sm:left-4 sm:w-4">
        <div className="relative h-3 w-full rounded-t bg-[#1f2725]">
          <span className="tank-pilot absolute left-1/2 top-1 size-1 -translate-x-1/2 rounded-full bg-red-500" />
        </div>
        <div className="relative h-32 w-full rounded-b-full border border-white/40 bg-white/15 sm:h-44">
          <div className="absolute inset-x-[3px] bottom-2 top-2 rounded-full bg-[repeating-linear-gradient(0deg,#f97316_0_1.5px,transparent_1.5px_4px)] opacity-70" />
          <div className="absolute inset-x-0 bottom-0 h-1/3 rounded-b-full bg-gradient-to-t from-orange-400/40 to-transparent" />
          <span className="absolute -right-1.5 top-6 size-2 rounded-full bg-white/40" />
          <span className="absolute -right-1.5 bottom-8 size-2 rounded-full bg-white/40" />
        </div>
      </div>

      {/* stick-on thermometer on the front glass */}
      <div className="pointer-events-none absolute left-8 top-5 flex h-16 w-4 flex-col items-center justify-end overflow-hidden rounded-full bg-white/85 pb-1 shadow sm:left-12 sm:h-20 sm:w-5">
        <span className="absolute top-1 text-[6px] font-bold text-ink sm:text-[7px]">26°</span>
        <span className="h-1/2 w-1 rounded-full bg-gradient-to-t from-red-500 to-red-400" />
        <span className="mt-0.5 size-2 rounded-full bg-red-500" />
      </div>

      {/* airline from the top down to the air stone */}
      <div className="pointer-events-none absolute bottom-7 right-[41.5%] top-0 w-[2px] bg-white/30" />
    </>
  );
}

/** Sea turtle (faces right) paddling with its flippers. */
function Turtle({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 80" className={cx("overflow-visible drop-shadow-[0_6px_6px_rgb(0_0_0/0.25)]", className)} aria-hidden>
      {/* far-side flippers */}
      <path className="tank-flipper [--delay:-0.6s]" d="M72 30 C 84 14, 80 2, 66 2 C 70 12, 66 20, 62 30 Z" fill="#6f8f45" />
      <path className="tank-flipper [--delay:-0.3s]" d="M32 32 C 24 22, 16 20, 12 24 C 18 28, 22 32, 26 36 Z" fill="#6f8f45" />
      {/* tail */}
      <path d="M22 40 L10 44 L22 46 Z" fill="#9cb86a" />
      {/* head */}
      <path d="M86 32 C 96 24, 112 26, 114 36 C 114 44, 100 48, 88 44 Z" fill="#a4bf72" />
      <circle cx="104" cy="33" r="2.4" fill="#1a1a1a" />
      <path d="M106 41 Q110 41 112 39" stroke="#6f8f45" strokeWidth="1.2" fill="none" />
      {/* shell */}
      <ellipse cx="56" cy="40" rx="36" ry="22" fill="#7a5a2f" />
      <ellipse cx="56" cy="38" rx="32" ry="18" fill="#9a7440" />
      <g fill="none" stroke="#5e4424" strokeWidth="1.6" strokeLinejoin="round">
        <path d="M44 26 L56 22 L68 26 L70 38 L56 44 L42 38 Z" />
        <path d="M44 26 L32 30 L28 40 L42 38 M68 26 L80 30 L84 40 L70 38 M42 38 L36 50 M70 38 L76 50 M56 44 V56" />
      </g>
      {/* near-side flippers */}
      <path className="tank-flipper" d="M74 50 C 88 58, 88 76, 72 78 C 74 68, 70 60, 64 54 Z" fill="#8aa95a" />
      <path className="tank-flipper [--delay:-0.9s]" d="M34 52 C 26 60, 24 70, 30 72 C 34 66, 38 60, 42 56 Z" fill="#8aa95a" />
    </svg>
  );
}
