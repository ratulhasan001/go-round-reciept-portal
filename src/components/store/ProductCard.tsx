"use client";

import Link from "next/link";
import { Plus } from "lucide-react";
import { tk, type PublicProduct } from "@/lib/site";
import { ProductImage } from "./ProductImage";
import { useShop } from "./StoreContext";

export function ProductCard({ p }: { p: PublicProduct }) {
  const { add, links } = useShop();
  const href = links.store(`/products/${encodeURIComponent(p.id)}`);
  return (
    <article className="group relative flex flex-col">
      <Link href={href} className="relative block aspect-square overflow-hidden rounded-[22px] bg-sea-sand ring-1 ring-sea-line">
        <div className="size-full transition-transform duration-700 ease-out group-hover:scale-[1.04]">
          <ProductImage src={p.images[0]} name={p.name} />
        </div>
        {!p.inStock && <span className="absolute left-3 top-3 rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-wider text-sea-muted">Sold out</span>}
      </Link>
      <div className="mt-3 flex items-start gap-2 px-0.5">
        <div className="min-w-0 flex-1">
          {p.category && <p className="truncate text-[11px] font-extrabold uppercase tracking-[0.16em] text-sea-leaf">{p.subcategory || p.category}</p>}
          <h3 className="mt-0.5 line-clamp-2 text-[15px] font-bold leading-snug">
            <Link href={href} className="after:absolute after:inset-0 after:content-['']">
              {p.name}
            </Link>
          </h3>
          <p className="mt-1 text-[15px] font-extrabold tabular-nums">
            {tk(p.price)}
            {p.unit && <span className="text-[12.5px] font-semibold text-sea-muted"> / {p.unit}</span>}
          </p>
        </div>
        <button
          onClick={() => add(p)}
          disabled={!p.inStock}
          className="relative z-10 mt-1 grid size-10 shrink-0 place-items-center rounded-full bg-sea-ink text-white transition hover:bg-sea-teal active:scale-90 disabled:bg-sea-line disabled:text-sea-muted"
          aria-label={p.inStock ? `Add ${p.name} to cart` : `${p.name} is sold out`}
        >
          <Plus className="size-[18px]" strokeWidth={2.5} />
        </button>
      </div>
    </article>
  );
}
