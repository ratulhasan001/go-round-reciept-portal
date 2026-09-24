"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Copy, Download, FilePlus2, FileSpreadsheet, Pencil, Search, Trash2, Wallet, TrendingUp, Clock3, ReceiptText, MessageCircle, Sheet, BellRing } from "lucide-react";
import { useStore } from "@/lib/store";
import { computeTotals, fmtDate, money } from "@/lib/calc";
import type { Invoice, Status } from "@/lib/types";
import { downloadExcel, downloadLedger, downloadPdf, waNumber } from "@/lib/download";
import { WAVE_BACK, WAVE_FRONT } from "@/lib/theme";
import { Button, Card, StatusBadge, buttonClass, cx, useClientValue, useToast } from "@/components/ui";

const greeting = () => {
  const hour = new Date().getHours();
  return hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
};

type Filter = "ALL" | Status;

export default function Dashboard() {
  const { invoices, shop, deleteInvoice, ready } = useStore();
  const toast = useToast();
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<Filter>("ALL");
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [busy, setBusy] = useState("");

  const rows = useMemo(
    () =>
      invoices
        .map((inv) => ({ inv, t: computeTotals(inv) }))
        .sort((a, b) => (b.inv.date + b.inv.number).localeCompare(a.inv.date + a.inv.number)),
    [invoices],
  );

  const stats = useMemo(() => {
    const billed = rows.reduce((s, r) => s + r.t.grandTotal, 0);
    const collected = rows.reduce((s, r) => s + r.t.paid, 0);
    const outstanding = rows.reduce((s, r) => s + Math.max(r.t.due, 0), 0);
    const open = rows.filter((r) => r.t.status !== "PAID").length;
    return { billed, collected, outstanding, open };
  }, [rows]);

  const visible = rows.filter(({ inv, t }) => {
    if (filter !== "ALL" && t.status !== filter) return false;
    const s = q.trim().toLowerCase();
    return !s || [inv.number, inv.customer.name, inv.customer.phone].some((x) => x.toLowerCase().includes(s));
  });

  const dl = async (inv: Invoice, kind: "pdf" | "xlsx") => {
    setBusy(inv.id + kind);
    try {
      if (kind === "pdf") await downloadPdf(inv, shop);
      else await downloadExcel(inv, shop);
      toast(`${kind === "pdf" ? "PDF" : "Excel"} downloaded · ${inv.number}`);
    } catch {
      toast("Could not generate the file", "err");
    } finally {
      setBusy("");
    }
  };

  const del = (inv: Invoice) => {
    if (confirmId !== inv.id) {
      setConfirmId(inv.id);
      setTimeout(() => setConfirmId((c) => (c === inv.id ? null : c)), 3000);
      return;
    }
    deleteInvoice(inv.id);
    setConfirmId(null);
    toast(`${inv.number} deleted`);
  };

  const greet = useClientValue(greeting, "Welcome back");

  // customers who still owe money, biggest first
  const owing = useMemo(() => {
    const m = new Map<string, { name: string; phone: string; due: number; numbers: string[] }>();
    for (const { inv, t } of rows) {
      if (t.due <= 0) continue;
      const key = (inv.customer.phone || inv.customer.name).trim().toLowerCase();
      const e = m.get(key) ?? { name: inv.customer.name || "Unknown", phone: inv.customer.phone, due: 0, numbers: [] };
      e.due += t.due;
      e.numbers.push(inv.number);
      m.set(key, e);
    }
    return [...m.values()].sort((a, b) => b.due - a.due).slice(0, 6);
  }, [rows]);

  const remindUrl = (o: (typeof owing)[number]) =>
    `https://wa.me/${waNumber(o.phone)}?text=${encodeURIComponent(
      `Hello ${o.name}, this is a friendly reminder from ${shop.name}. Your balance due is BDT ${money(o.due)} (receipt ${o.numbers.join(", ")}). Thank you!`,
    )}`;

  const exportLedger = async () => {
    setBusy("ledger");
    try {
      await downloadLedger(invoices, shop);
      toast("Ledger downloaded");
    } catch {
      toast("Could not create the ledger", "err");
    } finally {
      setBusy("");
    }
  };

  return (
    <div className="animate-fade-up">
      {/* hero */}
      <div className="relative mb-6 overflow-hidden rounded-3xl bg-deep px-6 pb-12 pt-7 text-white sm:px-8 sm:pb-14 sm:pt-9">
        <div className="pointer-events-none absolute -right-16 -top-24 size-72 rounded-full bg-aqua/25 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-28 right-40 size-64 rounded-full bg-lime/20 blur-3xl" />
        <svg viewBox="0 0 595 40" preserveAspectRatio="none" className="pointer-events-none absolute inset-x-0 bottom-0 h-10 w-full" aria-hidden>
          <path d={WAVE_BACK} className="fill-aqua/25" />
          <path d={WAVE_FRONT} className="fill-aqua/60" />
        </svg>
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4 sm:gap-5">
          {shop.logo && (
            // eslint-disable-next-line @next/next/no-img-element -- logo may be a data URL
            <img src={shop.logo} alt="" className="hidden size-20 shrink-0 rounded-full bg-white object-contain p-1 shadow-lg shadow-black/20 sm:block" />
          )}
          <div>
            <p className="text-sm font-semibold text-mint">{greet} 👋</p>
            <h1 className="mt-1 font-display text-3xl font-extrabold sm:text-4xl">{shop.name} receipts</h1>
            <p className="mt-2 max-w-lg text-[14.5px] text-mint/85">Create a receipt in under a minute. Every receipt downloads as an A4 PDF or Excel file, ready to print or send on WhatsApp.</p>
          </div>
          </div>
          <Link href="/new" className={buttonClass("accent", "lg", "w-full sm:w-auto")}>
            <FilePlus2 className="size-5" /> New receipt
          </Link>
        </div>
      </div>

      {/* stats */}
      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
        <Stat icon={<TrendingUp className="size-4" />} label="Total billed" value={money(stats.billed)} />
        <Stat icon={<Wallet className="size-4" />} label="Collected" value={money(stats.collected)} tone="text-brand" />
        <Stat icon={<Clock3 className="size-4" />} label="Outstanding" value={money(stats.outstanding)} tone="text-red-700" />
        <Stat icon={<ReceiptText className="size-4" />} label="Open receipts" value={`${stats.open} / ${rows.length}`} />
      </div>

      {/* who owes you */}
      {owing.length > 0 && (
        <Card className="mb-6 p-4 sm:p-5">
          <div className="mb-3 flex items-center gap-2">
            <span className="grid size-7 place-items-center rounded-lg bg-red-50 text-red-600">
              <BellRing className="size-4" />
            </span>
            <h2 className="font-display text-[16px] font-bold">Who owes you</h2>
            <span className="text-[12.5px] text-muted">· send a polite WhatsApp reminder in one tap</span>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {owing.map((o) => (
              <div key={o.name + o.phone} className="flex items-center justify-between gap-3 rounded-xl bg-canvas px-3.5 py-3">
                <div className="min-w-0">
                  <div className="truncate font-semibold">{o.name}</div>
                  <div className="text-[12px] text-muted">{o.numbers.join(", ")}</div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="font-display font-bold text-red-700">{money(o.due)}</span>
                  {o.phone && (
                    <a href={remindUrl(o)} target="_blank" rel="noopener" className="grid size-8 place-items-center rounded-lg bg-white text-[#25D366] shadow-sm hover:scale-105" aria-label={`Remind ${o.name} on WhatsApp`} title="Send reminder on WhatsApp">
                      <MessageCircle className="size-4" />
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* list */}
      <Card className="overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-line p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <div className="relative w-full sm:max-w-xs">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-faint" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search number, customer, phone"
              className="h-10 w-full rounded-xl border border-line bg-canvas pl-9 pr-3 text-sm placeholder:text-faint focus:border-brand focus:bg-white focus:outline-none focus:ring-4 focus:ring-brand/10"
            />
          </div>
          <div className="flex items-center gap-2 overflow-x-auto">
          <div className="flex gap-1 rounded-xl bg-canvas p-1">
            {(["ALL", "UNPAID", "PARTIAL", "PAID"] as Filter[]).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={cx("whitespace-nowrap rounded-lg px-3 py-1.5 text-[13px] font-semibold transition", filter === f ? "bg-white text-ink shadow-sm" : "text-muted hover:text-ink")}
              >
                {f === "ALL" ? "All" : f === "PARTIAL" ? "Partial" : f[0] + f.slice(1).toLowerCase()}
              </button>
            ))}
          </div>
          <Button size="sm" onClick={exportLedger} loading={busy === "ledger"} disabled={!rows.length} title="Download every receipt as one Excel sheet">
            {busy !== "ledger" && <Sheet className="size-4 text-brand" />} Ledger
          </Button>
          </div>
        </div>

        {!ready ? (
          <div className="p-10 text-center text-muted">Loading…</div>
        ) : visible.length === 0 ? (
          <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
            <div className="grid size-14 place-items-center rounded-2xl bg-soft text-brand">
              <ReceiptText className="size-6" />
            </div>
            <div className="font-display text-lg font-bold">{rows.length ? "No receipts match" : "No receipts yet"}</div>
            <p className="max-w-sm text-sm text-muted">{rows.length ? "Try a different search or filter." : "Create your first receipt - it only takes a minute."}</p>
            {!rows.length && (
              <Link href="/new" className={buttonClass("primary")}>
                <FilePlus2 className="size-4" /> New receipt
              </Link>
            )}
          </div>
        ) : (
          <>
            {/* desktop table */}
            <table className="hidden w-full text-sm md:table">
              <thead>
                <tr className="text-left text-[11.5px] font-semibold uppercase tracking-wide text-muted">
                  <th className="px-5 py-3">Receipt</th>
                  <th className="px-3 py-3">Customer</th>
                  <th className="px-3 py-3">Date</th>
                  <th className="px-3 py-3 text-right">Total</th>
                  <th className="px-3 py-3 text-right">Due</th>
                  <th className="px-3 py-3">Status</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {visible.map(({ inv, t }) => (
                  <tr key={inv.id} className="group border-t border-line transition hover:bg-canvas/70">
                    <td className="px-5 py-3.5">
                      <Link href={`/new?id=${inv.id}`} className="font-display font-bold text-ink hover:text-brand">{inv.number}</Link>
                    </td>
                    <td className="px-3 py-3.5">
                      <div className="font-semibold">{inv.customer.name || "—"}</div>
                      <div className="text-[12px] text-muted">{inv.customer.phone}</div>
                    </td>
                    <td className="px-3 py-3.5 text-body">{fmtDate(inv.date)}</td>
                    <td className="px-3 py-3.5 text-right font-semibold">{money(t.grandTotal)}</td>
                    <td className={cx("px-3 py-3.5 text-right font-bold", t.due > 0 ? "text-red-700" : "text-brand")}>{money(Math.max(t.due, 0))}</td>
                    <td className="px-3 py-3.5"><StatusBadge status={t.status} /></td>
                    <td className="px-5 py-3.5">
                      <RowActions inv={inv} busy={busy} confirm={confirmId === inv.id} onDl={dl} onDel={del} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* mobile cards */}
            <ul className="divide-y divide-line md:hidden">
              {visible.map(({ inv, t }) => (
                <li key={inv.id} className="p-4">
                  <Link href={`/new?id=${inv.id}`} className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-display font-bold">{inv.number}</span>
                        <StatusBadge status={t.status} />
                      </div>
                      <div className="mt-0.5 truncate text-sm font-semibold text-body">{inv.customer.name || "—"}</div>
                      <div className="text-[12px] text-muted">{fmtDate(inv.date)}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-display text-lg font-bold">{money(t.grandTotal)}</div>
                      {t.due > 0 && <div className="text-[12px] font-bold text-red-700">Due {money(t.due)}</div>}
                    </div>
                  </Link>
                  <div className="mt-3">
                    <RowActions inv={inv} busy={busy} confirm={confirmId === inv.id} onDl={dl} onDel={del} mobile />
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
      </Card>
    </div>
  );
}

function Stat({ icon, label, value, tone = "text-ink" }: { icon: React.ReactNode; label: string; value: string; tone?: string }) {
  return (
    <Card className="p-4 sm:p-5">
      <div className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-wide text-muted">
        <span className="grid size-7 place-items-center rounded-lg bg-soft text-brand">{icon}</span>
        {label}
      </div>
      <div className={cx("mt-3 font-display text-xl font-extrabold sm:text-2xl", tone)}>{value}</div>
    </Card>
  );
}

function RowActions({
  inv, busy, confirm, onDl, onDel, mobile,
}: {
  inv: Invoice;
  busy: string;
  confirm: boolean;
  onDl: (inv: Invoice, k: "pdf" | "xlsx") => void;
  onDel: (inv: Invoice) => void;
  mobile?: boolean;
}) {
  const icon = "grid size-8 place-items-center rounded-lg text-muted transition hover:bg-white hover:text-ink hover:shadow-sm";
  return (
    <div className={cx("flex items-center gap-1", mobile ? "justify-between" : "justify-end")}>
      <div className="flex gap-1.5">
        <Button size="sm" variant="primary" loading={busy === inv.id + "pdf"} onClick={() => onDl(inv, "pdf")}>
          {busy !== inv.id + "pdf" && <Download className="size-3.5" />} PDF
        </Button>
        <Button size="sm" loading={busy === inv.id + "xlsx"} onClick={() => onDl(inv, "xlsx")}>
          {busy !== inv.id + "xlsx" && <FileSpreadsheet className="size-3.5 text-brand" />} Excel
        </Button>
      </div>
      <div className="flex gap-0.5">
        <Link href={`/new?id=${inv.id}`} className={icon} title="Edit" aria-label="Edit">
          <Pencil className="size-4" />
        </Link>
        <Link href={`/new?copy=${inv.id}`} className={icon} title="Duplicate as new receipt" aria-label="Duplicate">
          <Copy className="size-4" />
        </Link>
        <button onClick={() => onDel(inv)} className={cx(icon, confirm && "w-auto bg-red-600 px-2 text-[12px] font-bold text-white hover:bg-red-700 hover:text-white")} title="Delete" aria-label="Delete">
          {confirm ? "Confirm?" : <Trash2 className="size-4" />}
        </button>
      </div>
    </div>
  );
}
