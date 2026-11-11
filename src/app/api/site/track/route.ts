import { NextResponse } from "next/server";
import { dbEnabled, ensureSchema } from "@/lib/server/db";
import { findOrder, findOrderByTrx, orderView } from "@/lib/server/orders";

export const dynamic = "force-dynamic";

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Public: an order's status, for its payment's transaction id ({ trxId }), or its code plus the phone number it was placed with. */
export async function POST(req: Request) {
  if (!dbEnabled()) return NextResponse.json({ error: "offline" }, { status: 503 });
  const body = await req.json().catch(() => null);
  try {
    await ensureSchema();
    const order = body?.trxId ? await findOrderByTrx(String(body.trxId)) : await findOrder(String(body?.code ?? ""), String(body?.phone ?? ""));
    if (!order) {
      await wait(500); // slows down guessing
      return NextResponse.json({ error: "missing" }, { status: 404 });
    }
    return NextResponse.json({ order: orderView(order) });
  } catch (e) {
    console.error("POST /api/site/track failed", e);
    return NextResponse.json({ error: "unavailable" }, { status: 503 });
  }
}
