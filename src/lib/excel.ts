"use client";

import type { Borders, Cell, Fill, Font, Workbook, Worksheet } from "exceljs";
import type { Invoice, Shop } from "./types";
import { amountInWords, computeTotals, filledItems, fmtDate, lineAmount } from "./calc";
import { STATUS_LABEL, T, logoUrl } from "./theme";
import { drawSeal, sealFor } from "./seal";

// Excel cannot embed fonts, so the workbook uses Arial to print identically on every computer.
const FONT = "Arial";
const argb = (hex: string) => "FF" + hex.replace("#", "").toUpperCase();
const solid = (hex: string): Fill => ({ type: "pattern", pattern: "solid", fgColor: { argb: argb(hex) } });
const font = (o: Partial<Font> & { hex?: string } = {}): Partial<Font> => {
  const { hex, ...rest } = o;
  return { name: FONT, size: 10, color: { argb: argb(hex ?? T.ink) }, ...rest };
};
const line = (hex: string, style: "thin" | "medium" | "hair" = "thin") => ({ style, color: { argb: argb(hex) } });
const MONEY = '#,##0.00;[Red]-#,##0.00;"-"';
const LESS = '"– "#,##0.00;#,##0.00;"-"'; // shown as a deduction
const DATE = "dd mmm yyyy";
const CARD = "#FAFCFA";

const excelDate = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
};

