import { db, dbEnabled, ensureSchema } from "@/lib/server/db";
import { logoImage } from "@/lib/server/logo";

export const dynamic = "force-dynamic";

/** Public: the shop logo shown on the customer form (it's printed on every receipt anyway). */
export async function GET() {
  if (!dbEnabled()) return new Response(null, { status: 404 });
  try {
    await ensureSchema();
    const [row] = await db()<{ logo: string | null }[]>`select data->>'logo' as logo from gr_docs where kind = 'shop' and id = 'shop'`;
    const img = logoImage(row?.logo ?? "");
    if (!img) return new Response(null, { status: 404 });
    return new Response(new Uint8Array(img.bytes), {
      headers: {
        "content-type": img.type,
        // the form links here with ?v=<hash of the logo>, so a new logo gets a new address
        "cache-control": "public, max-age=31536000, immutable",
        "x-content-type-options": "nosniff",
      },
    });
  } catch (e) {
    console.error("GET /api/shop-logo failed", e);
    return new Response(null, { status: 503 });
  }
}
