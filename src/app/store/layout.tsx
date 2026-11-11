import type { Metadata, Viewport } from "next";
import { preload } from "react-dom";
import { loadCatalog } from "@/lib/server/catalog";
import { requestHost, storeLinks } from "@/lib/server/links";
import { StoreProvider } from "@/components/store/StoreContext";
import { Header } from "@/components/store/Header";
import { Footer } from "@/components/store/Footer";
import { Floating } from "@/components/store/Floating";

export async function generateMetadata(): Promise<Metadata> {
  const { shop } = await loadCatalog();
  // as on the visiting card: "Importer & supplier of aquarium plants & accessories"
  const title = `${shop.name} · Importer & Supplier of Aquarium Plants & Accessories`;
  const description = `${shop.tagline}. Importer and supplier of aquarium plants, fertilisers and accessories in Bangladesh - order online, pay with bKash or bank transfer.`;
  return {
    title: { default: title, template: `%s · ${shop.name}` },
    description,
    applicationName: shop.name,
    openGraph: { siteName: shop.name, type: "website", title, description },
  };
}

export const viewport: Viewport = { themeColor: "#f3efe6" };

/** The customer website. Public: no shop login, and it never loads the admin panel's data. */
export default async function StoreLayout({ children }: LayoutProps<"/store">) {
  // the card's serif, fetched with the page so headings and the logo never flash a fallback font on slow mobile data
  for (const f of ["Fraunces-400", "Fraunces-600", "Fraunces-Italic"]) preload(`/fonts/${f}.woff2`, { as: "font", type: "font/woff2", crossOrigin: "anonymous" });
  const [{ shop, online }, host, links] = await Promise.all([loadCatalog(), requestHost(), storeLinks()]);
  return (
    <StoreProvider shop={shop} online={online} host={host}>
      <div className="store-root flex min-h-dvh flex-col">
        <Header />
        <main className="flex-1">{children}</main>
        <Footer shop={shop} links={links} />
        <Floating />
      </div>
    </StoreProvider>
  );
}
