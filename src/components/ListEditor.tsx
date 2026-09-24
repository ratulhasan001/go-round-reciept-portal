"use client";

import { useState } from "react";
import { Plus, Search, Trash2 } from "lucide-react";
import { Button, Card, Input, cx, useToast } from "./ui";

export interface Column<T> {
  key: keyof T & string;
  label: string;
  type?: "text" | "number" | "tel";
  placeholder?: string;
  width: string; // grid track
  align?: "right";
}

/** Inline-editable list used for Products and Customers. Changes save instantly. */
export function ListEditor<T extends { id: string }>({
  title,
  subtitle,
  icon,
  rows,
  columns,
  onChange,
  blank,
  noun,
}: {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  rows: T[];
  columns: Column<T>[];
  onChange: (rows: T[]) => void;
  blank: () => T;
  noun: string;
}) {
  const toast = useToast();
  const [q, setQ] = useState("");
  const [confirm, setConfirm] = useState<string | null>(null);
  const grid = `${columns.map((c) => c.width).join(" ")} 40px`;

  const visible = rows.filter((r) => !q.trim() || columns.some((c) => String(r[c.key] ?? "").toLowerCase().includes(q.trim().toLowerCase())));

  const set = (id: string, key: keyof T, v: string, type?: string) =>
    onChange(rows.map((r) => (r.id === id ? { ...r, [key]: type === "number" ? (v === "" ? 0 : Number(v)) : v } : r)));

  const add = () => {
    const row = blank();
    onChange([row, ...rows]);
    setQ("");
    setTimeout(() => document.getElementById(`row-${row.id}`)?.querySelector("input")?.focus(), 30);
  };

  const remove = (r: T) => {
    if (confirm !== r.id) {
      setConfirm(r.id);
      setTimeout(() => setConfirm((c) => (c === r.id ? null : c)), 3000);
      return;
    }
    onChange(rows.filter((x) => x.id !== r.id));
    setConfirm(null);
    toast(`${noun} removed`);
  };

  return (
    <div className="animate-fade-up">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="grid size-11 shrink-0 place-items-center rounded-2xl bg-deep text-lime">{icon}</div>
          <div>
            <h1 className="font-display text-2xl font-extrabold sm:text-3xl">{title}</h1>
            <p className="text-sm text-muted">{subtitle}</p>
          </div>
        </div>
        <Button variant="primary" onClick={add}>
          <Plus className="size-4" /> Add {noun.toLowerCase()}
        </Button>
      </div>

      <Card className="overflow-hidden">
        <div className="flex items-center justify-between gap-3 border-b border-line p-4">
          <div className="relative min-w-0 flex-1 sm:max-w-xs">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-faint" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={`Search ${title.toLowerCase()}`} className="bg-canvas pl-9" />
          </div>
          <span className="shrink-0 text-[13px] font-semibold text-muted">{rows.length} saved<span className="hidden sm:inline"> · auto-saves</span></span>
        </div>

        <div className="hidden gap-3 px-4 pt-3 text-[11.5px] font-semibold uppercase tracking-wide text-muted md:grid" style={{ gridTemplateColumns: grid }}>
          {columns.map((c) => (
            <span key={c.key} className={cx(c.align === "right" && "text-right")}>
              {c.label}
            </span>
          ))}
          <span />
        </div>
        <div className="flex flex-col gap-2 p-4 md:gap-1.5">
          {visible.length === 0 && <div className="py-10 text-center text-sm text-muted">Nothing here yet. Click “Add {noun.toLowerCase()}”.</div>}
          {visible.map((r) => (
            <div id={`row-${r.id}`} key={r.id} className="grid gap-2 rounded-xl border border-line p-3 md:border-0 md:p-0 md:[grid-template-columns:var(--g)]" style={{ "--g": grid } as React.CSSProperties}>
              {columns.map((c) => (
                <div key={c.key}>
                  <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-muted md:hidden">{c.label}</span>
                  <Input
                    type={c.type === "number" ? "number" : "text"}
                    inputMode={c.type === "number" ? "decimal" : c.type === "tel" ? "tel" : undefined}
                    className={cx(c.align === "right" && "text-right font-semibold")}
                    placeholder={c.placeholder}
                    aria-label={c.label}
                    value={c.type === "number" ? (Number(r[c.key]) || "") as number | string : String(r[c.key] ?? "")}
                    onChange={(e) => set(r.id, c.key, e.target.value, c.type)}
                  />
                </div>
              ))}
              <button
                onClick={() => remove(r)}
                className={cx("grid h-10 place-items-center self-end rounded-lg text-faint hover:bg-red-50 hover:text-red-600", confirm === r.id && "bg-red-600 text-[11px] font-bold text-white hover:bg-red-700 hover:text-white")}
                aria-label={`Remove ${noun}`}
              >
                {confirm === r.id ? "Sure?" : <Trash2 className="size-4" />}
              </button>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
