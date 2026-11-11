import { NextResponse } from "next/server";
import { currentAccount, startSession, hashPassword, newAccountId } from "@/lib/server/accounts";
import { db, dbEnabled, ensureSchema } from "@/lib/server/db";
import { OrderError, orderView, placeOrder } from "@/lib/server/orders";
import { phoneKey } from "@/lib/phone";

export const dynamic = "force-dynamic";

/** Public: places an order from the website checkout (as a guest, logged in, or creating an account on the way). */
export async function POST(req: Request) {
  if (!dbEnabled()) return NextResponse.json({ error: "offline", message: "Online ordering isn't switched on yet. Please order on WhatsApp." }, { status: 503 });
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  }
  if (body.website) return NextResponse.json({ error: "bad request" }, { status: 400 }); // bots fill the hidden field

  try {
    await ensureSchema();
    const account = await currentAccount();
    const password = typeof body.password === "string" ? body.password : "";
    if (!account && password) {
      if (password.length < 6) throw new OrderError(422, { error: "invalid", fields: { password: "Use at least 6 characters." } });
      const key = phoneKey(String(body.phone ?? ""));
      const [taken] = await db()`select 1 from gr_accounts where phone_key = ${key}`;
      if (taken) throw new OrderError(422, { error: "invalid", fields: { password: "This number already has an account - log in instead, or untick “Create an account”." } });
    }
    const order = await placeOrder(body, account?.id ?? null);
    if (!account && password) {
      // the order is in; now make the account it belongs to
      const id = newAccountId();
      await db()`
        insert into gr_accounts (id, phone_key, phone, name, email, address, pass_hash)
        values (${id}, ${phoneKey(order.customer.phone)}, ${order.customer.phone}, ${order.customer.name}, ${order.customer.email ?? ""}, ${order.customer.address}, ${await hashPassword(password)})
        on conflict (phone_key) do nothing`;
      const next = { ...order, accountId: id };
      await db()`update gr_docs set data = ${db().json(next as never)} where kind = 'order' and id = ${order.id}`;
      await startSession(id);
      return NextResponse.json({ ok: true, order: orderView(next), created: true });
    }
    return NextResponse.json({ ok: true, order: orderView(order), created: false });
  } catch (e) {
    if (e instanceof OrderError) return NextResponse.json(e.body, { status: e.status });
    console.error("POST /api/site/orders failed", e);
    return NextResponse.json({ error: "unavailable", message: "Something went wrong on our side. Please try again in a minute." }, { status: 503 });
  }
}
