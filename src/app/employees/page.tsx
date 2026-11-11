"use client";

import { useState } from "react";
import { IdCard, QrCode } from "lucide-react";
import { useStore } from "@/lib/store";
import { todayISO, uid } from "@/lib/calc";
import { makeStaffCode, tk } from "@/lib/site";
import { initials } from "@/lib/theme";
import type { Employee } from "@/lib/types";
import { ListEditor } from "@/components/ListEditor";
import { StaffQrDialog } from "@/components/StaffQrDialog";
import { Input, cx } from "@/components/ui";

const active = (e: Employee) => e.active !== false;
const byName = (a: Employee, b: Employee) => a.name.trim().localeCompare(b.name.trim(), undefined, { numeric: true, sensitivity: "base" });
const updated = (e: Employee) => e.updatedAt ?? 0;

export default function EmployeesPage() {
  const { employees, setEmployees } = useStore();
  const [qrFor, setQrFor] = useState<string | null>(null);
  const staff = employees.filter(active);
  const payroll = staff.reduce((s, e) => s + (Number(e.salary) || 0), 0);
  const shown = qrFor ? employees.find((e) => e.id === qrFor) ?? null : null;

  return (
    <>
      <ListEditor<Employee>
        section="employees"
        title="Employees"
        subtitle={
          employees.length
            ? `${staff.length} active · ${tk(payroll)} monthly salaries. Each person has a QR code that shows customers they really work for you.`
            : "Keep your staff's details here. Everyone gets a QR code that opens a page showing they really work for you."
        }
        icon={<IdCard className="size-5" />}
        noun="Employee"
        rows={employees}
        onChange={setEmployees}
        tableFrom="2xl"
        // a new person gets their verification code (and so their QR) straight away
        blank={() => ({ id: uid(), name: "", phone: "", role: "", joined: todayISO(), salary: 0, notes: "", active: true, code: makeStaffCode(), updatedAt: Date.now() })}
        touch={(e) => ({ ...e, code: e.code || makeStaffCode(), updatedAt: Date.now() })}
        sorts={[
          { label: "Recently updated", compare: (a, b) => updated(b) - updated(a) },
          { label: "Name A → Z", compare: byName },
          { label: "Newest joined", compare: (a, b) => b.joined.localeCompare(a.joined) || byName(a, b) },
          { label: "Longest serving", compare: (a, b) => (a.joined || "9").localeCompare(b.joined || "9") || byName(a, b) },
          { label: "Salary: high to low", compare: (a, b) => b.salary - a.salary || byName(a, b) },
          { label: "Salary: low to high", compare: (a, b) => a.salary - b.salary || byName(a, b) },
        ]}
        filters={[
          { label: "Active", test: active },
          { label: "Former", test: (e) => !active(e) },
        ]}
        lead={(e) => (
          <span
            key={`${initials(e.name || "?")}-${active(e)}`}
            title={active(e) ? "Works here" : "No longer works here"}
            className={cx("animate-lead-pop grid size-9 place-items-center rounded-full text-[12px] font-extrabold", active(e) ? "bg-rose-50 text-rose-600" : "bg-canvas text-faint")}
          >
            {e.name.trim() ? initials(e.name) : "?"}
          </span>
        )}
        rowActions={(e) => (
          <button
            type="button"
            onClick={() => {
              if (!e.code) setEmployees(employees.map((x) => (x.id === e.id ? { ...x, code: makeStaffCode(), updatedAt: Date.now() } : x)));
              setQrFor(e.id);
            }}
            className="grid size-9 place-items-center rounded-xl text-muted transition hover:bg-canvas hover:text-ink active:scale-90"
            aria-label={`QR code for ${e.name || "this employee"}`}
            title="QR code & ID card"
          >
            <QrCode className="size-[18px]" />
          </button>
        )}
        columns={[
          { key: "name", label: "Name", placeholder: "Full name", width: "minmax(0,1.3fr)" },
          { key: "phone", label: "Phone", type: "tel", placeholder: "01XXXXXXXXX", width: "150px" },
          { key: "role", label: "Role", placeholder: "e.g. Delivery, Packing", width: "minmax(0,1fr)" },
          {
            key: "joined",
            label: "Joined",
            type: "custom",
            width: "150px",
            render: (e, update) => <Input type="date" aria-label="Joining date" value={e.joined} onChange={(ev) => update({ joined: ev.target.value })} />,
          },
          { key: "salary", label: "Salary / month (BDT)", type: "number", placeholder: "0", width: "150px", align: "right" },
          { key: "active", label: "Status", type: "toggle", on: "Active", off: "Former", width: "140px" },
          { key: "notes", label: "Notes", placeholder: "NID, address, emergency contact…", width: "minmax(0,1.4fr)" },
        ]}
      />
      <StaffQrDialog employee={shown} onClose={() => setQrFor(null)} />
    </>
  );
}

