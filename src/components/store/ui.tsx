import { forwardRef } from "react";
import { Rule } from "./Art";

const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");
export { cx };

type V = "primary" | "teal" | "outline" | "ghost" | "light";
const V_CLS: Record<V, string> = {
  primary: "bg-sea-ink text-white hover:bg-sea-moss shadow-[0_8px_20px_-10px_rgba(17,58,45,0.8)]",
  teal: "bg-sea-teal text-white hover:bg-[#196c90] shadow-[0_8px_20px_-10px_rgba(31,127,168,0.8)]",
  outline: "border border-sea-ink/20 bg-transparent text-sea-ink hover:border-sea-ink/50 hover:bg-white/50",
  ghost: "text-sea-ink hover:bg-sea-sand/70",
  light: "bg-white text-sea-ink border border-sea-line hover:border-sea-ink/30",
};
const S_CLS = { sm: "h-9 px-4 text-[13px]", md: "h-11 px-5 text-[14px]", lg: "h-[52px] px-7 text-[15px]" };

export const btn = (v: V = "primary", s: keyof typeof S_CLS = "md", extra = "") =>
  cx(
    "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full font-bold transition duration-200 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sea-teal/50 focus-visible:ring-offset-2 focus-visible:ring-offset-sea-cream",
    V_CLS[v],
    S_CLS[s],
    extra,
  );

/** Eyebrow + big serif title (wrap a word in <em> for the card's teal italic) + the green rule. */
export function PageHead({ eyebrow, title, intro, center = false }: { eyebrow?: string; title: React.ReactNode; intro?: React.ReactNode; center?: boolean }) {
  return (
    <div className={cx("mb-8 sm:mb-10", center && "text-center")}>
      {eyebrow && <p className="store-eyebrow mb-3">{eyebrow}</p>}
      <h1 className="font-serif text-[38px] leading-[1.04] sm:text-[52px] [&_em]:text-sea-teal">{title}</h1>
      <Rule className={cx("mt-5", center && "mx-auto")} />
      {intro && <p className={cx("mt-5 max-w-2xl text-[15.5px] leading-relaxed text-sea-body", center && "mx-auto")}>{intro}</p>}
    </div>
  );
}

const inputCls =
  "w-full rounded-2xl border bg-white px-4 text-[15px] font-medium text-sea-ink outline-none transition placeholder:font-normal placeholder:text-sea-muted/70 focus:border-sea-teal focus:ring-4 focus:ring-sea-teal/12";

export const SeaInput = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }>(function SeaInput({ className, invalid, ...p }, ref) {
  return <input ref={ref} className={cx(inputCls, "h-12", invalid ? "border-red-300 bg-red-50/40" : "border-sea-line", className)} aria-invalid={invalid || undefined} {...p} />;
});

export function SeaTextarea({ className, invalid, ...p }: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean }) {
  return <textarea className={cx(inputCls, "min-h-24 py-3 leading-relaxed", invalid ? "border-red-300 bg-red-50/40" : "border-sea-line", className)} aria-invalid={invalid || undefined} {...p} />;
}

export function SeaField({ label, hint, error, children, className, htmlFor }: { label: string; hint?: string; error?: string; children: React.ReactNode; className?: string; htmlFor?: string }) {
  return (
    <div className={className}>
      <label htmlFor={htmlFor} className="mb-1.5 flex items-baseline justify-between gap-2 text-[13px] font-bold text-sea-ink">
        {label}
        {hint && <span className="text-[12px] font-semibold text-sea-muted">{hint}</span>}
      </label>
      {children}
      {error && <p className="mt-1.5 text-[12.5px] font-semibold text-red-600">{error}</p>}
    </div>
  );
}

export function Panel({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cx("rounded-[28px] border border-sea-line bg-sea-paper p-5 sm:p-7", className)}>{children}</div>;
}
