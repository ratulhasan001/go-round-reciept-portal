import type { Metadata } from "next";
import { db, dbEnabled, ensureSchema } from "@/lib/server/db";
import { type FormStatus, formStatus, validToken } from "@/lib/server/forms";
import { DEFAULT_LOGO } from "@/lib/theme";
import { CustomerFormView } from "@/components/CustomerFormView";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Your details", robots: { index: false, follow: false } };

/** Public page behind a customer-form link: no login, just the one-time token in the URL. */
export default async function CustomerFormPage(props: PageProps<"/f/[token]">) {
  const { token } = await props.params;
  let status: FormStatus = { state: "missing" };
  let shop = { name: "Go Round", tagline: "", logo: DEFAULT_LOGO };

  if (dbEnabled() && validToken(token)) {
    try {
      await ensureSchema();
      status = await formStatus(token);
      const [row] = await db()<{ data: { name?: string; tagline?: string; logo?: string } }[]>`select data from gr_docs where kind = 'shop' and id = 'shop'`;
      if (row) shop = { name: row.data.name || shop.name, tagline: row.data.tagline ?? "", logo: row.data.logo ?? DEFAULT_LOGO };
    } catch (e) {
      console.error("customer form page failed", e);
    }
  }

  // time left comes from the database clock, so a wrong phone clock can't stretch or cut it
  return <CustomerFormView token={token} state={status.state} msLeft={status.msLeft ?? 0} shop={shop} />;
}
