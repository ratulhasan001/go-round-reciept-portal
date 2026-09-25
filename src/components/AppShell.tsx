"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutGrid, FilePlus2, Package, Users, TicketPercent, Settings, LogOut } from "lucide-react";
import type { Mode, SyncState } from "@/lib/store";
import { useStore } from "@/lib/store";
import { initials } from "@/lib/theme";
import { cx } from "./ui";

const NAV = [
  { href: "/", label: "Receipts", icon: LayoutGrid },
  { href: "/new", label: "New receipt", icon: FilePlus2 },
  { href: "/products", label: "Products", icon: Package },
  { href: "/customers", label: "Customers", icon: Users },
  { href: "/coupons", label: "Coupons", icon: TicketPercent },
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
  const { shop, mode, sync, authEnabled, logout } = useStore();
  const active = (href: string) => (href === "/" ? path === "/" : path.startsWith(href));

  if (path === "/login") return <>{children}</>;

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
        <div className="mt-auto flex flex-col gap-2">
          <div className="flex items-center gap-2.5 rounded-2xl bg-white/6 px-4 py-3 text-[12.5px] text-mint/85">
            <SyncDot mode={mode} sync={sync} />
            {syncLabel(mode, sync)}
          </div>
          {authEnabled && (
            <button onClick={() => void logout()} className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-[14px] font-semibold text-mint/75 transition hover:bg-white/6 hover:text-white">
              <LogOut className="size-[18px]" /> Log out
            </button>
          )}
        </div>
      </aside>

      {/* mobile top bar */}
      <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-line bg-canvas/90 px-4 py-3 backdrop-blur lg:hidden">
        <Mark className="size-8 text-[12px]" />
        <div className="mr-auto font-display text-[17px] font-bold">{shop.name}</div>
        <span className="flex items-center gap-1.5 text-[11.5px] font-semibold text-muted" title={syncLabel(mode, sync)}>
          <SyncDot mode={mode} sync={sync} />
          <span className="hidden min-[380px]:inline">{syncLabel(mode, sync, true)}</span>
        </span>
        {authEnabled && (
          <button onClick={() => void logout()} className="grid size-9 place-items-center rounded-xl text-muted hover:bg-black/5 hover:text-ink" aria-label="Log out">
            <LogOut className="size-[18px]" />
          </button>
        )}
      </header>

      <main className="mx-auto w-full max-w-[1500px] px-4 pb-28 pt-5 sm:px-6 lg:px-10 lg:pb-12 lg:pt-8">{children}</main>

      {/* mobile bottom nav */}
      <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-6 border-t border-line bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden">
        {NAV.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cx("flex min-w-0 flex-col items-center gap-1 truncate px-0.5 py-2.5 text-[10.5px] font-semibold", active(href) ? "text-brand" : "text-muted")}
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

function syncLabel(mode: Mode, sync: SyncState, short = false) {
  if (mode === "loading") return "Loading…";
  if (mode === "local") return short ? "This device" : "Saved on this device";
  if (sync === "saving") return "Saving…";
  if (sync === "offline") return short ? "Offline" : "Offline · will sync when back online";
  return short ? "Synced" : "Synced to cloud";
}

function SyncDot({ mode, sync }: { mode: Mode; sync: SyncState }) {
  const color = mode !== "cloud" ? "bg-faint" : sync === "offline" ? "bg-amber-400" : sync === "saving" ? "bg-aqua animate-pulse" : "bg-lime";
  return <span className={cx("size-2 shrink-0 rounded-full", color)} />;
}
