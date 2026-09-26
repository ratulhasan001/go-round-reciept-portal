import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { SESSION_COOKIE, isAuthed } from "@/lib/server/auth";
import { dbEnabled } from "@/lib/server/db";
import { createForm, formStatus, revokeForm, validToken } from "@/lib/server/forms";

export const dynamic = "force-dynamic";

/** Owner-only: every call here needs the shop session (the proxy checks too). */
async function guard() {
  if (!isAuthed((await cookies()).get(SESSION_COOKIE)?.value)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!dbEnabled()) return NextResponse.json({ error: "no database" }, { status: 503 });
  return null;
}

/** Creates a new customer-form link. */
export async function POST() {
  const denied = await guard();
  if (denied) return denied;
  try {
    return NextResponse.json(await createForm());
  } catch (e) {
    console.error("POST /api/forms failed", e);
    return NextResponse.json({ error: "database unavailable" }, { status: 503 });
  }
}

/** Where a link stands: ?token=… → active / used (with the customer's name) / expired / missing. */
export async function GET(req: Request) {
  const denied = await guard();
  if (denied) return denied;
  const token = new URL(req.url).searchParams.get("token");
  if (!validToken(token)) return NextResponse.json({ state: "missing" });
  try {
    return NextResponse.json(await formStatus(token));
  } catch (e) {
    console.error("GET /api/forms failed", e);
    return NextResponse.json({ error: "database unavailable" }, { status: 503 });
  }
}

/** Cancels a link before it is used. */
export async function DELETE(req: Request) {
  const denied = await guard();
  if (denied) return denied;
  const token = new URL(req.url).searchParams.get("token");
  if (!validToken(token)) return NextResponse.json({ error: "bad request" }, { status: 400 });
  try {
    await revokeForm(token);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("DELETE /api/forms failed", e);
    return NextResponse.json({ error: "database unavailable" }, { status: 503 });
  }
}
