"use client";

import {
  AlignmentType, BorderStyle, CharacterSet, Document, Footer, Header, HorizontalPositionRelativeFrom, ImageRun, LevelFormat, Packer, Paragraph, ShadingType,
  LineRuleType, Table, TableCell, TableLayoutType, TableRow, TextRun, VerticalPositionRelativeFrom, WidthType,
} from "docx";
import type { Shop } from "./types";
import type { Letter } from "./letter";
import { contactLines } from "./letter";
import { fmtDate } from "./calc";
import { T, initials, logoUrl } from "./theme";
import { AQ, BUBBLES, FISH, GRASS, GRASS_H } from "./aquascape";
import { BASE_SIZE, CELL_LINE_HEIGHT, LINE_HEIGHT, RECEIPT_TABLE, cellAlign, cellText, faceInfo, parseRich, receiptRows, type Table as TableBlock, type Align, type Block, type Para } from "./richtext";
import { drawSignature } from "./seal";

// A Word version of the letterhead. The top (fish, logo, name, contact, rule) and the bottom (contact
// line, grass) are drawn as pictures pinned to the page in the header and footer, so they repeat on
// every page and can't be knocked out of place; everything in between is ordinary editable Word text.

const PAGE_W = 595;
const PAGE_H = 842;
const SCALE = 4; // pixels per pt in the pictures (~290 dpi)
const FOOT_H = 64;
const pt2px = (pt: number) => (pt * 96) / 72; // docx sizes pictures in 96-dpi pixels
const pt2emu = (pt: number) => Math.round(pt * 12700);
const pt2twip = (pt: number) => Math.round(pt * 20);

function cssVar(name: string, fallback: string) {
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v ? `${v}, ${fallback}` : fallback;
}

function canvas(hPt: number) {
  const c = document.createElement("canvas");
  c.width = PAGE_W * SCALE;
  c.height = Math.ceil(hPt * SCALE);
  const g = c.getContext("2d")!;
  g.scale(SCALE, SCALE);
  return { c, g };
}

const toBytes = async (c: HTMLCanvasElement) => new Uint8Array(await (await new Promise<Blob>((ok) => c.toBlob((b) => ok(b!), "image/png"))).arrayBuffer());

async function loadImage(src: string) {
  if (!src) return null;
  const img = new Image();
  img.src = src;
  try {
    await img.decode();
    return img;
  } catch {
    return null;
  }
}

/** Splits text into lines no wider than `w` at the canvas' current font. */
function wrapText(g: CanvasRenderingContext2D, text: string, w: number) {
  const out: string[] = [];
  let line = "";
  for (const word of text.split(" ")) {
    const next = line ? `${line} ${word}` : word;
    if (line && g.measureText(next).width > w) {
      out.push(line);
      line = word;
    } else line = next;
  }
  if (line) out.push(line);
  return out;
}

