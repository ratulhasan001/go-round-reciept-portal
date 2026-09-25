"use client";

import type { Customer } from "./types";
import { uid } from "./calc";

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

const clean = (s: unknown) => String(s ?? "").replace(/\s+/g, " ").trim();
const normName = (s: string) => clean(s).toLowerCase();

/** Bangladeshi numbers in any common shape (+880 17…, 88017…, 1743…, 017-43…) become 01XXXXXXXXX. */
export function normPhone(raw: string) {
  const s = clean(raw);
  let d = s.replace(/\D/g, "");
  if (d.startsWith("880")) d = d.slice(2);
  else if (d.startsWith("88") && d.length === 13) d = d.slice(2);
  if (d.length === 10 && d.startsWith("1")) d = "0" + d;
  return /^01\d{9}$/.test(d) ? d : s;
}
const phoneKey = (p: string) => normPhone(p).replace(/\D/g, "");

// ---------- reading files ----------

function detectDelimiter(firstLine: string) {
  const counts = [",", ";", "\t"].map((d) => [d, firstLine.split(d).length] as const);
  return counts.sort((a, b) => b[1] - a[1])[0]![0];
}

/** Small RFC 4180 CSV parser: quoted fields, "" escapes, commas / newlines inside quotes. */
function parseCsv(text: string): string[][] {
  text = text.replace(/^﻿/, "");
  const delim = detectDelimiter(text.split(/\r?\n/, 1)[0] ?? "");
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]!;
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (ch === '"') quoted = false;
      else field += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === delim) {
      row.push(field);
      field = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else field += ch;
  }
  if (field || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

async function parseXlsx(file: File): Promise<string[][]> {
  const ExcelJS = (await import("exceljs")).default;
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(await file.arrayBuffer());
  const ws = wb.worksheets.find((w) => w.actualRowCount > 0);
  if (!ws) return [];
  const rows: string[][] = [];
  ws.eachRow({ includeEmpty: false }, (r) => {
    const out: string[] = [];
    for (let c = 1; c <= ws.columnCount; c++) out.push(r.getCell(c).text ?? "");
    rows.push(out);
  });
  return rows;
}

/** Reads a .csv or .xlsx file into customer rows, finding the columns by their headings. */
export async function readCustomerFile(file: File): Promise<ImportRow[]> {
  const ext = file.name.toLowerCase().split(".").pop();
  if (ext === "xls") throw new Error("Old .xls files aren't supported - open it in Excel and save as .xlsx or .csv.");
  if (ext !== "csv" && ext !== "xlsx") throw new Error("Please choose a .xlsx or .csv file.");
  const grid = (ext === "csv" ? parseCsv(await file.text()) : await parseXlsx(file)).filter((r) => r.some((c) => clean(c)));
  if (!grid.length) throw new Error("The file is empty.");

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
