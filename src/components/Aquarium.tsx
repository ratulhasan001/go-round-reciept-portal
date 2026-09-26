import { cx } from "./ui";

/** Small animated fish tank: a glass tank of logo-aqua water, swaying weed, a lime fish and rising bubbles. Scales with font size. */
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
        <clipPath id="aq-tank">
          <rect x="6" y="10" width="52" height="46" rx="11" />
        </clipPath>
      </defs>

      {/* lid */}
      <rect x="12" y="5" width="40" height="5" rx="2.5" fill="#8cc556" />

      <g clipPath="url(#aq-tank)">
        <rect x="6" y="10" width="52" height="46" fill="#ffffff" fillOpacity="0.06" />
        {/* water with a rippling surface */}
        <path className="aq-ripple" d="M0 20 C 10 17, 18 23, 28 20 S 46 17, 56 20 S 70 23, 76 20 V 60 H 0 Z" fill="url(#aq-water)" />
        {/* sand */}
        <path d="M6 51 C 18 47, 30 53, 42 49 S 56 50, 58 49 V 56 H 6 Z" fill="#e8d9a8" />
        {/* weed */}
        <path className="aq-weed" d="M16 52 C 13 45, 19 41, 15 34 C 13 30, 16 27, 16 25" fill="none" stroke="#4e8a23" strokeWidth="3" strokeLinecap="round" />
        <path className="aq-weed [animation-delay:-1.5s]" d="M48 51 C 51 45, 46 41, 49 36" fill="none" stroke="#8cc556" strokeWidth="3" strokeLinecap="round" />
        {/* fish (faces right) */}
        <g className="aq-fish">
          <path d="M22 35 L 15 30 L 16.5 35 L 15 40 Z" fill="#8cc556" />
          <ellipse cx="31" cy="35" rx="10" ry="6.5" fill="url(#aq-fish)" />
          <path d="M28 29.5 Q 31 26 34 29" fill="#8cc556" />
          <circle cx="36" cy="33.5" r="1.6" fill="#0e2a23" />
          <circle cx="36.5" cy="33" r="0.5" fill="#ffffff" />
        </g>
        {/* bubbles */}
        <circle className="aq-bubble" cx="42" cy="44" r="2" fill="none" stroke="#ffffff" strokeWidth="1.2" />
        <circle className="aq-bubble [animation-delay:-1.1s]" cx="45" cy="44" r="1.3" fill="none" stroke="#ffffff" strokeWidth="1" />
        <circle className="aq-bubble [animation-delay:-2.2s]" cx="40" cy="44" r="1.6" fill="none" stroke="#ffffff" strokeWidth="1" />
      </g>

      {/* glass */}
      <rect x="6" y="10" width="52" height="46" rx="11" fill="none" stroke="url(#aq-glass)" strokeWidth="2.5" />
      <path d="M12 20 V 34" stroke="#ffffff" strokeOpacity="0.45" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}
