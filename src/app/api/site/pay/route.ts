import { NextResponse } from "next/server";
import { dbEnabled, ensureSchema } from "@/lib/server/db";
import { OrderError, addPayment, findOrder, orderView } from "@/lib/server/orders";

export const dynamic = "force-dynamic";

/** Public: the customer adds (or corrects) the bKash / bank transfer details of an order they already placed. */
export async function POST(req: Request) {
  if (!dbEnabled()) return NextResponse.json({ error: "offline" }, { status: 503 });
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ error: "bad request" }, { status: 400 });
  try {
    await ensureSchema();
    const order = await findOrder(String(body.code ?? ""), String(body.phone ?? ""));
    if (!order) return NextResponse.json({ error: "missing" }, { status: 404 });
    return NextResponse.json({ order: orderView(await addPayment(order, body)) });
  } catch (e) {
    if (e instanceof OrderError) return NextResponse.json(e.body, { status: e.status });
    console.error("POST /api/site/pay failed", e);
    return NextResponse.json({ error: "unavailable" }, { status: 503 });
  }
}
