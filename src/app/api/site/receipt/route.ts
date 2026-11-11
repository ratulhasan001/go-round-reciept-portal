import { NextResponse } from "next/server";
import { dbEnabled, ensureSchema } from "@/lib/server/db";
import { findOrder, orderReceipt } from "@/lib/server/orders";

export const dynamic = "force-dynamic";

/** Public: the receipt of an approved order ({ code, phone }), for the customer to download as a PDF. */
export async function POST(req: Request) {
  if (!dbEnabled()) return NextResponse.json({ error: "offline" }, { status: 503 });
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  try {
    await ensureSchema();
    const order = await findOrder(String(body?.code ?? ""), String(body?.phone ?? ""));
    if (!order) return NextResponse.json({ error: "missing" }, { status: 404 });
    const receipt = await orderReceipt(order);
    if (!receipt) return NextResponse.json({ error: "not ready" }, { status: 409 });
    return NextResponse.json(receipt, { headers: { "cache-control": "no-store" } });
  } catch (e) {
    console.error("POST /api/site/receipt failed", e);
    return NextResponse.json({ error: "unavailable" }, { status: 503 });
  }
}
