"use client";

import { useEffect, useRef, useState } from "react";
import {
  AlignCenter, AlignJustify, AlignLeft, AlignRight, Bold, Columns3, Eraser, Highlighter, Italic, List, ListOrdered, Minus, Palette, Redo2,
  PackagePlus, Rows3, Strikethrough, Table2, Trash2, Underline, Undo2,
} from "lucide-react";
import type { Product } from "@/lib/types";
import ProductPicker from "./ProductPicker";
import { recalcTables } from "@/lib/calcTable";
import { BASE_SIZE, FACES, LINE_HEIGHT, LINE_SPACINGS, PARA_GAPS, SIZES, faceOf } from "@/lib/richtext";
import { cx } from "./ui";

// A small Word-style editor for the letter body. It edits HTML in a contentEditable box with the
// browser's editing commands; parseRich() (src/lib/richtext.ts) turns that HTML into the preview,
// the PDF and the .docx, so whatever can't be printed (images, scripts, odd paste) is simply ignored.

type Cmd = "bold" | "italic" | "underline" | "strikeThrough" | "insertUnorderedList" | "insertOrderedList" | "justifyLeft" | "justifyCenter" | "justifyRight" | "justifyFull";
const STATE_CMDS: Cmd[] = ["bold", "italic", "underline", "strikeThrough", "insertUnorderedList", "insertOrderedList", "justifyLeft", "justifyCenter", "justifyRight", "justifyFull"];

// paragraph-level elements that line spacing and paragraph gaps are written on
const LEAF = "div, p, li, h1, h2, h3, h4, blockquote, td, th";
const CONTAINER = "div, p, li, h1, h2, h3, h4, blockquote, table, ul, ol, hr, pre";

const cellHtml = (tag: "td" | "th") => `<${tag}><br></${tag}>`;
const tableHtml = (rows: number, cols: number) =>
  `<table><tbody>${Array.from({ length: rows }, (_, r) => `<tr>${Array.from({ length: cols }, () => cellHtml(r === 0 ? "th" : "td")).join("")}</tr>`).join("")}</tbody></table><div><br></div>`;

