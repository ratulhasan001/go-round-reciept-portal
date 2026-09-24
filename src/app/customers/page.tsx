"use client";

import { Users } from "lucide-react";
import { useStore } from "@/lib/store";
import { uid } from "@/lib/calc";
import type { Customer } from "@/lib/types";
import { ListEditor } from "@/components/ListEditor";

export default function CustomersPage() {
  const { customers, setCustomers } = useStore();
  return (
    <ListEditor<Customer>
      title="Customers"
      subtitle="Saved automatically from every receipt - type a name and their details fill in."
      icon={<Users className="size-5" />}
      noun="Customer"
      rows={customers}
      onChange={setCustomers}
      blank={() => ({ id: uid(), name: "", phone: "", address: "" })}
      columns={[
        { key: "name", label: "Name", placeholder: "Customer name", width: "minmax(0,1.2fr)" },
        { key: "phone", label: "Phone", type: "tel", placeholder: "01XXXXXXXXX", width: "170px" },
        { key: "address", label: "Address", placeholder: "Area, City", width: "minmax(0,2fr)" },
      ]}
    />
  );
}
