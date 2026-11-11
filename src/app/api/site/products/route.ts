import { NextResponse } from "next/server";
import { loadProducts } from "@/lib/server/catalog";

export const dynamic = "force-dynamic";

/** Public: current prices and stock, so the cart can catch up with changes made since items were added. */
export async function GET() {
  try {
    return NextResponse.json({ products: await loadProducts() });
  } catch (e) {
    console.error("GET /api/site/products failed", e);
    return NextResponse.json({ error: "unavailable" }, { status: 503 });
  }
}
