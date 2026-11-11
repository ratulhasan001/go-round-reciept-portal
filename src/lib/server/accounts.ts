import { createHash, randomBytes, randomUUID, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { cookies } from "next/headers";
import { db, dbEnabled, ensureSchema } from "./db";

const scryptAsync = promisify(scrypt) as (pw: string, salt: Buffer, len: number) => Promise<Buffer>;

export const CUSTOMER_COOKIE = "gr_customer";
const SESSION_DAYS = 180;

export interface Account {
  id: string;
  phone: string;
  name: string;
  email: string;
  address: string;
}

export async function hashPassword(pw: string) {
  const salt = randomBytes(16);
  const hash = await scryptAsync(pw, salt, 32);
  return `scrypt$${salt.toString("base64url")}$${hash.toString("base64url")}`;
}

export async function checkPassword(pw: string, stored: string) {
  const [, salt, hash] = stored.split("$");
  if (!salt || !hash) return false;
  const want = Buffer.from(hash, "base64url");
  const got = await scryptAsync(pw, Buffer.from(salt, "base64url"), want.length);
  return timingSafeEqual(got, want);
}

const sha = (s: string) => createHash("sha256").update(s).digest("hex");

/** Logs the account in on this browser (a random token in an httpOnly cookie; only its hash is stored). */
export async function startSession(accountId: string) {
  const token = randomBytes(24).toString("base64url");
  await db()`
    insert into gr_sessions (token_hash, account_id, expires_at)
    values (${sha(token)}, ${accountId}, now() + make_interval(days => ${SESSION_DAYS}))`;
  await db()`delete from gr_sessions where expires_at < now()`;
  (await cookies()).set(CUSTOMER_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_DAYS * 24 * 60 * 60,
  });
}

export async function endSession() {
  const jar = await cookies();
  const token = jar.get(CUSTOMER_COOKIE)?.value;
  if (token && dbEnabled()) await db()`delete from gr_sessions where token_hash = ${sha(token)}`.catch(() => null);
  jar.delete(CUSTOMER_COOKIE);
}

/** The logged-in customer, or null. */
export async function currentAccount(): Promise<Account | null> {
  if (!dbEnabled()) return null;
  const token = (await cookies()).get(CUSTOMER_COOKIE)?.value;
  if (!token || token.length > 100) return null;
  try {
    await ensureSchema();
    const [a] = await db()<Account[]>`
      select a.id, a.phone, a.name, a.email, a.address from gr_sessions s join gr_accounts a on a.id = s.account_id
      where s.token_hash = ${sha(token)} and s.expires_at > now()`;
    return a ?? null;
  } catch {
    return null;
  }
}

export const newAccountId = () => randomUUID();

/** A short password the shop can give a customer who forgot theirs (no 0/O or 1/l to misread). */
export const tempPassword = () => [...randomBytes(8)].map((b) => "abcdefghjkmnpqrstuvwxyz23456789"[b % 31]).join("");
