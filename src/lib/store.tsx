"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { Customer, Invoice, Product, Shop } from "./types";
import { DEFAULT_SHOP, SEED_CUSTOMERS, SEED_INVOICES, SEED_PRODUCTS } from "./seed";
import { uid } from "./calc";

const KEY = "go-round-receipts:v1";

interface Data {
  shop: Shop;
  products: Product[];
  customers: Customer[];
  invoices: Invoice[];
}

interface Store extends Data {
  ready: boolean;
  setShop: (s: Shop) => void;
  setProducts: (p: Product[]) => void;
  setCustomers: (c: Customer[]) => void;
  saveInvoice: (inv: Invoice) => Invoice;
  deleteInvoice: (id: string) => void;
  nextInvoiceNumber: () => string;
  exportBackup: () => string;
  importBackup: (json: string) => void;
  resetAll: () => void;
}

const seed = (): Data => ({
  shop: DEFAULT_SHOP,
  products: SEED_PRODUCTS,
  customers: SEED_CUSTOMERS,
  invoices: SEED_INVOICES,
});

const Ctx = createContext<Store | null>(null);

const norm = (s: string) => s.trim().toLowerCase();

const withDefaults = (shop?: Partial<Shop>): Shop => ({
  ...DEFAULT_SHOP,
  ...shop,
  rates: {
    pay: { ...DEFAULT_SHOP.rates.pay, ...shop?.rates?.pay },
    courier: { ...DEFAULT_SHOP.rates.courier, ...shop?.rates?.courier },
  },
});

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<Data>(seed);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<Data>;
        // eslint-disable-next-line react-hooks/set-state-in-effect -- hydrate from browser storage once on mount
        setData({ ...seed(), ...parsed, shop: withDefaults(parsed.shop) });
      }
    } catch {
      /* storage unavailable - keep seed data */
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem(KEY, JSON.stringify(data));
    } catch {
      /* quota / private mode */
    }
  }, [data, ready]);

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
          products = [...products, { id: uid(), name: it.description.trim(), price: Number(it.price), category: "" }];
      }
      return { ...d, invoices, shop, customers, products };
    });
    return saved;
  }, []);

  const store = useMemo<Store>(
    () => ({
      ...data,
      ready,
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
    }),
    [data, ready, saveInvoice, nextInvoiceNumber],
  );

  return <Ctx.Provider value={store}>{children}</Ctx.Provider>;
}

export function useStore() {
  const s = useContext(Ctx);
  if (!s) throw new Error("useStore must be used inside StoreProvider");
  return s;
}
