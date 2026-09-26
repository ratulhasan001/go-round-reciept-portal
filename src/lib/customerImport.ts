"use client";

import type { Customer } from "./types";
import { uid } from "./calc";
import { readSheet } from "./sheet";
import { clean, normPhone, phoneKey } from "./phone";

export interface ImportRow {
  name: string;
  phone: string;
  address: string;
}

export interface ImportPlan {
  add: Customer[]; // brand-new customers
  update: Customer[]; // existing customers that get a missing phone / address filled in
  duplicates: number; // rows already saved (or repeated in the file) - skipped
  invalid: number; // rows without a name - skipped
  total: number; // data rows read from the file
}

const normName = (s: string) => clean(s).toLowerCase();
export { normPhone };

/** Reads a .csv or .xlsx file into customer rows, finding the columns by their headings. */
export async function readCustomerFile(file: File): Promise<ImportRow[]> {
  const grid = await readSheet(file);

  // header row: the first row (of the top 10) that mentions a name column
  const headerIdx = grid.slice(0, 10).findIndex((r) => r.some((c) => /name/i.test(c)));
  let col = { name: 0, phone: 1, address: 2 };
  if (headerIdx >= 0) {
    const h = grid[headerIdx]!.map((c) => clean(c).toLowerCase());
    const find = (re: RegExp) => h.findIndex((c) => re.test(c));
    col = { name: find(/name/), phone: find(/phone|mobile|contact|number|cell/), address: find(/address|location|area/) };
    if (col.name < 0) throw new Error("Couldn't find a “Recipient Name” column.");
  }
  return grid.slice(headerIdx + 1).map((r) => ({
    name: clean(r[col.name]),
    phone: col.phone >= 0 ? normPhone(r[col.phone] ?? "") : "",
    address: col.address >= 0 ? clean(r[col.address]) : "",
  }));
}

// ---------- duplicate check ----------

/**
 * Same phone number = same customer. Without a phone on either side, the same name counts as a match.
 * A match never creates a new customer; it only fills in a phone / address the saved one is missing.
 */
export function planImport(existing: Customer[], rows: ImportRow[]): ImportPlan {
  const plan: ImportPlan = { add: [], update: [], duplicates: 0, invalid: 0, total: rows.length };
  const people = existing.map((c) => ({ ...c }));
  const touched = new Set<string>();
  const now = Date.now();

  for (const row of rows) {
    if (!row.name) {
      plan.invalid++;
      continue;
    }
    const pk = phoneKey(row.phone);
    const hit =
      (pk && people.find((c) => phoneKey(c.phone) === pk)) ||
      people.find((c) => normName(c.name) === normName(row.name) && (!pk || !phoneKey(c.phone)));

    if (!hit) {
      const c: Customer = { id: uid(), name: row.name, phone: row.phone, address: row.address, updatedAt: now };
      people.push(c);
      plan.add.push(c);
      continue;
    }
    const fill = { phone: !hit.phone.trim() && row.phone, address: !hit.address.trim() && row.address };
    if (fill.phone || fill.address) {
      if (fill.phone) hit.phone = row.phone;
      if (fill.address) hit.address = row.address;
      hit.updatedAt = now;
      if (existing.some((c) => c.id === hit.id)) touched.add(hit.id);
    } else plan.duplicates++;
  }
  plan.update = people.filter((c) => touched.has(c.id));
  return plan;
}

export const SAMPLE_CSV = "Recipient Name,Recipient Phone,Recipient Address\nAmit Biswas,01743876195,\"Miapara More, Khulna\"\n";
