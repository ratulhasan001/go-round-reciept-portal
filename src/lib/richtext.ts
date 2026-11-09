// The letter body is edited as HTML (a contentEditable box with a Word-style toolbar) and stored as
// that HTML. Every output - the live preview, the PDF and the .docx - reads it through parseRich(),
// so all three show the same formatting and nothing from a paste is ever injected as raw HTML.

export type Align = "left" | "center" | "right" | "justify";
export type Face = "sans" | "serif" | "times" | "arial" | "courier";

export interface Run {
  text: string;
  b?: boolean;
  i?: boolean;
  u?: boolean;
  s?: boolean; // strikethrough
  size?: number; // pt
  color?: string; // #rrggbb
  face?: Face;
  bg?: string; // highlight, #rrggbb
}

export interface Para {
  kind: "p" | "bullet" | "number";
  align: Align;
  runs: Run[];
  n?: number; // number shown on a numbered item
  lh?: number; // line spacing, a multiple of the text size (missing = LINE_HEIGHT)
  after?: number; // space after the paragraph, pt
}

export interface Cell {
  head: boolean; // a <th>: shaded, bold
  paras: Para[];
}

export interface Table {
  kind: "table";
  rows: Cell[][];
  cols: number;
  widths?: number[]; // share of the width per column (sums to 1), from width:% on the first row; missing = equal
  look: "grid" | "receipt"; // receipt = the product table, drawn like the receipt's items table
}

export interface Rule {
  kind: "hr";
}

export type Block = Para | Table | Rule;

/** Body text size when nothing else is chosen, in pt. */
export const BASE_SIZE = 10;
/** Line spacing when nothing else is chosen ("Normal"), and inside table cells. */
export const LINE_HEIGHT = 1.65;
export const CELL_LINE_HEIGHT = 1.4;
export const LINE_SPACINGS: { value: number; label: string }[] = [
  { value: 1, label: "1.0" },
  { value: 1.15, label: "1.15" },
  { value: 1.5, label: "1.5" },
  { value: LINE_HEIGHT, label: "Normal" },
  { value: 2, label: "2.0" },
  { value: 2.5, label: "2.5" },
  { value: 3, label: "3.0" },
];
export const PARA_GAPS = [0, 6, 12, 18, 24]; // pt after a paragraph
export const SIZES = [8, 9, 10, 11, 12, 14, 16, 18, 20, 24, 28, 32];
/**
 * Fonts offered in the editor. `css` is what the editor and preview use, `pdf` the family embedded in the
 * PDF (Times, Helvetica and Courier are the PDF standard fonts, so they need no files), `docx` the name Word uses.
 */
export const FACES: { key: Face; label: string; css: string; pdf: string; docx: string }[] = [
  { key: "sans", label: "Manrope", css: "var(--font-manrope), sans-serif", pdf: "Manrope", docx: "Manrope" },
  { key: "serif", label: "Fraunces", css: "Fraunces, Georgia, serif", pdf: "Fraunces", docx: "Fraunces" },
  { key: "times", label: "Times New Roman", css: "'Times New Roman', Times, serif", pdf: "Times-Roman", docx: "Times New Roman" },
  { key: "arial", label: "Arial", css: "Arial, Helvetica, sans-serif", pdf: "Helvetica", docx: "Arial" },
  { key: "courier", label: "Courier New", css: "'Courier New', Courier, monospace", pdf: "Courier", docx: "Courier New" },
];
export const faceInfo = (f: Face | undefined) => FACES.find((x) => x.key === (f ?? "sans"))!;

const SKIP = new Set(["SCRIPT", "STYLE", "META", "TITLE", "HEAD", "LINK", "XML", "TEMPLATE", "IFRAME", "OBJECT", "SVG", "IMG"]);
const BLOCKS = new Set(["DIV", "P", "LI", "H1", "H2", "H3", "H4", "H5", "H6", "BLOCKQUOTE", "PRE", "SECTION", "ARTICLE", "HEADER", "FOOTER", "CAPTION"]);
// <font size="1".."7"> as the browser's font-size command writes it, in pt
const FONT_SIZE_ATTR: Record<string, number> = { "1": 8, "2": 10, "3": 12, "4": 14, "5": 18, "6": 24, "7": 32 };
const HEADING_SIZE: Record<string, number> = { H1: 20, H2: 16, H3: 13 };

