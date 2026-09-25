"use client";

import type { CouponCode } from "./types";
import { todayISO, uid } from "./calc";
import { normPhone } from "./customerImport";
import { readSheet } from "./sheet";

export interface Offer {
  pct: number;
  freeDelivery: boolean;
}

/** Code endings, as in the coupon sheet's header: (a-1%)(b-2%)(c-3%)(d-4%)(e-5%)(fd-free delivery) */
export const DEFAULT_LEGEND: Record<string, Offer> = {
  a: { pct: 1, freeDelivery: false },
  b: { pct: 2, freeDelivery: false },
  c: { pct: 3, freeDelivery: false },
  d: { pct: 4, freeDelivery: false },
  e: { pct: 5, freeDelivery: false },
  fd: { pct: 0, freeDelivery: true },
};

/** Reads a legend like "(a-1%)(fd-free delivery)" from a header cell, if there is one. */
export function parseLegend(text: string): Record<string, Offer> | null {
  const out: Record<string, Offer> = {};
  for (const m of text.matchAll(/\(\s*([a-z]+)\s*[-=:]\s*(?:(\d+(?:\.\d+)?)\s*%|(free\s*delivery))\s*\)/gi)) {
    out[m[1]!.toLowerCase()] = m[3] ? { pct: 0, freeDelivery: true } : { pct: Number(m[2]), freeDelivery: false };
  }
  return Object.keys(out).length ? out : null;
}

/** The offer a code stands for, from its letter ending ("…79a" = 1%, "…17fd" = free delivery). */
export function offerFromCode(code: string, legend = DEFAULT_LEGEND): Offer | null {
  const letters = code.trim().match(/([a-z]+)$/i)?.[1]?.toLowerCase();
  if (!letters) return null;
  return legend[letters] ?? legend[letters.slice(-1)] ?? null;
}

export const offerLabel = (o: Offer) => (o.freeDelivery ? "Free delivery" : `${o.pct}% off`);

export const normCode = (code: string) => code.replace(/\s+/g, "").toUpperCase();

/** dd-mm-yy, dd/mm/yyyy, "08 06 26" or yyyy-mm-dd → yyyy-mm-dd ("" when it isn't a date). */
function toISO(m: RegExpMatchArray) {
  const [yy, mo, d] = m[1] ? [m[1], m[2], m[3]] : [m[6], m[5], m[4]];
  const y = yy!.length === 2 ? "20" + yy : yy;
  const iso = `${y}-${mo!.padStart(2, "0")}-${d!.padStart(2, "0")}`;
  return Number.isNaN(Date.parse(iso)) ? "" : iso;
}
const DATE_RE = /(\d{4})-(\d{1,2})-(\d{1,2})|(\d{1,2})[-/. ](\d{1,2})[-/. ](\d{2,4})/g;

export const parseDate = (s: string) => {
  const m = [...s.matchAll(DATE_RE)][0];
  return m ? toISO(m) : "";
};

/** "21-04-26 to 21-06-26" → ["2026-04-21", "2026-06-21"] */
export function parseValidity(s: string): [string, string] {
  const dates = [...s.matchAll(DATE_RE)].map(toISO).filter(Boolean);
  return [dates[0] ?? "", dates[1] ?? ""];
}

export type CouponStatus = "used" | "expired" | "given" | "available";

export function couponStatus(c: CouponCode, today = todayISO()): CouponStatus {
  if (c.usedOn) return "used";
  if (c.validTo && c.validTo < today) return "expired";
  if (c.name.trim() || c.phone.trim()) return "given";
  return "available";
}

/** Why a coupon can't be used on a receipt right now ("" when it can). */
export function couponProblem(c: CouponCode, invoiceNumber: string, customer: { name: string; phone: string }, date = todayISO()) {
  if (c.usedOn && c.usedInvoice !== invoiceNumber) return `Already used${c.usedInvoice ? ` on ${c.usedInvoice}` : ""}`;
  if (c.validTo && c.validTo < date) return "Expired";
  if (c.validFrom && c.validFrom > date) return "Not valid yet";
  const phone = normPhone(customer.phone).replace(/\D/g, "");
  const ownerPhone = normPhone(c.phone).replace(/\D/g, "");
  if (ownerPhone && phone && ownerPhone !== phone) return `Given to ${c.name.trim() || c.phone}`;
  if (!ownerPhone && c.name.trim() && customer.name.trim() && c.name.trim().toLowerCase() !== customer.name.trim().toLowerCase())
    return `Given to ${c.name.trim()}`;
  return "";
}

