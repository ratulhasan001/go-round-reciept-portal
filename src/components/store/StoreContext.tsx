"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { linksFor, type Links, type PublicProduct, type PublicShop } from "@/lib/site";

export interface CartLine {
  id: string;
  name: string;
  price: number;
  unit: string;
  image?: string;
  qty: number;
}

interface Ctx {
  shop: PublicShop;
  links: Links; // store / verify links for the address this page is on
  online: boolean; // false = no database: browsing works, ordering doesn't
  lines: CartLine[];
  count: number;
  subtotal: number;
  ready: boolean;
  add: (p: PublicProduct, qty?: number) => void;
  setQty: (id: string, qty: number) => void;
  remove: (id: string) => void;
  clear: () => void;
  /** Brings names, prices and stock up to date; returns the ids that are no longer for sale. */
  refresh: (products: PublicProduct[]) => string[];
  /** The little "added" sheet. */
  added: { name: string; at: number } | null;
  dismissAdded: () => void;
}

const C = createContext<Ctx | null>(null);
const KEY = "go-round-cart:v1";

export function StoreProvider({ shop, online, host, children }: { shop: PublicShop; online: boolean; host: string; children: React.ReactNode }) {
  const links = useMemo(() => linksFor(host), [host]);
  const [lines, setLines] = useState<CartLine[]>([]);
  const [ready, setReady] = useState(false);
  const [added, setAdded] = useState<Ctx["added"]>(null);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(KEY) ?? "[]");
      if (Array.isArray(saved)) setLines(saved.filter((l) => l && typeof l.id === "string" && l.qty > 0)); // eslint-disable-line react-hooks/set-state-in-effect -- read once from this browser
    } catch {
      /* private mode / bad data */
    }
    setReady(true);
    // another tab changed the cart
    const onStorage = (e: StorageEvent) => {
      if (e.key !== KEY) return;
      try {
        setLines(JSON.parse(e.newValue ?? "[]"));
      } catch {
        /* ignore */
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem(KEY, JSON.stringify(lines));
    } catch {
      /* quota / private mode */
    }
  }, [lines, ready]);

  const add = useCallback((p: PublicProduct, qty = 1) => {
    setLines((ls) => {
      const hit = ls.find((l) => l.id === p.id);
      if (hit) return ls.map((l) => (l.id === p.id ? { ...l, qty: Math.min(99, l.qty + qty) } : l));
      return [...ls, { id: p.id, name: p.name, price: p.price, unit: p.unit, image: p.images[0], qty: Math.min(99, qty) }];
    });
    setAdded({ name: p.name, at: Date.now() });
  }, []);

  const refresh = useCallback((products: PublicProduct[]) => {
    const byId = new Map(products.map((p) => [p.id, p]));
    const gone: string[] = [];
    setLines((ls) =>
      ls.flatMap((l) => {
        const p = byId.get(l.id);
        if (!p || !p.inStock) {
          gone.push(l.id);
          return [];
        }
        return [{ ...l, name: p.name, price: p.price, unit: p.unit, image: p.images[0] }];
      }),
    );
    return gone;
  }, []);

  const value = useMemo<Ctx>(
    () => ({
      shop,
      links,
      online,
      lines,
      ready,
      count: lines.reduce((s, l) => s + l.qty, 0),
      subtotal: lines.reduce((s, l) => s + l.qty * l.price, 0),
      add,
      setQty: (id, qty) => setLines((ls) => (qty <= 0 ? ls.filter((l) => l.id !== id) : ls.map((l) => (l.id === id ? { ...l, qty: Math.min(99, qty) } : l)))),
      remove: (id) => setLines((ls) => ls.filter((l) => l.id !== id)),
      clear: () => setLines([]),
      refresh,
      added,
      dismissAdded: () => setAdded(null),
    }),
    [shop, links, online, lines, ready, add, refresh, added],
  );
  return <C.Provider value={value}>{children}</C.Provider>;
}

export function useShop() {
  const c = useContext(C);
  if (!c) throw new Error("useShop must be used inside the store layout");
  return c;
}

// orders placed on this browser, so Order status can fill itself in
const RECENT = "go-round-recent-orders";
export function rememberOrder(code: string, phone: string) {
  try {
    const list = (JSON.parse(localStorage.getItem(RECENT) ?? "[]") as { code: string; phone: string }[]).filter((o) => o.code !== code);
    localStorage.setItem(RECENT, JSON.stringify([{ code, phone }, ...list].slice(0, 10)));
  } catch {
    /* ignore */
  }
}
export function recentOrders(): { code: string; phone: string }[] {
  try {
    return JSON.parse(localStorage.getItem(RECENT) ?? "[]");
  } catch {
    return [];
  }
}
