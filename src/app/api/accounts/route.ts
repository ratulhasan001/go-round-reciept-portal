import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { SESSION_COOKIE, isAuthed } from "@/lib/server/auth";
import { hashPassword, tempPassword } from "@/lib/server/accounts";
import { db, dbEnabled, ensureSchema } from "@/lib/server/db";

export const dynamic = "force-dynamic";

const authed = async () => isAuthed((await cookies()).get(SESSION_COOKIE)?.value);

/** Admin: customer accounts on the website (never their passwords). */
export async function GET() {
  if (!(await authed())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!dbEnabled()) return NextResponse.json({ accounts: [] });
  try {
    await ensureSchema();
    const accounts = await db()`
      select a.id, a.name, a.phone, a.email, a.address, a.created_at as "createdAt",
        (select count(*)::int from gr_docs d where d.kind = 'order' and d.data->>'accountId' = a.id) as orders
      from gr_accounts a order by a.created_at desc limit 500`;
    return NextResponse.json({ accounts });
  } catch (e) {
    console.error("GET /api/accounts failed", e);
    return NextResponse.json({ error: "database unavailable" }, { status: 503 });
  }
}

/** Admin: { id, action: "reset" } gives the account a new temporary password (returned once), or { id, action: "delete" }. */
export async function POST(req: Request) {
  if (!(await authed())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!dbEnabled()) return NextResponse.json({ error: "no database" }, { status: 503 });
  const body = (await req.json().catch(() => null)) as { id?: string; action?: string } | null;
  if (!body?.id) return NextResponse.json({ error: "bad request" }, { status: 400 });
  try {
    await ensureSchema();
    if (body.action === "reset") {
      const password = tempPassword();
      const done = await db()`update gr_accounts set pass_hash = ${await hashPassword(password)} where id = ${body.id} returning id`;
      if (!done.length) return NextResponse.json({ error: "missing" }, { status: 404 });
      await db()`delete from gr_sessions where account_id = ${body.id}`; // log out everywhere
      return NextResponse.json({ password });
    }
    if (body.action === "delete") {
      await db()`delete from gr_accounts where id = ${body.id}`;
      return NextResponse.json({ ok: true });
    }
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  } catch (e) {
    console.error("POST /api/accounts failed", e);
    return NextResponse.json({ error: "database unavailable" }, { status: 503 });
  }
}