function toHex(c: string): string | undefined {
  c = c.trim().toLowerCase();
  if (/^#[0-9a-f]{6}$/.test(c)) return c;
  if (/^#[0-9a-f]{3}$/.test(c)) return "#" + [...c.slice(1)].map((x) => x + x).join("");
  const m = c.match(/^rgba?\(\s*(\d+)[\s,]+(\d+)[\s,]+(\d+)/);
  if (m) return "#" + [m[1], m[2], m[3]].map((x) => Math.min(255, Number(x)).toString(16).padStart(2, "0")).join("");
  return undefined;
}

function cssSize(v: string): number | undefined {
  const m = v.trim().match(/^([\d.]+)(pt|px|em|rem)?$/);
  if (!m) return undefined;
  const n = Number(m[1]);
  const pt = m[2] === "px" ? n * 0.75 : m[2] === "em" || m[2] === "rem" ? n * BASE_SIZE : n;
  return Math.round(Math.min(72, Math.max(6, pt)) * 2) / 2;
}

/** The first font named in a CSS font-family list, matched to one of FACES (pasted fonts map to the nearest one). */
export function faceOf(family: string): Face | undefined {
  const first = family.split(",")[0]!.replace(/["']/g, "").trim().toLowerCase();
  if (/courier|mono|consolas/.test(first)) return "courier";
  if (/fraunces/.test(first)) return "serif";
  if (/times|georgia|garamond|cambria|book antiqua|palatino|^serif$/.test(first)) return "times";
  if (/manrope|--font-manrope|__manrope/.test(first) || first.startsWith("var(")) return "sans";
  if (/arial|helvetica|calibri|verdana|tahoma|segoe|sans/.test(first)) return "arial";
  return undefined;
}

function styled(el: HTMLElement, base: Omit<Run, "text">): Omit<Run, "text"> {
  const r = { ...base };
  const tag = el.tagName;
  if (tag === "B" || tag === "STRONG" || tag in HEADING_SIZE) r.b = true;
  if (tag === "I" || tag === "EM") r.i = true;
  if (tag === "U" || tag === "INS") r.u = true;
  if (tag === "S" || tag === "STRIKE" || tag === "DEL") r.s = true;
  if (tag in HEADING_SIZE) r.size = HEADING_SIZE[tag];
  if (tag === "FONT") {
    const size = el.getAttribute("size");
    if (size && FONT_SIZE_ATTR[size]) r.size = FONT_SIZE_ATTR[size];
    const color = el.getAttribute("color");
    if (color && toHex(color)) r.color = toHex(color);
    const face = el.getAttribute("face");
    if (face && faceOf(face)) r.face = faceOf(face);
  }
  const st = el.style;
  if (st) {
    if (st.fontWeight) r.b = st.fontWeight === "bold" || st.fontWeight === "bolder" || Number(st.fontWeight) >= 600;
    if (st.fontStyle) r.i = st.fontStyle === "italic" || st.fontStyle === "oblique";
    const deco = `${st.textDecoration} ${st.textDecorationLine}`;
    if (deco.includes("underline")) r.u = true;
    if (deco.includes("line-through")) r.s = true;
    if (st.fontSize && cssSize(st.fontSize)) r.size = cssSize(st.fontSize);
    if (st.color && toHex(st.color)) r.color = toHex(st.color);
    if (st.fontFamily && faceOf(st.fontFamily)) r.face = faceOf(st.fontFamily);
    const bg = st.backgroundColor && toHex(st.backgroundColor);
    if (bg && bg !== "#ffffff") r.bg = bg;
  }
  return r;
}

/** Column shares from width:% on the cells of a table's first row (the rest share what is left). */
function widthsOf(table: HTMLElement, cols: number): number[] | undefined {
  const first = [...table.querySelectorAll("tr")].find((r) => r.closest("table") === table);
  if (!first) return undefined;
  const pct = [...first.children].slice(0, cols).map((c) => {
    const w = (c as HTMLElement).style?.width?.trim() ?? "";
    return w.endsWith("%") ? Math.max(0, parseFloat(w)) || 0 : 0;
  });
  while (pct.length < cols) pct.push(0);
  const set = pct.reduce((a, b) => a + b, 0);
  const free = pct.filter((w) => !w).length;
  if (!set || set >= 100 && free) return undefined;
  const rest = free ? (100 - set) / free : 0;
  const all = pct.map((w) => w || rest);
  const sum = all.reduce((a, b) => a + b, 0);
  return all.map((w) => w / sum);
}

/** Line spacing written on a block (unitless or %), if any. */
function lineHeightOf(el: HTMLElement): number | undefined {
  const v = el.style?.lineHeight?.trim();
  if (!v) return undefined;
  const n = v.endsWith("%") ? parseFloat(v) / 100 : /^[\d.]+$/.test(v) ? Number(v) : NaN;
  return Number.isFinite(n) && n > 0 ? Math.min(4, Math.max(0.8, n)) : undefined;
}

/** Space after a block (its bottom margin), in pt, if any. */
function gapOf(el: HTMLElement): number | undefined {
  const v = el.style?.marginBottom?.trim();
  if (!v) return undefined;
  const m = v.match(/^([\d.]+)(pt|px)?$/);
  if (!m) return undefined;
  const pt = m[2] === "px" ? Number(m[1]) * 0.75 : Number(m[1]);
  return Math.min(72, Math.round(pt));
}

function alignOf(el: HTMLElement, fallback: Align): Align {
  const a = (el.style?.textAlign || el.getAttribute("align") || "").toLowerCase();
  if (a === "center" || a === "right" || a === "justify" || a === "left") return a;
  if (a === "start") return "left";
  if (a === "end") return "right";
  return fallback;
}

/** Reads the editor's HTML into paragraphs of formatted runs. Browser only; returns [] on the server. */
export function parseRich(html: string): Block[] {
  if (!html.trim() || typeof DOMParser === "undefined") return [];
  return parseNodes(new DOMParser().parseFromString(html, "text/html").body, true);
}

function parseNodes(root: HTMLElement, allowTables: boolean): Block[] {
  const blocks: Block[] = [];
  let cur: Para | null = null;

  type Ctx = { list?: "bullet" | "number"; align: Align; lh?: number; after?: number };
  const open = (ctx: Ctx, kind?: Para["kind"]) =>
    (cur ??= { kind: kind ?? "p", align: ctx.align, runs: [], ...(ctx.lh ? { lh: ctx.lh } : {}), ...(ctx.after !== undefined ? { after: ctx.after } : {}) });
  const close = () => {
    if (cur) blocks.push(cur);
    cur = null;
  };

  const walk = (node: Node, st: Omit<Run, "text">, ctx: Ctx) => {
    if (node.nodeType === 3) {
      const text = (node.nodeValue ?? "").replace(/[\t\n\r ]+/g, " ");
      if (!text || (text === " " && !cur)) return; // whitespace between block tags
      const b = open(ctx);
      const last = b.runs[b.runs.length - 1];
      const same = last && JSON.stringify({ ...last, text: "" }) === JSON.stringify({ ...st, text: "" });
      if (same) last.text += text;
      else b.runs.push({ text, ...st });
      return;
    }
    if (node.nodeType !== 1) return;
    const el = node as HTMLElement;
    const tag = el.tagName;
    if (SKIP.has(tag) || tag.includes(":")) return; // also Word's <o:p> and friends
    if (tag === "HR") {
      close();
      blocks.push({ kind: "hr" });
      return;
    }
    if (tag === "TABLE") {
      close();
      if (!allowTables) return; // no tables inside table cells
      const rows: Cell[][] = [];
      el.querySelectorAll("tr").forEach((tr) => {
        if (tr.closest("table") !== el) return;
        const cells = [...tr.children]
          .filter((c) => c.tagName === "TD" || c.tagName === "TH")
          .map((c) => ({ head: c.tagName === "TH", paras: parseNodes(c as HTMLElement, false).filter((b): b is Para => b.kind !== "hr" && b.kind !== "table") }));
        if (cells.length) rows.push(cells);
      });
      const cols = Math.max(0, ...rows.map((r) => r.length));
      if (cols) blocks.push({ kind: "table", rows: rows.map((r) => [...r, ...Array.from({ length: cols - r.length }, () => ({ head: false, paras: [] }))]), cols, widths: widthsOf(el, cols), look: el.dataset.calc ? "receipt" : "grid" });
      return;
    }
    if (tag === "BR") {
      open(ctx);
      close();
      return;
    }
    const s = styled(el, st);
    if (tag === "UL" || tag === "OL") {
      close();
      const inner: Ctx = { list: tag === "UL" ? "bullet" : "number", align: alignOf(el, ctx.align), lh: lineHeightOf(el) ?? ctx.lh, after: gapOf(el) ?? ctx.after };
      el.childNodes.forEach((c) => walk(c, s, inner));
      close();
      return;
    }
    if (BLOCKS.has(tag)) {
      close();
      const inner: Ctx = { ...ctx, align: alignOf(el, ctx.align), lh: lineHeightOf(el) ?? ctx.lh, after: gapOf(el) ?? ctx.after };
      if (tag !== "LI") inner.list = undefined;
      open(inner, tag === "LI" ? (ctx.list ?? "bullet") : "p");
      el.childNodes.forEach((c) => walk(c, s, inner));
      // an empty <div></div> still made a block (a blank line); one that only held a <br> already closed it
      close();
      return;
    }
    el.childNodes.forEach((c) => walk(c, s, ctx));
  };

  // a table cell may set its own alignment and spacing
  root.childNodes.forEach((c) => walk(c, root === root.ownerDocument.body ? {} : styled(root, {}), { align: alignOf(root, "left"), lh: lineHeightOf(root), after: gapOf(root) }));
  close();

  // trim spaces at the ends of each paragraph, drop trailing empty paragraphs, number the lists
  for (const b of blocks) {
    if (b.kind === "hr" || b.kind === "table") continue;
    if (b.runs[0]) b.runs[0].text = b.runs[0].text.replace(/^ +/, "");
    const last = b.runs[b.runs.length - 1];
    if (last) last.text = last.text.replace(/ +$/, "");
    b.runs = b.runs.filter((r) => r.text);
  }
  const emptyPara = (b: Block) => b.kind !== "hr" && b.kind !== "table" && !b.runs.length;
  while (blocks.length && emptyPara(blocks[blocks.length - 1]!)) blocks.pop();
  let n = 0;
  for (const b of blocks) {
    n = b.kind === "number" ? n + 1 : 0;
    if (b.kind === "number") b.n = n;
  }
  return blocks;
}

const paraText = (p: Para) => p.runs.some((r) => r.text.trim());

/** True when the body has anything to print (text, a table or a line). */
export const hasText = (html: string) =>
  parseRich(html).some((b) => b.kind === "hr" || (b.kind === "table" ? b.rows.length > 0 : paraText(b)));

/** Plain text (older drafts) to editor HTML. */
export const textToHtml = (text: string) =>
  text
    .split("\n")
    .map((l) => `<div>${l ? l.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;") : "<br>"}</div>`)
    .join("");

/** Plain text of a table cell. */
export const cellText = (c: Cell) => c.paras.map((p) => p.runs.map((r) => r.text).join("")).join(" ").trim();
export const cellAlign = (c: Cell): Align => c.paras[0]?.align ?? "left";

/** Rows of a receipt-look table: the header bar, item rows, and the total bar (a later row made of header cells). */
export const receiptRows = (t: Table) =>
  t.rows.map((cells, r) => ({ kind: r === 0 ? ("head" as const) : cells.every((c) => c.head) ? ("total" as const) : ("item" as const), cells }));

/** Receipt items-table type sizes, in pt. */
export const RECEIPT_TABLE = { head: 7, item: 9, total: 12 } as const;
