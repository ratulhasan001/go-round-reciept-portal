import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { SESSION_COOKIE, isAuthed } from "@/lib/server/auth";
import { db, dbEnabled, ensureSchema } from "@/lib/server/db";

export const dynamic = "force-dynamic";

const TYPES = ["image/webp", "image/jpeg", "image/png"];
const MAX = 3 * 1024 * 1024;

/**
 * Admin: uploads one product photo in two sizes (the browser resizes it first), as form fields "full" and "thumb".
 * Returns { url } - the thumbnail is the same address with "-t" on the end.
 */
export async function POST(req: Request) {
  if (!isAuthed((await cookies()).get(SESSION_COOKIE)?.value)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!dbEnabled()) return NextResponse.json({ error: "no database" }, { status: 503 });
  const form = await req.formData().catch(() => null);
  const full = form?.get("full");
  const small = form?.get("thumb");
  if (!(full instanceof Blob) || !(small instanceof Blob)) return NextResponse.json({ error: "bad request" }, { status: 400 });
  if (![full, small].every((b) => TYPES.includes(b.type) && b.size > 0 && b.size <= MAX)) return NextResponse.json({ error: "Use a JPG, PNG or WebP photo under 3 MB." }, { status: 415 });
  try {
    await ensureSchema();
    const id = randomBytes(12).toString("base64url");
    const [a, b] = await Promise.all([full.arrayBuffer(), small.arrayBuffer()]);
    await db()`insert into gr_images (id, mime, bytes) values (${id}, ${full.type}, ${Buffer.from(a)}), (${id + "-t"}, ${small.type}, ${Buffer.from(b)})`;
    return NextResponse.json({ url: `/api/img/${id}` });
  } catch (e) {
    console.error("POST /api/images failed", e);
    return NextResponse.json({ error: "database unavailable" }, { status: 503 });
  }
}

/** Admin: removes a photo (both sizes). ?url=/api/img/<id> */
export async function DELETE(req: Request) {
  if (!isAuthed((await cookies()).get(SESSION_COOKIE)?.value)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!dbEnabled()) return NextResponse.json({ error: "no database" }, { status: 503 });
  const id = new URL(req.url).searchParams.get("url")?.match(/^\/api\/img\/([A-Za-z0-9_-]{8,80})$/)?.[1];
  if (!id) return NextResponse.json({ error: "bad request" }, { status: 400 });
  try {
    await db()`delete from gr_images where id = ${id} or id = ${id + "-t"}`;
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("DELETE /api/images failed", e);
    return NextResponse.json({ error: "database unavailable" }, { status: 503 });
  }
}
