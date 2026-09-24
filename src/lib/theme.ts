// Shared receipt design tokens - used by the web preview, the PDF and the Excel file.
// Colours are taken from the Go Round logo: leaf green, aqua water and ink black.
export const T = {
  ink: "#0E2A23",
  body: "#34463F",
  muted: "#6A7B74",
  faint: "#A0ADA7",
  line: "#E3EAE6",
  leaf: "#8CC556", // logo ring
  leafDeep: "#4E8A23", // leaf, dark enough for text on white
  leafSoft: "#F1F8EA",
  aqua: "#56CAEE", // logo water
  aquaDeep: "#1A86AE",
  aquaSoft: "#EAF7FC",
  white: "#FFFFFF",
  status: {
    PAID: { bg: "#E3F4D6", fg: "#3E7A18" },
    PARTIAL: { bg: "#FFF1D6", fg: "#94600A" },
    UNPAID: { bg: "#FDE4E1", fg: "#B0301F" },
  },
} as const;

export const STATUS_LABEL = { PAID: "Paid", PARTIAL: "Partially paid", UNPAID: "Unpaid" } as const;

export const DEFAULT_LOGO = "/logo.png";

export const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("") || "GR";

/** Absolute URL / data URL for the shop logo, or "" when the shop has no logo. */
export const logoUrl = (logo: string) =>
  !logo ? "" : logo.startsWith("data:") || /^https?:/.test(logo) ? logo : `${window.location.origin}${logo}`;

// Water-wave band used across the receipt (drawn in a 595 x 40 box)
export const WAVE_BACK = "M0 18 C 90 2, 190 34, 300 18 S 500 2, 595 16 L595 40 L0 40 Z";
export const WAVE_FRONT = "M0 26 C 110 12, 210 40, 320 26 S 510 14, 595 28 L595 40 L0 40 Z";
