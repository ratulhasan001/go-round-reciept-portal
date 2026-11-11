"use client";

import { ORDER_LABEL, PAY_LABEL, absolute, payState, publicLinks, siteSettings, tk } from "@/lib/site";
import type { Order, OrderStatus, Shop } from "@/lib/types";
import { cx } from "../ui";

export const STATUS_TONE: Record<OrderStatus, string> = {
  placed: "bg-amber-50 text-amber-700 ring-amber-600/20",
  confirmed: "bg-aqua-soft text-aqua-deep ring-aqua-deep/20",
  shipped: "bg-violet-50 text-violet-700 ring-violet-600/20",
  delivered: "bg-lime/15 text-brand ring-brand/20",
  cancelled: "bg-canvas text-muted ring-line",
};

const PAY_TONE = {
  awaiting: "bg-red-50 text-red-700 ring-red-600/20",
  submitted: "bg-amber-50 text-amber-700 ring-amber-600/20",
  rejected: "bg-red-50 text-red-700 ring-red-600/20",
  verified: "bg-lime/15 text-brand ring-brand/20",
} as const;

export function StatusChip({ status, className }: { status: OrderStatus; className?: string }) {
  return (
    <span className={cx("inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-[12px] font-bold ring-1 ring-inset", STATUS_TONE[status], className)}>
      <span className="size-1.5 rounded-full bg-current" />
      {status === "placed" ? "To approve" : ORDER_LABEL[status]}
    </span>
  );
}

export function PayChip({ order, className }: { order: Order; className?: string }) {
  const s = payState(order);
  const label = { awaiting: "Unpaid", submitted: `${order.payment.method} sent · approve`, rejected: "Payment not found", verified: "Approved" }[s];
  return (
    <span
      title={PAY_LABEL[s]}
      className={cx("inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-[12px] font-bold ring-1 ring-inset", PAY_TONE[s], className)}
    >
      {label}
    </span>
  );
}

export function timeAgo(ms: number, now: number) {
  const s = Math.max(0, Math.round((now - ms) / 1000));
  if (s < 60) return "just now";
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} h ago`;
  const d = Math.round(h / 24);
  if (d < 7) return `${d} day${d === 1 ? "" : "s"} ago`;
  return new Date(ms).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export const itemSummary = (o: Order) => o.items.map((i) => `${i.qty} × ${i.name}`).join(", ");

/** How to pay, as a few lines for a WhatsApp message. */
export function payInstructions(o: Order, shop: Shop) {
  const s = siteSettings(shop);
  if (o.payment.method === "bKash")
    return [`Please send ${tk(o.total)} by bKash (${s.bkash.type === "Personal" ? "Send Money" : "Payment"}) to *${s.bkash.number}* and reply with the transaction ID.`];
  const b = s.bank;
  if (!b.accountNumber.trim()) return [`Please reply here and we'll send our bank details for the ${tk(o.total)} transfer.`];
  return [
    `Please transfer ${tk(o.total)} to:`,
    ...[b.bank && `Bank: ${b.bank}`, b.accountName && `Account name: ${b.accountName}`, `Account no: ${b.accountNumber}`, b.branch && `Branch: ${b.branch}`, b.routing && `Routing: ${b.routing}`].filter(Boolean),
    `and reply with the transfer reference.`,
  ] as string[];
}

/** The verify page, where the customer checks the order (and gets the receipt) with their transaction id. */
export const trackUrl = (o: Order) => absolute(`${publicLinks(window.location.host).verify()}?code=${encodeURIComponent(o.code)}`, window.location.origin);

/** A ready-made WhatsApp update for the customer about where their order is. */
export function updateMessage(o: Order, shop: Shop) {
  const paid = !!o.payment.verified;
  const rejected = payState(o) === "rejected";
  const status: Record<OrderStatus, string> = {
    placed: paid
      ? "your payment is approved."
      : rejected
        ? `we couldn't find your payment${o.payment.trxId ? ` (transaction ID ${o.payment.trxId})` : ""}. Please check it and send it again on your order page.`
        : o.payment.trxId
          ? "we've received your order and are checking your payment."
          : "we've received your order.",
    confirmed: "your payment is approved and your order is being packed.",
    shipped: "your order is on its way.",
    delivered: "your order has been delivered. Thank you!",
    cancelled: "your order has been cancelled.",
  };
  const lines = [
    `Hello ${o.customer.name.split(" ")[0] || "there"},`,
    `${shop.name} order *${o.code}*: ${status[o.status]}`,
    ``,
    ...o.items.map((i) => `• ${i.qty} × ${i.name}`),
    `Total: *${tk(o.total)}*${paid ? " (paid)" : ""}`,
  ];
  if (!paid && o.status !== "cancelled" && (!o.payment.trxId || rejected)) lines.push(``, ...payInstructions(o, shop));
  if (paid && o.invoiceNumber && o.status !== "cancelled") lines.push(``, `Your receipt ${o.invoiceNumber} is ready - download it from your order page.`);
  if (o.tracking?.trim() && (o.status === "shipped" || o.status === "delivered")) lines.push(``, `Delivery / tracking: ${o.tracking.trim()}`);
  if (o.status !== "cancelled") lines.push(``, `Order status${o.payment.trxId ? ` (enter your transaction ID ${o.payment.trxId})` : ""}: ${trackUrl(o)}`);
  return lines.join("\n");
}
