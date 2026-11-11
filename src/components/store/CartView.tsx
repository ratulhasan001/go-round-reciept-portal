"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Minus, Plus, ShoppingBag, Trash2 } from "lucide-react";
import { tk, type PublicProduct } from "@/lib/site";
import { ProductImage } from "./ProductImage";
import { useShop } from "./StoreContext";
import { Fish } from "./Art";
import { btn } from "./ui";

/** Brings the cart up to date with the shop's current prices and stock (once per page view). */
export function useFreshCart() {
  const { refresh, ready, lines } = useShop();
  const [note, setNote] = useState("");
  const has = lines.length > 0;
  useEffect(() => {
    if (!ready || !has) return;
    let alive = true;
    fetch("/api/site/products")
      .then((r) => (r.ok ? r.json() : null))
      .then((b: { products?: PublicProduct[] } | null) => {
        if (!alive || !b?.products) return;
        const gone = refresh(b.products);
        if (gone.length) setNote("Some items sold out and were taken out of your cart.");
      })
      .catch(() => null);
    return () => {
      alive = false;
    };
  }, [ready, has, refresh]);
  return note;
}

export function QtyStepper({ id, qty }: { id: string; qty: number }) {
  const { setQty } = useShop();
  return (
    <div className="flex h-10 items-center rounded-full border border-sea-line bg-white">
      <button onClick={() => setQty(id, qty - 1)} className="grid size-10 place-items-center rounded-full hover:bg-sea-sand/60" aria-label="One less">
        <Minus className="size-3.5" />
      </button>
      <span className="w-6 text-center text-[14px] font-extrabold tabular-nums">{qty}</span>
      <button onClick={() => setQty(id, qty + 1)} className="grid size-10 place-items-center rounded-full hover:bg-sea-sand/60" aria-label="One more">
        <Plus className="size-3.5" />
      </button>
    </div>
  );
}

export function CartView() {
  const { lines, subtotal, remove, ready, shop, links } = useShop();
  const note = useFreshCart();

  if (!ready) return <div className="h-64 animate-pulse rounded-[28px] bg-sea-sand/50" />;
  if (!lines.length)
    return (
      <div className="grid place-items-center rounded-[28px] border border-dashed border-sea-line px-6 py-20 text-center">
        <Fish className="sea-bob w-20" />
        <p className="mt-5 font-serif text-[28px]">Your cart is empty</p>
        <p className="mt-1 text-[14.5px] text-sea-muted">Let&apos;s find something for your tank.</p>
        <Link href={links.store("/products")} className={btn("primary", "lg", "mt-7")}>
          <ShoppingBag className="size-4" /> Go to the shop
        </Link>
      </div>
    );

  const free = shop.site.freeDeliveryOver;
  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
      <div>
        {note && <p className="mb-4 rounded-2xl bg-amber-50 px-4 py-3 text-[13.5px] font-semibold text-amber-800">{note}</p>}
        <ul className="divide-y divide-sea-line border-y border-sea-line">
          {lines.map((l) => (
            <li key={l.id} className="flex gap-4 py-5">
              <Link href={links.store(`/products/${encodeURIComponent(l.id)}`)} className="size-20 shrink-0 overflow-hidden rounded-2xl ring-1 ring-sea-line sm:size-24">
                <ProductImage src={l.image} name={l.name} />
              </Link>
              <div className="flex min-w-0 flex-1 flex-col">
                <div className="flex items-start justify-between gap-3">
                  <Link href={links.store(`/products/${encodeURIComponent(l.id)}`)} className="line-clamp-2 text-[15px] font-bold leading-snug hover:text-sea-teal">
                    {l.name}
                  </Link>
                  <p className="shrink-0 text-[15px] font-extrabold tabular-nums">{tk(l.price * l.qty)}</p>
                </div>
                <p className="mt-0.5 text-[13px] text-sea-muted">
                  {tk(l.price)}
                  {l.unit && ` / ${l.unit}`}
                </p>
                <div className="mt-auto flex items-center justify-between pt-3">
                  <QtyStepper id={l.id} qty={l.qty} />
                  <button onClick={() => remove(l.id)} className="inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-[13px] font-bold text-sea-muted hover:bg-red-50 hover:text-red-600">
                    <Trash2 className="size-4" /> Remove
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
        <Link href={links.store("/products")} className="mt-5 inline-block text-[14px] font-bold text-sea-teal hover:underline">
          ← Keep shopping
        </Link>
      </div>
      <aside className="lg:sticky lg:top-24 lg:self-start">
        <div className="rounded-[28px] border border-sea-line bg-sea-paper p-6">
          <div className="flex justify-between text-[15px] font-semibold">
            <span>Subtotal</span>
            <span className="font-extrabold tabular-nums">{tk(subtotal)}</span>
          </div>
          <p className="mt-2 text-[13px] text-sea-muted">Delivery is added at checkout.</p>
          {free > 0 && (
            <p className="mt-3 rounded-xl bg-sea-teal-soft px-3 py-2 text-[13px] font-semibold text-sea-teal">
              {subtotal >= free ? "🎉 You get free delivery!" : `Add ${tk(free - subtotal)} more for free delivery.`}
            </p>
          )}
          <Link href={links.store("/checkout")} className={btn("primary", "lg", "mt-5 w-full")}>
            Checkout <ArrowRight className="size-4" />
          </Link>
          <p className="mt-3 text-center text-[12.5px] text-sea-muted">Pay with bKash or bank transfer</p>
        </div>
      </aside>
    </div>
  );
}
