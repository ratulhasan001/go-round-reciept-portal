"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, Minus, Package, Plus, Search } from "lucide-react";
import type { Product } from "@/lib/types";
import { money } from "@/lib/calc";
import { calcTableHtml } from "@/lib/calcTable";
import { Switch, cx } from "./ui";

// Picks products from the saved price list and hands back editor HTML to drop in at the caret.

type Format = "table" | "list" | "text";
const FORMATS: { key: Format; label: string }[] = [
  { key: "table", label: "Table" },
  { key: "list", label: "Bullet list" },
  { key: "text", label: "In the text" },
];

const esc = (t: string) => t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const unitOf = (p: Product) => p.unit?.trim() ?? "";

/** Table: the receipt's items table with quantities, amounts and a total. List / text: product, then unit, then price. */
export function productsHtml(list: Product[], format: Format, prices: boolean, qty: (p: Product) => number = () => 1) {
  const price = (p: Product) => `BDT ${money(p.price)}${unitOf(p) ? ` / ${esc(unitOf(p))}` : ""}`;
  if (format === "table") return calcTableHtml(list.map((product) => ({ product, qty: qty(product) })));
  const unitOnly = (p: Product) => (unitOf(p) ? ` (${esc(unitOf(p))})` : "");
  if (format === "list") return `<ul>${list.map((p) => `<li>${esc(p.name)}${prices ? ` – ${price(p)}` : unitOnly(p)}</li>`).join("")}</ul>`;
  return list.map((p) => `${esc(p.name)}${prices ? ` (${price(p)})` : unitOnly(p)}`).join(", ");
}

