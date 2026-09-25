"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import type { Customer, Invoice, Product, Shop } from "./types";
import { DEFAULT_SHOP, SEED_CUSTOMERS, SEED_INVOICES, SEED_PRODUCTS } from "./seed";
import { uid } from "./calc";

const KEY = "go-round-receipts:v1"; // this device's copy of the data
const OUTBOX = "go-round-receipts:outbox"; // changes not yet confirmed by the server
const MIGRATED = "go-round-receipts:migrated"; // this device's old data has been moved to the database

interface Data {
  shop: Shop;
  products: Product[];
  customers: Customer[];
  invoices: Invoice[];
}

/** "local" = no database configured (data lives in this browser); "cloud" = saved to the database. */
export type Mode = "loading" | "local" | "cloud";
export type SyncState = "idle" | "saving" | "offline";

interface Store extends Data {
  ready: boolean;
  mode: Mode;
  sync: SyncState;
  authEnabled: boolean;
  setShop: (s: Shop) => void;
  setProducts: (p: Product[]) => void;
  setCustomers: (c: Customer[]) => void;
  saveInvoice: (inv: Invoice) => Invoice;
  deleteInvoice: (id: string) => void;
  nextInvoiceNumber: () => string;
  exportBackup: () => string;
  importBackup: (json: string) => void;
  resetAll: () => void;
  logout: () => Promise<void>;
}

const seed = (): Data => ({
  shop: DEFAULT_SHOP,
  products: SEED_PRODUCTS,
  customers: SEED_CUSTOMERS,
  invoices: SEED_INVOICES,
});

const Ctx = createContext<Store | null>(null);

const norm = (s: string) => s.trim().toLowerCase();

const withDefaults = (shop?: Partial<Shop> | null): Shop => ({
  ...DEFAULT_SHOP,
  ...shop,
  rates: {
    pay: { ...DEFAULT_SHOP.rates.pay, ...shop?.rates?.pay },
    courier: { ...DEFAULT_SHOP.rates.courier, ...shop?.rates?.courier },
  },
});

// ---------- document diffing (what changed since the last sync) ----------

type Kind = "shop" | "product" | "customer" | "invoice";
interface Change {
  kind: Kind;
  id: string;
  data: object | null; // null = deleted
}
const LISTS: [Kind, keyof Omit<Data, "shop">][] = [
  ["product", "products"],
  ["customer", "customers"],
  ["invoice", "invoices"],
];

function docs(d: Data) {
  const m = new Map<string, Change>();
  m.set("shop:shop", { kind: "shop", id: "shop", data: d.shop });
  for (const [kind, list] of LISTS) for (const x of d[list] as { id: string }[]) m.set(`${kind}:${x.id}`, { kind, id: x.id, data: x });
  return m;
}

function diff(prev: Data, next: Data): Change[] {
  const a = docs(prev);
  const b = docs(next);
  const out: Change[] = [];
  for (const [k, c] of b) if (!a.has(k) || JSON.stringify(a.get(k)!.data) !== JSON.stringify(c.data)) out.push(c);
  for (const [k, c] of a) if (!b.has(k)) out.push({ ...c, data: null });
  return out;
}

function applyChanges(d: Data, changes: Change[]): Data {
  const next: Data = { ...d, products: [...d.products], customers: [...d.customers], invoices: [...d.invoices] };
  for (const c of changes) {
    if (c.kind === "shop") {
      if (c.data) next.shop = withDefaults(c.data as Shop);
      continue;
    }
    const list = LISTS.find(([k]) => k === c.kind)![1];
    const arr = (next[list] as { id: string }[]).filter((x) => x.id !== c.id);
    if (c.data) arr.unshift(c.data as { id: string });
    (next as unknown as Record<string, unknown>)[list] = arr;
  }
  return next;
}

