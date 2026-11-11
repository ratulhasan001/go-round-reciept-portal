"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, ShoppingBag, UserRound, X } from "lucide-react";
import { waLink } from "@/lib/site";
import { useShop } from "./StoreContext";
import { FacebookIcon, WhatsAppIcon } from "./Icons";

const isOn = (path: string, href: string, home: string) => (href === home ? path === href : path === href.split("?")[0] || path.startsWith(href + "/"));

export function Header() {
  const { shop, count, ready, links } = useShop();
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [bump, setBump] = useState(0);

  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 8);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);
  useEffect(() => setOpen(false), [path]); // eslint-disable-line react-hooks/set-state-in-effect -- close the menu after navigating
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => void (document.body.style.overflow = "");
  }, [open]);
  useEffect(() => {
    if (ready && count) setBump((b) => b + 1); // eslint-disable-line react-hooks/set-state-in-effect -- replay the badge pop when the count changes
  }, [count, ready]);

  return (
    <>
      {shop.site.announcement.trim() && (
        <div className="bg-sea-ink px-4 py-2 text-center text-[12.5px] font-semibold text-sea-cream">{shop.site.announcement}</div>
      )}
      <header className={`sticky top-0 z-40 border-b transition-[background-color,border-color,box-shadow] duration-300 ${scrolled ? "border-sea-line bg-sea-cream/90 shadow-[0_6px_24px_-18px_rgba(17,58,45,0.5)] backdrop-blur-md" : "border-transparent bg-sea-cream"}`}>
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4 sm:h-[72px] sm:px-6">
          <Link href={links.store()} className="flex min-w-0 items-center gap-2.5" aria-label={`${shop.name} home`}>
            {shop.logo && (
              // eslint-disable-next-line @next/next/no-img-element -- shop logo
              <img src={shop.logo} alt="" className="size-10 shrink-0 rounded-full object-contain sm:size-11" />
            )}
            <span className="truncate font-serif text-[22px] font-semibold leading-none sm:text-[25px]">{shop.name}</span>
          </Link>

          <nav className="mx-auto hidden items-center gap-1 lg:flex" aria-label="Main">
            {links.nav.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                aria-current={isOn(path, l.href, links.store()) ? "page" : undefined}
                className="group relative rounded-full px-3.5 py-2 text-[14px] font-semibold text-sea-body transition-colors hover:text-sea-ink aria-[current=page]:text-sea-ink"
              >
                {l.label}
                <span className="absolute inset-x-3.5 -bottom-0.5 h-0.5 origin-left scale-x-0 rounded-full bg-sea-leaf transition-transform duration-300 group-hover:scale-x-100 group-aria-[current=page]:scale-x-100" />
              </Link>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-1 lg:ml-0">
            <Link href={links.store("/account")} className="grid size-11 place-items-center rounded-full text-sea-ink transition hover:bg-sea-sand/70" aria-label="My account">
              <UserRound className="size-[21px]" />
            </Link>
            <Link href={links.store("/cart")} className="relative grid size-11 place-items-center rounded-full text-sea-ink transition hover:bg-sea-sand/70" aria-label={`Cart, ${count} item${count === 1 ? "" : "s"}`}>
              <ShoppingBag className="size-[21px]" />
              {ready && count > 0 && (
                <span key={bump} className="sea-pop absolute right-0.5 top-0.5 grid h-5 min-w-5 place-items-center rounded-full bg-sea-teal px-1 text-[11px] font-extrabold text-white">
                  {count > 99 ? "99+" : count}
                </span>
              )}
            </Link>
            <button onClick={() => setOpen(true)} className="grid size-11 place-items-center rounded-full text-sea-ink transition hover:bg-sea-sand/70 lg:hidden" aria-label="Open menu" aria-expanded={open}>
              <Menu className="size-[22px]" />
            </button>
          </div>
        </div>
      </header>

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Menu">
          <button className="absolute inset-0 bg-sea-ink/30 backdrop-blur-[2px]" aria-label="Close menu" onClick={() => setOpen(false)} />
          <div className="sea-drawer-in absolute inset-y-0 right-0 flex w-[min(86vw,360px)] flex-col bg-sea-cream shadow-2xl">
            <div className="flex h-16 items-center justify-between px-5">
              <span className="store-eyebrow">Menu</span>
              <button onClick={() => setOpen(false)} className="grid size-11 place-items-center rounded-full hover:bg-sea-sand/70" aria-label="Close menu">
                <X className="size-[22px]" />
              </button>
            </div>
            <nav className="flex flex-col px-3" aria-label="Main">
              {links.nav.map((l, i) => (
                <Link
                  key={l.href}
                  href={l.href}
                  aria-current={isOn(path, l.href, links.store()) ? "page" : undefined}
                  className="sea-sheet-in flex items-center justify-between rounded-2xl px-3 py-3.5 font-serif text-[24px] text-sea-ink transition hover:bg-sea-sand/60 aria-[current=page]:italic aria-[current=page]:text-sea-teal"
                  style={{ animationDelay: `${60 + i * 35}ms` }}
                >
                  {l.label}
                </Link>
              ))}
              <Link href={links.store("/account")} className="sea-sheet-in mt-1 rounded-2xl px-3 py-3.5 font-serif text-[24px] text-sea-ink hover:bg-sea-sand/60" style={{ animationDelay: "290ms" }}>
                My account
              </Link>
            </nav>
            <div className="mt-auto flex gap-2 p-5">
              <a href={waLink(shop.site.whatsapp)} target="_blank" rel="noopener noreferrer" className="flex h-12 flex-1 items-center justify-center gap-2 rounded-full bg-sea-ink text-[14px] font-bold text-white">
                <WhatsAppIcon className="size-5 text-wa" /> WhatsApp
              </a>
              {shop.site.facebook && (
                <a href={shop.site.facebook} target="_blank" rel="noopener noreferrer" className="grid size-12 place-items-center rounded-full border border-sea-line text-sea-ink" aria-label="Facebook">
                  <FacebookIcon className="size-5" />
                </a>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
