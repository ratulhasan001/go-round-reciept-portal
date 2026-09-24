import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { SESSION_COOKIE, authEnabled, isAuthed } from "@/lib/server/auth";
import { db, dbEnabled, ensureSchema } from "@/lib/server/db";

export const dynamic = "force-dynamic";

/** All shop data in one go: settings, products, customers and receipts. */
export async function GET() {
  if (!isAuthed((await cookies()).get(SESSION_COOKIE)?.value)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!dbEnabled()) return NextResponse.json({ db: false, auth: authEnabled() });
  try {
    await ensureSchema();
    const rows = await db()<{ kind: string; data: unknown }[]>`select kind, data from gr_docs order by updated_at`;
    const pick = (k: string) => rows.filter((r) => r.kind === k).map((r) => r.data);
    return NextResponse.json({
      db: true,
      auth: authEnabled(),
      shop: pick("shop")[0] ?? null,
      products: pick("product"),
      customers: pick("customer"),
      invoices: pick("invoice"),
    });
  } catch (e) {
    console.error("GET /api/data failed", e);
    return NextResponse.json({ error: "database unavailable" }, { status: 503 });
  }
}
