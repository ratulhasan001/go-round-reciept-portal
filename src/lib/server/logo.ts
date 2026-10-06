import { createHash } from "node:crypto";

// Settings saves an uploaded logo as a data URL (a 320 px PNG is ~170 KB of text). Only raster images are served
// from our own domain: an SVG could carry script.
const DATA_URL = /^data:(image\/(?:png|jpeg|webp|gif));base64,([A-Za-z0-9+/]+={0,2})$/;

/** The image inside a data-URL logo, or null when the logo is a path, a web address or empty. */
export function logoImage(logo: string) {
  const m = DATA_URL.exec(logo);
  return m ? { type: m[1], bytes: Buffer.from(m[2], "base64") } : null;
}

/**
 * Where the public customer form loads the logo from. Inlined, a data URL is sent twice (in the HTML and again in
 * React's page data) and made up ~95% of the page, so it's served by /api/shop-logo instead. The version changes
 * with the logo, so that URL can be cached for good.
 */
export const logoSrc = (logo: string) =>
  DATA_URL.test(logo) ? `/api/shop-logo?v=${createHash("sha256").update(logo).digest("hex").slice(0, 12)}` : logo;