async function drawHeader(shop: Shop) {
  const sans = cssVar("--font-manrope", "sans-serif");
  const serif = "Fraunces, Georgia, serif";
  await Promise.allSettled([document.fonts.load(`600 25px ${serif}`), document.fonts.load(`800 8px ${sans}`), document.fonts.load(`400 8px ${sans}`)]);
  const logo = await loadImage(logoUrl(shop.logo));
  const contact = contactLines(shop);

  const textH = 27.5 + (shop.tagline ? 9.5 : 0) + (contact.length ? 5 + contact.length * 8 * 1.45 : 0);
  const blockH = Math.max(68, textH);
  const top = 54;
  const ruleY = top + blockH + 20;
  const { c, g } = canvas(ruleY + 4);

  // fish and bubbles
  g.strokeStyle = AQ.blue;
  g.fillStyle = AQ.blue;
  g.lineJoin = "round";
  for (const f of FISH) {
    g.lineWidth = f.stroke;
    g.stroke(new Path2D(f.body));
    g.stroke(new Path2D(f.tail));
    g.beginPath();
    g.arc(f.eye.cx, f.eye.cy, f.eye.r, 0, Math.PI * 2);
    g.fill();
  }
  g.lineWidth = 0.7;
  for (const b of BUBBLES) {
    g.globalAlpha = b.opacity;
    g.beginPath();
    g.arc(b.cx, b.cy, b.r, 0, Math.PI * 2);
    g.stroke();
  }
  g.globalAlpha = 1;

  // logo
  const ly = top + (blockH - 68) / 2;
  if (logo) {
    const k = Math.min(68 / logo.naturalWidth, 68 / logo.naturalHeight);
    const [w, h] = [logo.naturalWidth * k, logo.naturalHeight * k];
    g.drawImage(logo, 40 + (68 - w) / 2, ly + (68 - h) / 2, w, h);
  } else {
    g.strokeStyle = T.leaf;
    g.lineWidth = 4;
    g.beginPath();
    g.arc(74, ly + 34, 28, 0, Math.PI * 2);
    g.stroke();
    g.fillStyle = AQ.ink;
    g.font = `600 20px ${serif}`;
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.fillText(initials(shop.name), 74, ly + 34);
    g.textAlign = "left";
  }

  // name, tagline, contact
  g.textBaseline = "alphabetic";
  let y = top + (blockH - textH) / 2;
  const x = 40 + 68 + 14;
  g.fillStyle = AQ.ink;
  g.font = `600 25px ${serif}`;
  g.fillText(shop.name, x, y + 22);
  y += 27.5;
  if (shop.tagline) {
    g.fillStyle = AQ.muted;
    g.font = `800 6.4px ${sans}`;
    g.letterSpacing = "1.6px";
    g.fillText(shop.tagline.toUpperCase(), x, y + 7.5);
    g.letterSpacing = "0px";
    y += 9.5;
  }
  if (contact.length) {
    g.fillStyle = T.muted;
    g.font = `400 8px ${sans}`;
    y += 5;
    for (const line of contact) {
      g.fillText(line, x, y + 8);
      y += 8 * 1.45;
    }
  }

  // rule: short green dash, then a hairline
  g.fillStyle = AQ.green;
  g.fillRect(40, ruleY, 36, 1.6);
  g.fillStyle = AQ.line;
  g.fillRect(80, ruleY + 0.5, PAGE_W - 40 - 80, 0.6);

  return { data: await toBytes(c), h: ruleY + 4 };
}

async function drawFooter(shop: Shop) {
  const sans = cssVar("--font-manrope", "sans-serif");
  await document.fonts.load(`400 6.8px ${sans}`).catch(() => {});
  const { c, g } = canvas(FOOT_H);
  for (const b of GRASS) {
    g.save();
    g.translate(0, FOOT_H - GRASS_H);
    g.strokeStyle = b.color;
    g.globalAlpha = b.opacity;
    g.lineWidth = b.width;
    g.lineCap = "round";
    g.stroke(new Path2D(b.d));
    g.restore();
  }
  g.globalAlpha = 1;
  g.fillStyle = T.faint;
  g.font = `400 6.8px ${sans}`;
  const lines = wrapText(g, [shop.name, ...contactLines(shop)].join("  ·  "), PAGE_W - 80);
  // same place as the PDF: the last line's bottom 44 pt above the page edge
  lines.forEach((l, i) => g.fillText(l, 40, FOOT_H - 44 - 2 - (lines.length - 1 - i) * 6.8 * 1.4));
  return toBytes(c);
}

const ALIGN: Record<Align, (typeof AlignmentType)[keyof typeof AlignmentType]> = {
  left: AlignmentType.LEFT,
  center: AlignmentType.CENTER,
  right: AlignmentType.RIGHT,
  justify: AlignmentType.JUSTIFIED,
};

const CONTENT_TW = pt2twip(PAGE_W - 80);

function para(b: Para, list: number, inCell = false, bold = false) {
  const runs = b.runs.length
    ? b.runs.map(
        (r) =>
          new TextRun({
            text: r.text,
            bold: r.b || bold,
            italics: r.i,
            underline: r.u ? {} : undefined,
            strike: r.s,
            size: (r.size ?? BASE_SIZE) * 2,
            color: (r.color ?? T.body).slice(1),
            font: faceInfo(r.face).docx,
            ...(r.bg ? { shading: { type: ShadingType.CLEAR, color: "auto", fill: r.bg.slice(1) } } : {}),
          }),
      )
    : [new TextRun({ text: "", size: BASE_SIZE * 2 })];
  return new Paragraph({
    children: runs,
    alignment: ALIGN[b.align],
    // the same line pitch as the PDF (size x spacing), growing for anything taller on the line
    spacing: {
      after: pt2twip(b.after ?? 0),
      line: pt2twip(Math.max(BASE_SIZE, ...b.runs.map((r) => r.size ?? BASE_SIZE)) * (b.lh ?? (inCell ? CELL_LINE_HEIGHT : LINE_HEIGHT))),
      lineRule: LineRuleType.AT_LEAST,
    },
    ...(b.kind === "bullet" ? { bullet: { level: 0 } } : {}),
    ...(b.kind === "number" ? { numbering: { reference: "letter-numbers", level: 0, instance: list } } : {}),
  });
}

