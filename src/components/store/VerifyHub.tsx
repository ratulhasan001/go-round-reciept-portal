"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { IdCard, ReceiptText, ScanLine } from "lucide-react";
import { TrackView } from "./TrackView";
import { useShop } from "./StoreContext";
import { Panel, SeaField, SeaInput, btn, cx } from "./ui";

/** verify.goroundbd.com: check a purchase / order (by mobile number) or a staff member (by the code on their card). */
export function VerifyHub() {
  const { links, shop } = useShop();
  const router = useRouter();
  const [tab, setTab] = useState<"order" | "staff">("order");
  const [code, setCode] = useState("");
  const clean = code.trim().toLowerCase().replace(/^.*\//, ""); // a pasted QR link works too

  return (
    <div>
      <div className="mx-auto mb-6 grid max-w-lg grid-cols-2 rounded-full bg-sea-sand/70 p-1" role="tablist" aria-label="What to verify">
        {(
          [
            ["order", "Purchase or order", <ReceiptText key="o" className="size-4" />],
            ["staff", "Staff member", <IdCard key="s" className="size-4" />],
          ] as const
        ).map(([key, label, icon]) => (
          <button
            key={key}
            role="tab"
            aria-selected={tab === key}
            onClick={() => setTab(key)}
            className={cx("flex h-11 items-center justify-center gap-2 rounded-full text-[14px] font-bold transition", tab === key ? "bg-white text-sea-ink shadow-sm" : "text-sea-muted")}
          >
            {icon} {label}
          </button>
        ))}
      </div>

      {tab === "order" ? (
        <TrackView />
      ) : (
        <Panel className="mx-auto max-w-lg">
          <div className="flex items-start gap-3 rounded-2xl bg-sea-teal-soft p-4 text-[14px] leading-relaxed text-sea-body">
            <ScanLine className="mt-0.5 size-5 shrink-0 text-sea-teal" />
            <p>
              Every {shop.name} staff member carries an ID card with a QR code. <b>Scan it with your phone camera</b> - it opens their verification page right away.
            </p>
          </div>
          <form
            className="mt-5 grid gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              if (clean.length >= 6) router.push(links.staff(clean));
            }}
          >
            <SeaField label="Or type the code under the QR" htmlFor="v-staff">
              <SeaInput id="v-staff" value={code} onChange={(e) => setCode(e.target.value)} placeholder="e.g. xwtzpxw8gy4f" autoCapitalize="none" autoComplete="off" spellCheck={false} className="text-center font-mono text-[17px] tracking-[0.1em]" />
            </SeaField>
            <button type="submit" disabled={clean.length < 6} className={btn("primary", "lg", "w-full")}>
              Verify staff member
            </button>
          </form>
        </Panel>
      )}
    </div>
  );
}
