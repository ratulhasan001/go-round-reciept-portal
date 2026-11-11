"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CloudOff, Search, ShoppingBag, X } from "lucide-react";
import { useStore } from "@/lib/store";
import { tk } from "@/lib/site";
import type { Order, OrderStatus } from "@/lib/types";
import { SectionIcon, VisitStore } from "@/components/nav";
import { Card, Input, cx } from "@/components/ui";
import { OrderPanel } from "@/components/orders/OrderPanel";
import { PayChip, StatusChip, itemSummary, timeAgo } from "@/components/orders/shared";

const TABS: { key: OrderStatus | "all"; label: string }[] = [
  { key: "placed", label: "To approve" },
  { key: "confirmed", label: "To ship" },
  { key: "shipped", label: "Shipped" },
  { key: "delivered", label: "Delivered" },
  { key: "cancelled", label: "Cancelled" },
  { key: "all", label: "All" },
];

const norm = (s: string) => s.toLowerCase().replace(/\s+/g, "");

export default function OrdersPage() {
  const { orders, saveOrder, mode, ready } = useStore();
  const [picked, setPicked] = useState<OrderStatus | "all" | null>(null);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<string | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  // the clock for "5 min ago", read after mount (so the server render matches) and every minute after
  const [now, setNow] = useState(0);
  useEffect(() => {
    const tick = () => setNow(Date.now());
    const first = setTimeout(tick, 0);
    const id = setInterval(tick, 60_000);
    return () => {
      clearTimeout(first);
      clearInterval(id);
    };
  }, []);

  const counts = useMemo(() => {
    const m: Record<string, number> = { all: orders.length };
    for (const o of orders) m[o.status] = (m[o.status] ?? 0) + 1;
    return m;
  }, [orders]);
  // until a tab is picked: new orders if there are any, otherwise everything
  const tab = picked ?? (counts.placed ? "placed" : "all");

  const list = useMemo(() => {
    const term = norm(q);
    const digits = q.replace(/\D/g, "");
    return orders
      .filter((o) => tab === "all" || o.status === tab)
      .filter(
        (o) =>
          !term ||
          norm(o.code).includes(term) ||
          norm(o.customer.name).includes(term) ||
          (digits.length >= 3 && o.customer.phone.replace(/\D/g, "").includes(digits)) ||
          norm(o.payment.trxId ?? "").includes(term),
      )
      .sort((a, b) => b.createdAt - a.createdAt);
  }, [orders, tab, q]);

  // opening an order marks it as seen
  const openOrder = (o: Order) => {
    setOpen(o.id);
    if (!o.seen) saveOrder({ ...o, seen: true });
  };

  // "/" jumps to search, like the other lists
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "/" || (e.target as HTMLElement).closest("input, textarea, select")) return;
      e.preventDefault();
      searchRef.current?.focus();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="animate-fade-up">
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <SectionIcon section="orders" className="size-11 rounded-2xl bg-deep text-lime shadow-lg shadow-deep/20" />
        <div className="mr-auto min-w-0">
          <h1 className="font-display text-2xl font-extrabold sm:text-3xl">Orders</h1>
          <p className="text-sm text-muted">Orders from your website. Open one to check the payment, ship it and make the receipt.</p>
        </div>
        <VisitStore tone="light" />
      </div>

      {ready && mode !== "cloud" && (
        <Card className="mb-5 flex items-start gap-3 border-amber-200 bg-amber-50/60 p-4 text-[13.5px] text-amber-800">
          <CloudOff className="mt-0.5 size-4 shrink-0" />
          <p>Website orders need the cloud database. This copy of the app is saving on this device only, so customers can browse the store but can&apos;t place orders yet.</p>
        </Card>
      )}

      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:px-0 lg:pb-0 [&::-webkit-scrollbar]:hidden" role="tablist">
          {TABS.map((t) => {
            const on = tab === t.key;
            const n = counts[t.key] ?? 0;
            return (
              <button
                key={t.key}
                type="button"
                role="tab"
                aria-selected={on}
                onClick={() => setPicked(t.key)}
                className={cx(
                  "flex h-9 shrink-0 items-center gap-2 rounded-full border px-3.5 text-[13px] font-semibold transition active:scale-95",
                  on ? "border-deep bg-deep text-white" : "border-line bg-white text-body hover:border-faint",
                )}
              >
                {t.label}
                <span className={cx("rounded-full px-1.5 text-[11px] font-bold tabular-nums", on ? "bg-lime text-deep" : t.key === "placed" && n ? "bg-lime/25 text-brand" : "bg-canvas text-muted")}>{n}</span>
              </button>
            );
          })}
        </div>
        <div className="relative lg:ml-auto lg:w-80">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-faint" />
          <Input ref={searchRef} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search code, name, phone or TrxID" className="pl-9 pr-9" aria-label="Search orders" />
          {q && (
            <button type="button" onClick={() => setQ("")} className="absolute right-2 top-1/2 grid size-7 -translate-y-1/2 place-items-center rounded-lg text-muted hover:bg-canvas" aria-label="Clear search">
              <X className="size-4" />
            </button>
          )}
        </div>
      </div>

      {list.length === 0 ? (
        <Card className="grid place-items-center px-6 py-16 text-center">
          <div className="grid size-14 place-items-center rounded-2xl bg-soft text-brand">
            <ShoppingBag className="size-6" />
          </div>
          {orders.length === 0 ? (
            <>
              <h2 className="mt-4 text-lg font-bold">No website orders yet</h2>
              <p className="mt-1 max-w-sm text-[13.5px] text-muted">When customers order on your website, their orders appear here - with their payment details, ready to confirm and ship.</p>
              <VisitStore tone="light" className="mt-5" />
            </>
          ) : (
            <>
              <h2 className="mt-4 text-lg font-bold">Nothing here</h2>
              <p className="mt-1 text-[13.5px] text-muted">{q ? "No orders match your search." : "No orders with this status."}</p>
            </>
          )}
        </Card>
      ) : (
        <ul className="grid gap-2.5 xl:grid-cols-2">
          {list.map((o) => (
            <li key={o.id}>
              <button
                type="button"
                onClick={() => openOrder(o)}
                className={cx(
                  "group flex w-full flex-col gap-2 rounded-2xl border bg-white p-4 text-left shadow-[0_1px_2px_rgba(20,32,26,0.04)] transition hover:-translate-y-0.5 hover:border-faint hover:shadow-lg hover:shadow-deep/5 active:scale-[0.995]",
                  !o.seen && o.status !== "cancelled" ? "border-lime" : "border-line",
                )}
              >
                <div className="flex items-center gap-2">
                  {!o.seen && o.status !== "cancelled" && (
                    <span className="relative flex size-2.5" aria-label="New">
                      <span className="absolute inline-flex size-full animate-ping rounded-full bg-lime opacity-70" />
                      <span className="relative inline-flex size-2.5 rounded-full bg-brand" />
                    </span>
                  )}
                  <span className="font-mono text-[14px] font-extrabold tracking-wide text-ink">{o.code}</span>
                  <span className="text-[12px] text-muted">{now ? timeAgo(o.createdAt, now) : ""}</span>
                  <span className="ml-auto font-amount text-[16px]">{tk(o.total)}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <p className="min-w-0 truncate text-[14px] font-semibold text-body">
                    {o.customer.name} <span className="font-normal text-muted">· {o.customer.phone}</span>
                  </p>
                </div>
                <p className="line-clamp-1 text-[13px] text-muted">{itemSummary(o)}</p>
                <div className="flex flex-wrap items-center gap-1.5">
                  <StatusChip status={o.status} />
                  <PayChip order={o} />
                  {o.payment.trxId && !o.payment.verified && <span className="font-mono text-[12px] text-muted">{o.payment.trxId}</span>}
                  {o.invoiceNumber && <span className="ml-auto rounded-full bg-canvas px-2 py-0.5 text-[11.5px] font-bold text-body">{o.invoiceNumber}</span>}
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}

      <OrderPanel id={open} onClose={() => setOpen(null)} />
    </div>
  );
}
