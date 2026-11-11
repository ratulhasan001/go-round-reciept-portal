import { Suspense } from "react";
import type { Metadata } from "next";
import { loadCatalog } from "@/lib/server/catalog";
import { ShopBrowser } from "@/components/store/ShopBrowser";
import { PageHead } from "@/components/store/ui";

export const metadata: Metadata = { title: "Shop", description: "Aquarium plants, fertilisers and accessories." };

export default async function ShopPage() {
  const { products } = await loadCatalog();
  return (
    <div className="mx-auto max-w-6xl px-4 pt-10 sm:px-6 sm:pt-14">
      <PageHead eyebrow="The shop" title={<>Everything for a <em>planted tank</em></>} />
      <Suspense>
        <ShopBrowser products={products} />
      </Suspense>
    </div>
  );
}