async function logoDataUrl(logo: string): Promise<string | null> {
  const url = logoUrl(logo);
  if (!url) return null;
  if (url.startsWith("data:image/png") || url.startsWith("data:image/jpeg")) return url;
  try {
    const blob = await (await fetch(url)).blob();
    return await new Promise((res, rej) => {
      const r = new FileReader();
      r.onload = () => res(String(r.result));
      r.onerror = rej;
      r.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

export async function renderExcelBlob(inv: Invoice, shop: Shop) {
  const ExcelJS = (await import("exceljs")).default;
  const wb: Workbook = new ExcelJS.Workbook();
  wb.creator = shop.name;
  wb.created = new Date();
  wb.calcProperties.fullCalcOnLoad = true;

  const ws = wb.addWorksheet(inv.number.replace(/[\\/?*[\]:]/g, "-").slice(0, 31) || "Invoice", {
    views: [{ showGridLines: false, zoomScale: 110 }],
    pageSetup: {
      paperSize: 9, // A4
      orientation: "portrait",
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      horizontalCentered: true,
      margins: { left: 0.4, right: 0.4, top: 0.4, bottom: 0.55, header: 0.2, footer: 0.25 },
    },
    headerFooter: { oddFooter: `&L&"${FONT}"&8${shop.name} · ${inv.number}&R&"${FONT}"&8Page &P of &N` },
  });
  ws.columns = [{ width: 9 }, { width: 42 }, { width: 15 }, { width: 9 }, { width: 18 }];

  const t = computeTotals(inv);
  const items = filledItems(inv);
  const payments = inv.payments.filter((p) => p.amount);
  const COLS = ["A", "B", "C", "D", "E"];

  const set = (
    ref: string,
    value: Cell["value"],
    f: Partial<Font>,
    opts: { align?: Partial<Cell["alignment"]>; fmt?: string; fill?: string; merge?: string; border?: Partial<Borders> } = {},
  ) => {
    if (opts.merge) ws.mergeCells(opts.merge);
    const c = ws.getCell(ref);
    c.value = value;
    c.font = f;
    c.alignment = { vertical: "middle", ...opts.align };
    if (opts.fmt) c.numFmt = opts.fmt;
    if (opts.fill) c.fill = solid(opts.fill);
    if (opts.border) c.border = opts.border;
    return c;
  };
  const band = (row: number, hex: string, cols = COLS) => cols.forEach((c) => (ws.getCell(`${c}${row}`).fill = solid(hex)));
  const height = (row: number, h: number) => (ws.getRow(row).height = h);

  // ---------- header ----------
  band(1, T.aqua);
  height(1, 7);
  const logo = await logoDataUrl(shop.logo);
  if (logo) {
    const id = wb.addImage({ base64: logo, extension: logo.startsWith("data:image/jpeg") ? "jpeg" : "png" });
    ws.addImage(id, { tl: { col: 0.08, row: 1.25 }, ext: { width: 64, height: 64 }, editAs: "oneCell" });
  }
  const nameCol = logo ? "B" : "A";
  height(2, 28);
  set(`${nameCol}2`, shop.name, font({ size: 20, bold: true }), { merge: `${nameCol}2:C2`, align: { horizontal: "left" } });
  set("D2", "INVOICE", font({ size: 22, bold: true }), { merge: "D2:E2", align: { horizontal: "right" } });
  height(3, 16);
  set(`${nameCol}3`, shop.tagline, font({ size: 9, bold: true, hex: T.leafDeep }), { merge: `${nameCol}3:C3` });
  set("D3", `No. ${inv.number}`, font({ size: 10, bold: true, hex: T.aquaDeep }), { merge: "D3:E3", align: { horizontal: "right" } });
  height(4, 15);
  set(`${nameCol}4`, shop.address, font({ size: 8.5, hex: T.muted }), { merge: `${nameCol}4:C4` });
  const st = T.status[t.status];
  set("E4", STATUS_LABEL[t.status].toUpperCase(), font({ size: 8, bold: true, hex: st.fg }), { fill: st.bg, align: { horizontal: "center" } });
  height(5, 15);
  set(`${nameCol}5`, [shop.phone, shop.email, shop.website].filter(Boolean).join("   ·   "), font({ size: 8.5, hex: T.muted }), { merge: `${nameCol}5:C5` });
  height(6, 10);
  height(7, 4);
  ["A", "B", "C", "D"].forEach((c) => (ws.getCell(`${c}7`).border = { bottom: line(T.leaf, "medium") }));
  ws.getCell("E7").border = { bottom: line(T.aqua, "medium") };
  height(8, 12);

  // ---------- billed to + balance due ----------
  height(9, 18);
  set("A9", "BILLED TO", font({ size: 7.5, bold: true, hex: T.muted }), { merge: "A9:B9" });
  set("C9", "INVOICE TOTAL", font({ size: 7.5, bold: true, hex: T.muted }), { merge: "C9:E9", fill: CARD, align: { indent: 1, vertical: "bottom" } });
  height(10, 22);
  set("A10", inv.customer.name || "—", font({ size: 13, bold: true }), { merge: "A10:B10" });
  height(11, 18);
  set("A11", inv.customer.phone, font({ size: 9, hex: T.body }), { merge: "A11:B11" });
  height(12, 18);
  set("A12", inv.customer.address, font({ size: 9, hex: T.body }), { merge: "A12:B12", align: { wrapText: true } });
  const totalCard = set("C10", null, font({ size: 16, bold: true }), { merge: "C10:E10", fill: CARD, fmt: '"BDT "#,##0.00', align: { horizontal: "left", indent: 1 } });
  set("C11", "Paid", font({ size: 8.5, hex: T.muted }), { merge: "C11:D11", fill: CARD, align: { indent: 1 } });
  const paidCard = set("E11", null, font({ size: 9, bold: true }), { fill: CARD, fmt: MONEY, align: { horizontal: "right" } });
  set("C12", t.due < 0 ? "Credit" : "Balance due", font({ size: 8.5, hex: T.muted }), { merge: "C12:D12", fill: CARD, align: { indent: 1 } });
  const dueCard = set("E12", null, font({ size: 9, bold: true }), { fill: CARD, fmt: MONEY, align: { horizontal: "right" } });
  // thin frame around the summary card
  for (const r of [9, 10, 11, 12])
    for (const c of ["C", "D", "E"]) {
      const b: Partial<Borders> = {};
      if (r === 9) b.top = line(T.line);
      if (r === 12) b.bottom = line(T.line);
      if (r === 11) b.top = line(T.line);
      if (r === 12) b.top = line(T.line);
      if (c === "C") b.left = line(T.line);
      if (c === "E") b.right = line(T.line);
      ws.getCell(`${c}${r}`).border = b;
    }

  height(13, 10);
  height(14, 18);
  set("A14", "Date", font({ size: 8.5, hex: T.muted }));
  set("B14", excelDate(inv.date), font({ size: 9, bold: true }), { fmt: DATE, align: { horizontal: "left" } });
  set("C14", "Last payment", font({ size: 8.5, hex: T.muted }), { merge: "C14:D14", align: { horizontal: "right" } });
  const lastPayCell = set("E14", null, font({ size: 9, bold: true }), { fmt: DATE, align: { horizontal: "right" } });
  height(15, 12);

  // ---------- items ----------
  let r = 16;
  height(r, 22);
  const heads: [string, string, Partial<Cell["alignment"]>][] = [
    ["A", "#", { horizontal: "center" }],
    ["B", "DESCRIPTION", { horizontal: "left", indent: 1 }],
    ["C", "UNIT PRICE", { horizontal: "right" }],
    ["D", "QTY", { horizontal: "center" }],
    ["E", "AMOUNT (BDT)", { horizontal: "right" }],
  ];
  for (const [c, h, a] of heads) set(`${c}${r}`, h, font({ size: 7.5, bold: true, hex: T.leafDeep }), { align: a, fill: T.leafSoft });
  ws.pageSetup.printTitlesRow = `${r}:${r}`;

  const first = r + 1;
  items.forEach((it, i) => {
    const row = first + i;
    height(row, 21);
    const b = { bottom: line(T.line) };
    set(`A${row}`, i + 1, font({ size: 9, hex: T.faint }), { align: { horizontal: "center" }, border: b, fmt: "00" });
    set(`B${row}`, it.description, font({ size: 10, bold: true }), { align: { horizontal: "left", indent: 1, wrapText: true }, border: b });
    set(`C${row}`, Number(it.price) || 0, font({ size: 10 }), { fmt: MONEY, align: { horizontal: "right" }, border: b });
    set(`D${row}`, Number(it.qty) || 0, font({ size: 10 }), { fmt: "0.##", align: { horizontal: "center" }, border: b });
    set(`E${row}`, { formula: `C${row}*D${row}`, result: lineAmount(it) }, font({ size: 10, bold: true }), { fmt: MONEY, align: { horizontal: "right" }, border: b });
  });
  const last = Math.max(first, first + items.length - 1);
  if (items.length === 0) set(`B${first}`, "No items", font({ size: 9, italic: true, hex: T.faint }), {});

  // ---------- totals (right) + words / notes (left) ----------
  r = last + 2;
  height(r - 1, 12);
  const nc = t.charges.length;
  const hc = t.couponTotal ? 1 : 0;
  const tot = { sub: r, del: r + 1, disc: r + 2, coupon: r + 3, grand: r + 3 + hc + nc, paid: r + 4 + hc + nc, due: r + 5 + hc + nc };
  const payFirst = tot.due + 4;
  const payLast = payFirst + Math.max(payments.length, 1) - 1;

  const totRow = (row: number, label: string, value: Cell["value"], f = font({ size: 10 }), lf = font({ size: 9.5, hex: T.muted }), fmt = MONEY) => {
    height(row, 20);
    set(`C${row}`, label, lf, { merge: `C${row}:D${row}`, align: { horizontal: "right" } });
    set(`E${row}`, value, f, { fmt, align: { horizontal: "right" } });
  };
  totRow(tot.sub, "Subtotal", { formula: `SUM(E${first}:E${last})`, result: t.subtotal });
  totRow(tot.del, "Delivery charge", Number(inv.delivery) || 0);
  const dPct = Number(inv.discountPct) || 0;
  const dFix = Number(inv.discount) || 0;
  const del = Number(inv.delivery) || 0;
  const dFree = !!inv.discountFreeDelivery && del > 0;
  const cFree = !!inv.coupon?.freeDelivery && !dFree && del > 0;
  const discItems = `ROUND(E${tot.sub}*${dPct}/100,2)+${dFix}`;
  totRow(
    tot.disc,
    t.discountLabel,
    dPct || dFree ? { formula: `${discItems}${dFree ? `+E${tot.del}` : ""}`, result: t.discountTotal } : dFix,
    undefined,
    undefined,
    LESS,
  );
  if (hc) {
    const cPct = Number(inv.coupon?.pct) || 0;
    const cFix = Number(inv.coupon?.amount) || 0;
    totRow(
      tot.coupon,
      t.couponLabel,
      cPct || cFree ? { formula: `ROUND((E${tot.sub}-(${discItems}))*${cPct}/100,2)+${cFix}${cFree ? `+E${tot.del}` : ""}`, result: t.couponTotal } : cFix,
      undefined,
      undefined,
      LESS,
    );
  }
  const baseRef = `(E${tot.sub}+E${tot.del}-E${tot.disc}${hc ? `-E${tot.coupon}` : ""})`;
  const firstCharge = tot.disc + 1 + hc;
  t.charges.forEach((c, i) => {
    const row = firstCharge + i;
    totRow(row, c.label, c.rate !== undefined ? { formula: `ROUND(E${tot.sub}*${c.rate}/100,2)${c.fixed ? `+${c.fixed}` : ""}`, result: c.amount } : c.amount);
  });
  const chargeSum = nc ? `+SUM(E${firstCharge}:E${firstCharge + nc - 1})` : "";
  totRow(tot.grand, "Grand Total", { formula: `${baseRef}${chargeSum}`, result: t.grandTotal }, font({ size: 12, bold: true }), font({ size: 11, bold: true }));
  band(tot.grand, T.leafSoft, ["C", "D", "E"]);
  height(tot.grand, 24);
  totRow(tot.paid, "Paid", payments.length ? { formula: `SUM(E${payFirst}:E${payLast})`, result: t.paid } : 0, undefined, undefined, LESS);
  totRow(
    tot.due,
    t.due < 0 ? "Credit / change" : "Balance due",
    { formula: `E${tot.grand}-E${tot.paid}`, result: t.due },
    font({ size: 10.5, bold: true }),
    font({ size: 9.5, bold: true }),
    '"BDT "#,##0.00;"BDT "#,##0.00;"BDT 0.00"',
  );
  ["C", "D", "E"].forEach((c) => (ws.getCell(`${c}${tot.due}`).border = { top: line(T.line) }));
  height(tot.due, 22);

  totalCard.value = { formula: `E${tot.grand}`, result: t.grandTotal };
  paidCard.value = { formula: `E${tot.paid}`, result: t.paid };
  dueCard.value = { formula: `ABS(E${tot.due})`, result: Math.abs(t.due) };
  lastPayCell.value = payments.length
    ? { formula: `MAX(C${payFirst}:C${payLast})`, result: t.lastPayment ? excelDate(t.lastPayment) : undefined }
    : "—";

  set(`A${tot.sub}`, "AMOUNT IN WORDS", font({ size: 7.5, bold: true, hex: T.aquaDeep }), { merge: `A${tot.sub}:B${tot.sub}`, fill: T.aquaSoft, align: { indent: 1, vertical: "bottom" } });
  set(`A${tot.del}`, amountInWords(t.grandTotal), font({ size: 9.5, bold: true }), {
    merge: `A${tot.del}:B${tot.del}`,
    fill: T.aquaSoft,
    align: { indent: 1, wrapText: true, vertical: "top" },
  });
  ws.getCell(`A${tot.sub}`).border = { left: line(T.aqua, "medium") };
  ws.getCell(`A${tot.del}`).border = { left: line(T.aqua, "medium") };
  height(tot.del, 28);
  if (inv.notes) {
    set(`A${tot.grand}`, "NOTES", font({ size: 7.5, bold: true, hex: T.muted }), { merge: `A${tot.grand}:B${tot.grand}`, align: { vertical: "bottom" } });
    set(`A${tot.paid}`, inv.notes, font({ size: 9, hex: T.body }), { merge: `A${tot.paid}:B${tot.due}`, align: { wrapText: true, vertical: "top" } });
  }

  // ---------- payment history ----------
  height(tot.due + 1, 14);
  const ph = tot.due + 2;
  height(ph, 20);
  set(`A${ph}`, "PAYMENT HISTORY", font({ size: 7.5, bold: true, hex: T.muted }), { merge: `A${ph}:E${ph}` });
  const phh = ph + 1;
  const pheads: [string, string, Partial<Cell["alignment"]>][] = [
    ["A", "#", { horizontal: "center" }],
    ["B", "NOTE", { horizontal: "left", indent: 1 }],
    ["C", "DATE", { horizontal: "center" }],
    ["D", "METHOD", { horizontal: "center" }],
    ["E", "AMOUNT (BDT)", { horizontal: "right" }],
  ];
  height(phh, 18);
  for (const [c, h, a] of pheads) set(`${c}${phh}`, h, font({ size: 7.5, bold: true, hex: T.leafDeep }), { align: a, fill: T.leafSoft });
  if (payments.length === 0) {
    set(`A${payFirst}`, "No payments recorded yet.", font({ size: 9, italic: true, hex: T.faint }), { merge: `A${payFirst}:E${payFirst}`, align: { horizontal: "center" } });
  }
  payments.forEach((p, i) => {
    const row = payFirst + i;
    height(row, 19);
    const b = { bottom: line(T.line) };
    set(`A${row}`, i + 1, font({ size: 9, hex: T.faint }), { align: { horizontal: "center" }, border: b });
    set(`B${row}`, p.note, font({ size: 9, hex: T.body }), { align: { indent: 1 }, border: b });
    set(`C${row}`, p.date ? excelDate(p.date) : null, font({ size: 9 }), { fmt: DATE, align: { horizontal: "center" }, border: b });
    set(`D${row}`, p.method, font({ size: 9, bold: true }), { align: { horizontal: "center" }, border: b });
    set(`E${row}`, Number(p.amount) || 0, font({ size: 9, bold: true }), { fmt: MONEY, align: { horizontal: "right" }, border: b });
  });

  // ---------- footer ----------
  r = payLast + 2;
  // space for the PAID / DUE seal (certificate style)
  const spec = sealFor(inv, shop);
  const sealRows = spec ? 4 : 2;
  for (let k = 0; k < sealRows; k++) height(r + k, spec ? 25 : 16);
  if (spec) {
    const sealId = wb.addImage({ base64: await drawSeal(spec), extension: "png" });
    ws.addImage(sealId, { tl: { col: 3.55, row: r - 1 + 0.15 }, ext: { width: 118, height: 118 }, editAs: "oneCell" });
  }
  const f1 = r + sealRows;
  height(f1, 22);
  set(`A${f1}`, shop.thankYou, font({ size: 12.5, bold: true, hex: T.leafDeep }), { merge: `A${f1}:C${f1}` });
  set(`D${f1}`, "✓ Electronically issued receipt", font({ size: 8.5, bold: true, hex: T.leafDeep }), {
    merge: `D${f1}:E${f1}`,
    align: { horizontal: "right", vertical: "bottom" },
  });
  height(f1 + 1, 26);
  set(`D${f1 + 1}`, "System-generated and valid without a signature.", font({ size: 7.5, hex: T.muted }), {
    merge: `D${f1 + 1}:E${f1 + 1}`,
    align: { horizontal: "right", vertical: "top", wrapText: true },
  });
  if (shop.terms) {
    set(`A${f1 + 1}`, shop.terms, font({ size: 7.5, hex: T.muted }), { merge: `A${f1 + 1}:C${f1 + 1}`, align: { wrapText: true, vertical: "top" } });
  }
  const f3 = f1 + 2;
  set(`A${f3}`, `${shop.name} · Receipt ${inv.number} · Issued ${fmtDate(inv.date)}`, font({ size: 7, hex: T.faint }), {
    merge: `A${f3}:E${f3}`,
    align: { horizontal: "center" },
  });
  height(f3 + 1, 7);
  band(f3 + 1, T.leaf);

  ws.pageSetup.printArea = `A1:E${f3 + 1}`;
  (ws as Worksheet).properties.defaultRowHeight = 18;

  const buf = await wb.xlsx.writeBuffer();
  return new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
}
