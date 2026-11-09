"use client";

import type { Product } from "./types";
import { money } from "./calc";

// A "calculating" product table for the letter body, laid out like the receipt's items table:
//   #  |  Product  |  Unit  |  Unit price  |  Qty  |  Amount (BDT)      (+ a Total row)
// The header cells carry data-col names, so recalcTables() can find the columns again after the
// table is edited (rows added, prices or quantities changed) and rewrite every amount and the total.

const esc = (t: string) => t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const RIGHT = "text-align: right";
const CENTER = "text-align: center";
const LOCKED = 'contenteditable="false"'; // worked out from the other cells, so not typed into

/** Reads "2,350.00", "BDT 2350", "3 pcs"… as a number; blank or unreadable = null. */
export function readNumber(t: string): number | null {
  const m = t.replace(/,/g, "").match(/-?\d+(\.\d+)?/);
  return m ? Number(m[0]) : null;
}

const qtyText = (n: number) => String(Math.round(n * 1000) / 1000);
const no = (n: number) => String(n).padStart(2, "0");

/** Same columns and widths as the receipt's items table (src/lib/pdf.tsx). */
export function calcTableHtml(items: { product: Product; qty: number }[]) {
  const head =
    `<th data-col="no" style="width: 7%">#</th>` +
    `<th data-col="name" style="width: 47%">DESCRIPTION</th>` +
    `<th data-col="price" style="width: 16%; ${RIGHT}">UNIT PRICE</th>` +
    `<th data-col="qty" style="width: 10%; ${CENTER}">QTY</th>` +
    `<th data-col="amount" style="width: 20%; ${RIGHT}">AMOUNT (BDT)</th>`;
  let total = 0;
  const rows = items.map(({ product: p, qty }, i) => {
    const amount = p.price * qty;
    total += amount;
    return (
      `<tr><td ${LOCKED} style="color: #a0ada7">${no(i + 1)}</td><td style="font-weight: 700">${esc(p.name)}</td>` +
      `<td style="${RIGHT}">${money(p.price)}</td><td style="${CENTER}">${qtyText(qty)}</td>` +
      `<td ${LOCKED} style="${RIGHT}; font-weight: 700">${money(amount)}</td></tr>`
    );
  });
  const totalRow =
    `<tr data-row="total"><th ${LOCKED}><br></th><th ${LOCKED}><br></th><th ${LOCKED} style="${RIGHT}">Total</th>` +
    `<th ${LOCKED}><br></th><th ${LOCKED} style="${RIGHT}">${money(total)}</th></tr>`;
  return `<table data-calc="products"><tbody><tr>${head}</tr>${rows.join("")}${totalRow}</tbody></table><div><br></div>`;
}

/** Recomputes every calculating table under `root`: row numbers, each amount (price x qty) and the total. Returns true if anything changed. */
export function recalcTables(root: HTMLElement) {
  let changed = false;
  const set = (cell: Element | undefined, text: string) => {
    if (cell && cell.textContent !== text) {
      cell.textContent = text;
      changed = true;
    }
  };
  root.querySelectorAll<HTMLTableElement>('table[data-calc="products"]').forEach((table) => {
    const rows = [...table.rows];
    const head = rows[0];
    if (!head) return;
    const col = (name: string) => [...head.cells].findIndex((c) => c.dataset.col === name);
    const [num, price, qty, amount] = ["no", "price", "qty", "amount"].map(col);
    if (price < 0 || qty < 0 || amount < 0) return; // a column was deleted: leave the table alone
    let total = 0;
    let n = 0;
    for (const tr of rows.slice(1)) {
      if (tr.dataset.row === "total") continue;
      const p = readNumber(tr.cells[price]?.textContent ?? "");
      const q = readNumber(tr.cells[qty]?.textContent ?? "");
      n++;
      if (num >= 0) set(tr.cells[num], no(n));
      const a = p !== null && q !== null ? p * q : null;
      if (a !== null) total += a;
      set(tr.cells[amount], a === null ? "" : money(a));
    }
    const totalRow = rows.find((r) => r.dataset.row === "total");
    set(totalRow?.cells[amount], money(total));
  });
  return changed;
}
