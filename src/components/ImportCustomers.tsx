"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { CopyX, Download, FileSpreadsheet, FileUp, Loader2, RefreshCw, UserPlus, UserX, X } from "lucide-react";
import type { Customer } from "@/lib/types";
import { SAMPLE_CSV, planImport, readCustomerFile, type ImportPlan } from "@/lib/customerImport";
import { saveBlob } from "@/lib/download";
import { Button, cx, useToast } from "./ui";

/** "Import" button + dialog that adds customers from an Excel / CSV file, skipping duplicates. */
export function ImportCustomers({ customers, onImport }: { customers: Customer[]; onImport: (plan: ImportPlan) => void }) {
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [drag, setDrag] = useState(false);
  const [error, setError] = useState("");
  const [file, setFile] = useState("");
  const [plan, setPlan] = useState<ImportPlan | null>(null);
  const input = useRef<HTMLInputElement>(null);

  const close = () => {
    setOpen(false);
    setPlan(null);
    setError("");
    setFile("");
  };

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const load = async (f: File | undefined) => {
    if (!f) return;
    setBusy(true);
    setError("");
    setPlan(null);
    setFile(f.name);
    try {
      const rows = await readCustomerFile(f);
      setPlan(planImport(customers, rows));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't read this file.");
    }
    setBusy(false);
    if (input.current) input.current.value = "";
  };

  const confirm = () => {
    if (!plan) return;
    onImport(plan);
    const parts = [plan.add.length && `${plan.add.length} added`, plan.update.length && `${plan.update.length} updated`].filter(Boolean);
    toast(parts.length ? `Customers ${parts.join(", ")}` : "Nothing new to import");
    close();
  };

  const changes = plan ? plan.add.length + plan.update.length : 0;

  return (
    <>
      <Button onClick={() => setOpen(true)} className="group">
        <FileUp className="size-4 transition-transform duration-300 group-hover:-translate-y-0.5" /> Import
      </Button>
      <input ref={input} type="file" accept=".xlsx,.csv" className="hidden" onChange={(e) => load(e.target.files?.[0])} />

      {/* portalled to <body>: the page wrapper is animated with a transform, which would trap a fixed element */}
      {open &&
        createPortal(
          <div className="fixed inset-0 z-50 grid place-items-center p-4" role="dialog" aria-modal="true" aria-labelledby="import-title">
            <div className="animate-backdrop-in absolute inset-0 bg-deep/50 backdrop-blur-sm" onClick={close} />
            <div className="animate-modal-in relative flex max-h-[90dvh] w-full max-w-lg flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">
              <div className="flex items-start justify-between gap-3 border-b border-line p-5">
                <div className="flex items-center gap-3">
                  <div className="grid size-10 place-items-center rounded-2xl bg-soft text-brand">
                    <FileSpreadsheet className="size-5" />
                  </div>
                  <div>
                    <h2 id="import-title" className="font-display text-lg font-extrabold">
                      Import customers
                    </h2>
                    <p className="text-[13px] text-muted">From Excel (.xlsx) or CSV - duplicates are skipped.</p>
                  </div>
                </div>
                <button onClick={close} className="grid size-9 place-items-center rounded-xl text-muted transition hover:rotate-90 hover:bg-canvas hover:text-ink" aria-label="Close">
                  <X className="size-5" />
                </button>
              </div>

              <div className="overflow-y-auto p-5">
                {!plan && (
                  <>
                    <button
                      type="button"
                      onClick={() => input.current?.click()}
                      onDragOver={(e) => {
                        e.preventDefault();
                        setDrag(true);
                      }}
                      onDragLeave={() => setDrag(false)}
                      onDrop={(e) => {
                        e.preventDefault();
                        setDrag(false);
                        load(e.dataTransfer.files[0]);
                      }}
                      disabled={busy}
                      className={cx(
                        "group flex w-full flex-col items-center gap-3 rounded-2xl border-2 border-dashed px-6 py-10 text-center transition-all duration-300",
                        drag ? "scale-[1.02] border-lime bg-soft" : "border-line bg-canvas hover:border-lime/70 hover:bg-soft/60",
                      )}
                    >
                      <span className={cx("grid size-14 place-items-center rounded-2xl bg-white text-brand shadow-sm transition-transform duration-300", drag ? "animate-empty-bob scale-110" : "group-hover:-translate-y-1")}>
                        {busy ? <Loader2 className="size-6 animate-spin" /> : <FileUp className="size-6" />}
                      </span>
                      <span className="font-semibold text-ink">{busy ? `Reading ${file}…` : drag ? "Drop it!" : "Drop your file here, or click to browse"}</span>
                      <span className="text-[12.5px] text-muted">.xlsx or .csv</span>
                    </button>

                    {error && (
                      <div className="animate-confirm-shake mt-3 rounded-xl bg-red-50 px-3 py-2.5 text-[13px] font-semibold text-red-700" role="alert">
                        {error}
                      </div>
                    )}

                    <div className="mt-5 rounded-2xl border border-line p-4">
                      <div className="mb-2 text-[11.5px] font-semibold uppercase tracking-wide text-muted">Expected columns</div>
                      <div className="flex flex-wrap gap-2">
                        {["Recipient Name", "Recipient Phone", "Recipient Address"].map((c, i) => (
                          <span key={c} className="animate-row-in rounded-lg bg-canvas px-2.5 py-1 text-[12.5px] font-semibold text-ink" style={{ animationDelay: `${i * 70}ms` }}>
                            {c}
                          </span>
                        ))}
                      </div>
                      <p className="mt-2.5 text-[12.5px] text-muted">
                        Same phone number = same customer. Phones like +8801… or 1743… are tidied to 01XXXXXXXXX. A match only fills in a missing phone or address.
                      </p>
                      <button
                        type="button"
                        onClick={() => saveBlob(new Blob([SAMPLE_CSV], { type: "text/csv" }), "customers-sample.csv")}
                        className="mt-3 inline-flex items-center gap-1.5 text-[13px] font-bold text-brand hover:underline"
                      >
                        <Download className="size-3.5" /> Download sample file
                      </button>
                    </div>
                  </>
                )}

                {plan && (
                  <div className="animate-fade-up">
                    <div className="mb-4 flex items-center gap-2 text-[13px] text-muted">
                      <FileSpreadsheet className="size-4 text-brand" />
                      <span className="truncate font-semibold text-ink">{file}</span>· {plan.total} rows
                    </div>
                    <div className="grid grid-cols-2 gap-2.5">
                      <Stat i={0} icon={<UserPlus className="size-4" />} label="New" value={plan.add.length} tone="bg-soft text-brand" />
                      <Stat i={1} icon={<RefreshCw className="size-4" />} label="Details filled in" value={plan.update.length} tone="bg-aqua-soft text-aqua-deep" />
                      <Stat i={2} icon={<CopyX className="size-4" />} label="Duplicates skipped" value={plan.duplicates} tone="bg-amber-50 text-amber-700" />
                      <Stat i={3} icon={<UserX className="size-4" />} label="No name, skipped" value={plan.invalid} tone="bg-red-50 text-red-600" />
                    </div>

                    {plan.add.length > 0 && (
                      <div className="mt-4">
                        <div className="mb-2 text-[11.5px] font-semibold uppercase tracking-wide text-muted">New customers</div>
                        <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line">
                          {plan.add.slice(0, 6).map((c, i) => (
                            <li key={c.id} className="animate-row-in flex items-center gap-3 px-3 py-2.5" style={{ animationDelay: `${200 + i * 60}ms` }}>
                              <span className="min-w-0 flex-1 truncate text-[13.5px] font-semibold">{c.name}</span>
                              <span className="shrink-0 text-[12.5px] tabular-nums text-muted">{c.phone || "—"}</span>
                            </li>
                          ))}
                          {plan.add.length > 6 && <li className="px-3 py-2 text-center text-[12.5px] font-semibold text-muted">+ {plan.add.length - 6} more</li>}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {plan && (
                <div className="flex items-center justify-between gap-2 border-t border-line p-4">
                  <Button variant="ghost" onClick={() => setPlan(null)}>
                    Choose another file
                  </Button>
                  <Button variant="primary" onClick={confirm} disabled={!changes}>
                    {changes ? `Import ${changes} customer${changes === 1 ? "" : "s"}` : "Nothing new"}
                  </Button>
                </div>
              )}
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}

function Stat({ i, icon, label, value, tone }: { i: number; icon: React.ReactNode; label: string; value: number; tone: string }) {
  const shown = useCountUp(value);
  return (
    <div className="animate-row-in rounded-2xl border border-line p-3" style={{ animationDelay: `${i * 70}ms` }}>
      <div className={cx("mb-2 grid size-8 place-items-center rounded-xl", tone)}>{icon}</div>
      <div className="font-display text-2xl font-extrabold tabular-nums">{shown}</div>
      <div className="text-[12px] font-semibold text-muted">{label}</div>
    </div>
  );
}

/** Animates a number from 0 up to `target`. */
function useCountUp(target: number, ms = 700) {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      const id = requestAnimationFrame(() => setN(target));
      return () => cancelAnimationFrame(id);
    }
    const start = performance.now();
    let id = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / ms);
      setN(Math.round(target * (1 - Math.pow(1 - p, 3))));
      if (p < 1) id = requestAnimationFrame(tick);
    };
    id = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(id);
  }, [target, ms]);
  return n;
}
