"use client";

import { createContext, forwardRef, useCallback, useContext, useState, useSyncExternalStore } from "react";
import { CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import type { Status } from "@/lib/types";
import { STATUS_LABEL } from "@/lib/theme";

export const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");

type BtnVariant = "primary" | "secondary" | "ghost" | "danger" | "dark" | "accent";

const btnBase =
  "inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 focus-visible:ring-offset-2 whitespace-nowrap";
const btnVariants: Record<BtnVariant, string> = {
  primary: "bg-brand text-white shadow-sm shadow-brand/20 hover:bg-brand-600",
  dark: "bg-deep text-white hover:bg-ink",
  accent: "bg-lime text-deep shadow-lg shadow-black/10 hover:bg-white",
  secondary: "bg-white text-ink border border-line hover:border-faint hover:bg-canvas",
  ghost: "text-body hover:bg-black/5",
  danger: "bg-white text-red-700 border border-red-200 hover:bg-red-50",
};
const btnSizes = { sm: "h-8 px-3 text-[13px]", md: "h-10 px-4 text-sm", lg: "h-12 px-5 text-[15px]" };

export function Button({
  variant = "secondary",
  size = "md",
  loading,
  className,
  children,
  ...p
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: BtnVariant; size?: keyof typeof btnSizes; loading?: boolean }) {
  return (
    <button className={cx(btnBase, btnVariants[variant], btnSizes[size], className)} disabled={loading || p.disabled} {...p}>
      {loading ? <Loader2 className="size-4 animate-spin" /> : null}
      {children}
    </button>
  );
}

export const buttonClass = (variant: BtnVariant = "secondary", size: keyof typeof btnSizes = "md", className?: string) =>
  cx(btnBase, btnVariants[variant], btnSizes[size], className);

export function Card({ className, children, ...p }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cx("rounded-2xl border border-line bg-white shadow-[0_1px_2px_rgba(20,32,26,0.04)]", className)} {...p}>
      {children}
    </div>
  );
}

export function SectionTitle({ icon, title, hint, action }: { icon?: React.ReactNode; title: string; hint?: string; action?: React.ReactNode }) {
  return (
    <div className="mb-4 flex items-start justify-between gap-3">
      <div className="flex items-start gap-3">
        {icon ? <div className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg bg-soft text-brand">{icon}</div> : null}
        <div>
          <h2 className="font-display text-[17px] font-bold text-ink">{title}</h2>
          {hint ? <p className="text-[13px] text-muted">{hint}</p> : null}
        </div>
      </div>
      {action}
    </div>
  );
}

export function Label({ children, htmlFor }: { children: React.ReactNode; htmlFor?: string }) {
  return (
    <label htmlFor={htmlFor} className="mb-1.5 block text-[12px] font-semibold uppercase tracking-wide text-muted">
      {children}
    </label>
  );
}

const inputCls =
  "h-10 w-full rounded-xl border border-line bg-white px-3 text-[14px] text-ink placeholder:text-faint transition focus:border-brand focus:outline-none focus:ring-4 focus:ring-brand/10";

export const Input = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(function Input({ className, ...p }, ref) {
  return <input ref={ref} className={cx(inputCls, className)} {...p} />;
});

export function Textarea({ className, ...p }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cx(inputCls, "h-auto min-h-20 py-2.5 leading-relaxed", className)} {...p} />;
}

export function Select({ className, children, ...p }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={cx(inputCls, "appearance-none bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2212%22 height=%2212%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22%236B7A70%22 stroke-width=%222.5%22><path d=%22m6 9 6 6 6-6%22/></svg>')] bg-[right_0.75rem_center] bg-no-repeat pr-8", className)} {...p}>
      {children}
    </select>
  );
}

export function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <Label>{label}</Label>
      {children}
    </div>
  );
}

const badgeCls: Record<Status, string> = {
  PAID: "bg-lime/15 text-brand ring-brand/20",
  PARTIAL: "bg-amber-50 text-amber-700 ring-amber-600/20",
  UNPAID: "bg-red-50 text-red-700 ring-red-600/20",
};
export function StatusBadge({ status }: { status: Status }) {
  return (
    <span className={cx("inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[12px] font-bold ring-1 ring-inset", badgeCls[status])}>
      <span className="size-1.5 rounded-full bg-current" />
      {STATUS_LABEL[status]}
    </span>
  );
}

// ---------- toasts ----------
type Toast = { id: number; msg: string; kind: "ok" | "err" };
const ToastCtx = createContext<(msg: string, kind?: Toast["kind"]) => void>(() => {});

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const push = useCallback((msg: string, kind: Toast["kind"] = "ok") => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, msg, kind }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3200);
  }, []);
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-20 z-50 flex flex-col items-center gap-2 px-4 lg:bottom-6" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className="animate-toast pointer-events-auto flex items-center gap-2.5 rounded-xl bg-ink px-4 py-3 text-sm font-medium text-white shadow-xl">
            {t.kind === "ok" ? <CheckCircle2 className="size-4 text-lime" /> : <AlertCircle className="size-4 text-red-300" />}
            {t.msg}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}
export const useToast = () => useContext(ToastCtx);

const noopSubscribe = () => () => {};
/** A value that only exists in the browser (falls back during server pre-rendering). */
export function useClientValue<T>(get: () => T, fallback: T) {
  return useSyncExternalStore(noopSubscribe, get, () => fallback);
}

export function Switch({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cx("relative h-6 w-11 shrink-0 rounded-full transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40", checked ? "bg-brand" : "bg-line")}
    >
      <span className={cx("absolute top-0.5 size-5 rounded-full bg-white shadow transition-all", checked ? "left-[22px]" : "left-0.5")} />
    </button>
  );
}

export function Chip({ active, onClick, children, hint }: { active: boolean; onClick: () => void; children: React.ReactNode; hint?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cx(
        "flex flex-col items-start rounded-xl border px-3 py-2 text-left transition active:scale-[0.98]",
        active ? "border-brand bg-soft ring-2 ring-brand/15" : "border-line bg-white hover:border-faint",
      )}
    >
      <span className={cx("text-[13.5px] font-bold", active ? "text-brand" : "text-ink")}>{children}</span>
      {hint ? <span className="text-[11.5px] font-semibold text-muted">{hint}</span> : null}
    </button>
  );
}
