import { createHash, createHmac, timingSafeEqual } from "node:crypto";

export const SESSION_COOKIE = "gr_session";
export const SESSION_MAX_AGE = 60 * 60 * 24 * 365; // stay logged in for a year on a device

/** Login is switched on as soon as APP_PASSWORD is set (in Vercel → Settings → Environment Variables). */
export const authEnabled = () => !!process.env.APP_PASSWORD;

const sha = (s: string) => createHash("sha256").update(s).digest();

/** Session value derived from the password - changing APP_PASSWORD logs every device out. */
export const sessionToken = () =>
  createHmac("sha256", process.env.APP_PASSWORD ?? "").update("go-round-session-v1").digest("base64url");

export function checkPassword(input: string) {
  if (!authEnabled()) return true;
  return timingSafeEqual(sha(input), sha(process.env.APP_PASSWORD!));
}

export function isAuthed(cookieValue: string | undefined) {
  if (!authEnabled()) return true;
  if (!cookieValue) return false;
  return timingSafeEqual(sha(cookieValue), sha(sessionToken()));
}
