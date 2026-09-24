"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutGrid, FilePlus2, Package, Users, Settings } from "lucide-react";
import { useStore } from "@/lib/store";
import { initials } from "@/lib/theme";
import { cx } from "./ui";

const NAV = [
  { href: "/", label: "Receipts", icon: LayoutGrid },
  { href: "/new", label: "New receipt", icon: FilePlus2 },
  { href: "/products", label: "Products", icon: Package },
  { href: "/customers", label: "Customers", icon: Users },
  { href: "/settings", label: "Settings", icon: Settings },
];

function Mark({ className }: { className?: string }) {
  const { shop } = useStore();
  return shop.logo ? (
    // eslint-disable-next-line @next/next/no-img-element -- user-uploaded data URL
    <img src={shop.logo} alt="" className={cx("rounded-full bg-white object-contain p-0.5 ring-2 ring-white/10", className)} />
  ) : (
    <div className={cx("grid place-items-center rounded-xl bg-lime font-display font-extrabold text-deep", className)}>{initials(shop.name)}</div>
  );
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const { shop } = useStore();
  const active = (href: string) => (href === "/" ? path === "/" : path.startsWith(href));

  return (
    <div className="min-h-dvh lg:pl-64">
      {/* desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col bg-deep px-4 py-6 text-white lg:flex">
        <Link href="/" className="mb-8 flex items-center gap-3 px-2">
          <Mark className="size-10 text-[15px]" />
          <div className="min-w-0">
            <div className="truncate font-display text-lg font-bold leading-tight">{shop.name}</div>
            <div className="text-[12px] text-mint/80">Receipt Studio</div>
          </div>
        </Link>
        <nav className="flex flex-col gap-1">
          {NAV.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={cx(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-[14px] font-semibold transition",
                active(href) ? "bg-white/12 text-white" : "text-mint/75 hover:bg-white/6 hover:text-white",
              )}
            >
              <Icon className={cx("size-[18px]", active(href) && "text-lime")} />
              {label}
            </Link>
          ))}
        </nav>
        <div className="mt-auto rounded-2xl bg-white/6 p-4 text-[12.5px] leading-relaxed text-mint/80">
          <div className="mb-1 font-display text-[14px] font-bold text-white">A4 · PDF · Excel</div>
          Every receipt downloads as a print-ready A4 PDF and an Excel file with live formulas.
        </div>
      </aside>

      {/* mobile top bar */}
      <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-line bg-canvas/90 px-4 py-3 backdrop-blur lg:hidden">
        <Mark className="size-8 text-[12px]" />
        <div className="font-display text-[17px] font-bold">{shop.name}</div>
      </header>

      <main className="mx-auto w-full max-w-[1500px] px-4 pb-28 pt-5 sm:px-6 lg:px-10 lg:pb-12 lg:pt-8">{children}</main>

      {/* mobile bottom nav */}
      <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-line bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden">
        {NAV.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cx("flex flex-col items-center gap-1 py-2.5 text-[11px] font-semibold", active(href) ? "text-brand" : "text-muted")}
          >
            {href === "/new" ? (
              <span className="-my-1 grid h-8 w-12 place-items-center rounded-xl bg-brand text-white shadow-md shadow-brand/30">
                <Icon className="size-[18px]" />
              </span>
            ) : (
              <Icon className="size-5" />
            )}
            {href === "/new" ? "New" : label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
