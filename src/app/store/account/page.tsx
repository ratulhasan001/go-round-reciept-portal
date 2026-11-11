import { Suspense } from "react";
import type { Metadata } from "next";
import { AccountView } from "@/components/store/AccountView";
import { PageHead } from "@/components/store/ui";

export const metadata: Metadata = { title: "My account" };

export default function AccountPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 pt-10 sm:px-6 sm:pt-14">
      <PageHead eyebrow="Account" title={<>My <em>account</em></>} />
      <Suspense>
        <AccountView />
      </Suspense>
    </div>
  );
}
