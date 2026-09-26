import { cx } from "./ui";

/** Wide oval pond: fish drift under the surface and every few seconds one leaps out with a splash. Decorative only. */
export function Pond({ className }: { className?: string }) {
  return (
    <div className={cx("relative h-28 select-none", className)} aria-hidden>
      {/* the water */}
      <div className="absolute inset-x-0 bottom-0 h-[4.5rem] overflow-hidden rounded-[50%] bg-[radial-gradient(ellipse_at_50%_40%,#56caee_0%,#2aa3cf_45%,#1a86ae_75%,#0f5f7e_100%)] shadow-[0_0_0_3px_rgb(140_197_86/0.55),0_0_0_7px_rgb(140_197_86/0.15),0_14px_30px_-8px_rgb(0_0_0/0.55)]">
        {/* light playing on the surface */}
        <div className="pond-shimmer absolute left-[12%] top-[22%] h-1.5 w-1/4 rounded-full bg-white/35 blur-[2px]" />
        <div className="pond-shimmer absolute right-[18%] top-[48%] h-1 w-1/5 rounded-full bg-white/25 blur-[2px] [--delay:-2s]" />

        {/* fish under the surface */}
        <Swimmer className="top-[42%] [--dur:16s]" size={30} tone="#0d5a78" />
        <Swimmer className="top-[18%] [--delay:-7s] [--dur:21s]" size={22} tone="#0f6a8c" />
        <Swimmer className="top-[58%] [--delay:-3s] [--dur:13s]" size={26} tone="#0d5a78" reverse />

        {/* lily pads */}
        <LilyPad className="left-[7%] top-[30%] w-7" />
        <LilyPad className="right-[9%] top-[20%] w-9 rotate-[140deg]" />
        <LilyPad className="left-[46%] top-[62%] w-6 rotate-[70deg]" />
      </div>

      {/* reeds on the banks */}
      <Reeds className="bottom-6 left-[2%]" />
      <Reeds className="bottom-5 right-[3%] -scale-x-100" />

      {/* jumpers: the surface is the middle of the oval, 2.25rem up from the bottom */}
      <Jumper className="bottom-9 left-[26%]" />
      <Jumper className="bottom-9 left-[64%] [--delay:-3.2s]" mirror />
    </div>
  );
}

function FishShape({ body, fin, eye = true, className }: { body: string; fin: string; eye?: boolean; className?: string }) {
  return (
    <svg viewBox="0 -1 28 16" className={className}>
      <path d="M7 7 L0 2 L1.5 7 L0 12 Z" fill={fin} />
      <ellipse cx="16" cy="7" rx="10" ry="6" fill={body} />
      <path d="M13 1.5 Q16 -1.5 19 1" fill={fin} />
      {eye && <circle cx="21.5" cy="5.8" r="1.4" fill="#0e2a23" />}
    </svg>
  );
}

function Swimmer({ className, size, tone, reverse }: { className?: string; size: number; tone: string; reverse?: boolean }) {
  return (
    // the wrapper spans the pond, so translating it by % crosses the whole pond
    <div className={cx("pond-swim absolute inset-x-0", reverse && "[--dir:reverse]", className)}>
      <div className={cx("pond-bob", reverse && "-scale-x-100")} style={{ width: size }}>
        <FishShape body={tone} fin={tone} eye={false} className="w-full opacity-70" />
      </div>
    </div>
  );
}

function Jumper({ className, mirror }: { className?: string; mirror?: boolean }) {
  return (
    <div className={cx("absolute w-16", mirror && "-scale-x-100", className)}>
      {/* take-off and landing ripples */}
      <span className="pond-ripple absolute -left-3 -top-1.5 h-3 w-8 rounded-[50%] border-2 border-white/80" />
      <span className="pond-ripple pond-ripple-land absolute -top-1.5 left-11 h-3 w-8 rounded-[50%] border-2 border-white/80" />
      {/* splash drops on landing */}
      <span className="pond-drop absolute left-[3.6rem] top-0 size-1.5 rounded-full bg-white/90 [--dx:-7px]" />
      <span className="pond-drop absolute left-[3.6rem] top-0 size-1 rounded-full bg-white/90 [--dx:2px]" />
      <span className="pond-drop absolute left-[3.6rem] top-0 size-1.5 rounded-full bg-white/80 [--dx:9px]" />
      {/* the fish */}
      <div className="pond-jump absolute -left-3 -top-2 w-7">
        <FishShape body="#b5e27f" fin="#8cc556" className="w-full drop-shadow-[0_2px_2px_rgb(0_0_0/0.35)]" />
      </div>
    </div>
  );
}

function LilyPad({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 12" className={cx("absolute", className)}>
      <path d="M10 6 L18.5 3.4 A 9 5.5 0 1 1 17.8 2 Z" fill="#6fae3b" />
      <path d="M10 6 L3 4.5 M10 6 L6 10 M10 6 L14 10.5" stroke="#4e8a23" strokeWidth="0.6" />
    </svg>
  );
}

function Reeds({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 40" className={cx("absolute h-12 w-7 overflow-visible", className)}>
      <path className="aq-weed" d="M6 40 C 5 28, 8 18, 4 4" fill="none" stroke="#4e8a23" strokeWidth="2.2" strokeLinecap="round" />
      {/* cattail sways with its stem */}
      <g className="aq-weed [--delay:-1s]">
        <path d="M12 40 C 12 26, 14 14, 13 0" fill="none" stroke="#8cc556" strokeWidth="2.2" strokeLinecap="round" />
        <rect x="11" y="4" width="3.6" height="9" rx="1.8" fill="#6b4a2b" />
      </g>
      <path className="aq-weed [--delay:-2s]" d="M18 40 C 18 30, 16 22, 21 12" fill="none" stroke="#6fae3b" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}