export default function RichEditor({
  value, onChange, placeholder, products,
}: {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  products?: Product[]; // when given, a toolbar button inserts saved products at the caret
}) {
  const box = useRef<HTMLDivElement>(null);
  const saved = useRef<Range | null>(null);
  const [active, setActive] = useState<Record<string, boolean>>({});
  const [inTable, setInTable] = useState(false);
  const [size, setSize] = useState("");
  const [face, setFace] = useState("");
  const [grid, setGrid] = useState<{ open: boolean; r: number; c: number }>({ open: false, r: 0, c: 0 });
  const [empty, setEmpty] = useState(!value);
  const [picking, setPicking] = useState(false);
  const [spacing, setSpacing] = useState({ lh: String(LINE_HEIGHT), gap: "0" });

  // the box is uncontrolled: fill it once (the parent remounts it with a new key to replace the text)
  useEffect(() => {
    if (box.current) box.current.innerHTML = value;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- first value only
  }, []);

  const emit = () => {
    const el = box.current;
    if (!el) return;
    recalcTables(el); // product tables: amounts and total follow the prices and quantities
    setEmpty(!el.textContent?.trim() && !el.querySelector("table, hr, li"));
    onChange(el.innerHTML);
  };

  // remember the caret while the toolbar has focus, and light up the buttons for the text under it
  useEffect(() => {
    const onSel = () => {
      const sel = document.getSelection();
      const el = box.current;
      if (!sel || !sel.rangeCount || !el || !el.contains(sel.anchorNode)) return;
      saved.current = sel.getRangeAt(0).cloneRange();
      const next: Record<string, boolean> = {};
      for (const c of STATE_CMDS) {
        try {
          next[c] = document.queryCommandState(c);
        } catch {
          next[c] = false;
        }
      }
      setActive(next);
      const node = sel.anchorNode instanceof Element ? sel.anchorNode : sel.anchorNode?.parentElement;
      setInTable(!!node?.closest("td, th"));
      const blk = node?.closest(LEAF);
      if (blk && blk !== el && el.contains(blk)) {
        const st = (blk as HTMLElement).style;
        setSpacing({ lh: st.lineHeight || String(LINE_HEIGHT), gap: st.marginBottom ? String(parseFloat(st.marginBottom)) : "0" });
      } else setSpacing({ lh: String(LINE_HEIGHT), gap: "0" });
      if (node && el.contains(node)) {
        const cs = getComputedStyle(node);
        setSize(String(Math.round(parseFloat(cs.fontSize) * 0.75 * 2) / 2));
        setFace(faceOf(cs.fontFamily) ?? "sans");
      }
    };
    document.addEventListener("selectionchange", onSel);
    return () => document.removeEventListener("selectionchange", onSel);
  }, []);

  const restore = () => {
    const el = box.current;
    if (!el) return;
    el.focus();
    const sel = document.getSelection();
    let r = saved.current;
    if (!r || !el.contains(r.startContainer)) {
      // never clicked into the text yet: continue at the end of the letter
      r = document.createRange();
      r.selectNodeContents(el);
      r.collapse(false);
    }
    sel?.removeAllRanges();
    sel?.addRange(r);
  };

  const exec = (cmd: string, arg?: string) => {
    restore();
    document.execCommand("styleWithCSS", false, cmd === "hiliteColor" ? "true" : "false");
    document.execCommand(cmd, false, arg);
    emit();
  };

  const applySize = (pt: number) => {
    restore();
    document.execCommand("styleWithCSS", false, "false");
    document.execCommand("fontSize", false, "7");
    box.current?.querySelectorAll('font[size="7"]').forEach((f) => {
      const span = document.createElement("span");
      span.style.fontSize = `${pt}pt`;
      span.append(...f.childNodes);
      // a <font> may also carry colour or face from the same command
      const color = f.getAttribute("color");
      if (color) span.style.color = color;
      const fc = f.getAttribute("face");
      if (fc) span.style.fontFamily = fc;
      f.replaceWith(span);
    });
    setSize(String(pt));
    emit();
  };

  /** Sets line spacing or the gap after on every paragraph the selection touches (like Word). */
  const applySpacing = (kind: "lh" | "gap", value: number) => {
    restore();
    const el = box.current;
    const sel = document.getSelection();
    if (!el || !sel?.rangeCount) return;
    const r = sel.getRangeAt(0);
    // innermost paragraphs under the selection
    const targets = [...el.querySelectorAll<HTMLElement>(LEAF)].filter((b) => r.intersectsNode(b) && !b.querySelector(CONTAINER));
    // loose text at the top level (the first line typed is not wrapped in a paragraph yet): wrap it
    const wraps: Node[][] = [];
    let group: Node[] = [];
    const flush = () => {
      if (group.some((n) => r.intersectsNode(n))) wraps.push(group);
      group = [];
    };
    el.childNodes.forEach((n) => (n instanceof Element && n.matches(CONTAINER) ? flush() : group.push(n)));
    flush();
    for (const g of wraps) {
      const d = document.createElement("div");
      g[0]!.parentNode!.insertBefore(d, g[0]!);
      d.append(...g);
      targets.push(d);
    }
    for (const b of targets) {
      if (kind === "lh") b.style.lineHeight = value === LINE_HEIGHT ? "" : String(value);
      else b.style.marginBottom = value ? `${value}pt` : "";
      if (!b.getAttribute("style")) b.removeAttribute("style");
    }
    // keep the same paragraphs selected
    if (targets.length) {
      const nr = document.createRange();
      nr.setStartBefore(targets[0]!.firstChild ?? targets[0]!);
      nr.setEndAfter(targets[targets.length - 1]!.lastChild ?? targets[targets.length - 1]!);
      sel.removeAllRanges();
      sel.addRange(nr);
    }
    setSpacing((sp) => ({ ...sp, [kind]: String(value) }));
    emit();
  };

  const currentCell = () => {
    const r = saved.current;
    const n = r?.startContainer;
    const el = n instanceof Element ? n : n?.parentElement;
    const cell = el?.closest("td, th") as HTMLTableCellElement | null;
    return cell && box.current?.contains(cell) ? cell : null;
  };

  const tableOp = (op: "row" | "col" | "delRow" | "delCol" | "delTable") => {
    const cell = currentCell();
    if (!cell) return;
    const tr = cell.parentElement as HTMLTableRowElement;
    const table = cell.closest("table")!;
    const idx = cell.cellIndex;
    const rows = [...table.querySelectorAll("tr")].filter((r) => r.closest("table") === table);
    if (op === "row") {
      const row = document.createElement("tr");
      row.innerHTML = Array.from({ length: tr.cells.length }, () => cellHtml("td")).join("");
      tr.after(row);
    } else if (op === "col") {
      for (const r of rows) {
        const ref = r.cells[Math.min(idx, r.cells.length - 1)];
        const tag = ref?.tagName === "TH" ? "th" : "td";
        const tmp = document.createElement("tr");
        tmp.innerHTML = cellHtml(tag);
        if (ref) ref.after(tmp.firstChild!);
        else r.append(tmp.firstChild!);
      }
    } else if (op === "delRow") {
      if (rows.length <= 1) table.remove();
      else tr.remove();
    } else if (op === "delCol") {
      if (tr.cells.length <= 1) table.remove();
      else for (const r of rows) r.cells[idx]?.remove();
    } else table.remove();
    setInTable(!!currentCell()?.isConnected);
    emit();
  };

  const insertTable = (r: number, c: number) => {
    setGrid({ open: false, r: 0, c: 0 });
    exec("insertHTML", tableHtml(r, c));
  };

  // Tab / Shift+Tab move between table cells
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key !== "Tab") return;
    const sel = document.getSelection();
    const n = sel?.anchorNode;
    const el = n instanceof Element ? n : n?.parentElement;
    const cell = el?.closest("td, th");
    if (!cell) return;
    e.preventDefault();
    const cells = [...cell.closest("table")!.querySelectorAll("td, th")];
    const next = cells[cells.indexOf(cell) + (e.shiftKey ? -1 : 1)];
    if (!next) return;
    const range = document.createRange();
    range.selectNodeContents(next);
    range.collapse(false);
    sel!.removeAllRanges();
    sel!.addRange(range);
  };

  const keep = (e: React.MouseEvent) => e.preventDefault(); // keep the caret in the text while clicking the toolbar
  const sep = <span className="mx-0.5 h-6 w-px shrink-0 bg-line" />;
  const selCls = "h-8 shrink-0 rounded-lg border border-line bg-white px-2 text-[13px] text-ink focus:outline-none focus:ring-2 focus:ring-brand/20";

  return (
    <div className="rounded-xl border border-line bg-white focus-within:border-brand focus-within:ring-4 focus-within:ring-brand/10">
      {/* toolbar */}
      <div className="flex flex-wrap items-center gap-1 border-b border-line bg-canvas/60 p-1.5" role="toolbar" aria-label="Formatting">
        {products && (
          <div className="relative">
            <button
              type="button"
              onMouseDown={keep}
              onClick={() => setPicking((v) => !v)}
              aria-expanded={picking}
              title="Insert products from your price list"
              className={cx(
                "flex h-8 shrink-0 items-center gap-1.5 rounded-lg px-2.5 text-[13px] font-semibold transition",
                picking ? "bg-deep text-lime" : "bg-soft text-brand hover:bg-lime/25",
              )}
            >
              <PackagePlus className="size-4" /> Product
            </button>
            {picking && (
              <ProductPicker
                products={products}
                onClose={() => setPicking(false)}
                onInsert={(html) => {
                  setPicking(false);
                  exec("insertHTML", html);
                }}
              />
            )}
          </div>
        )}
        <ToolBtn icon={Undo2} label="Undo (Ctrl/⌘ + Z)" pressed={false} onClick={() => exec("undo")} />
        <ToolBtn icon={Redo2} label="Redo (Ctrl/⌘ + Shift + Z)" pressed={false} onClick={() => exec("redo")} />
        {sep}
        <select className={selCls} aria-label="Paragraph style" defaultValue="" onChange={(e) => (exec("formatBlock", e.target.value), (e.target.value = ""))}>
          <option value="" disabled>
            Style
          </option>
          <option value="div">Normal text</option>
          <option value="h1">Heading 1</option>
          <option value="h2">Heading 2</option>
          <option value="h3">Heading 3</option>
        </select>
        <select className={selCls} aria-label="Font" value={face} onChange={(e) => (setFace(e.target.value), exec("fontName", FACES.find((f) => f.key === e.target.value)!.label))}>
          <option value="" disabled>
            Font
          </option>
          {FACES.map((f) => (
            <option key={f.key} value={f.key}>
              {f.label}
            </option>
          ))}
        </select>
        <select className={cx(selCls, "w-[68px]")} aria-label="Font size" value={SIZES.includes(Number(size)) ? size : ""} onChange={(e) => applySize(Number(e.target.value))}>
          <option value="" disabled>
            {size || BASE_SIZE}
          </option>
          {SIZES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        {sep}
        <ToolBtn icon={Bold} label="Bold (Ctrl/⌘ + B)" pressed={!!active.bold} onClick={() => exec("bold")} />
        <ToolBtn icon={Italic} label="Italic (Ctrl/⌘ + I)" pressed={!!active.italic} onClick={() => exec("italic")} />
        <ToolBtn icon={Underline} label="Underline (Ctrl/⌘ + U)" pressed={!!active.underline} onClick={() => exec("underline")} />
        <ToolBtn icon={Strikethrough} label="Strikethrough" pressed={!!active.strikeThrough} onClick={() => exec("strikeThrough")} />
        <label title="Text colour" className="relative grid size-8 shrink-0 cursor-pointer place-items-center rounded-lg text-body hover:bg-black/5" onMouseDown={() => restore()}>
          <Palette className="size-4" />
          <input type="color" defaultValue="#113a2d" aria-label="Text colour" className="absolute inset-0 cursor-pointer opacity-0" onChange={(e) => exec("foreColor", e.target.value)} />
        </label>
        <label title="Highlight" className="relative grid size-8 shrink-0 cursor-pointer place-items-center rounded-lg text-body hover:bg-black/5" onMouseDown={() => restore()}>
          <Highlighter className="size-4" />
          <input type="color" defaultValue="#fff3a3" aria-label="Highlight colour" className="absolute inset-0 cursor-pointer opacity-0" onChange={(e) => exec("hiliteColor", e.target.value)} />
        </label>
        {sep}
        <ToolBtn icon={AlignLeft} label="Align left" pressed={!!active.justifyLeft} onClick={() => exec("justifyLeft")} />
        <ToolBtn icon={AlignCenter} label="Center" pressed={!!active.justifyCenter} onClick={() => exec("justifyCenter")} />
        <ToolBtn icon={AlignRight} label="Align right" pressed={!!active.justifyRight} onClick={() => exec("justifyRight")} />
        <ToolBtn icon={AlignJustify} label="Justify" pressed={!!active.justifyFull} onClick={() => exec("justifyFull")} />
        <select
          className={cx(selCls, "w-[104px]")}
          aria-label="Line spacing"
          title="Line spacing"
          value={LINE_SPACINGS.some((x) => String(x.value) === spacing.lh) ? spacing.lh : ""}
          onChange={(e) => applySpacing("lh", Number(e.target.value))}
        >
          <option value="" disabled>
            ↕ {spacing.lh}
          </option>
          {LINE_SPACINGS.map((x) => (
            <option key={x.value} value={String(x.value)}>
              ↕ {x.label}
            </option>
          ))}
        </select>
        <select
          className={cx(selCls, "w-[118px]")}
          aria-label="Space after paragraph"
          title="Space after paragraph"
          value={PARA_GAPS.includes(Number(spacing.gap)) ? spacing.gap : ""}
          onChange={(e) => applySpacing("gap", Number(e.target.value))}
        >
          <option value="" disabled>
            ¶ {spacing.gap} pt after
          </option>
          {PARA_GAPS.map((g) => (
            <option key={g} value={String(g)}>
              ¶ {g ? `${g} pt after` : "No gap"}
            </option>
          ))}
        </select>
        {sep}
        <ToolBtn icon={List} label="Bullet list" pressed={!!active.insertUnorderedList} onClick={() => exec("insertUnorderedList")} />
        <ToolBtn icon={ListOrdered} label="Numbered list" pressed={!!active.insertOrderedList} onClick={() => exec("insertOrderedList")} />
        {sep}
        <div className="relative">
          <ToolBtn icon={Table2} label="Insert table" pressed={grid.open} onClick={() => setGrid((g) => ({ ...g, open: !g.open }))} />
          {grid.open && (
            <div className="absolute left-0 top-9 z-30 rounded-xl border border-line bg-white p-2 shadow-xl" onMouseDown={keep} onMouseLeave={() => setGrid((g) => ({ ...g, r: 0, c: 0 }))}>
              <div className="grid grid-cols-6 gap-1">
                {Array.from({ length: 36 }, (_, k) => {
                  const [r, c] = [Math.floor(k / 6) + 1, (k % 6) + 1];
                  return (
                    <button
                      key={k}
                      type="button"
                      aria-label={`${r} by ${c} table`}
                      onMouseEnter={() => setGrid({ open: true, r, c })}
                      onClick={() => insertTable(r, c)}
                      className={cx("size-5 rounded-[4px] border", r <= grid.r && c <= grid.c ? "border-brand bg-soft" : "border-line bg-white")}
                    />
                  );
                })}
              </div>
              <div className="mt-1.5 text-center text-[12px] font-semibold text-muted">{grid.r ? `${grid.r} × ${grid.c} table` : "Pick a size"}</div>
            </div>
          )}
        </div>
        {inTable && (
          <>
            <ToolBtn icon={Rows3} label="Add row below" pressed={false} onClick={() => tableOp("row")} />
            <ToolBtn icon={Columns3} label="Add column right" pressed={false} onClick={() => tableOp("col")} />
            <button type="button" onMouseDown={keep} onClick={() => tableOp("delRow")} className="h-8 shrink-0 rounded-lg px-2 text-[12px] font-semibold text-body hover:bg-black/5">
              − Row
            </button>
            <button type="button" onMouseDown={keep} onClick={() => tableOp("delCol")} className="h-8 shrink-0 rounded-lg px-2 text-[12px] font-semibold text-body hover:bg-black/5">
              − Column
            </button>
            <ToolBtn icon={Trash2} label="Delete table" pressed={false} onClick={() => tableOp("delTable")} />
          </>
        )}
        <ToolBtn icon={Minus} label="Horizontal line" pressed={false} onClick={() => exec("insertHorizontalRule")} />
        <ToolBtn icon={Eraser} label="Clear formatting" pressed={false} onClick={() => exec("removeFormat")} />
      </div>

      {/* page */}
      <div className="relative">
        {empty && <div className="pointer-events-none absolute left-4 top-3 text-[10pt] text-faint">{placeholder}</div>}
        <div
          ref={box}
          contentEditable
          suppressContentEditableWarning
          role="textbox"
          aria-multiline
          aria-label="Letter body"
          onInput={emit}
          onBlur={emit}
          onKeyDown={onKeyDown}
          className="rich-editor min-h-72 px-4 py-3 text-[10pt] leading-[1.65] text-body outline-none"
        />
      </div>
    </div>
  );
}

function ToolBtn({ icon: Icon, label, pressed, onClick }: { icon: typeof Bold; label: string; pressed: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={pressed}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={cx("grid size-8 shrink-0 place-items-center rounded-lg transition", pressed ? "bg-deep text-lime" : "text-body hover:bg-black/5")}
    >
      <Icon className="size-4" />
    </button>
  );
}
