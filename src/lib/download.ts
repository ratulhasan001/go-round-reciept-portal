"use client";

import type { Invoice, Shop } from "./types";
import { bdt, computeTotals, fileBase, fmtDate } from "./calc";

export function saveBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

export async function downloadPdf(inv: Invoice, shop: Shop) {
  const { renderPdfBlob } = await import("./pdf");
  saveBlob(await renderPdfBlob(inv, shop), `${fileBase(inv)}.pdf`);
}

export async function downloadExcel(inv: Invoice, shop: Shop) {
  const { renderExcelBlob } = await import("./excel");
  saveBlob(await renderExcelBlob(inv, shop), `${fileBase(inv)}.xlsx`);
}

export async function downloadLedger(invoices: Invoice[], shop: Shop) {
  const { renderLedgerBlob } = await import("./ledger");
  saveBlob(await renderLedgerBlob(invoices, shop), `${shop.name.replace(/\W+/g, "_")}-receipts-${new Date().toISOString().slice(0, 10)}.xlsx`);
}

/** Opens the A4 PDF in a new tab so the browser's print dialog prints it exactly. */
export async function printPdf(inv: Invoice, shop: Shop) {
  const win = window.open("", "_blank");
  const { renderPdfBlob } = await import("./pdf");
  const url = URL.createObjectURL(await renderPdfBlob(inv, shop));
  if (win) win.location.href = url;
  else window.location.href = url;
}

/** True when the device can share files (most phones) - e.g. straight into WhatsApp. */
export const canShareFiles = () => {
  if (typeof navigator === "undefined" || !navigator.canShare) return false;
  try {
    return navigator.canShare({ files: [new File([""], "x.pdf", { type: "application/pdf" })] });
  } catch {
    return false;
  }
};

export async function sharePdf(inv: Invoice, shop: Shop) {
  const { renderPdfBlob } = await import("./pdf");
  const file = new File([await renderPdfBlob(inv, shop)], `${fileBase(inv)}.pdf`, { type: "application/pdf" });
  await navigator.share({ files: [file], title: `Receipt ${inv.number}`, text: receiptMessage(inv, shop) });
}

export function receiptMessage(inv: Invoice, shop: Shop) {
  const t = computeTotals(inv);
  const lines = [
    `Hello${inv.customer.name ? " " + inv.customer.name : ""},`,
    `Here is your receipt *${inv.number}* from *${shop.name}* (${fmtDate(inv.date)}).`,
    ``,
    `Total: ${bdt(t.grandTotal)}`,
    `Paid: ${bdt(t.paid)}`,
    t.due > 0 ? `*Balance due: ${bdt(t.due)}*` : `Status: Fully paid ✅`,
    ``,
    shop.thankYou,
  ];
  return lines.join("\n");
}

/** 01XXXXXXXXX / +880… → 8801XXXXXXXXX for wa.me links */
export function waNumber(phone: string) {
  let d = phone.replace(/\D/g, "");
  if (d.startsWith("00")) d = d.slice(2);
  if (d.startsWith("0") && d.length === 11) d = "88" + d;
  return d;
}

export const whatsappUrl = (inv: Invoice, shop: Shop) =>
  `https://wa.me/${waNumber(inv.customer.phone)}?text=${encodeURIComponent(receiptMessage(inv, shop))}`;
