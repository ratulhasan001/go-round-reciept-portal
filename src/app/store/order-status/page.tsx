import { Suspense } from "react";
import type { Metadata } from "next";
import { TrackView } from "@/components/store/TrackView";
import { PageHead } from "@/components/store/ui";

export const metadata: Metadata = { title: "Order status" };

export default function OrderStatusPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 pt-10 sm:px-6 sm:pt-14">
      <PageHead
        eyebrow="Order status"
        title={<>Where&apos;s my <em>order?</em></>}
        intro="No account needed - type the mobile number you ordered with to see your orders and download their receipts."
      />
      <Suspense>
        <TrackView />
      </Suspense>
    </div>
  );
}
