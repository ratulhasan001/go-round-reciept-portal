"use client";

import { ViewTransition } from "react";
import { FilePlus2, Package, ReceiptText, Settings, TicketPercent, Users, type LucideIcon } from "lucide-react";
import type { Mode, SyncState } from "@/lib/store";
import { useStore } from "@/lib/store";
import { initials } from "@/lib/theme";
import { cx } from "./ui";

export interface Section {
  key: string;
  href: string;
  label: string;
  short: string; // for tight spaces
  blurb: string;
  icon: LucideIcon;
}

/** Every part of the app, in navbar order. */
export const SECTIONS: Section[] = [
  { key: "receipts", href: "/receipts", label: "Receipts", short: "Receipts", blurb: "Every receipt, payment and balance due", icon: ReceiptText },
  { key: "new", href: "/new", label: "New receipt", short: "New", blurb: "Make a receipt in under a minute", icon: FilePlus2 },
  { key: "products", href: "/products", label: "Products", short: "Products", blurb: "Price list and stock status", icon: Package },
  { key: "customers", href: "/customers", label: "Customers", short: "Customers", blurb: "Contacts, spending and dues", icon: Users },
  { key: "coupons", href: "/coupons", label: "Coupons", short: "Coupons", blurb: "Coupon codes, validity and usage", icon: TicketPercent },
  { key: "settings", href: "/settings", label: "Settings", short: "Settings", blurb: "Shop details, charges and backups", icon: Settings },
];

export const sectionIndex = (path: string) => SECTIONS.findIndex((s) => path === s.href || path.startsWith(s.href + "/"));

/** Transition type for moving between two sections: slide the way the navbar reads. */
export const lateral = (from: number, to: number) => [to >= from ? "nav-right" : "nav-left"];

/**
 * The section's icon badge. It carries a shared view-transition name, so the icon on a home tile
 * flies into the page header when the section opens (and back again on the way home).
 */
export function SectionIcon({ section, className, iconClass }: { section: string; className?: string; iconClass?: string }) {
  const s = SECTIONS.find((x) => x.key === section)!;
  const Icon = s.icon;
  return (
    <ViewTransition name={`section-icon-${section}`} share="morph" default="none">
      <div className={cx("grid shrink-0 place-items-center", className)}>
        <Icon className={iconClass ?? "size-5"} />
      </div>
    </ViewTransition>
  );
}

export function Mark({ className }: { className?: string }) {
  const { shop } = useStore();
  return shop.logo ? (
    // eslint-disable-next-line @next/next/no-img-element -- user-uploaded data URL
    <img src={shop.logo} alt="" className={cx("rounded-full bg-white object-contain p-0.5 ring-2 ring-white/10", className)} />
  ) : (
    <div className={cx("grid place-items-center rounded-xl bg-lime font-display font-extrabold text-deep", className)}>{initials(shop.name)}</div>
  );
}

export function syncLabel(mode: Mode, sync: SyncState, short = false) {
  if (mode === "loading") return "Loading…";
  if (mode === "local") return short ? "This device" : "Saved on this device";
  if (sync === "saving") return "Saving…";
  if (sync === "offline") return short ? "Offline" : "Offline · will sync when back online";
  return short ? "Synced" : "Synced to cloud";
}

export function SyncDot({ mode, sync }: { mode: Mode; sync: SyncState }) {
  const color = mode !== "cloud" ? "bg-faint" : sync === "offline" ? "bg-amber-400" : sync === "saving" ? "bg-aqua" : "bg-lime";
  return (
    <span className="relative flex size-2 shrink-0">
      {mode === "cloud" && sync !== "offline" && <span className={cx("absolute inset-0 animate-ping rounded-full opacity-60", color)} />}
      <span className={cx("relative size-2 rounded-full", color)} />
    </span>
  );
}
