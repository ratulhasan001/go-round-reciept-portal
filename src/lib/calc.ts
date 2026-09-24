import type { ChargeLine, Invoice, LineItem, Totals } from "./types";

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

export const lineAmount = (it: LineItem) => round2((Number(it.price) || 0) * (Number(it.qty) || 0));

export const filledItems = (inv: Invoice) => inv.items.filter((i) => i.description.trim() !== "");

export const pct = (n: number) => `${Number(n.toFixed(2))}%`;

export const courierName = (x: NonNullable<Invoice["extras"]>) => (x.courier === "Other" ? x.courierName?.trim() || "Courier" : x.courier);

// " (10%)", " (10% + 50.00)", " (free delivery)"… or "" for a plain fixed amount
const adjustLabel = (p: number, fixed: number, freeDelivery = false) => {
  if (!p && !freeDelivery) return "";
  const parts = [p ? pct(p) : "", fixed ? money(fixed) : "", freeDelivery ? "free delivery" : ""].filter(Boolean);
  return ` (${parts.join(" + ")})`;
};

/** Additional charge lines (payment channel %, courier %, manual) for a receipt. */
export function chargeLines(inv: Invoice, base: number): ChargeLine[] {
  const x = inv.extras;
  if (!x?.enabled) return [];
  const lines: ChargeLine[] = [];
  if (x.payRate > 0) lines.push({ label: `${x.payVia} charge (${pct(x.payRate)})`, amount: round2((base * x.payRate) / 100), rate: x.payRate });
  if (x.courier === "Other") {
    const rate = Number(x.courierRate) || 0;
    const fixed = Number(x.courierFixed) || 0;
    if (rate || fixed)
      lines.push({ label: `${courierName(x)} charge${adjustLabel(rate, fixed)}`, amount: round2((base * rate) / 100 + fixed), rate, fixed });
  } else if (x.courier !== "None" && x.courierRate > 0)
    lines.push({ label: `${x.courier} charge (${pct(x.courierRate)})`, amount: round2((base * x.courierRate) / 100), rate: x.courierRate });
  for (const m of x.manual) if (Number(m.amount)) lines.push({ label: m.label.trim() || "Additional charge", amount: round2(Number(m.amount)) });
  return lines;
}

export function computeTotals(inv: Invoice): Totals {
  const subtotal = round2(filledItems(inv).reduce((s, i) => s + lineAmount(i), 0));
  const dPct = Number(inv.discountPct) || 0;
  const dFix = Number(inv.discount) || 0;
  const delivery = Number(inv.delivery) || 0;
  const dFree = !!inv.discountFreeDelivery && delivery > 0;
  const discountOnItems = round2((subtotal * dPct) / 100 + dFix);
  const discountTotal = round2(discountOnItems + (dFree ? delivery : 0));
  const c = inv.coupon;
  const cPct = Number(c?.pct) || 0;
  const cFix = Number(c?.amount) || 0;
  const cFree = !!c?.freeDelivery && !dFree && delivery > 0; // delivery is only waived once
  const couponTotal = round2(((subtotal - discountOnItems) * cPct) / 100 + cFix + (cFree ? delivery : 0));
  const base = round2(subtotal + delivery - discountTotal - couponTotal);
  const charges = chargeLines(inv, base);
  const chargesTotal = round2(charges.reduce((s, c) => s + c.amount, 0));
  const grandTotal = round2(base + chargesTotal);
  const paid = round2(inv.payments.reduce((s, p) => s + (Number(p.amount) || 0), 0));
  const due = round2(grandTotal - paid);
  const dates = inv.payments.filter((p) => p.date && p.amount).map((p) => p.date).sort();
  const status = due <= 0 && grandTotal > 0 ? "PAID" : paid > 0 ? "PARTIAL" : "UNPAID";
  return {
    subtotal,
    discountTotal,
    discountLabel: `Discount${adjustLabel(dPct, dFix, dFree)}`,
    couponTotal,
    couponLabel: `Coupon${c?.code.trim() ? " " + c.code.trim().toUpperCase() : ""}${adjustLabel(cPct, cFix, cFree)}`,
    base, charges, chargesTotal, grandTotal, paid, due, status, lastPayment: dates.at(-1) ?? null };
}

// ---------- formatting ----------

export const money = (n: number) =>
  (Number(n) || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const bdt = (n: number) => `BDT ${money(n)}`;

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function fmtDate(iso: string | null | undefined) {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return "—";
  return `${String(d).padStart(2, "0")} ${MONTHS[m - 1]} ${y}`;
}

export const todayISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

// ---------- amount in words (Bangladeshi lakh / crore system) ----------

const ONES = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve",
  "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
const TENS = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

function twoDigits(n: number) {
  if (n < 20) return ONES[n];
  return TENS[Math.floor(n / 10)] + (n % 10 ? "-" + ONES[n % 10] : "");
}

function intWords(n: number): string {
  if (n === 0) return "Zero";
  const parts: string[] = [];
  const crore = Math.floor(n / 1e7);
  if (crore) parts.push(intWords(crore) + " Crore");
  n %= 1e7;
  const lakh = Math.floor(n / 1e5);
  if (lakh) parts.push(twoDigits(lakh) + " Lakh");
  n %= 1e5;
  const thousand = Math.floor(n / 1000);
  if (thousand) parts.push(twoDigits(thousand) + " Thousand");
  n %= 1000;
  const hundred = Math.floor(n / 100);
  if (hundred) parts.push(ONES[hundred] + " Hundred");
  n %= 100;
  if (n) parts.push(twoDigits(n));
  return parts.join(" ");
}

export function amountInWords(amount: number) {
  const abs = Math.abs(round2(amount));
  const taka = Math.floor(abs);
  const paisa = Math.round((abs - taka) * 100);
  let s = `Taka ${intWords(taka)}`;
  if (paisa) s += ` and ${twoDigits(paisa)} Paisa`;
  return (amount < 0 ? "Minus " : "") + s + " Only";
}

export const uid = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36);

export const fileBase = (inv: Invoice) =>
  `${inv.number}${inv.customer.name ? "-" + inv.customer.name : ""}`.replace(/[^\w\-]+/g, "_");
