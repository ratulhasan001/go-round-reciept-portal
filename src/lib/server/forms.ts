import { createHash, randomBytes } from "node:crypto";
import { db, ensureSchema } from "./db";

/** How long a customer-form link stays open. */
export const FORM_TTL_MINUTES = 30;

export type FormState = "active" | "used" | "expired" | "missing";
export interface FormStatus {
  state: FormState;
  expiresAt?: number; // ms
  msLeft?: number; // time until it expires, by the database clock
  customerName?: string;
}

export const newToken = () => randomBytes(18).toString("base64url");
export const validToken = (t: unknown): t is string => typeof t === "string" && /^[A-Za-z0-9_-]{16,64}$/.test(t);
/** The database only ever sees this hash, so a leaked table can't be turned back into working links. */
export const hashToken = (t: string) => createHash("sha256").update(t).digest("hex");

export async function createForm() {
  await ensureSchema();
  const sql = db();
  const token = newToken();
  const [row] = await sql<{ expires_at: Date }[]>`
    insert into gr_forms (token_hash, expires_at)
    values (${hashToken(token)}, now() + make_interval(mins => ${FORM_TTL_MINUTES}))
    returning expires_at`;
  // tidy up links that ended more than a day ago
  await sql`delete from gr_forms where expires_at < now() - interval '1 day'`;
  return { token, expiresAt: row!.expires_at.getTime() };
}

export async function formStatus(token: string): Promise<FormStatus> {
  await ensureSchema();
  const [row] = await db()<{ expires_at: Date; used_at: Date | null; customer_name: string | null; open: boolean; ms_left: number }[]>`
    select expires_at, used_at, customer_name, expires_at > now() as open,
           greatest(0, extract(epoch from expires_at - now()) * 1000)::float8 as ms_left
    from gr_forms where token_hash = ${hashToken(token)}`;
  if (!row) return { state: "missing" };
  const expiresAt = row.expires_at.getTime();
  if (row.used_at) return { state: "used", expiresAt, customerName: row.customer_name ?? undefined };
  return row.open ? { state: "active", expiresAt, msLeft: row.ms_left } : { state: "expired", expiresAt };
}

/** Ends a link early (the owner cancelled it). */
export async function revokeForm(token: string) {
  await revokeById(hashToken(token));
}

/** Link ids are the start of the token hash: enough to tell links apart, never enough to open one. */
export const validLinkId = (id: unknown): id is string => typeof id === "string" && /^[0-9a-f]{12,64}$/.test(id);

/** Ends a live link early, by its id. */
export async function revokeById(id: string) {
  await ensureSchema();
  await db()`
    update gr_forms set expires_at = now(), cancelled_at = now()
    where token_hash like ${id + "%"} and used_at is null and expires_at > now()`;
}

export interface LinkRow {
  id: string;
  state: "active" | "used" | "expired" | "cancelled";
  createdAt: number;
  endedAt: number | null; // when it was used, cancelled or ran out
  msLeft: number;
  customerName: string | null;
}

/** The most recent links, newest first, for the owner's overview. */
export async function listForms(limit = 25): Promise<LinkRow[]> {
  await ensureSchema();
  const rows = await db()<
    { token_hash: string; created_at: Date; expires_at: Date; used_at: Date | null; cancelled_at: Date | null; customer_name: string | null; open: boolean; ms_left: number }[]
  >`
    select token_hash, created_at, expires_at, used_at, cancelled_at, customer_name, expires_at > now() as open,
           greatest(0, extract(epoch from expires_at - now()) * 1000)::float8 as ms_left
    from gr_forms order by created_at desc limit ${limit}`;
  return rows.map((r) => ({
    id: r.token_hash.slice(0, 16),
    state: r.used_at ? "used" : r.cancelled_at ? "cancelled" : r.open ? "active" : "expired",
    createdAt: r.created_at.getTime(),
    endedAt: (r.used_at ?? r.cancelled_at ?? (r.open ? null : r.expires_at))?.getTime() ?? null,
    msLeft: r.open && !r.used_at ? r.ms_left : 0,
    customerName: r.customer_name,
  }));
}