/** A product table drawn like the receipt's items table. */
function receiptTable(t: TableBlock) {
  const ws = Array.from({ length: t.cols }, (_, c) => Math.floor(CONTENT_TW * (t.widths?.[c] ?? 1 / t.cols)));
  const none = { style: BorderStyle.NONE, size: 0, color: "auto" };
  const hair = { style: BorderStyle.SINGLE, size: 4, color: AQ.line.slice(1) };
  return new Table({
    width: { size: CONTENT_TW, type: WidthType.DXA },
    layout: TableLayoutType.FIXED,
    columnWidths: ws,
    borders: { top: none, bottom: none, left: none, right: none, insideHorizontal: none, insideVertical: none },
    rows: receiptRows(t).map(
      ({ kind, cells }) =>
        new TableRow({
          cantSplit: true,
          tableHeader: kind === "head",
          children: cells.map((c, k) => {
            const text = (s: string, o: Partial<ConstructorParameters<typeof TextRun>[0] & object>) => new TextRun({ text: s, font: "Manrope", color: AQ.ink.slice(1), ...o });
            const kids =
              kind === "item"
                ? c.paras.length
                  ? c.paras.map((p) => para({ ...p, runs: p.runs.map((x) => ({ ...x, size: x.size ?? RECEIPT_TABLE.item, color: x.color ?? T.ink })) }, 0, true))
                  : [new Paragraph({ children: [] })]
                : [
                    new Paragraph({
                      alignment: ALIGN[cellAlign(c)],
                      children: [
                        kind === "head"
                          ? text(cellText(c), { bold: true, size: RECEIPT_TABLE.head * 2, characterSpacing: 24 })
                          : text(cellText(c), { bold: true, size: RECEIPT_TABLE.total * 2, font: "Fraunces" }),
                      ],
                    }),
                  ];
            return new TableCell({
              width: { size: ws[k]!, type: WidthType.DXA },
              margins: { top: kind === "head" ? 140 : 160, bottom: kind === "head" ? 140 : 160, left: k === 0 ? 160 : 60, right: k === cells.length - 1 ? 160 : 60 },
              verticalAlign: "center",
              borders: kind === "item" ? { bottom: hair } : undefined,
              ...(kind !== "item" ? { shading: { type: ShadingType.CLEAR, color: "auto", fill: AQ.sage.slice(1) } } : {}),
              children: kids,
            });
          }),
        }),
    ),
  });
}

function bodyParagraphs(blocks: Block[]): (Paragraph | Table)[] {
  let list = 0; // a new numbering instance for each numbered list, so every list starts at 1
  const line = { style: BorderStyle.SINGLE, size: 4, color: AQ.ink.slice(1) };
  return blocks.map((b, i) => {
    if (b.kind === "hr") return new Paragraph({ children: [], spacing: { before: 120, after: 120 }, border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: AQ.line.slice(1), space: 1 } } });
    if (b.kind === "table" && b.look === "receipt") return receiptTable(b);
    if (b.kind === "table") {
      const ws = Array.from({ length: b.cols }, (_, c) => Math.floor(CONTENT_TW * (b.widths?.[c] ?? 1 / b.cols)));
      return new Table({
        width: { size: CONTENT_TW, type: WidthType.DXA },
        layout: TableLayoutType.FIXED,
        columnWidths: ws,
        borders: { top: line, bottom: line, left: line, right: line, insideHorizontal: line, insideVertical: line },
        rows: b.rows.map(
          (row) =>
            new TableRow({
              cantSplit: true,
              children: row.map((cell, c) => {
                const w = ws[c]!;
                list++;
                const kids = cell.paras.length ? cell.paras.map((p) => para(p, list, true, cell.head)) : [new Paragraph({ children: [] })];
                return new TableCell({
                  width: { size: w, type: WidthType.DXA },
                  margins: { top: 80, bottom: 80, left: 100, right: 100 },
                  ...(cell.head ? { shading: { type: ShadingType.CLEAR, color: "auto", fill: AQ.sage.slice(1) } } : {}),
                  children: kids,
                });
              }),
            }),
        ),
      });
    }
    if (b.kind === "number" && blocks[i - 1]?.kind !== "number") list++;
    return para(b, list);
  });
}

