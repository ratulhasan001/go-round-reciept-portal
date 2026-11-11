import { cache } from "react";
import { connection } from "next/server";
import { DEFAULT_SHOP, SEED_PRODUCTS } from "@/lib/seed";
import { onSite, publicProduct, siteSettings, type PublicProduct, type PublicShop } from "@/lib/site";
import type { Product, Shop } from "@/lib/types";
import { db, dbEnabled, ensureSchema } from "./db";
import { logoSrc } from "./logo";

const withDefaults = (shop: Partial<Shop> | null | undefined): Shop => ({
  ...DEFAULT_SHOP,
  ...shop,
  email: shop?.email?.trim() || DEFAULT_SHOP.email, // shops saved without an email address use the default one
  rates: DEFAULT_SHOP.rates,
});

/** The saved shop settings (defaults when there is no database or nothing saved yet). */
export async function loadShop(): Promise<Shop> {
  if (!dbEnabled()) return DEFAULT_SHOP;
  await ensureSchema();
  const [row] = await db()<{ data: Shop }[]>`select data from gr_docs where kind = 'shop' and id = 'shop'`;
  return withDefaults(row?.data);
}

export const publicShop = (shop: Shop): PublicShop => ({
  name: shop.name,
  tagline: shop.tagline,
  address: shop.address,
  phone: shop.phone,
  email: shop.email,
  logo: shop.logo ? logoSrc(shop.logo) : "",
  site: siteSettings(shop),
});

/** Every product shown on the website, newest first. */
export async function loadProducts(): Promise<PublicProduct[]> {
  if (!dbEnabled()) return SEED_PRODUCTS.filter(onSite).map(publicProduct);
  await ensureSchema();
  const rows = await db()<{ data: Product }[]>`select data from gr_docs where kind = 'product' order by updated_at desc`;
  return rows.map((r) => r.data).filter(onSite).map(publicProduct);
}

/** Shop + products for one page render (shared by the layout and the page; always fresh, never prerendered). */
export const loadCatalog = cache(async () => {
  await connection();
  try {
    const [shop, products] = await Promise.all([loadShop(), loadProducts()]);
    return { shop: publicShop(shop), products, online: dbEnabled() };
  } catch (e) {
    console.error("store catalog failed", e);
    return { shop: publicShop(DEFAULT_SHOP), products: [] as PublicProduct[], online: false };
  }
});
