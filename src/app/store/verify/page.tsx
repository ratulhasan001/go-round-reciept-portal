import { Suspense } from "react";
import type { Metadata } from "next";
import { loadCatalog } from "@/lib/server/catalog";
import { VerifyHub } from "@/components/store/VerifyHub";
import { PageHead } from "@/components/store/ui";

export const metadata: Metadata = { title: "Verify", description: "Check a purchase, an order's status or a staff member." };

/** verify.goroundbd.com (or /store/verify on a dev address). */
export default async function VerifyPage() {
  const { shop } = await loadCatalog();
  return (
    <div className="mx-auto max-w-6xl px-4 pt-10 sm:px-6 sm:pt-14">
      <PageHead
        center
        eyebrow={`${shop.name} · Verify`}
        title={<>Is it really <em>{shop.name}?</em></>}
        intro="Check a purchase or your order's status with the mobile number it was placed with - and download its receipt - or make sure someone really works for us."
      />
      <Suspense>
        <VerifyHub />
      </Suspense>
    </div>
  );
}
