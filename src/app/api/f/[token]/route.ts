import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { db, dbEnabled, ensureSchema } from "@/lib/server/db";
import { formStatus, hashToken, validToken } from "@/lib/server/forms";
import { clean, normPhone, phoneKey } from "@/lib/phone";

export const dynamic = "force-dynamic";

/**
 * Public: a customer submits the form behind a link. The link is claimed and the customer saved in one
 * transaction, so a link can only ever be used once. The same phone number updates the saved customer
 * instead of adding a duplicate.
 */
export async function POST(req: Request, ctx: RouteContext<"/api/f/[token]">) {
  const { token } = await ctx.params;
  if (!dbEnabled() || !validToken(token)) return NextResponse.json({ error: "missing" }, { status: 404 });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  }
  const name = clean(body.name).slice(0, 80);
  const phone = normPhone(clean(body.phone).slice(0, 30));
  const address = clean(body.address).slice(0, 300);
  const digits = phoneKey(phone);
  const errors: Record<string, string> = {};
  if (name.length < 2) errors.name = "Please enter your full name.";
  if (digits.length < 6 || digits.length > 15) errors.phone = "Please enter a valid WhatsApp number.";
  if (address.length < 3) errors.address = "Please enter your address.";
  if (Object.keys(errors).length) return NextResponse.json({ error: "invalid", fields: errors }, { status: 422 });

  try {
    await ensureSchema();
    const saved = await db().begin(async (tx) => {
      const [claimed] = await tx`
        update gr_forms set used_at = now(), customer_name = ${name}
        where token_hash = ${hashToken(token)} and used_at is null and expires_at > now()
        returning token_hash`;
      if (!claimed) return false;

      const [match] = await tx<{ id: string; data: Record<string, unknown> }[]>`
        select id, data from gr_docs
        where kind = 'customer' and regexp_replace(coalesce(data->>'phone', ''), '\\D', '', 'g') = ${digits}
        order by updated_at desc limit 1`;
      const id = match?.id ?? randomUUID();
      const customer = { ...(match?.data ?? {}), id, name, phone, address, updatedAt: Date.now() };
      await tx`
        insert into gr_docs (kind, id, data) values ('customer', ${id}, ${tx.json(customer)})
        on conflict (kind, id) do update set data = excluded.data, updated_at = now()`;
      return true;
    });
    if (!saved) {
      const { state } = await formStatus(token);
      return NextResponse.json({ error: state === "active" ? "missing" : state }, { status: 410 });
    }
    return NextResponse.json({ ok: true, name });
  } catch (e) {
    console.error("POST /api/f/[token] failed", e);
    return NextResponse.json({ error: "unavailable" }, { status: 503 });
  }
}
