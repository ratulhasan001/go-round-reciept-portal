"use client";

import { useState } from "react";
import { ArrowRight, Eye, EyeOff, Loader2, LockKeyhole } from "lucide-react";
import { WAVE_BACK, WAVE_FRONT } from "@/lib/theme";

export default function LoginPage() {
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password || busy) return;
    setBusy(true);
    setError("");
    const res = await fetch("/api/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ password }),
    }).catch(() => null);
    if (res?.ok) {
      const next = new URLSearchParams(window.location.search).get("next");
      window.location.href = next && next.startsWith("/") && !next.startsWith("//") ? next : "/";
      return;
    }
    setBusy(false);
    setPassword("");
    setError(res ? "Incorrect password. Please try again." : "Can't connect. Check your internet and try again.");
  };

  return (
    <main className="relative grid min-h-dvh place-items-center overflow-hidden bg-deep px-5 py-10 text-white">
      {/* soft background light */}
      <div className="pointer-events-none absolute -left-32 -top-32 size-[420px] rounded-full bg-aqua/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 -right-24 size-[460px] rounded-full bg-lime/15 blur-3xl" />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.05]"
        style={{ backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)", backgroundSize: "22px 22px" }}
      />
      <svg viewBox="0 0 595 40" preserveAspectRatio="none" className="pointer-events-none absolute inset-x-0 bottom-0 h-16 w-full" aria-hidden>
        <path d={WAVE_BACK} className="fill-aqua/15" />
        <path d={WAVE_FRONT} className="fill-lime/20" />
      </svg>

      <form
        onSubmit={submit}
        className="animate-fade-up relative w-full max-w-[380px] rounded-[28px] border border-white/10 bg-white/[0.06] p-7 shadow-2xl shadow-black/40 backdrop-blur-xl sm:p-9"
      >
        <div className="mx-auto mb-6 grid size-16 place-items-center rounded-2xl bg-gradient-to-br from-lime to-aqua text-deep shadow-lg shadow-lime/20">
          <LockKeyhole className="size-7" strokeWidth={2.2} />
        </div>

        <div className="mb-1 text-center text-[11px] font-bold uppercase tracking-[0.28em] text-lime">Restricted access</div>
        <h1 className="text-center font-display text-3xl font-extrabold">Confidential</h1>
        <p className="mt-2 text-center text-[14.5px] text-mint/80">Enter password to continue</p>

        <label htmlFor="password" className="sr-only">
          Password
        </label>
        <div className={`mt-7 flex h-13 items-center rounded-2xl border bg-black/20 transition focus-within:ring-4 ${error ? "border-red-400/70 focus-within:ring-red-400/15" : "border-white/15 focus-within:border-lime focus-within:ring-lime/15"}`}>
          <input
            id="password"
            type={show ? "text" : "password"}
            autoComplete="current-password"
            autoFocus
            placeholder="Password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setError("");
            }}
            className="h-full min-w-0 flex-1 bg-transparent px-4 text-[16px] tracking-wide text-white placeholder:text-white/35 focus:outline-none"
          />
          <button
            type="button"
            onClick={() => setShow((s) => !s)}
            className="grid size-11 place-items-center text-white/50 hover:text-white"
            aria-label={show ? "Hide password" : "Show password"}
          >
            {show ? <EyeOff className="size-[18px]" /> : <Eye className="size-[18px]" />}
          </button>
        </div>

        <div className="min-h-6 pt-2 text-center text-[13px] font-semibold text-red-300" role="alert">
          {error}
        </div>

        <button
          type="submit"
          disabled={!password || busy}
          className="mt-1 flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-lime font-bold text-deep shadow-lg shadow-lime/20 transition hover:bg-white active:scale-[0.99] disabled:opacity-50"
        >
          {busy ? <Loader2 className="size-5 animate-spin" /> : <>Enter <ArrowRight className="size-[18px]" /></>}
        </button>
      </form>
    </main>
  );
}
