"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Minus, Plus, ShieldCheck, Truck, Wallet } from "lucide-react";
import { richHtml, tk, waLink, type PublicProduct } from "@/lib/site";
import { ProductImage } from "./ProductImage";
import { useShop } from "./StoreContext";
import { WhatsAppIcon } from "./Icons";
import { btn, cx } from "./ui";

export function ProductDetail({ p }: { p: PublicProduct }) {
  const { add, shop, links } = useShop();
  const router = useRouter();
  const [qty, setQty] = useState(1);
  const [pic, setPic] = useState(0);

  return (
    <div className="grid gap-8 lg:grid-cols-[1.1fr_1fr] lg:gap-14">
      <div className="lg:sticky lg:top-24 lg:self-start">
        <div className="aspect-square overflow-hidden rounded-[28px] bg-sea-sand ring-1 ring-sea-line">
          <ProductImage key={pic} src={p.images[pic]} name={p.name} thumb={false} eager className="animate-fade-up" />
        </div>
        {p.images.length > 1 && (
          <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
            {p.images.map((src, i) => (
              <button
                key={src}
                onClick={() => setPic(i)}
                className={cx("size-[72px] shrink-0 overflow-hidden rounded-2xl ring-2 transition", i === pic ? "ring-sea-teal" : "ring-transparent opacity-70 hover:opacity-100")}
                aria-label={`Photo ${i + 1}`}
                aria-pressed={i === pic}
              >
                <ProductImage src={src} name="" />
              </button>
            ))}
          </div>
        )}
      </div>

      <div>
        {p.category && (
          <p className="store-eyebrow flex flex-wrap items-center gap-x-2 !text-sea-leaf">
            <Link href={`${links.store("/products")}?category=${encodeURIComponent(p.category)}`} className="hover:underline">
              {p.category}
            </Link>
            {p.subcategory && (
              <>
                <span aria-hidden className="text-sea-muted">›</span>
                <Link href={`${links.store("/products")}?category=${encodeURIComponent(p.category)}&sub=${encodeURIComponent(p.subcategory)}`} className="hover:underline">
                  {p.subcategory}
                </Link>
              </>
            )}
          </p>
        )}
        <h1 className="mt-3 font-serif text-[34px] leading-[1.08] sm:text-[44px]">{p.name}</h1>
        <p className="mt-4 text-[28px] font-extrabold tabular-nums">
          {tk(p.price)}
          {p.unit && <span className="text-[15px] font-semibold text-sea-muted"> / {p.unit}</span>}
        </p>
        <p className={cx("mt-2 inline-flex items-center gap-2 text-[13.5px] font-bold", p.inStock ? "text-sea-leaf" : "text-sea-muted")}>
          <span className={cx("size-2 rounded-full", p.inStock ? "bg-sea-leaf" : "bg-sea-muted")} />
          {p.inStock ? "In stock" : "Sold out right now"}
        </p>

        {p.inStock ? (
          <div className="mt-7 flex flex-wrap items-center gap-3">
            <div className="flex h-[52px] items-center rounded-full border border-sea-line bg-white">
              <button onClick={() => setQty((q) => Math.max(1, q - 1))} className="grid size-[52px] place-items-center rounded-full hover:bg-sea-sand/60" aria-label="One less">
                <Minus className="size-4" />
              </button>
              <span className="w-8 text-center text-[16px] font-extrabold tabular-nums" aria-live="polite">
                {qty}
              </span>
              <button onClick={() => setQty((q) => Math.min(99, q + 1))} className="grid size-[52px] place-items-center rounded-full hover:bg-sea-sand/60" aria-label="One more">
                <Plus className="size-4" />
              </button>
            </div>
            <button onClick={() => add(p, qty)} className={btn("outline", "lg", "flex-1 sm:flex-none")}>
              Add to cart
            </button>
            <button
              onClick={() => {
                add(p, qty);
                router.push(links.store("/checkout"));
              }}
              className={btn("primary", "lg", "w-full sm:w-auto")}
            >
              Buy now
            </button>
          </div>
        ) : (
          <a href={waLink(shop.site.whatsapp, `Hi! When will "${p.name}" be back in stock?`)} target="_blank" rel="noopener noreferrer" className={btn("primary", "lg", "mt-7")}>
            <WhatsAppIcon className="size-[18px] text-wa" /> Ask when it&apos;s back
          </a>
        )}

        {p.description.trim() && <div className="rich-desc mt-9 border-t border-sea-line pt-7 text-[15.5px] leading-relaxed text-sea-body" dangerouslySetInnerHTML={{ __html: richHtml(p.description) }} />}

        <ul className="mt-9 grid gap-3 border-t border-sea-line pt-7 text-[14px] text-sea-body">
          <li className="flex gap-3">
            <Truck className="size-5 shrink-0 text-sea-teal" />
            <span>
              {shop.site.deliveryNote.trim() || "Delivery all over Bangladesh"}
              {shop.site.freeDeliveryOver > 0 && ` · free on orders over ${tk(shop.site.freeDeliveryOver)}`}
            </span>
          </li>
          <li className="flex gap-3">
            <Wallet className="size-5 shrink-0 text-sea-teal" /> Pay with bKash or bank transfer
          </li>
          <li className="flex gap-3">
            <ShieldCheck className="size-5 shrink-0 text-sea-teal" /> Packed by hand and checked before it leaves us
          </li>
        </ul>
        <a
          href={waLink(shop.site.whatsapp, `Hi! I have a question about "${p.name}".`)}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-6 inline-flex items-center gap-2 text-[14px] font-bold text-sea-ink underline decoration-sea-line underline-offset-4 hover:decoration-sea-ink"
        >
          <WhatsAppIcon className="size-[18px] text-wa" /> Ask about this product
        </a>
      </div>
    </div>
  );
}
