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
        intro="No account needed - type the transaction ID of your bKash or bank payment to see your order and download its receipt."
      />
      <Suspense>
        <TrackView />
      </Suspense>
    </div>
  );
}
