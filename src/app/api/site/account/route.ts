import { NextResponse } from "next/server";
import { checkPassword, currentAccount, endSession, hashPassword, newAccountId, startSession } from "@/lib/server/accounts";
import { db, dbEnabled, ensureSchema } from "@/lib/server/db";
import { accountOrders, readContact } from "@/lib/server/orders";
import { phoneKey } from "@/lib/phone";

export const dynamic = "force-dynamic";

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
const bad = (fields: Record<string, string>) => NextResponse.json({ error: "invalid", fields }, { status: 422 });

/** Public: the logged-in customer and their orders (or { account: null }). */
export async function GET() {
  if (!dbEnabled()) return NextResponse.json({ account: null, offline: true });
  try {
    const account = await currentAccount();
    if (!account) return NextResponse.json({ account: null });
    return NextResponse.json({ account, orders: await accountOrders(account.id) });
  } catch (e) {
    console.error("GET /api/site/account failed", e);
    return NextResponse.json({ error: "unavailable" }, { status: 503 });
  }
}

/** Public: { action: "register" | "login" | "logout" | "update" | "password", ... } */
export async function POST(req: Request) {
  if (!dbEnabled()) return NextResponse.json({ error: "offline", message: "Accounts aren't available yet." }, { status: 503 });
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ error: "bad request" }, { status: 400 });
  const password = typeof body.password === "string" ? body.password : "";

  try {
    await ensureSchema();
    switch (body.action) {
      case "register": {
        const { name, phone, email, address, errors } = readContact(body);
        if (password.length < 6) errors.password = "Use at least 6 characters.";
        if (Object.keys(errors).length) return bad(errors);
        const id = newAccountId();
        const [row] = await db()<{ id: string }[]>`
          insert into gr_accounts (id, phone_key, phone, name, email, address, pass_hash)
          values (${id}, ${phoneKey(phone)}, ${phone}, ${name}, ${email}, ${address}, ${await hashPassword(password)})
          on conflict (phone_key) do nothing returning id`;
        if (!row) return bad({ phone: "This number already has an account. Log in instead." });
        await startSession(id);
        return NextResponse.json({ ok: true });
      }
      case "login": {
        const key = phoneKey(String(body.phone ?? ""));
        const [a] = await db()<{ id: string; pass_hash: string }[]>`select id, pass_hash from gr_accounts where phone_key = ${key}`;
        if (!a || !(await checkPassword(password, a.pass_hash))) {
          await wait(600); // slow down guessing
          return bad({ password: "Wrong phone number or password." });
        }
        await startSession(a.id);
        return NextResponse.json({ ok: true });
      }
      case "logout":
        await endSession();
        return NextResponse.json({ ok: true });
      case "update": {
        const me = await currentAccount();
        if (!me) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
        const { name, phone, email, address, errors } = readContact(body);
        if (Object.keys(errors).length) return bad(errors);
        const [clash] = await db()`select 1 from gr_accounts where phone_key = ${phoneKey(phone)} and id <> ${me.id}`;
        if (clash) return bad({ phone: "Another account uses this number." });
        await db()`update gr_accounts set name = ${name}, phone = ${phone}, phone_key = ${phoneKey(phone)}, email = ${email}, address = ${address} where id = ${me.id}`;
        return NextResponse.json({ ok: true });
      }
      case "password": {
        const me = await currentAccount();
        if (!me) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
        const next = typeof body.next === "string" ? body.next : "";
        const [a] = await db()<{ pass_hash: string }[]>`select pass_hash from gr_accounts where id = ${me.id}`;
        if (!a || !(await checkPassword(password, a.pass_hash))) return bad({ password: "Your current password is wrong." });
        if (next.length < 6) return bad({ next: "Use at least 6 characters." });
        await db()`update gr_accounts set pass_hash = ${await hashPassword(next)} where id = ${me.id}`;
        return NextResponse.json({ ok: true });
      }
      default:
        return NextResponse.json({ error: "bad request" }, { status: 400 });
    }
  } catch (e) {
    console.error("POST /api/site/account failed", e);
    return NextResponse.json({ error: "unavailable", message: "Something went wrong on our side. Please try again." }, { status: 503 });
  }
}
