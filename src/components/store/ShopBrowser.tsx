"use client";

import { useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search, SearchX, X } from "lucide-react";
import { plainText, type PublicProduct } from "@/lib/site";
import { ProductCard } from "./ProductCard";
import { cx } from "./ui";

const same = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();

const SORTS = [
  { key: "new", label: "Newest" },
  { key: "low", label: "Price: low to high" },
  { key: "high", label: "Price: high to low" },
  { key: "az", label: "Name A–Z" },
] as const;

export function ShopBrowser({ products }: { products: PublicProduct[] }) {
  const params = useSearchParams();
  const router = useRouter();
  const path = usePathname();
  const [q, setQ] = useState(params.get("q") ?? "");
  const category = params.get("category") ?? "";
  const subcategory = params.get("sub") ?? "";
  const sort = params.get("sort") ?? "new";
  const [inStockOnly, setInStockOnly] = useState(false);

  const categories = useMemo(() => {
    const m = new Map<string, number>();
    for (const p of products) if (p.category) m.set(p.category, (m.get(p.category) ?? 0) + 1);
    return [...m.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [products]);

  // the subcategories of the chosen category, e.g. Filter › Filter media, Filter accessories
  const subcategories = useMemo(() => {
    const m = new Map<string, number>();
    for (const p of products) if (p.subcategory && same(p.category, category)) m.set(p.subcategory, (m.get(p.subcategory) ?? 0) + 1);
    return [...m.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [products, category]);

  const setParams = (patch: Record<string, string>) => {
    const next = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(patch)) {
      if (v) next.set(k, v);
      else next.delete(k);
    }
    router.replace(`${path}${next.size ? `?${next}` : ""}`, { scroll: false });
  };
  const setParam = (k: string, v: string) => setParams({ [k]: v });
  // a new category starts with all of its subcategories
  const pickCategory = (c: string) => setParams({ category: c, sub: "" });

  const shown = useMemo(() => {
    const words = q.trim().toLowerCase().split(/\s+/).filter(Boolean);
    const list = products.filter(
      (p) =>
        (!category || same(p.category, category)) &&
        (!subcategory || same(p.subcategory, subcategory)) &&
        (!inStockOnly || p.inStock) &&
        words.every((w) => `${p.name} ${p.category} ${p.subcategory} ${plainText(p.description)}`.toLowerCase().includes(w)),
    );
    const byName = (a: PublicProduct, b: PublicProduct) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: "base" });
    if (sort === "low") list.sort((a, b) => a.price - b.price || byName(a, b));
    else if (sort === "high") list.sort((a, b) => b.price - a.price || byName(a, b));
    else if (sort === "az") list.sort(byName);
    // sold-out items go last, whatever the order
    return list.sort((a, b) => Number(b.inStock) - Number(a.inStock));
  }, [products, q, category, subcategory, sort, inStockOnly]);

  const subChip = (on: boolean) =>
    cx("h-9 shrink-0 rounded-full px-3.5 text-[13px] font-bold transition", on ? "bg-sea-teal text-white" : "bg-sea-teal-soft text-sea-teal hover:bg-sea-teal/15");
  const chip = (on: boolean) =>
    cx("h-10 shrink-0 rounded-full px-4 text-[13.5px] font-bold transition", on ? "bg-sea-ink text-white" : "border border-sea-line bg-sea-paper text-sea-body hover:border-sea-ink/30");

  return (
    <>
      <div className="sticky top-16 z-20 -mx-4 mb-8 border-b border-sea-line/70 bg-sea-cream/92 px-4 pb-3 pt-3 backdrop-blur-md sm:top-[72px] sm:-mx-6 sm:px-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <div className="relative md:w-80">
            <Search className="pointer-events-none absolute left-4 top-1/2 size-[18px] -translate-y-1/2 text-sea-muted" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search plants, ferts, tools…"
              aria-label="Search products"
              type="search"
              className="h-11 w-full rounded-full border border-sea-line bg-white pl-11 pr-10 text-[15px] font-medium outline-none transition placeholder:font-normal placeholder:text-sea-muted/70 focus:border-sea-teal focus:ring-4 focus:ring-sea-teal/12"
            />
            {q && (
              <button onClick={() => setQ("")} className="absolute right-2 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-full text-sea-muted hover:bg-sea-sand" aria-label="Clear search">
                <X className="size-4" />
              </button>
            )}
          </div>
          <div className="flex items-center gap-2 md:ml-auto">
            <label className="flex h-11 cursor-pointer items-center gap-2 rounded-full border border-sea-line bg-white px-4 text-[13.5px] font-bold text-sea-body">
              <input type="checkbox" checked={inStockOnly} onChange={(e) => setInStockOnly(e.target.checked)} className="size-4 accent-sea-ink" />
              In stock
            </label>
            <select
              value={sort}
              onChange={(e) => setParam("sort", e.target.value === "new" ? "" : e.target.value)}
              aria-label="Sort by"
              className="h-11 flex-1 rounded-full border border-sea-line bg-white px-4 text-[13.5px] font-bold text-sea-body outline-none focus:border-sea-teal md:flex-none"
            >
              {SORTS.map((s) => (
                <option key={s.key} value={s.key}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
        </div>
        {categories.length > 0 && (
          <div className="-mx-4 mt-3 flex gap-2 overflow-x-auto px-4 [scrollbar-width:none] sm:-mx-6 sm:px-6 [&::-webkit-scrollbar]:hidden">
            <button className={chip(!category)} onClick={() => pickCategory("")}>
              All
            </button>
            {categories.map(([c, n]) => (
              <button key={c} className={chip(same(category, c))} onClick={() => pickCategory(c)} aria-pressed={same(category, c)}>
                {c} <span className="opacity-60">{n}</span>
              </button>
            ))}
          </div>
        )}
        {subcategories.length > 0 && (
          <div className="-mx-4 mt-2 flex items-center gap-2 overflow-x-auto px-4 [scrollbar-width:none] sm:-mx-6 sm:px-6 [&::-webkit-scrollbar]:hidden" aria-label={`${category} types`}>
            <span className="shrink-0 pl-1 text-[13px] font-extrabold text-sea-muted" aria-hidden>
              ›
            </span>
            <button className={subChip(!subcategory)} onClick={() => setParam("sub", "")}>
              All {category}
            </button>
            {subcategories.map(([c, n]) => (
              <button key={c} className={subChip(same(subcategory, c))} onClick={() => setParam("sub", c)} aria-pressed={same(subcategory, c)}>
                {c} <span className="opacity-60">{n}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <p className="mb-5 text-[13px] font-semibold text-sea-muted" aria-live="polite">
        {shown.length} product{shown.length === 1 ? "" : "s"}
        {category && ` in ${category}`}
        {subcategory && ` › ${subcategory}`}
      </p>

      {shown.length ? (
        <div className="grid grid-cols-2 gap-x-4 gap-y-9 sm:gap-x-6 md:grid-cols-3 lg:grid-cols-4">
          {shown.map((p) => (
            <ProductCard key={p.id} p={p} />
          ))}
        </div>
      ) : (
        <div className="grid place-items-center rounded-[28px] border border-dashed border-sea-line px-6 py-20 text-center">
          <SearchX className="size-9 text-sea-muted" />
          <p className="mt-4 font-serif text-[24px]">Nothing found</p>
          <p className="mt-1 text-[14px] text-sea-muted">{products.length ? "Try another word or category." : "Products will appear here soon."}</p>
          {(q || category || inStockOnly) && (
            <button
              onClick={() => {
                setQ("");
                setInStockOnly(false);
                pickCategory("");
              }}
              className="mt-5 text-[14px] font-bold text-sea-teal underline-offset-4 hover:underline"
            >
              Clear filters
            </button>
          )}
        </div>
      )}
    </>
  );
}
