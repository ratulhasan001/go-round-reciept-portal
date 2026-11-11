import type { Metadata, Viewport } from "next";
import { loadCatalog } from "@/lib/server/catalog";
import { requestHost, storeLinks } from "@/lib/server/links";
import { StoreProvider } from "@/components/store/StoreContext";
import { Header } from "@/components/store/Header";
import { Footer } from "@/components/store/Footer";
import { Floating } from "@/components/store/Floating";

export async function generateMetadata(): Promise<Metadata> {
  const { shop } = await loadCatalog();
  return {
    title: { default: `${shop.name} · Aquarium plants & accessories`, template: `%s · ${shop.name}` },
    description: `${shop.tagline}. Aquarium plants, fertilisers and accessories in Bangladesh - order online, pay with bKash or bank transfer.`,
    applicationName: shop.name,
    openGraph: { siteName: shop.name, type: "website" },
  };
}

export const viewport: Viewport = { themeColor: "#f3efe6" };

/** The customer website. Public: no shop login, and it never loads the admin panel's data. */
export default async function StoreLayout({ children }: LayoutProps<"/store">) {
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