export default function ProductPicker({ products, onInsert, onClose }: { products: Product[]; onInsert: (html: string) => void; onClose: () => void }) {
  const box = useRef<HTMLDivElement>(null);
  const [q, setQ] = useState("");
  const [picked, setPicked] = useState<string[]>([]); // ids, in the order they were ticked
  const [format, setFormat] = useState<Format>("table");
  const [prices, setPrices] = useState(true);
  const [qtys, setQtys] = useState<Record<string, number>>({});
  const qtyOf = (p: Product) => qtys[p.id] ?? 1;
  const setQty = (id: string, n: number) => setQtys((m) => ({ ...m, [id]: Math.max(0, Math.round(n * 1000) / 1000) }));

  // close on a click outside or Escape
  useEffect(() => {
    const down = (e: MouseEvent) => box.current && !box.current.contains(e.target as Node) && onClose();
    const key = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("mousedown", down);
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("mousedown", down);
      document.removeEventListener("keydown", key);
    };
  }, [onClose]);

  const shown = useMemo(() => {
    const t = q.trim().toLowerCase();
    return [...products].filter((p) => !t || p.name.toLowerCase().includes(t)).sort((a, b) => a.name.localeCompare(b.name));
  }, [products, q]);

  const toggle = (id: string) => setPicked((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]));
  const chosen = picked.map((id) => products.find((p) => p.id === id)).filter((p): p is Product => !!p);

  return (
    <div ref={box} className="absolute left-0 top-9 z-40 w-[min(360px,calc(100vw-3rem))] rounded-2xl border border-line bg-white p-3 shadow-2xl" role="dialog" aria-label="Insert products">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-faint" />
        <input
          autoFocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && shown[0] && (e.preventDefault(), toggle(shown[0].id))}
          placeholder={`Search ${products.length} products…`}
          className="h-9 w-full rounded-xl border border-line bg-white pl-9 pr-3 text-[13.5px] text-ink placeholder:text-faint focus:border-brand focus:outline-none focus:ring-4 focus:ring-brand/10"
        />
      </div>

      <div className="mt-2 max-h-60 overflow-y-auto overscroll-contain">
        {shown.length === 0 && <div className="px-2 py-6 text-center text-[13px] text-muted">{products.length ? "No product matches" : "No products saved yet - add them in Products"}</div>}
        {shown.map((p) => {
          const on = picked.includes(p.id);
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => toggle(p.id)}
              className={cx("flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left transition", on ? "bg-soft" : "hover:bg-canvas")}
            >
              <span className={cx("grid size-4.5 shrink-0 place-items-center rounded-[5px] border", on ? "border-brand bg-brand text-white" : "border-faint bg-white")}>{on && <Check className="size-3" strokeWidth={3} />}</span>
              <span className="min-w-0 flex-1 truncate text-[13.5px] font-semibold text-ink">{p.name}</span>
              {unitOf(p) && <span className="max-w-20 shrink-0 truncate rounded-full bg-canvas px-1.5 text-[11px] font-semibold text-muted">{unitOf(p)}</span>}
              {p.inStock === false && <span className="shrink-0 rounded-full bg-red-50 px-1.5 text-[10.5px] font-bold text-red-600">Out</span>}
              <span className="shrink-0 text-[12.5px] tabular-nums text-muted">{money(p.price)}</span>
            </button>
          );
        })}
      </div>

      <div className="mt-2 border-t border-line pt-2.5">
        <div className="grid grid-cols-3 rounded-lg bg-black/5 p-0.5">
          {FORMATS.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => setFormat(f.key)}
              className={cx("rounded-md py-1 text-[12.5px] font-semibold transition", format === f.key ? "bg-white text-ink shadow-sm" : "text-muted")}
            >
              {f.label}
            </button>
          ))}
        </div>
        {format === "table" ? (
          chosen.length > 0 && (
            <div className="mt-2 max-h-40 overflow-y-auto rounded-xl bg-canvas p-1.5">
              {chosen.map((p) => (
                <div key={p.id} className="flex items-center gap-2 px-1 py-1">
                  <span className="min-w-0 flex-1 truncate text-[12.5px] font-semibold text-ink">{p.name}</span>
                  <div className="flex shrink-0 items-center rounded-lg border border-line bg-white">
                    <button type="button" aria-label={`Fewer ${p.name}`} onClick={() => setQty(p.id, qtyOf(p) - 1)} className="grid size-7 place-items-center text-muted hover:text-ink">
                      <Minus className="size-3.5" />
                    </button>
                    <input
                      type="number"
                      inputMode="decimal"
                      min={0}
                      aria-label={`Quantity of ${p.name}`}
                      value={qtyOf(p)}
                      onChange={(e) => setQty(p.id, Number(e.target.value) || 0)}
                      className="h-7 w-10 bg-transparent text-center text-[13px] font-semibold tabular-nums text-ink focus:outline-none"
                    />
                    <button type="button" aria-label={`More ${p.name}`} onClick={() => setQty(p.id, qtyOf(p) + 1)} className="grid size-7 place-items-center text-muted hover:text-ink">
                      <Plus className="size-3.5" />
                    </button>
                  </div>
                  <span className="w-20 shrink-0 text-right text-[12.5px] font-bold tabular-nums text-ink">{money(p.price * qtyOf(p))}</span>
                </div>
              ))}
              <div className="mt-1 flex justify-between border-t border-line px-1 pt-1.5 text-[12.5px] font-bold text-ink">
                <span>Total</span>
                <span className="tabular-nums">BDT {money(chosen.reduce((sum, p) => sum + p.price * qtyOf(p), 0))}</span>
              </div>
            </div>
          )
        ) : (
          <div className="mt-2 flex items-center justify-between gap-2 px-1">
            <span className="text-[12.5px] font-semibold text-body">Show prices</span>
            <Switch label="Show prices" checked={prices} onChange={setPrices} />
          </div>
        )}
        <button
          type="button"
          disabled={!chosen.length}
          onClick={() => onInsert(productsHtml(chosen, format, prices, qtyOf))}
          className="mt-2.5 flex h-9 w-full items-center justify-center gap-2 rounded-xl bg-brand text-[13.5px] font-semibold text-white transition hover:bg-brand-600 disabled:opacity-40"
        >
          <Package className="size-4" />
          {chosen.length ? `Insert ${chosen.length} product${chosen.length > 1 ? "s" : ""}` : "Tick products to insert"}
        </button>
      </div>
    </div>
  );
}
