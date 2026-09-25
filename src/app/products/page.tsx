"use client";

import { Package, PackageCheck, PackageX } from "lucide-react";
import { useStore } from "@/lib/store";
import { uid } from "@/lib/calc";
import type { Product } from "@/lib/types";
import { ListEditor } from "@/components/ListEditor";
import { cx } from "@/components/ui";

const inStock = (p: Product) => p.inStock !== false;

export default function ProductsPage() {
  const { products, setProducts } = useStore();
  return (
    <ListEditor<Product>
      title="Products"
      subtitle="Your price list - pick these while making a receipt and the price fills in."
      icon={<Package className="size-5" />}
      noun="Product"
      rows={products}
      onChange={setProducts}
      blank={() => ({ id: uid(), name: "", price: 0, inStock: true })}
      filters={[
        { label: "In stock", test: inStock },
        { label: "Out of stock", test: (p) => !inStock(p) },
      ]}
      lead={(p) => (
        <span
          key={String(inStock(p))}
          className={cx("animate-lead-pop grid size-9 place-items-center rounded-xl", inStock(p) ? "bg-soft text-brand" : "bg-red-50 text-red-500")}
        >
          {inStock(p) ? <PackageCheck className="size-[18px]" /> : <PackageX className="size-[18px]" />}
        </span>
      )}
      columns={[
        { key: "name", label: "Product name", placeholder: "e.g. Seachem Prime 325ml", width: "minmax(0,2fr)" },
        { key: "inStock", label: "Status", type: "toggle", on: "In stock", off: "Out of stock", width: "160px" },
        { key: "price", label: "Unit price (BDT)", type: "number", placeholder: "0.00", width: "160px", align: "right" },
      ]}
    />
  );
}
