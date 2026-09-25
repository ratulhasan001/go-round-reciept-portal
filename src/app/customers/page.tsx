"use client";

import { Users } from "lucide-react";
import { useStore } from "@/lib/store";
import { uid } from "@/lib/calc";
import { initials } from "@/lib/theme";
import type { Customer } from "@/lib/types";
import { ListEditor } from "@/components/ListEditor";

// friendly avatar colours, picked from the name so each customer keeps theirs
const AVATARS = [
  "bg-lime/25 text-brand",
  "bg-aqua/20 text-aqua-deep",
  "bg-amber-100 text-amber-700",
  "bg-rose-100 text-rose-700",
  "bg-violet-100 text-violet-700",
  "bg-emerald-100 text-emerald-700",
];
const avatarTone = (name: string) => AVATARS[[...name].reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) >>> 0, 7) % AVATARS.length];

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
      lead={(c) => {
        const ini = c.name.trim() ? initials(c.name) : "?";
        return (
          <span key={ini} className={`animate-lead-pop grid size-9 place-items-center rounded-full text-[12px] font-extrabold ${avatarTone(ini)}`}>
            {ini}
          </span>
        );
      }}
      columns={[
        { key: "name", label: "Name", placeholder: "Customer name", width: "minmax(0,1.2fr)" },
        { key: "phone", label: "Phone", type: "tel", placeholder: "01XXXXXXXXX", width: "170px" },
        { key: "address", label: "Address", placeholder: "Area, City", width: "minmax(0,2fr)" },
      ]}
    />
  );
}
