"use client";

import { Package } from "lucide-react";
import { useStore } from "@/lib/store";
import { uid } from "@/lib/calc";
import type { Product } from "@/lib/types";
import { ListEditor } from "@/components/ListEditor";

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
      blank={() => ({ id: uid(), name: "", price: 0, category: "" })}
      columns={[
        { key: "name", label: "Product name", placeholder: "e.g. Seachem Prime 325ml", width: "minmax(0,2fr)" },
        { key: "category", label: "Category", placeholder: "Optional", width: "minmax(0,1fr)" },
        { key: "price", label: "Unit price (BDT)", type: "number", placeholder: "0.00", width: "160px", align: "right" },
      ]}
    />
  );
}
