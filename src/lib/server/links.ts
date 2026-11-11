import { cache } from "react";
import { headers } from "next/headers";
import { linksFor } from "@/lib/site";

/** The address this request came in on (as the browser sees it). */
export const requestHost = cache(async () => {
  const h = await headers();
  return h.get("x-forwarded-host") ?? h.get("host") ?? "";
});

/** Store / verify / admin links for server components, right for the address being served. */
export const storeLinks = cache(async () => linksFor(await requestHost()));
