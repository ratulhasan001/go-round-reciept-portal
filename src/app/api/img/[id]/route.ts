import { db, dbEnabled, ensureSchema } from "@/lib/server/db";

export const dynamic = "force-dynamic";

/** Public: a product photo. Every upload gets a new id, so the address can be cached for good. */
export async function GET(_req: Request, ctx: RouteContext<"/api/img/[id]">) {
  const { id } = await ctx.params;
  if (!dbEnabled() || !/^[A-Za-z0-9_-]{8,80}$/.test(id)) return new Response(null, { status: 404 });
  try {
    await ensureSchema();
    const [img] = await db()<{ mime: string; bytes: Buffer }[]>`select mime, bytes from gr_images where id = ${id}`;
    if (!img) return new Response(null, { status: 404 });
    return new Response(new Uint8Array(img.bytes), {
      headers: {
        "content-type": img.mime,
        "cache-control": "public, max-age=31536000, immutable",
        "x-content-type-options": "nosniff",
      },
    });
  } catch (e) {
    console.error("GET /api/img failed", e);
    return new Response(null, { status: 503 });
  }
}
