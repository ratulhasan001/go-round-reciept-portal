import { NextResponse } from "next/server";
import { db, dbEnabled, ensureSchema } from "@/lib/server/db";
import { lookupContact } from "@/lib/server/customers";

export const dynamic = "force-dynamic";

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Public: { phone } → the details saved for that mobile number, so a returning customer doesn't type them again
 * (checkout and "Create account"). A number with a website account only answers { account: true }.
 */
export async function POST(req: Request) {
  if (!dbEnabled()) return NextResponse.json({ error: "offline" }, { status: 503 });
  const body = await req.json().catch(() => null);
  try {
    await ensureSchema();
    const found = await lookupContact(db(), String(body?.phone ?? "").slice(0, 30));
    if (!found) {
      await wait(400); // slows down guessing
      return NextResponse.json({ error: "missing" }, { status: 404 });
    }
    return NextResponse.json(found);
  } catch (e) {
    console.error("POST /api/site/customer failed", e);
    return NextResponse.json({ error: "unavailable" }, { status: 503 });
  }
}
