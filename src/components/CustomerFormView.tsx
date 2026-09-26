"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowRight, CheckCheck, Hourglass, Link2Off, Loader2, Lock, MapPin, MessageCircle, Phone, Timer, User } from "lucide-react";
import { WAVE_BACK, WAVE_FRONT } from "@/lib/theme";
import { cx } from "./ui";

type View = "active" | "used" | "expired" | "missing" | "done";
type Fields = { name: string; phone: string; address: string };

const pad = (n: number) => String(n).padStart(2, "0");

/** The form a customer fills in from a one-time link, plus the thank-you / expired screens. */
export function CustomerFormView({
  token,
  state,
  msLeft,
  shop,
}: {
  token: string;
  state: "active" | "used" | "expired" | "missing";
  msLeft: number;
  shop: { name: string; tagline: string; logo: string };
}) {
  const [view, setView] = useState<View>(state);
  const [form, setForm] = useState<Fields>({ name: "", phone: "", address: "" });
  const [errors, setErrors] = useState<Partial<Fields>>({});
  const [busy, setBusy] = useState(false);
  const [shake, setShake] = useState(0);
  const [failure, setFailure] = useState("");
  const [savedName, setSavedName] = useState("");

  // countdown: the deadline is fixed when the page arrives, from the server's own measurement
  const deadline = useRef(0);
  const [left, setLeft] = useState<number | null>(null);
  useEffect(() => {
    if (state !== "active") return;
    deadline.current = Date.now() + msLeft;
    const tick = () => {
      const ms = Math.max(0, deadline.current - Date.now());
      setLeft(ms);
      if (ms === 0) setView((v) => (v === "active" ? "expired" : v));
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [state, msLeft]);

  const total = 30 * 60 * 1000;
  const urgent = left !== null && left < 60_000;
  const soon = left !== null && left < 5 * 60_000;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs: Partial<Fields> = {};
    if (form.name.trim().length < 2) errs.name = "Please enter your full name.";
    if (form.phone.replace(/\D/g, "").length < 6) errs.phone = "Please enter a valid phone number.";
    if (form.address.trim().length < 3) errs.address = "Please enter your address.";
    setErrors(errs);
    setFailure("");
    if (Object.keys(errs).length) return setShake((n) => n + 1);

    setBusy(true);
    try {
      const res = await fetch(`/api/f/${encodeURIComponent(token)}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(form),
      });
      const body = await res.json().catch(() => ({}));
      if (res.ok) {
        setSavedName(body.name ?? form.name);
        setView("done");
      } else if (res.status === 422 && body.fields) {
        setErrors(body.fields);
        setShake((n) => n + 1);
      } else if (res.status === 410 || res.status === 404) {
        setView(body.error === "used" ? "used" : body.error === "expired" ? "expired" : "missing");
      } else {
        setFailure("Couldn't send your details. Please check your connection and try again.");
        setShake((n) => n + 1);
      }
    } catch {
      setFailure("Couldn't send your details. Please check your connection and try again.");
      setShake((n) => n + 1);
    }
    setBusy(false);
  };

  const set = (k: keyof Fields) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm((f) => ({ ...f, [k]: e.target.value }));
    if (errors[k]) setErrors((x) => ({ ...x, [k]: undefined }));
  };

  return (
    <main className="relative flex min-h-dvh flex-col items-center overflow-hidden bg-deep px-4 pb-24 pt-8 text-white sm:pt-14">
      {/* same underwater backdrop as the app's home page */}
      <div className="animate-aurora pointer-events-none absolute -left-40 -top-40 size-[520px] rounded-full bg-aqua/25 blur-3xl" />
      <div className="animate-aurora-slow pointer-events-none absolute -right-32 top-24 size-[460px] rounded-full bg-lime/20 blur-3xl" />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.05]"
        style={{ backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)", backgroundSize: "24px 24px" }}
      />
      {[12, 28, 71, 86].map((x, i) => (
        <span
          key={x}
          className="form-bubble pointer-events-none absolute bottom-0 rounded-full border border-white/30 bg-white/5"
          style={{ left: `${x}%`, width: 8 + (i % 2) * 8, height: 8 + (i % 2) * 8, animationDelay: `${-i * 2.3}s`, animationDuration: `${9 + i * 2}s` }}
        />
      ))}
      <svg viewBox="0 0 595 40" preserveAspectRatio="none" className="animate-wave pointer-events-none absolute inset-x-0 bottom-0 h-16 w-full" aria-hidden>
        <path d={WAVE_BACK} className="fill-aqua/20" />
        <path d={WAVE_FRONT} className="fill-canvas" />
      </svg>

      {/* shop */}
      <header className="animate-home-in relative flex flex-col items-center text-center">
        {shop.logo ? (
          // eslint-disable-next-line @next/next/no-img-element -- the logo may be a data URL
          <img src={shop.logo} alt="" className="size-20 rounded-full bg-white object-contain p-1 shadow-xl shadow-black/30 ring-4 ring-white/10" />
        ) : null}
        <h1 className="mt-3 font-display text-2xl font-extrabold sm:text-3xl">{shop.name}</h1>
        {shop.tagline && <p className="mt-1 max-w-xs text-[13px] text-mint/80">{shop.tagline}</p>}
      </header>

      <section
        key={view}
        className="animate-home-in relative mt-7 w-full max-w-md overflow-hidden rounded-3xl bg-white text-ink shadow-[0_30px_80px_-20px_rgb(0_0_0/0.6)]"
        style={{ animationDelay: "120ms" }}
      >
        {view === "active" && (
          <>
            {/* time left, as a bar that drains */}
            <div className="h-1.5 bg-line">
              <div
                className={cx("h-full transition-[width,background-color] duration-1000 ease-linear", urgent ? "bg-red-500" : soon ? "bg-amber-500" : "bg-gradient-to-r from-lime to-aqua")}
                style={{ width: `${left === null ? 100 : (left / total) * 100}%` }}
              />
            </div>
            <form onSubmit={submit} noValidate className="p-6 sm:p-7">
              <h2 className="font-display text-xl font-extrabold">Share your details</h2>
              <p className="mt-1 text-[13.5px] text-muted">{shop.name} will use them for your orders, deliveries and receipts.</p>

              {/* expiry countdown */}
              <div
                className={cx(
                  "mt-5 flex items-center gap-3 rounded-2xl px-4 py-3 transition-colors duration-500",
                  urgent ? "bg-red-50 text-red-600" : soon ? "bg-amber-50 text-amber-700" : "bg-aqua-soft text-aqua-deep",
                )}
                role="timer"
                aria-live="off"
                aria-label={left === null ? "" : `Link expires in ${Math.ceil(left / 60000)} minutes`}
              >
                <span className={cx("grid size-10 shrink-0 place-items-center rounded-xl bg-white/70", urgent && "animate-pulse")}>
                  <Timer className="form-timer size-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[11.5px] font-bold uppercase tracking-wider opacity-80">This link expires in</span>
                  <span className="block text-[12px] opacity-70">{urgent ? "Hurry - less than a minute left!" : soon ? "Only a few minutes left" : "Please fill it in before it closes"}</span>
                </span>
                <span className="flex items-baseline font-display text-[28px] font-extrabold leading-none tabular-nums">
                  {left === null ? (
                    "30:00"
                  ) : (
                    <>
                      <span key={`m${Math.floor(left / 60000)}`} className="animate-tick inline-block">
                        {pad(Math.floor(left / 60000))}
                      </span>
                      <span className="form-colon">:</span>
                      <span key={`s${Math.floor((left % 60000) / 1000)}`} className="animate-tick inline-block">
                        {pad(Math.floor((left % 60000) / 1000))}
                      </span>
                    </>
                  )}
                </span>
              </div>

              <div key={shake} className={cx("mt-6 space-y-4", shake > 0 && "animate-confirm-shake")}>
                <FormField i={0} icon={<User className="size-[18px]" />} label="Full name" error={errors.name}>
                  <input value={form.name} onChange={set("name")} autoComplete="name" placeholder="e.g. Go Round" maxLength={80} className={inputClass(!!errors.name)} />
                </FormField>
                <FormField
                  i={1}
                  icon={<Phone className="size-[18px]" />}
                  label={
                    <>
                      Phone number{" "}
                      <span className="ml-1 inline-flex items-center gap-1 rounded-full bg-[#e7f8ee] px-2 py-0.5 align-middle text-[11px] font-bold text-[#128c4a]">
                        <MessageCircle className="size-3" /> WhatsApp
                      </span>
                    </>
                  }
                  error={errors.phone}
                >
                  <input
                    value={form.phone}
                    onChange={set("phone")}
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    placeholder="01XXXXXXXXX"
                    maxLength={30}
                    className={inputClass(!!errors.phone)}
                  />
                </FormField>
                <FormField i={2} icon={<MapPin className="size-[18px]" />} label="Delivery address" error={errors.address} top>
                  <textarea
                    value={form.address}
                    onChange={set("address")}
                    autoComplete="street-address"
                    placeholder="House, road, area, city"
                    rows={3}
                    maxLength={300}
                    className={cx(inputClass(!!errors.address), "h-auto resize-none py-3")}
                  />
                </FormField>
              </div>

              {failure && <p className="mt-4 rounded-xl bg-red-50 px-3 py-2 text-[13px] font-medium text-red-600">{failure}</p>}

              <button
                type="submit"
                disabled={busy}
                className="group relative mt-6 flex h-13 w-full items-center justify-center gap-2 overflow-hidden rounded-2xl bg-deep font-display text-[16px] font-bold text-lime shadow-lg shadow-deep/25 transition hover:-translate-y-0.5 hover:shadow-xl active:translate-y-0 active:scale-[0.98] disabled:opacity-80"
              >
                <span aria-hidden className="animate-shine pointer-events-none absolute inset-y-0 -left-1/2 w-1/3 skew-x-[-20deg] bg-white/15 blur-md" />
                {busy ? (
                  <>
                    <Loader2 className="size-5 animate-spin" /> Sending…
                  </>
                ) : (
                  <>
                    Send my details <ArrowRight className="size-5 transition-transform duration-300 group-hover:translate-x-1" />
                  </>
                )}
              </button>
              <p className="mt-4 flex items-center justify-center gap-1.5 text-center text-[12px] text-muted">
                <Lock className="size-3.5" /> Goes only to {shop.name}. This link works once.
              </p>
            </form>
          </>
        )}

        {view === "done" && (
          <Message
            icon={
              <svg viewBox="0 0 52 52" className="size-16" aria-hidden>
                <circle className="form-check-ring" cx="26" cy="26" r="24" fill="none" stroke="currentColor" strokeWidth="3" />
                <path className="form-check-tick" d="M15 27 L23 35 L38 18" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            }
            tone="bg-soft text-brand"
            title={`Thank you, ${savedName.trim().split(/\s+/)[0]}!`}
            text={`Your details are saved with ${shop.name}. You can close this page now.`}
          />
        )}
        {view === "used" && (
          <Message icon={<CheckCheck className="size-9" />} tone="bg-aqua-soft text-aqua-deep" title="Already filled in" text={`This form has already been sent to ${shop.name}. Each link works once.`} />
        )}
        {view === "expired" && (
          <Message icon={<Hourglass className="form-hourglass size-9" />} tone="bg-amber-50 text-amber-600" title="This link has expired" text={`Links stay open for 30 minutes. Please ask ${shop.name} for a new one.`} />
        )}
        {view === "missing" && (
          <Message icon={<Link2Off className="size-9" />} tone="bg-red-50 text-red-500" title="This link isn't valid" text={`Please check the link, or ask ${shop.name} to send a new one.`} />
        )}
      </section>
    </main>
  );
}

const inputClass = (bad: boolean) =>
  cx(
    "h-12 w-full rounded-2xl border bg-canvas pl-11 pr-4 text-[15px] font-medium text-ink outline-none transition-all duration-300 placeholder:font-normal placeholder:text-faint",
    "focus:border-transparent focus:bg-white focus:shadow-[0_0_0_2px_var(--color-lime),0_8px_24px_-10px_rgb(26_134_174/0.45)]",
    bad ? "border-red-300 bg-red-50/50" : "border-line",
  );

function FormField({ i, icon, label, error, top, children }: { i: number; icon: React.ReactNode; label: React.ReactNode; error?: string; top?: boolean; children: React.ReactNode }) {
  return (
    <label className="animate-home-in group/field block" style={{ animationDelay: `${220 + i * 80}ms` }}>
      <span className="mb-1.5 block text-[12.5px] font-bold text-body">{label}</span>
      <span className="relative block">
        <span
          className={cx(
            "pointer-events-none absolute left-4 text-faint transition-all duration-300 group-focus-within/field:scale-110 group-focus-within/field:text-brand",
            top ? "top-3.5" : "top-1/2 -translate-y-1/2",
          )}
        >
          {icon}
        </span>
        {children}
      </span>
      {error && <span className="animate-fade-up mt-1.5 block text-[12.5px] font-semibold text-red-600">{error}</span>}
    </label>
  );
}

function Message({ icon, tone, title, text }: { icon: React.ReactNode; tone: string; title: string; text: string }) {
  return (
    <div className="flex flex-col items-center px-6 py-10 text-center sm:px-8">
      <div className={cx("form-badge grid size-24 place-items-center rounded-full", tone)}>{icon}</div>
      <h2 className="animate-home-in mt-5 font-display text-2xl font-extrabold" style={{ animationDelay: "250ms" }}>
        {title}
      </h2>
      <p className="animate-home-in mt-2 max-w-xs text-[14px] text-muted" style={{ animationDelay: "330ms" }}>
        {text}
      </p>
    </div>
  );
}
