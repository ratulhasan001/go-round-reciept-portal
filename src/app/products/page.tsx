"use client";

import { useMemo } from "react";
import { Package, PackageCheck, PackageX } from "lucide-react";
import { useStore } from "@/lib/store";
import { uid } from "@/lib/calc";
import type { Product } from "@/lib/types";
import { ListEditor } from "@/components/ListEditor";
import { cx } from "@/components/ui";

const inStock = (p: Product) => p.inStock !== false;
const byName = (a: Product, b: Product) => a.name.trim().localeCompare(b.name.trim(), undefined, { numeric: true, sensitivity: "base" });
const updated = (p: Product) => p.updatedAt ?? 0;
const fmtUpdated = (p: Product) =>
  p.updatedAt ? `Updated ${new Date(p.updatedAt).toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}` : "Not edited recently";

export default function ProductsPage() {
  const { products, setProducts, invoices } = useStore();

  // units sold per product name, for "Best selling"
  const sold = useMemo(() => {
    const m = new Map<string, number>();
    for (const inv of invoices) for (const it of inv.items) m.set(it.description.trim().toLowerCase(), (m.get(it.description.trim().toLowerCase()) ?? 0) + (Number(it.qty) || 1));
    return m;
  }, [invoices]);
  const units = (p: Product) => sold.get(p.name.trim().toLowerCase()) ?? 0;

  return (
    <ListEditor<Product>
      section="products"
      title="Products"
      subtitle="Your price list - pick these while making a receipt and the price fills in."
      icon={<Package className="size-5" />}
      noun="Product"
      rows={products}
      onChange={setProducts}
      blank={() => ({ id: uid(), name: "", price: 0, inStock: true, updatedAt: Date.now() })}
      touch={(p) => ({ ...p, updatedAt: Date.now() })}
      sorts={[
        { label: "Recently updated", compare: (a, b) => updated(b) - updated(a) },
        { label: "Oldest updated", compare: (a, b) => updated(a) - updated(b) },
        { label: "Name A → Z", compare: byName },
        { label: "Name Z → A", compare: (a, b) => byName(b, a) },
        { label: "Price: low to high", compare: (a, b) => a.price - b.price || byName(a, b) },
        { label: "Price: high to low", compare: (a, b) => b.price - a.price || byName(a, b) },
        { label: "Best selling", compare: (a, b) => units(b) - units(a) || byName(a, b) },
        { label: "In stock first", compare: (a, b) => Number(inStock(b)) - Number(inStock(a)) || byName(a, b) },
        { label: "Out of stock first", compare: (a, b) => Number(inStock(a)) - Number(inStock(b)) || byName(a, b) },
      ]}
      filters={[
        { label: "In stock", test: inStock },
        { label: "Out of stock", test: (p) => !inStock(p) },
      ]}
      lead={(p) => (
        <span
          key={String(inStock(p))}
          title={fmtUpdated(p)}
          className={cx("animate-lead-pop grid size-9 place-items-center rounded-xl", inStock(p) ? "bg-soft text-brand" : "bg-red-50 text-red-500")}
        >
          {inStock(p) ? <PackageCheck className="size-[18px]" /> : <PackageX className="size-[18px]" />}
        </span>
      )}
      columns={[
        { key: "name", label: "Product name", placeholder: "e.g. Seachem Prime 325ml", width: "minmax(0,2fr)" },
        { key: "inStock", label: "Status", type: "toggle", on: "In stock", off: "Out of stock", width: "160px" },
        { key: "price", label: "Unit price (BDT)", type: "number", placeholder: "0.00", width: "160px", align: "right" },
      ]}
    />
  );
}
