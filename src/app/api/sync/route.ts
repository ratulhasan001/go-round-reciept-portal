import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { SESSION_COOKIE, isAuthed } from "@/lib/server/auth";
import { KINDS, type Kind, db, dbEnabled, ensureSchema } from "@/lib/server/db";

export const dynamic = "force-dynamic";

interface Change {
  kind: Kind;
  id: string;
  data: Record<string, unknown> | null; // null = delete
}

const valid = (c: unknown): c is Change => {
  const x = c as Change;
  return !!x && KINDS.includes(x.kind) && typeof x.id === "string" && x.id.length > 0 && x.id.length <= 100 && (x.data === null || typeof x.data === "object");
};

/** Saves a batch of changes (upserts and deletes) from the browser. */
export async function POST(req: Request) {
  if (!isAuthed((await cookies()).get(SESSION_COOKIE)?.value)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!dbEnabled()) return NextResponse.json({ error: "no database" }, { status: 503 });

  let changes: unknown;
  try {
    changes = (await req.json())?.changes;
  } catch {
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  }
  if (!Array.isArray(changes) || changes.length > 5000 || !changes.every(valid)) return NextResponse.json({ error: "bad request" }, { status: 400 });

  try {
    await ensureSchema();
    const sql = db();
    await sql.begin(async (tx) => {
      for (const c of changes as Change[]) {
        if (c.data === null) await tx`delete from gr_docs where kind = ${c.kind} and id = ${c.id}`;
        else
          await tx`
            insert into gr_docs (kind, id, data) values (${c.kind}, ${c.id}, ${tx.json(c.data as never)})
            on conflict (kind, id) do update set data = excluded.data, updated_at = now()`;
      }
    });
    return NextResponse.json({ ok: true, saved: (changes as Change[]).length });
  } catch (e) {
    console.error("POST /api/sync failed", e);
    return NextResponse.json({ error: "database unavailable" }, { status: 503 });
  }
}