// ---------- import ----------

export interface CouponImportPlan {
  add: CouponCode[];
  update: CouponCode[];
  duplicates: number;
  invalid: number; // rows without a code
  unknownOffer: number; // codes whose ending isn't in the legend (imported with no offer)
  total: number;
}

/** Reads a coupon sheet (.xlsx / .csv): Code, Name, Phone Number, Validity, Using Date. */
export async function readCouponFile(file: File): Promise<{ rows: Omit<CouponCode, "id">[]; legend: Record<string, Offer> }> {
  const grid = await readSheet(file);
  const headerIdx = grid.slice(0, 10).findIndex((r) => r.some((c) => /code/i.test(c)));
  let col = { code: 0, name: 1, phone: 2, validity: 3, from: -1, to: -1, used: 4 };
  let legend = DEFAULT_LEGEND;
  if (headerIdx >= 0) {
    const h = grid[headerIdx]!;
    const find = (re: RegExp, skip: RegExp | null = null) => h.findIndex((c) => re.test(c) && !(skip && skip.test(c)));
    col = {
      code: find(/code/i),
      name: find(/name/i),
      phone: find(/phone|mobile|contact|number/i, /code/i),
      used: find(/used|using|redeem/i),
      from: find(/valid\s*from|start/i),
      to: find(/valid\s*(to|until|till)|expir|end/i),
      validity: find(/validity|valid|period/i, /valid\s*from|valid\s*(to|until|till)/i),
    };
    legend = parseLegend(h[col.code] ?? "") ?? DEFAULT_LEGEND;
  }
  const cell = (r: string[], i: number) => (i >= 0 ? (r[i] ?? "") : "");
  const rows = grid.slice(headerIdx + 1).map((r) => {
    const code = cell(r, col.code);
    const offer = offerFromCode(code, legend);
    const [vf, vt] = parseValidity(cell(r, col.validity));
    return {
      code,
      pct: offer?.pct ?? 0,
      freeDelivery: offer?.freeDelivery ?? false,
      name: cell(r, col.name),
      phone: cell(r, col.phone) ? normPhone(cell(r, col.phone)) : "",
      validFrom: parseDate(cell(r, col.from)) || vf,
      validTo: parseDate(cell(r, col.to)) || vt,
      usedOn: parseDate(cell(r, col.used)),
    };
  });
  return { rows, legend };
}

/** Same code = same coupon (spaces / capitals ignored). A match only fills in details the saved one is missing. */
export function planCouponImport(existing: CouponCode[], rows: Omit<CouponCode, "id">[], legend = DEFAULT_LEGEND): CouponImportPlan {
  const plan: CouponImportPlan = { add: [], update: [], duplicates: 0, invalid: 0, unknownOffer: 0, total: rows.length };
  const byCode = new Map(existing.map((c) => [normCode(c.code), { ...c }]));
  const touched = new Set<string>();
  const now = Date.now();
  for (const row of rows) {
    const key = normCode(row.code);
    if (!key) {
      plan.invalid++;
      continue;
    }
    const hit = byCode.get(key);
    if (!hit) {
      if (!offerFromCode(row.code, legend)) plan.unknownOffer++;
      const c: CouponCode = { ...row, code: row.code.trim(), id: uid(), updatedAt: now };
      byCode.set(key, c);
      plan.add.push(c);
      continue;
    }
    let changed = false;
    for (const f of ["name", "phone", "validFrom", "validTo", "usedOn"] as const) {
      if (!hit[f].trim() && row[f]) {
        hit[f] = row[f];
        changed = true;
      }
    }
    if (changed) {
      hit.updatedAt = now;
      if (existing.some((c) => c.id === hit.id)) touched.add(hit.id);
    } else plan.duplicates++;
  }
  plan.update = [...byCode.values()].filter((c) => touched.has(c.id));
  return plan;
}

export const COUPON_SAMPLE_CSV =
  "Code (a-1%)(b-2%)(c-3%)(d-4%)(e-5%)(fd-free delivery),Name,Phone Number,Validity,Using Date\n" +
  "GR41-87-44-79a,Monowarul Islam,01746980757,21-04-26 to 21-06-26,\n" +
  "GR43-29-44-17fd,,,,\n";
