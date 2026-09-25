"use client";

import type { Cell } from "exceljs";

/** Small RFC 4180 CSV parser: quoted fields, "" escapes, delimiters / newlines inside quotes. Detects , ; or tab. */
function parseCsv(text: string): string[][] {
  text = text.replace(/^﻿/, "");
  const first = text.split(/\r?\n/, 1)[0] ?? "";
  const delim = [",", ";", "\t"].map((d) => [d, first.split(d).length] as const).sort((a, b) => b[1] - a[1])[0]![0];
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

/** Cell text that never throws (exceljs does on some merged cells). Real Excel dates become yyyy-mm-dd. */
function cellText(cell: Cell) {
  try {
    const v = cell.value;
    if (v instanceof Date) return v.toISOString().slice(0, 10); // Excel stores dates as UTC midnight
    return cell.text ?? "";
  } catch {
    return "";
  }
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
    for (let c = 1; c <= ws.columnCount; c++) out.push(cellText(r.getCell(c)));
    rows.push(out);
  });
  return rows;
}

/** Reads the first sheet of a .xlsx or .csv file into rows of trimmed text, dropping empty rows. */
export async function readSheet(file: File): Promise<string[][]> {
  const ext = file.name.toLowerCase().split(".").pop();
  if (ext === "xls") throw new Error("Old .xls files aren't supported - open it in Excel and save as .xlsx or .csv.");
  if (ext !== "csv" && ext !== "xlsx") throw new Error("Please choose a .xlsx or .csv file.");
  const grid = (ext === "csv" ? parseCsv(await file.text()) : await parseXlsx(file))
    .map((r) => r.map((c) => String(c ?? "").replace(/\s+/g, " ").trim()))
    .filter((r) => r.some(Boolean));
  if (!grid.length) throw new Error("The file is empty.");
  return grid;
}
