"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Check, X } from "lucide-react";
import { waLink } from "@/lib/site";
import { useShop } from "./StoreContext";
import { WhatsAppIcon } from "./Icons";

/** WhatsApp button in the corner, and the "Added to cart" sheet. */
export function Floating() {
  const { shop, added, dismissAdded, count, links } = useShop();
  const path = usePathname();
  const onCheckout = path.startsWith(links.store("/checkout")) || path.startsWith(links.store("/cart"));

  useEffect(() => {
    if (!added) return;
    const t = setTimeout(dismissAdded, 3800);
    return () => clearTimeout(t);
  }, [added, dismissAdded]);

  return (
    <>
      {!onCheckout && (
        <a
          href={waLink(shop.site.whatsapp, `Hi ${shop.name}! `)}
          target="_blank"
          rel="noopener noreferrer"
          className="fixed bottom-5 right-4 z-30 grid size-14 place-items-center rounded-full bg-wa text-white shadow-[0_10px_30px_-8px_rgba(37,211,102,0.7)] transition hover:scale-105 active:scale-95 sm:bottom-6 sm:right-6"
          aria-label="Chat with us on WhatsApp"
        >
          <WhatsAppIcon className="size-7" />
        </a>
      )}
      {added && !onCheckout && (
        <div className="fixed inset-x-3 bottom-3 z-40 sm:inset-x-auto sm:bottom-6 sm:right-24 sm:w-[360px]" role="status">
          <div key={added.at} className="sea-sheet-in flex items-center gap-3 rounded-2xl bg-sea-ink p-3 pl-4 text-white shadow-2xl">
            <span className="grid size-8 shrink-0 place-items-center rounded-full bg-sea-sprout text-sea-ink">
              <Check className="size-4" strokeWidth={3} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13.5px] font-bold">{added.name}</p>
              <p className="text-[12px] text-white/70">Added · {count} in your cart</p>
            </div>
            <Link href={links.store("/cart")} onClick={dismissAdded} className="rounded-full bg-white px-4 py-2 text-[13px] font-bold text-sea-ink">
              View cart
            </Link>
            <button onClick={dismissAdded} className="grid size-8 place-items-center rounded-full text-white/60 hover:text-white" aria-label="Dismiss">
              <X className="size-4" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
