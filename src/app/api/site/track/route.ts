import { NextResponse } from "next/server";
import { dbEnabled, ensureSchema } from "@/lib/server/db";
import { findOrder, findOrderByTrx, findOrdersByPhone, orderView } from "@/lib/server/orders";

export const dynamic = "force-dynamic";

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Public order status:
 *   { phone }        → { orders }: every order placed with that mobile number (the Order status page)
 *   { code, phone }  → { order }: one order (links in WhatsApp updates, and refreshing an open order)
 *   { trxId }        → { order }: the order paid with that transaction id (older links)
 */
export async function POST(req: Request) {
  if (!dbEnabled()) return NextResponse.json({ error: "offline" }, { status: 503 });
  const body = await req.json().catch(() => null);
  try {
    await ensureSchema();
    if (body?.phone && !body?.code && !body?.trxId) {
      const orders = await findOrdersByPhone(String(body.phone));
      if (!orders.length) {
        await wait(500); // slows down guessing
        return NextResponse.json({ error: "missing" }, { status: 404 });
      }
      return NextResponse.json({ orders: orders.map(orderView) });
    }
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
