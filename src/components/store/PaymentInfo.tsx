"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { prettyPhone, tk, waLink, type PublicShop } from "@/lib/site";
import type { OrderPayMethod } from "@/lib/types";
import { WhatsAppIcon } from "./Icons";

export function CopyText({ text, label }: { text: string; label?: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      onClick={() => {
        void navigator.clipboard?.writeText(text).then(() => {
          setDone(true);
          setTimeout(() => setDone(false), 1500);
        });
      }}
      className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-[12.5px] font-bold text-sea-ink ring-1 ring-sea-line transition hover:ring-sea-ink/30"
      aria-label={`Copy ${label ?? text}`}
    >
      {done ? <Check className="size-3.5 text-sea-leaf" /> : <Copy className="size-3.5" />}
      {done ? "Copied" : "Copy"}
    </button>
  );
}

function Row({ k, v, copy }: { k: string; v: string; copy?: boolean }) {
  if (!v) return null;
  return (
    <div className="flex items-center justify-between gap-3 py-2">
      <span className="text-[13px] font-semibold text-sea-muted">{k}</span>
      <span className="flex items-center gap-2 text-right text-[14.5px] font-extrabold">
        {v} {copy && <CopyText text={v.replace(/^\+880 /, "0").replace(/[-\s]/g, "")} label={k} />}
      </span>
    </div>
  );
}

/** How to pay: the shop's bKash number or bank account, and the amount. */
export function PaymentInfo({ shop, method, amount, code }: { shop: PublicShop; method: OrderPayMethod; amount: number; code?: string }) {
  const { bkash, bank, whatsapp } = shop.site;
  if (method === "bKash")
    return (
      <div className="rounded-2xl bg-[#fdf0f5] p-4 ring-1 ring-[#e2136e]/15">
        <p className="text-[13.5px] font-bold text-[#b0105a]">
          {bkash.type === "Merchant" ? "Make a payment" : bkash.type === "Agent" ? "Cash out" : "Send money"} with bKash
        </p>
        <div className="mt-1 divide-y divide-[#e2136e]/10">
          <Row k={`bKash (${bkash.type})`} v={prettyPhone(bkash.number)} copy />
          <Row k="Amount" v={tk(amount)} />
          {code && <Row k="Reference" v={code} copy />}
        </div>
        <p className="mt-2 text-[12.5px] leading-relaxed text-sea-body">After paying, type the transaction ID (TrxID) from the bKash message below.</p>
      </div>
    );
  const hasBank = bank.accountNumber.trim();
  return (
    <div className="rounded-2xl bg-sea-teal-soft p-4 ring-1 ring-sea-teal/15">
      <p className="text-[13.5px] font-bold text-sea-teal">Bank transfer</p>
      {hasBank ? (
        <>
          <div className="mt-1 divide-y divide-sea-teal/10">
            <Row k="Bank" v={bank.bank} />
            <Row k="Account name" v={bank.accountName} />
            <Row k="Account no." v={bank.accountNumber} copy />
            <Row k="Branch" v={bank.branch} />
            <Row k="Routing no." v={bank.routing} copy />
            <Row k="Amount" v={tk(amount)} />
            {code && <Row k="Reference" v={code} copy />}
          </div>
          <p className="mt-2 text-[12.5px] leading-relaxed text-sea-body">After the transfer, type the transaction / reference number below.</p>
        </>
      ) : (
        <p className="mt-2 text-[13.5px] leading-relaxed text-sea-body">
          Message us on WhatsApp for our bank details, then add the reference number to your order.{" "}
          <a href={waLink(whatsapp, `Hi! Please send me your bank details${code ? ` for order ${code}` : ""}.`)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-bold text-sea-ink underline underline-offset-4">
            <WhatsAppIcon className="size-4 text-wa" /> Ask on WhatsApp
          </a>
        </p>
      )}
    </div>
  );
}
