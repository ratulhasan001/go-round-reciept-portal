import { cx } from "./ui";

// round bowl: flared neck at the top, a 24-radius globe below
const BOWL = "M19 12 C 19 17, 8 21, 8 37 A 24 24 0 0 0 56 37 C 56 21, 45 17, 45 12 Z";

/** Small animated fish bowl: a round glass bowl of logo-aqua water, swaying weed, a lime fish and rising bubbles. Scales with font size. */
export function Aquarium({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={cx("inline-block h-[1em] w-[1em] overflow-visible", className)} aria-hidden>
      <defs>
        <linearGradient id="aq-water" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#56caee" stopOpacity="0.9" />
          <stop offset="1" stopColor="#1a86ae" />
        </linearGradient>
        <linearGradient id="aq-glass" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.55" />
          <stop offset="1" stopColor="#ffffff" stopOpacity="0.12" />
        </linearGradient>
        <linearGradient id="aq-fish" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#c4ec8f" />
          <stop offset="1" stopColor="#8cc556" />
        </linearGradient>
        <clipPath id="aq-bowl">
          <path d={BOWL} />
        </clipPath>
      </defs>

      {/* shadow the bowl sits on */}
      <ellipse cx="32" cy="61.5" rx="15" ry="2" fill="#000000" fillOpacity="0.28" />

      <g clipPath="url(#aq-bowl)">
        <rect x="0" y="0" width="64" height="64" fill="#ffffff" fillOpacity="0.07" />
        {/* water with a rippling surface */}
        <path className="aq-ripple" d="M0 25 C 10 22, 18 28, 28 25 S 46 22, 56 25 S 70 28, 78 25 V 64 H 0 Z" fill="url(#aq-water)" />
        {/* sand */}
        <path d="M4 54 C 16 50, 28 56, 40 52 S 56 52, 60 52 V 64 H 4 Z" fill="#e8d9a8" />
        {/* weed */}
        <path className="aq-weed" d="M20 56 C 17 49, 23 45, 19 38 C 17 34, 20 31, 20 29" fill="none" stroke="#4e8a23" strokeWidth="3" strokeLinecap="round" />
        <path className="aq-weed [animation-delay:-1.5s]" d="M45 55 C 48 49, 43 45, 46 40" fill="none" stroke="#8cc556" strokeWidth="3" strokeLinecap="round" />
        {/* fish (faces right) */}
        <g className="aq-fish">
          <path d="M23 39 L 16 34 L 17.5 39 L 16 44 Z" fill="#8cc556" />
          <ellipse cx="32" cy="39" rx="10" ry="6.5" fill="url(#aq-fish)" />
          <path d="M29 33.5 Q 32 30, 35 33" fill="#8cc556" />
          <circle cx="37" cy="37.5" r="1.6" fill="#0e2a23" />
          <circle cx="37.5" cy="37" r="0.5" fill="#ffffff" />
        </g>
        {/* bubbles */}
        <circle className="aq-bubble" cx="42" cy="48" r="2" fill="none" stroke="#ffffff" strokeWidth="1.2" />
        <circle className="aq-bubble [animation-delay:-1.1s]" cx="45" cy="48" r="1.3" fill="none" stroke="#ffffff" strokeWidth="1" />
        <circle className="aq-bubble [animation-delay:-2.2s]" cx="40" cy="48" r="1.6" fill="none" stroke="#ffffff" strokeWidth="1" />
      </g>

      {/* glass */}
      <path d={BOWL} fill="none" stroke="url(#aq-glass)" strokeWidth="2.5" strokeLinejoin="round" />
      <ellipse cx="32" cy="12" rx="13" ry="2.6" fill="none" stroke="#8cc556" strokeWidth="2.5" />
      <path d="M13 30 A 20 20 0 0 0 17 47" fill="none" stroke="#ffffff" strokeOpacity="0.5" strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="19" cy="25.5" r="1.3" fill="#ffffff" fillOpacity="0.6" />
    </svg>
  );
}
