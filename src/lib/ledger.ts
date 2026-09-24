"use client";

import type { Invoice, Shop } from "./types";
import { computeTotals, filledItems } from "./calc";
import { STATUS_LABEL, T } from "./theme";

const argb = (hex: string) => "FF" + hex.replace("#", "").toUpperCase();
const MONEY = '#,##0.00;[Red]-#,##0.00;"-"';

/** One workbook listing every receipt - handy for monthly accounts. */
export async function renderLedgerBlob(invoices: Invoice[], shop: Shop) {
  const ExcelJS = (await import("exceljs")).default;
  const wb = new ExcelJS.Workbook();
  wb.creator = shop.name;
  const ws = wb.addWorksheet("Receipts", {
    views: [{ state: "frozen", ySplit: 3, showGridLines: false }],
    pageSetup: { paperSize: 9, orientation: "portrait", fitToPage: true, fitToWidth: 1, fitToHeight: 0, horizontalCentered: true },
  });
  const cols = [
    ["Receipt", 13], ["Date", 13], ["Customer", 24], ["Phone", 15], ["Items", 7],
    ["Grand total", 14], ["Paid", 14], ["Balance due", 14], ["Status", 14],
  ] as const;
  ws.columns = cols.map(([, w]) => ({ width: w }));

  ws.mergeCells("A1:I1");
  const title = ws.getCell("A1");
  title.value = `${shop.name} · Receipt ledger`;
  title.font = { name: "Arial", size: 16, bold: true, color: { argb: argb(T.ink) } };
  ws.getRow(1).height = 30;
  ws.mergeCells("A2:I2");
  ws.getCell("A2").value = `Exported ${new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })} · ${invoices.length} receipts`;
  ws.getCell("A2").font = { name: "Arial", size: 9, color: { argb: argb(T.muted) } };

  const head = ws.getRow(3);
  cols.forEach(([h], i) => {
    const c = head.getCell(i + 1);
    c.value = h.toUpperCase();
    c.font = { name: "Arial", size: 8, bold: true, color: { argb: argb(T.white) } };
    c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: argb(T.ink) } };
    c.alignment = { vertical: "middle", horizontal: i >= 5 && i <= 7 ? "right" : "left" };
  });
  head.height = 22;
  ws.pageSetup.printTitlesRow = "3:3";

  const sorted = [...invoices].sort((a, b) => (a.date + a.number).localeCompare(b.date + b.number));
  sorted.forEach((inv, i) => {
    const t = computeTotals(inv);
    const r = i + 4;
    const [y, m, d] = inv.date.split("-").map(Number);
    const row = ws.getRow(r);
    row.values = [inv.number, new Date(Date.UTC(y, m - 1, d)), inv.customer.name, inv.customer.phone, filledItems(inv).length, t.grandTotal, t.paid];
    row.getCell(8).value = { formula: `F${r}-G${r}`, result: t.due };
    row.getCell(9).value = STATUS_LABEL[t.status];
    row.height = 19;
    row.eachCell({ includeEmpty: true }, (c, n) => {
      c.font = { name: "Arial", size: 9.5, bold: n === 1 || n === 8, color: { argb: argb(n === 9 ? T.status[t.status].fg : T.ink) } };
      c.border = { bottom: { style: "thin", color: { argb: argb(T.line) } } };
      c.alignment = { vertical: "middle" };
      if (i % 2) c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: argb("#F8FAF9") } };
    });
    row.getCell(2).numFmt = "dd mmm yyyy";
    [6, 7, 8].forEach((n) => (row.getCell(n).numFmt = MONEY));
  });

  const end = sorted.length + 3;
  const tr = ws.getRow(end + 1);
  tr.getCell(1).value = "TOTAL";
  (["F", "G", "H"] as const).forEach((col, k) => {
    const sum = sorted.reduce((s, inv) => {
      const t = computeTotals(inv);
      return s + [t.grandTotal, t.paid, t.due][k];
    }, 0);
    tr.getCell(6 + k).value = { formula: `SUM(${col}4:${col}${Math.max(end, 4)})`, result: sum };
    tr.getCell(6 + k).numFmt = MONEY;
  });
  tr.height = 22;
  tr.eachCell({ includeEmpty: true }, (c) => {
    c.font = { name: "Arial", size: 10, bold: true, color: { argb: argb(T.ink) } };
    c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: argb(T.leafSoft) } };
    c.border = { top: { style: "medium", color: { argb: argb(T.leaf) } } };
    c.alignment = { vertical: "middle" };
  });
  ws.autoFilter = { from: "A3", to: `I${Math.max(end, 3)}` };

  const buf = await wb.xlsx.writeBuffer();
  return new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
}
