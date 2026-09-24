import { Suspense } from "react";
import Editor from "@/components/Editor";

export const metadata = { title: "New receipt · Go Round" };

export default function NewReceiptPage() {
  return (
    <Suspense fallback={<div className="grid h-[60vh] place-items-center text-muted">Loading…</div>}>
      <Editor />
    </Suspense>
  );
}
