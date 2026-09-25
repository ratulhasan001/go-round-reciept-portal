"use client";

import { useEffect, useMemo, useRef } from "react";
import { CopyX, RefreshCw, UserPlus, UserX, Users } from "lucide-react";
import { useStore } from "@/lib/store";
import { computeTotals, uid } from "@/lib/calc";
import { initials } from "@/lib/theme";
import type { Customer } from "@/lib/types";
import { ListEditor } from "@/components/ListEditor";
import { ImportDialog } from "@/components/ImportDialog";
import { SAMPLE_CSV, planImport, readCustomerFile } from "@/lib/customerImport";

// friendly avatar colours, picked from the initials so each customer keeps theirs
const AVATARS = [
  "bg-lime/25 text-brand",
  "bg-aqua/20 text-aqua-deep",
  "bg-amber-100 text-amber-700",
  "bg-rose-100 text-rose-700",
  "bg-violet-100 text-violet-700",
  "bg-emerald-100 text-emerald-700",
];
const avatarTone = (name: string) => AVATARS[[...name].reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) >>> 0, 7) % AVATARS.length];

const key = (name: string) => name.trim().toLowerCase();
const byName = (a: Customer, b: Customer) => a.name.trim().localeCompare(b.name.trim(), undefined, { numeric: true, sensitivity: "base" });
const updated = (c: Customer) => c.updatedAt ?? 0;

export default function CustomersPage() {
  const { customers, setCustomers, invoices } = useStore();
  const latest = useRef(customers);
  useEffect(() => {
    latest.current = customers;
  });

  // receipts, spend and money still owed per customer (matched by name, like receipts do)
  const stats = useMemo(() => {
    const m = new Map<string, { receipts: number; spent: number; due: number }>();
    for (const inv of invoices) {
      const k = key(inv.customer.name);
      if (!k) continue;
      const t = computeTotals(inv);
      const s = m.get(k) ?? { receipts: 0, spent: 0, due: 0 };
      m.set(k, { receipts: s.receipts + 1, spent: s.spent + t.grandTotal, due: s.due + t.due });
    }
    return m;
  }, [invoices]);
  const stat = (c: Customer) => stats.get(key(c.name)) ?? { receipts: 0, spent: 0, due: 0 };

  return (
    <ListEditor<Customer>
      title="Customers"
      subtitle="Saved automatically from every receipt - type a name and their details fill in."
      icon={<Users className="size-5" />}
      noun="Customer"
      rows={customers}
      onChange={setCustomers}
      blank={() => ({ id: uid(), name: "", phone: "", address: "", updatedAt: Date.now() })}
      touch={(c) => ({ ...c, updatedAt: Date.now() })}
      actions={
        <ImportDialog
          title="Import customers"
          hint="From Excel (.xlsx) or CSV - duplicates are skipped."
          columns={["Recipient Name", "Recipient Phone", "Recipient Address"]}
          notes="Same phone number = same customer. Phones like +8801… or 1743… are tidied to 01XXXXXXXXX. A match only fills in a missing phone or address."
          sample={{ name: "customers-sample.csv", csv: SAMPLE_CSV }}
          noun={["customer", "customers"]}
          read={async (file) => {
            const plan = planImport(latest.current, await readCustomerFile(file));
            return {
              total: plan.total,
              changes: plan.add.length + plan.update.length,
              stats: [
                { label: "New", value: plan.add.length, icon: <UserPlus className="size-4" />, tone: "bg-soft text-brand" },
                { label: "Details filled in", value: plan.update.length, icon: <RefreshCw className="size-4" />, tone: "bg-aqua-soft text-aqua-deep" },
                { label: "Duplicates skipped", value: plan.duplicates, icon: <CopyX className="size-4" />, tone: "bg-amber-50 text-amber-700" },
                { label: "No name, skipped", value: plan.invalid, icon: <UserX className="size-4" />, tone: "bg-red-50 text-red-600" },
              ],
              listTitle: "New customers",
              list: plan.add.map((c) => ({ id: c.id, primary: c.name, secondary: c.phone })),
              apply: () => {
                const changed = new Map(plan.update.map((c) => [c.id, c]));
                setCustomers([...plan.add, ...latest.current.map((c) => changed.get(c.id) ?? c)]);
                const parts = [plan.add.length && `${plan.add.length} added`, plan.update.length && `${plan.update.length} updated`].filter(Boolean);
                return `Customers ${parts.join(", ")}`;
              },
            };
          }}
        />
      }
      sorts={[
        { label: "Recently updated", compare: (a, b) => updated(b) - updated(a) },
        { label: "Oldest updated", compare: (a, b) => updated(a) - updated(b) },
        { label: "Name A → Z", compare: byName },
        { label: "Name Z → A", compare: (a, b) => byName(b, a) },
        { label: "Most receipts", compare: (a, b) => stat(b).receipts - stat(a).receipts || byName(a, b) },
        { label: "Top spending", compare: (a, b) => stat(b).spent - stat(a).spent || byName(a, b) },
        { label: "Most due", compare: (a, b) => stat(b).due - stat(a).due || byName(a, b) },
      ]}
      lead={(c) => {
        const ini = c.name.trim() ? initials(c.name) : "?";
        const s = stat(c);
        return (
          <span
            key={ini}
            title={`${s.receipts} receipt${s.receipts === 1 ? "" : "s"} · ৳ ${Math.round(s.spent).toLocaleString("en-IN")} spent${s.due > 0 ? ` · ৳ ${Math.round(s.due).toLocaleString("en-IN")} due` : ""}`}
            className={`animate-lead-pop grid size-9 place-items-center rounded-full text-[12px] font-extrabold ${avatarTone(ini)}`}
          >
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