// the letter's fonts go inside the file, so it looks right on computers that don't have them installed
async function embeddedFonts() {
  const get = (f: string) => fetch(`/fonts/${f}`).then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(new Error(f))));
  try {
    const [m4, m7, f4, f6, fi] = await Promise.all(["Manrope-400.ttf", "Manrope-700.ttf", "Fraunces-400.ttf", "Fraunces-600.ttf", "Fraunces-Italic.ttf"].map(get));
    // docx types these as Node Buffers; plain bytes work the same in the browser
    const b = (x: ArrayBuffer) => new Uint8Array(x) as unknown as Buffer;
    return [
      { name: "Manrope", data: b(m4), bold: b(m7), characterSet: CharacterSet.ANSI },
      { name: "Fraunces", data: b(f4), bold: b(f6), italic: b(fi), characterSet: CharacterSet.ANSI },
    ];
  } catch {
    return []; // offline: Word falls back to a similar installed font
  }
}

export async function renderLetterDocx(letter: Letter, shop: Shop) {
  const [head, foot, sign, fonts] = await Promise.all([drawHeader(shop), drawFooter(shop), letter.signed ? drawSignature(shop) : null, embeddedFonts()]);
  const ink = AQ.ink.slice(1);
  const meta = (k: string, v: string) =>
    new Paragraph({
      alignment: AlignmentType.RIGHT,
      children: [
        new TextRun({ text: `${k}  `, bold: true, size: 14, color: AQ.muted.slice(1), font: "Manrope" }),
        new TextRun({ text: v, bold: true, size: 19, color: ink, font: "Manrope" }),
      ],
    });

  const children: (Paragraph | Table)[] = [];
  if (letter.ref.trim()) children.push(meta("REF.", letter.ref.trim()));
  if (letter.date) children.push(meta("DATE", fmtDate(letter.date)));
  const to = letter.to.trim();
  if (to) {
    children.push(new Paragraph({ spacing: { before: 120, after: 80 }, children: [new TextRun({ text: "TO", bold: true, size: 14, color: T.muted.slice(1), font: "Manrope" })] }));
    for (const line of to.split("\n")) children.push(new Paragraph({ children: [new TextRun({ text: line, size: 20, color: ink, font: "Manrope" })] }));
  }
  if (letter.subject.trim())
    children.push(
      new Paragraph({ spacing: { before: 400, after: 120 }, children: [new TextRun({ text: `Subject: ${letter.subject.trim()}`, bold: true, size: 26, color: ink, font: "Fraunces" })] }),
    );
  const body = bodyParagraphs(parseRich(letter.body));
  if (body.length) children.push(new Paragraph({ children: [], spacing: { after: 120 } }), ...body);
  if (sign) {
    const bytes = new Uint8Array(await (await fetch(sign)).arrayBuffer());
    children.push(new Paragraph({ alignment: AlignmentType.RIGHT, spacing: { before: 360 }, children: [new ImageRun({ type: "png", data: bytes, transformation: { width: pt2px(180), height: pt2px(115) } })] }));
  }
  if (!children.length) children.push(new Paragraph({ children: [] })); // a blank letterhead

  const pinned = (data: Uint8Array, hPt: number, yPt: number) =>
    new ImageRun({
      type: "png",
      data,
      transformation: { width: pt2px(PAGE_W), height: pt2px(hPt) },
      floating: {
        horizontalPosition: { relative: HorizontalPositionRelativeFrom.PAGE, offset: 0 },
        verticalPosition: { relative: VerticalPositionRelativeFrom.PAGE, offset: pt2emu(yPt) },
        behindDocument: false,
        allowOverlap: true,
      },
    });

  const doc = new Document({
    creator: shop.name,
    fonts,
    title: letter.subject || `${shop.name} letterhead`,
    styles: { default: { document: { run: { font: "Manrope", size: BASE_SIZE * 2, color: T.body.slice(1) } } } },
    numbering: {
      config: [
        {
          reference: "letter-numbers",
          levels: [{ level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.START, style: { paragraph: { indent: { left: 360, hanging: 280 } } } }],
        },
      ],
    },
    sections: [
      {
        properties: {
          page: {
            size: { width: pt2twip(PAGE_W), height: pt2twip(PAGE_H) },
            margin: { top: pt2twip(head.h + 18), bottom: pt2twip(92), left: pt2twip(40), right: pt2twip(40), header: 0, footer: 0 },
          },
        },
        headers: { default: new Header({ children: [new Paragraph({ children: [pinned(head.data, head.h, 0)] })] }) },
        footers: { default: new Footer({ children: [new Paragraph({ children: [pinned(foot, FOOT_H, PAGE_H - FOOT_H)] })] }) },
        children,
      },
    ],
  });
  return Packer.toBlob(doc);
}