const readJSON = <T,>(key: string): T | null => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
};
const writeJSON = (key: string, value: unknown) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* quota / private mode */
  }
};

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const onLogin = usePathname() === "/login";
  const [data, setData] = useState<Data>(seed);
  const [ready, setReady] = useState(false);
  const [mode, setMode] = useState<Mode>("loading");
  const [sync, setSync] = useState<SyncState>("idle");
  const [authEnabled, setAuthEnabled] = useState(false);

  const lastSeen = useRef<Data | null>(null); // data as of the last diff
  const outbox = useRef(new Map<string, Change>());
  const flushTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flushing = useRef(false);

  const schedule = useRef<(ms: number) => void>(() => {});

  const flush = useCallback(async () => {
    if (flushing.current || outbox.current.size === 0) return;
    flushing.current = true;
    const batch = [...outbox.current.entries()];
    setSync("saving");
    try {
      const res = await fetch("/api/sync", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ changes: batch.map(([, c]) => c) }),
      });
      if (res.status === 401) {
        flushing.current = false;
        window.location.href = "/login"; // eslint-disable-line @next/next/no-location-assign-relative-destination -- full reload clears the session state
        return;
      }
      if (!res.ok) throw new Error(`sync failed: ${res.status}`);
      // drop what was saved, unless it changed again while we were saving
      for (const [k, c] of batch) if (outbox.current.get(k) === c) outbox.current.delete(k);
      writeJSON(OUTBOX, [...outbox.current.values()]);
      setSync("idle");
      flushing.current = false;
      if (outbox.current.size) schedule.current(400); // more changes arrived while saving
    } catch {
      flushing.current = false;
      setSync("offline");
      schedule.current(10_000); // retry until the connection is back
    }
  }, []);

  useEffect(() => {
    schedule.current = (ms: number) => {
      if (flushTimer.current) clearTimeout(flushTimer.current);
      flushTimer.current = setTimeout(() => {
        flushTimer.current = null;
        void flush();
      }, ms);
    };
  }, [flush]);

  const queue = useCallback(
    (changes: Change[]) => {
      if (!changes.length) return;
      for (const c of changes) outbox.current.set(`${c.kind}:${c.id}`, c);
      writeJSON(OUTBOX, [...outbox.current.values()]);
      schedule.current(600);
    },
    [],
  );

  const loadFromServer = useCallback(async (): Promise<"ok" | "nodb" | "failed"> => {
    const res = await fetch("/api/data", { cache: "no-store" }).catch(() => null);
    if (res?.status === 401) {
      window.location.href = "/login"; // eslint-disable-line @next/next/no-location-assign-relative-destination -- full reload clears the session state
      return "failed";
    }
    const body = res?.ok ? await res.json().catch(() => null) : null;
    if (!body) return "failed";
    setAuthEnabled(!!body.auth);
    if (!body.db) return "nodb";

    const server: Data = {
      shop: withDefaults(body.shop),
      products: body.products ?? [],
      customers: body.customers ?? [],
      invoices: body.invoices ?? [],
    };
    const pending: Change[] = [];
    let merged = server;
    const local = readJSON<Partial<Data>>(KEY);

    if (!localStorage.getItem(MIGRATED)) {
      const serverEmpty = !body.shop && !server.products.length && !server.customers.length && !server.invoices.length;
      if (local) {
        // first login on a device that already has receipts: move them into the database
        const localData: Data = { ...seed(), ...local, shop: withDefaults(local.shop) };
        const have = docs(server);
        for (const [k, c] of docs(localData)) if (!have.has(k) || (k === "shop:shop" && !body.shop)) pending.push(c);
      } else if (serverEmpty) {
        // brand-new shop: start with the default settings and product list
        pending.push(...docs({ shop: DEFAULT_SHOP, products: SEED_PRODUCTS, customers: [], invoices: [] }).values());
      }
      merged = applyChanges(server, pending);
      localStorage.setItem(MIGRATED, "1");
    } else if (!body.shop) {
      pending.push({ kind: "shop", id: "shop", data: server.shop });
    }

    // changes made on this device that never reached the server
    const unsent = readJSON<Change[]>(OUTBOX) ?? [];
    merged = applyChanges(merged, unsent);
    pending.push(...unsent);

    lastSeen.current = merged;
    setData(merged);
    queue(pending);
    return "ok";
  }, [queue]);

  // initial load
  useEffect(() => {
    if (onLogin) return;
    let cancelled = false;
    (async () => {
      const local = readJSON<Partial<Data>>(KEY);
      const result = await loadFromServer();
      if (cancelled) return;
      if (result === "ok") setMode("cloud");
      else {
        // no database (or it can't be reached): keep working from this device's copy
        const fromLocal = local ? { ...seed(), ...local, shop: withDefaults(local.shop) } : seed();
        lastSeen.current = fromLocal;
        setData(fromLocal);
        const wasCloud = !!localStorage.getItem(MIGRATED) && result === "failed";
        setMode(wasCloud ? "cloud" : "local");
        if (wasCloud) {
          setSync("offline");
          for (const c of readJSON<Change[]>(OUTBOX) ?? []) outbox.current.set(`${c.kind}:${c.id}`, c);
          schedule.current(10_000);
        }
      }
      setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [onLogin, loadFromServer]);

  // keep this device's copy, and queue changes for the database
  useEffect(() => {
    if (!ready) return;
    writeJSON(KEY, data);
    if (mode === "cloud" && lastSeen.current) queue(diff(lastSeen.current, data));
    lastSeen.current = data;
  }, [data, ready, mode, queue]);

  // pick up changes made on other devices when coming back to the app
  useEffect(() => {
    if (mode !== "cloud") return;
    const onVisible = () => {
      if (document.visibilityState === "visible" && outbox.current.size === 0 && !flushing.current) void loadFromServer();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [mode, loadFromServer]);

  const nextInvoiceNumber = useCallback(() => {
    const used = new Set(data.invoices.map((i) => i.number));
    let n = data.shop.nextNumber;
    let num = `${data.shop.invoicePrefix}${String(n).padStart(4, "0")}`;
    while (used.has(num)) num = `${data.shop.invoicePrefix}${String(++n).padStart(4, "0")}`;
    return num;
  }, [data.invoices, data.shop]);

  const saveInvoice = useCallback((inv: Invoice) => {
    const saved = { ...inv, updatedAt: Date.now() };
    setData((d) => {
      const exists = d.invoices.some((i) => i.id === inv.id);
      const invoices = exists ? d.invoices.map((i) => (i.id === inv.id ? saved : i)) : [saved, ...d.invoices];

      // bump the running number when a new invoice uses it
      const shop = { ...d.shop };
      const m = inv.number.startsWith(shop.invoicePrefix) ? Number(inv.number.slice(shop.invoicePrefix.length)) : NaN;
      if (!exists && Number.isFinite(m) && m >= shop.nextNumber) shop.nextNumber = m + 1;

      // remember new / updated customers automatically
      let customers = d.customers;
      const c = inv.customer;
      if (c.name.trim()) {
        const hit = customers.find((x) => norm(x.name) === norm(c.name));
        if (!hit) customers = [...customers, { id: uid(), name: c.name.trim(), phone: c.phone, address: c.address }];
        else if (hit.phone !== c.phone || hit.address !== c.address)
          customers = customers.map((x) => (x.id === hit.id ? { ...x, phone: c.phone || x.phone, address: c.address || x.address } : x));
      }

      // remember new products automatically
      let products = d.products;
      for (const it of inv.items) {
        if (!it.description.trim() || !it.price) continue;
        if (!products.some((p) => norm(p.name) === norm(it.description)))
          products = [...products, { id: uid(), name: it.description.trim(), price: Number(it.price), inStock: true }];
      }
      return { ...d, invoices, shop, customers, products };
    });
    return saved;
  }, []);

  const logout = useCallback(async () => {
    await fetch("/api/logout", { method: "POST" }).catch(() => null);
    // don't leave shop data on a logged-out device (unless some changes still need to be sent)
    if (outbox.current.size === 0) localStorage.removeItem(KEY);
    window.location.href = "/login"; // eslint-disable-line @next/next/no-location-assign-relative-destination -- full reload clears the session state
  }, []);

  const store = useMemo<Store>(
    () => ({
      ...data,
      ready,
      mode,
      sync,
      authEnabled,
      setShop: (shop) => setData((d) => ({ ...d, shop })),
      setProducts: (products) => setData((d) => ({ ...d, products })),
      setCustomers: (customers) => setData((d) => ({ ...d, customers })),
      saveInvoice,
      deleteInvoice: (id) => setData((d) => ({ ...d, invoices: d.invoices.filter((i) => i.id !== id) })),
      nextInvoiceNumber,
      exportBackup: () => JSON.stringify({ app: "go-round-receipts", version: 1, ...data }, null, 2),
      importBackup: (json) => {
        const parsed = JSON.parse(json);
        if (!parsed || !Array.isArray(parsed.invoices)) throw new Error("This file is not a Go Round backup.");
        setData({
          shop: withDefaults(parsed.shop),
          products: parsed.products ?? [],
          customers: parsed.customers ?? [],
          invoices: parsed.invoices,
        });
      },
      resetAll: () => setData(seed()),
      logout,
    }),
    [data, ready, mode, sync, authEnabled, saveInvoice, nextInvoiceNumber, logout],
  );

  return <Ctx.Provider value={store}>{children}</Ctx.Provider>;
}

export function useStore() {
  const s = useContext(Ctx);
  if (!s) throw new Error("useStore must be used inside StoreProvider");
  return s;
}
