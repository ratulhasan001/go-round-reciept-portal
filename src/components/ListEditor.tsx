"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { ArrowUpDown, Plus, Search, SearchX, Sparkles, Trash2 } from "lucide-react";
import { Button, Card, Input, Select, cx, useToast } from "./ui";

export interface Column<T> {
  key: keyof T & string;
  label: string;
  type?: "text" | "number" | "tel" | "toggle";
  placeholder?: string;
  width: string; // grid track
  align?: "right";
  /** Labels for a "toggle" column. A missing value counts as on. */
  on?: string;
  off?: string;
}

export interface Filter<T> {
  label: string;
  test: (row: T) => boolean;
}

export interface Sort<T> {
  label: string;
  compare: (a: T, b: T) => number;
}

const ROW_OUT_MS = 280;

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
  lead,
  filters,
  sorts,
  touch,
  actions,
}: {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  rows: T[];
  columns: Column<T>[];
  onChange: (rows: T[]) => void;
  blank: () => T;
  noun: string;
  /** Small visual shown at the start of each row on wide screens (avatar, icon…). */
  lead?: (row: T) => React.ReactNode;
  /** Quick filter tabs shown next to the search box; "All" is added in front. */
  filters?: Filter<T>[];
  /** Sort options; the first one is the default. */
  sorts?: Sort<T>[];
  /** Applied to a row whenever it is edited, e.g. to stamp an updated time. */
  touch?: (row: T) => T;
  /** Extra buttons shown next to "Add", e.g. Import. */
  actions?: React.ReactNode;
}) {
  const toast = useToast();
  const [q, setQ] = useState("");
  const [confirm, setConfirm] = useState<string | null>(null);
  const [leaving, setLeaving] = useState<string[]>([]);
  const [fresh, setFresh] = useState<string | null>(null);
  const [tab, setTab] = useState(0);
  const freshTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const latest = useRef(rows);
  useEffect(() => {
    latest.current = rows;
  });
  const grid = `${lead ? "40px " : ""}${columns.map((c) => c.width).join(" ")} 40px`;

  // Sorting is live, except while the cursor is inside a row: then the order is held still so the row
  // being edited never jumps away. As soon as focus leaves the rows, everything glides into place.
  const [sortIdx, setSortIdx] = useState(0);
  const [hold, setHold] = useState<string[] | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const tops = useRef(new Map<string, number>());
  const primary = columns[0]!.key;
  const compare = sorts?.[sortIdx]?.compare;
  const isBlank = (r: T) => !String(r[primary] ?? "").trim();
  // rows still being filled in (no name yet) stay on top
  const sortRows = (list: T[]) => (!compare ? list : [...list].sort((a, b) => Number(isBlank(b)) - Number(isBlank(a)) || compare(a, b)));
  const byId = new Map(rows.map((r) => [r.id, r]));
  const ordered = hold
    ? [...rows.filter((r) => !hold.includes(r.id)), ...hold.map((id) => byId.get(id)!).filter(Boolean)]
    : sortRows(rows);

  const onRowFocus = () => {
    if (!hold) setHold(ordered.map((r) => r.id));
  };
  const onRowBlur = (e: React.FocusEvent) => {
    // moving between rows keeps the hold; leaving the rows releases it
    if (!listRef.current?.contains(e.relatedTarget as Node | null)) setHold(null);
  };

  // FLIP: when rows change position, slide them from where they were to where they are now
  useLayoutEffect(() => {
    const els = listRef.current?.querySelectorAll<HTMLElement>("[data-row]") ?? [];
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const next = new Map<string, number>();
    els.forEach((el) => {
      const id = el.dataset.row!;
      const before = tops.current.get(id);
      if (before !== undefined && !reduce && Math.abs(before - el.offsetTop) > 1)
        el.animate([{ transform: `translateY(${before - el.offsetTop}px)` }, { transform: "none" }], {
          duration: 420,
          easing: "cubic-bezier(0.22, 1, 0.36, 1)",
        });
      next.set(id, el.offsetTop);
    });
    tops.current = next;
  });

  const tabs: Filter<T>[] = filters ? [{ label: "All", test: () => true }, ...filters] : [];
  const needle = q.trim().toLowerCase();
  const visible = ordered.filter(
    (r) =>
      (!tabs[tab] || tabs[tab].test(r)) &&
      (!needle || columns.some((c) => c.type !== "toggle" && String(r[c.key] ?? "").toLowerCase().includes(needle))),
  );

  const set = (id: string, key: keyof T, v: string | boolean, type?: Column<T>["type"]) =>
    onChange(
      rows.map((r) => {
        if (r.id !== id) return r;
        const next = { ...r, [key]: type === "number" ? (v === "" ? 0 : Number(v)) : v };
        return touch ? touch(next) : next;
      }),
    );

  const add = () => {
    const row = blank();
    onChange([row, ...rows]);
    setQ("");
    setTab(0);
    setFresh(row.id);
    clearTimeout(freshTimer.current);
    freshTimer.current = setTimeout(() => setFresh(null), 1400);
    setTimeout(() => document.getElementById(`row-${row.id}`)?.querySelector("input")?.focus(), 30);
  };

  const remove = (r: T) => {
    if (confirm !== r.id) {
      setConfirm(r.id);
      setTimeout(() => setConfirm((c) => (c === r.id ? null : c)), 3000);
      return;
    }
    setConfirm(null);
    setLeaving((l) => [...l, r.id]);
    // let the row slide away before it is actually removed
    setTimeout(() => {
      setHold(null); // the focused delete button disappears without a blur event
      onChange(latest.current.filter((x) => x.id !== r.id));
      setLeaving((l) => l.filter((id) => id !== r.id));
      toast(`${noun} removed`);
    }, ROW_OUT_MS);
  };

  return (
    <div className="animate-fade-up">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="animate-icon-float grid size-11 shrink-0 place-items-center rounded-2xl bg-deep text-lime shadow-lg shadow-deep/20">{icon}</div>
          <div>
            <h1 className="font-display text-2xl font-extrabold sm:text-3xl">{title}</h1>
            <p className="text-sm text-muted">{subtitle}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {actions}
          <Button variant="primary" onClick={add} className="group">
            <Plus className="size-4 transition-transform duration-300 group-hover:rotate-90" /> Add {noun.toLowerCase()}
          </Button>
        </div>
      </div>

      <Card className="overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-line p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 flex-1 flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
            <div className="relative min-w-0 flex-1 sm:max-w-xs">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-faint" />
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={`Search ${title.toLowerCase()}`} className="bg-canvas pl-9" />
            </div>
            {tabs.length > 0 && (
              <div
                role="tablist"
                aria-label={`Filter ${title.toLowerCase()}`}
                className="relative grid h-10 shrink-0 rounded-xl bg-canvas p-1"
                style={{ gridTemplateColumns: `repeat(${tabs.length}, minmax(0, 1fr))` }}
              >
                {/* sliding highlight */}
                <span
                  aria-hidden
                  className="absolute inset-y-1 left-1 rounded-lg bg-white shadow-sm shadow-black/10 transition-transform duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)]"
                  style={{ width: `calc((100% - 0.5rem) / ${tabs.length})`, transform: `translateX(${tab * 100}%)` }}
                />
                {tabs.map((f, i) => {
                  const n = rows.filter(f.test).length;
                  return (
                    <button
                      key={f.label}
                      role="tab"
                      aria-selected={tab === i}
                      onClick={() => setTab(i)}
                      className={cx(
                        "relative z-10 flex items-center justify-center gap-1 whitespace-nowrap px-1.5 text-[12px] sm:gap-1.5 sm:px-3 sm:text-[13px] font-semibold transition-colors",
                        tab === i ? "text-ink" : "text-muted hover:text-ink",
                      )}
                    >
                      {f.label}
                      <span
                        key={n}
                        className={cx(
                          "animate-count-bump rounded-full px-1.5 text-[11px] tabular-nums",
                          tab === i ? "bg-deep text-lime" : "bg-line text-muted",
                        )}
                      >
                        {n}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
            {sorts && sorts.length > 1 && (
              <div className="flex shrink-0 items-center gap-2">
                <div className="relative">
                  <ArrowUpDown
                    key={sortIdx}
                    className="animate-sort-flip pointer-events-none absolute left-3 top-1/2 z-10 size-4 -translate-y-1/2 text-brand"
                  />
                  <Select
                    aria-label="Sort by"
                    value={sortIdx}
                    onChange={(e) => {
                      setHold(null);
                      setSortIdx(Number(e.target.value));
                    }}
                    className="w-auto cursor-pointer bg-canvas pl-9 font-semibold"
                  >
                    {sorts.map((s, i) => (
                      <option key={s.label} value={i}>
                        {s.label}
                      </option>
                    ))}
                  </Select>
                </div>
              </div>
            )}
          </div>
          <span className="shrink-0 text-[13px] font-semibold text-muted">
            <span key={rows.length} className="animate-count-bump inline-block tabular-nums text-ink">
              {rows.length}
            </span>{" "}
            saved<span className="hidden sm:inline"> · auto-saves</span>
          </span>
        </div>

        <div className="hidden gap-3 px-4 pt-3 text-[11.5px] font-semibold uppercase tracking-wide text-muted md:grid" style={{ gridTemplateColumns: grid }}>
          {lead && <span />}
          {columns.map((c) => (
            <span key={c.key} className={cx(c.align === "right" && "text-right")}>
              {c.label}
            </span>
          ))}
          <span />
        </div>
        <div ref={listRef} className="relative flex flex-col gap-2 p-4 md:gap-1.5">
          {visible.length === 0 && (
            <div className="animate-fade-up flex flex-col items-center gap-3 py-12 text-center">
              <div className="animate-empty-bob grid size-14 place-items-center rounded-2xl bg-soft text-brand">
                {rows.length === 0 ? <Sparkles className="size-6" /> : <SearchX className="size-6" />}
              </div>
              <div className="text-sm text-muted">
                {rows.length === 0 ? <>Nothing here yet. Click “Add {noun.toLowerCase()}”.</> : <>No {title.toLowerCase()} match this search or filter.</>}
              </div>
            </div>
          )}
          {visible.map((r, i) => {
            const isLeaving = leaving.includes(r.id);
            return (
              <div
                id={`row-${r.id}`}
                key={r.id}
                data-row={r.id}
                onFocus={onRowFocus}
                onBlur={onRowBlur}
                className={cx(
                  "grid gap-2 rounded-xl border border-line p-3 transition-colors md:border-transparent md:p-1 md:-mx-1 md:[grid-template-columns:var(--g)] md:hover:bg-canvas",
                  isLeaving ? "animate-row-out pointer-events-none" : "animate-row-in",
                  fresh === r.id && "animate-row-fresh",
                )}
                style={{ "--g": grid, animationDelay: isLeaving || fresh === r.id ? undefined : `${Math.min(i, 12) * 35}ms` } as React.CSSProperties}
              >
                {lead && <div className="hidden place-items-center md:grid">{lead(r)}</div>}
                {columns.map((c) => (
                  <div key={c.key}>
                    <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-muted md:hidden">{c.label}</span>
                    {c.type === "toggle" ? (
                      <Toggle on={r[c.key] !== false} onLabel={c.on ?? "On"} offLabel={c.off ?? "Off"} onChange={(v) => set(r.id, c.key, v, c.type)} />
                    ) : (
                      <Input
                        type={c.type === "number" ? "number" : "text"}
                        inputMode={c.type === "number" ? "decimal" : c.type === "tel" ? "tel" : undefined}
                        className={cx(c.align === "right" && "text-right font-semibold")}
                        placeholder={c.placeholder}
                        aria-label={c.label}
                        value={c.type === "number" ? ((Number(r[c.key]) || "") as number | string) : String(r[c.key] ?? "")}
                        onChange={(e) => set(r.id, c.key, e.target.value, c.type)}
                      />
                    )}
                  </div>
                ))}
                <button
                  onClick={() => remove(r)}
                  className={cx(
                    "grid h-10 place-items-center self-end rounded-lg text-faint transition hover:bg-red-50 hover:text-red-600",
                    confirm === r.id && "animate-confirm-shake bg-red-600 text-[11px] font-bold text-white hover:bg-red-700 hover:text-white",
                  )}
                  aria-label={`Remove ${noun}`}
                >
                  {confirm === r.id ? "Sure?" : <Trash2 className="size-4" />}
                </button>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}

/** Pill switch with a springy knob, e.g. In stock / Out of stock. */
function Toggle({ on, onLabel, offLabel, onChange }: { on: boolean; onLabel: string; offLabel: string; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={() => onChange(!on)}
      className={cx(
        "group flex h-10 w-full items-center gap-2.5 rounded-xl border px-2.5 text-left text-[13px] font-bold transition-colors duration-300 active:scale-[0.97]",
        on ? "border-lime/60 bg-soft text-brand hover:border-lime" : "border-red-200 bg-red-50 text-red-700 hover:border-red-300",
      )}
    >
      <span className={cx("relative h-5 w-9 shrink-0 rounded-full transition-colors duration-300", on ? "bg-lime" : "bg-red-300")}>
        <span
          className={cx(
            "absolute top-0.5 left-0.5 grid size-4 place-items-center rounded-full bg-white shadow-sm transition-transform duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] group-active:scale-x-125",
            on ? "translate-x-4" : "translate-x-0",
          )}
        >
          {on && <span className="absolute size-4 animate-ping rounded-full bg-lime/50" />}
          <span className={cx("size-1.5 rounded-full transition-colors", on ? "bg-brand" : "bg-red-400")} />
        </span>
      </span>
      <span key={String(on)} className="animate-label-swap truncate">
        {on ? onLabel : offLabel}
      </span>
    </button>
  );
}
