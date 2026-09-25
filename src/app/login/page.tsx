"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Delete, LockKeyhole, LockKeyholeOpen } from "lucide-react";
import { WAVE_BACK, WAVE_FRONT } from "@/lib/theme";

const PIN_LENGTH = 4;
const DIGITS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"];

/** Keypad layout: 10 digits in random order, with Clear and Delete in the bottom corners. */
const shuffledKeys = () => {
  const d = [...DIGITS];
  for (let i = d.length - 1; i > 0; i--) {
    const j = crypto.getRandomValues(new Uint32Array(1))[0]! % (i + 1);
    [d[i], d[j]] = [d[j]!, d[i]!];
  }
  return [...d.slice(0, 9), "", d[9]!, "del"];
};

type Status = "idle" | "checking" | "error" | "success";

export default function LoginPage() {
  const [pin, setPin] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState("");
  const [peek, setPeek] = useState(-1); // index of the digit briefly shown before it turns into a dot
  const [pressed, setPressed] = useState<string | null>(null);
  const [keys, setKeys] = useState<string[] | null>(null); // shuffled on the client only, so SSR and hydration agree
  const peekTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const locked = status === "checking" || status === "success";

  const submit = useCallback(async (value: string) => {
    setStatus("checking");
    setError("");
    const res = await fetch("/api/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ password: value }),
    }).catch(() => null);
    if (res?.ok) {
      setStatus("success");
      navigator.vibrate?.(30);
      const next = new URLSearchParams(window.location.search).get("next");
      setTimeout(() => {
        window.location.href = next && next.startsWith("/") && !next.startsWith("//") ? next : "/";
      }, 650);
      return;
    }
    setStatus("error");
    navigator.vibrate?.([60, 40, 60]);
    setError(res ? "Wrong PIN. Try again." : "Can't connect. Check your internet.");
    setTimeout(() => {
      setPin("");
      setStatus("idle");
    }, 550);
  }, []);

  const press = useCallback(
    (key: string) => {
      if (locked || status === "error") return;
      setPressed(key);
      setTimeout(() => setPressed((p) => (p === key ? null : p)), 140);
      if (key === "del") {
        setPin(pin.slice(0, -1));
        setPeek(-1);
        return;
      }
      if (key === "clear") {
        setPin("");
        setPeek(-1);
        return;
      }
      if (pin.length >= PIN_LENGTH) return;
      const next = pin + key;
      setError("");
      setPin(next);
      setPeek(pin.length);
      clearTimeout(peekTimer.current);
      peekTimer.current = setTimeout(() => setPeek(-1), 450);
      if (next.length === PIN_LENGTH) {
        setStatus("checking");
        setTimeout(() => submit(next), 180);
      }
    },
    [locked, status, pin, submit],
  );

  // physical keyboard support
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (/^\d$/.test(e.key)) press(e.key);
      else if (e.key === "Backspace") press("del");
      else if (e.key === "Escape") press("clear");
      else return;
      e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [press]);

  useEffect(() => () => clearTimeout(peekTimer.current), []);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- random layout must be created after hydration
  useEffect(() => setKeys(shuffledKeys()), []);

  const Lock = status === "success" ? LockKeyholeOpen : LockKeyhole;

  return (
    <main className="relative grid min-h-dvh place-items-center overflow-hidden bg-deep px-5 py-10 text-white select-none">
      {/* soft background light */}
      <div className="animate-drift pointer-events-none absolute -left-32 -top-32 size-[420px] rounded-full bg-aqua/20 blur-3xl" />
      <div className="animate-drift-slow pointer-events-none absolute -bottom-40 -right-24 size-[460px] rounded-full bg-lime/15 blur-3xl" />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.05]"
        style={{ backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)", backgroundSize: "22px 22px" }}
      />
      <svg viewBox="0 0 595 40" preserveAspectRatio="none" className="pointer-events-none absolute inset-x-0 bottom-0 h-16 w-full" aria-hidden>
        <path d={WAVE_BACK} className="fill-aqua/15" />
        <path d={WAVE_FRONT} className="fill-lime/20" />
      </svg>

      <section className="animate-fade-up relative w-full max-w-[360px] rounded-[32px] border border-white/10 bg-white/[0.06] px-6 pb-7 pt-8 shadow-2xl shadow-black/40 backdrop-blur-xl sm:px-8">
        {/* lock badge */}
        <div className="relative mx-auto mb-5 grid size-16 place-items-center">
          <span
            className={`absolute inset-0 rounded-2xl transition-colors duration-300 ${status === "error" ? "bg-red-400/30" : "bg-lime/25"} ${status === "idle" ? "animate-pin-halo" : ""}`}
          />
          <span
            className={`relative grid size-16 place-items-center rounded-2xl text-deep shadow-lg transition-all duration-300 ${
              status === "error"
                ? "bg-gradient-to-br from-red-300 to-red-400 shadow-red-400/25"
                : "bg-gradient-to-br from-lime to-aqua shadow-lime/20"
            } ${status === "success" ? "animate-pin-unlock" : ""} ${status === "error" ? "animate-pin-wobble" : ""}`}
          >
            <Lock className="size-7" strokeWidth={2.2} />
          </span>
        </div>

        <div className="mb-1 text-center text-[11px] font-bold uppercase tracking-[0.28em] text-lime">Restricted access</div>
        <h1 className="text-center font-display text-3xl font-extrabold">
          {status === "success" ? "Welcome back!" : "Enter your PIN"}
        </h1>
        <p className="mt-1.5 text-center text-[14px] text-mint/75">
          {status === "checking" ? "Checking…" : status === "success" ? "Unlocking…" : `Type your ${PIN_LENGTH}-digit PIN`}
        </p>

        {/* PIN slots */}
        <div
          className={`mt-7 flex justify-center gap-4 ${status === "error" ? "animate-pin-shake" : ""}`}
          role="status"
          aria-live="polite"
          aria-label={`${pin.length} of ${PIN_LENGTH} digits entered`}
        >
          {Array.from({ length: PIN_LENGTH }, (_, i) => {
            const filled = i < pin.length;
            const tone =
              status === "error" ? "border-red-400 bg-red-400/15" : status === "success" ? "border-lime bg-lime/20" : filled ? "border-lime bg-lime/10" : "border-white/20 bg-black/20";
            return (
              <div
                key={i}
                className={`relative grid size-14 place-items-center rounded-2xl border-2 transition-colors duration-200 ${tone} ${
                  status === "checking" ? "animate-pin-wave" : ""
                } ${status === "success" ? "animate-pin-hop" : ""} ${i === pin.length && status === "idle" ? "ring-4 ring-lime/10" : ""}`}
                style={status === "checking" || status === "success" ? { animationDelay: `${i * 90}ms` } : undefined}
              >
                {filled &&
                  (peek === i ? (
                    <span key="digit" className="animate-pin-pop font-display text-2xl font-extrabold text-lime">
                      {pin[i]}
                    </span>
                  ) : (
                    <span key="dot" className={`animate-pin-pop size-3.5 rounded-full ${status === "error" ? "bg-red-400" : "bg-lime"}`} />
                  ))}
                {filled && peek === i && <span className="animate-pin-ripple pointer-events-none absolute inset-0 rounded-2xl border-2 border-lime" />}
                {!filled && i === pin.length && status === "idle" && (
                  <span className="animate-pin-caret absolute bottom-2.5 h-0.5 w-4 rounded-full bg-lime/70" />
                )}
              </div>
            );
          })}
        </div>

        <div className="min-h-7 pt-3 text-center text-[13px] font-semibold text-red-300" role="alert">
          {error}
        </div>

        {/* keypad */}
        <div className="mt-1 grid grid-cols-3 gap-3">
          {!keys && Array.from({ length: 12 }, (_, i) => <div key={i} className="h-14" />)}
          {keys?.map((key, i) =>
            key === "" ? (
              <button
                key={i}
                type="button"
                onClick={() => press("clear")}
                disabled={locked || !pin}
                className="animate-key-in h-14 rounded-2xl text-[12px] font-bold uppercase tracking-widest text-white/45 transition hover:text-white disabled:opacity-0"
              >
                Clear
              </button>
            ) : (
              <button
                key={i}
                type="button"
                onClick={() => press(key)}
                disabled={locked}
                aria-label={key === "del" ? "Delete last digit" : key}
                style={{ animationDelay: `${i * 35}ms` }}
                className={`animate-key-in relative grid h-14 place-items-center overflow-hidden rounded-2xl font-display text-2xl font-bold transition duration-150 active:scale-90 disabled:opacity-40 ${
                  key === "del"
                    ? "text-white/60 hover:text-white"
                    : "border border-white/10 bg-white/[0.07] hover:border-lime/40 hover:bg-white/[0.12]"
                } ${pressed === key ? "scale-90 bg-lime/25 text-lime" : ""}`}
              >
                {key === "del" ? <Delete className="size-6" /> : key}
              </button>
            ),
          )}
        </div>
      </section>
    </main>
  );
}
