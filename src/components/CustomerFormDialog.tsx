"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, CloudOff, Copy, ExternalLink, Hourglass, Link2, Loader2, MessageCircle, RefreshCw, Send, Share2, Sparkles, UserCheck, X } from "lucide-react";
import { useStore } from "@/lib/store";
import { Button, cx, useToast } from "./ui";

const KEY = "gr-customer-form"; // the link in progress, so it survives closing the dialog or reloading
const TTL = 30 * 60 * 1000;
const POLL_MS = 4000;

type Phase = "intro" | "creating" | "live" | "used" | "expired";
interface Live {
  token: string;
  url: string;
  deadline: number; // ms, this device's clock
}

const pad = (n: number) => String(n).padStart(2, "0");
const clock = (ms: number) => `${pad(Math.floor(ms / 60000))}:${pad(Math.floor((ms % 60000) / 1000))}`;
const readSaved = (): Live | null => {
  try {
    const s = JSON.parse(localStorage.getItem(KEY) ?? "null") as Live | null;
    return s && s.deadline > Date.now() ? s : null;
  } catch {
    return null;
  }
};
const save = (l: Live | null) => {
  try {
    if (l) localStorage.setItem(KEY, JSON.stringify(l));
    else localStorage.removeItem(KEY);
  } catch {
    /* private mode */
  }
};

/**
 * "Customer form" button + dialog: makes a one-time link (open 30 minutes) to a public form. What the customer
 * sends goes straight into the customer list; the link then closes. While a link is live the button shows the
 * time left, and the dialog (or a toast, if it is closed) reports the moment the customer has filled it in.
 */
export function CustomerFormDialog() {
  const { shop, mode, reload } = useStore();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [phase, setPhase] = useState<Phase>("intro");
  const [live, setLive] = useState<Live | null>(null);
  const [left, setLeft] = useState(0);
  const [copied, setCopied] = useState<"auto" | "manual" | null>(null);
  const [who, setWho] = useState("");
  const [error, setError] = useState("");
  const linkBox = useRef<HTMLInputElement>(null);
  // latest values for the polling loop, which shouldn't restart every time the store changes
  const openRef = useRef(open);
  const fns = useRef({ reload, toast });
  useEffect(() => {
    openRef.current = open;
    fns.current = { reload, toast };
  });

  // pick up a link made earlier (dialog closed, page reloaded); read after mount so the server render matches
  useEffect(() => {
    const id = window.setTimeout(() => {
      const saved = readSaved();
      if (!saved) return save(null);
      setLive(saved);
      setPhase("live");
    }, 0);
    return () => clearTimeout(id);
  }, []);

  const close = () => {
    setOpen(false);
    setError("");
    // finished links don't need to be shown again
    if (phase === "used" || phase === "expired") {
      setPhase("intro");
      setLive(null);
      setCopied(null);
    }
  };

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const copy = useCallback(async (url: string, how: "auto" | "manual") => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(how);
      return true;
    } catch {
      // clipboard blocked (e.g. the tap was too long ago): leave the link selected for a manual copy
      linkBox.current?.select();
      return false;
    }
  }, []);

  const create = async () => {
    setPhase("creating");
    setError("");
    setCopied(null);
    const res = await fetch("/api/forms", { method: "POST" }).catch(() => null);
    const body = res?.ok ? await res.json().catch(() => null) : null;
    if (!body?.token) {
      setPhase("intro");
      setError(res?.status === 503 ? "The database isn't reachable right now. Try again in a moment." : "Couldn't create a link. Please try again.");
      return;
    }
    const l: Live = { token: body.token, url: `${window.location.origin}/f/${body.token}`, deadline: Date.now() + TTL };
    save(l);
    setLive(l);
    setLeft(TTL);
    setPhase("live");
    if (await copy(l.url, "auto")) toast("Link copied - paste it to your customer");
  };

  const cancel = async () => {
    if (!live) return;
    await fetch(`/api/forms?token=${encodeURIComponent(live.token)}`, { method: "DELETE" }).catch(() => null);
    save(null);
    setLive(null);
    setCopied(null);
    setPhase("intro");
    toast("Link cancelled");
  };

  // countdown
  useEffect(() => {
    if (phase !== "live" || !live) return;
    const tick = () => {
      const ms = Math.max(0, live.deadline - Date.now());
      setLeft(ms);
      if (ms === 0) {
        save(null);
        setPhase((p) => (p === "live" ? "expired" : p));
      }
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [phase, live]);

  // ask the server whether the customer has filled it in (also while the dialog is closed)
  useEffect(() => {
    if (phase !== "live" || !live) return;
    let stop = false;
    const check = async () => {
      const res = await fetch(`/api/forms?token=${encodeURIComponent(live.token)}`, { cache: "no-store" }).catch(() => null);
      const s = res?.ok ? await res.json().catch(() => null) : null;
      if (stop || !s?.state) return;
      if (s.state === "used") {
        save(null);
        setWho(s.customerName ?? "Your customer");
        setPhase("used");
        fns.current.reload();
        if (!openRef.current) fns.current.toast(`${s.customerName ?? "Your customer"} filled in the form and was added to customers`);
      } else if (s.state === "expired" || s.state === "missing") {
        save(null);
        setPhase("expired");
      } else if (typeof s.msLeft === "number") {
        // keep our countdown on the server's clock
        const deadline = Date.now() + s.msLeft;
        if (Math.abs(deadline - live.deadline) > 3000) setLive((l) => (l ? { ...l, deadline } : l));
      }
    };
    void check();
    const id = window.setInterval(check, POLL_MS);
    return () => {
      stop = true;
      clearInterval(id);
    };
  }, [phase, live]);

  const message = live ? `Hi! Please share your details with ${shop.name} here: ${live.url}\nThe link works once and closes in 30 minutes.` : "";
  const share = async () => {
    if (!live) return;
    if (navigator.share) await navigator.share({ title: `${shop.name} - your details`, text: message }).catch(() => null);
    else if (await copy(message, "manual")) toast("Message copied");
  };

  const frac = phase === "live" ? left / TTL : 0;
  const tone = left < 60_000 ? "text-red-500" : left < 5 * 60_000 ? "text-amber-500" : "text-brand";

  return (
    <>
      <Button onClick={() => setOpen(true)} className="group relative">
        <Link2 className="size-4 transition-transform duration-300 group-hover:-rotate-45" /> Customer form
        {phase === "live" && (
          <span className="ml-0.5 flex items-center gap-1 rounded-full bg-soft px-1.5 py-0.5 text-[11px] font-bold tabular-nums text-brand">
            <span className="relative flex size-1.5">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-lime" />
              <span className="relative inline-flex size-1.5 rounded-full bg-brand" />
            </span>
            {clock(left)}
          </span>
        )}
      </Button>

      {/* portalled to <body>: the page wrapper is animated with a transform, which would trap a fixed element */}
      {open &&
        createPortal(
          <div className="fixed inset-0 z-50 grid place-items-center p-4" role="dialog" aria-modal="true" aria-labelledby="cform-title">
            <div className="animate-backdrop-in absolute inset-0 bg-deep/50 backdrop-blur-sm" onClick={close} />
            <div className="animate-modal-in relative flex max-h-[92dvh] w-full max-w-md flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">
              {/* header */}
              <div className="relative overflow-hidden bg-deep px-5 pb-6 pt-5 text-white">
                <div className="animate-aurora pointer-events-none absolute -right-16 -top-20 size-56 rounded-full bg-aqua/30 blur-3xl" />
                <div className="animate-aurora-slow pointer-events-none absolute -bottom-24 -left-10 size-48 rounded-full bg-lime/25 blur-3xl" />
                <div className="relative flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="grid size-11 place-items-center rounded-2xl bg-white/10 text-lime ring-1 ring-white/15">
                      <Link2 className="size-5" />
                    </div>
                    <div>
                      <h2 id="cform-title" className="font-display text-lg font-extrabold">
                        Customer form
                      </h2>
                      <p className="text-[13px] text-mint/80">A one-time link your customer fills in</p>
                    </div>
                  </div>
                  <button onClick={close} className="grid size-9 place-items-center rounded-xl text-mint/80 transition hover:rotate-90 hover:bg-white/10 hover:text-white" aria-label="Close">
                    <X className="size-5" />
                  </button>
                </div>
              </div>

              <div key={phase} className="animate-fade-up overflow-y-auto p-5">
                {mode !== "cloud" ? (
                  <State
                    icon={<CloudOff className="size-8" />}
                    tone="bg-amber-50 text-amber-600"
                    title="Needs the cloud database"
                    text="Right now your data is saved only on this device, so a customer's phone can't reach it. Connect the database (DATABASE_URL) to use customer forms."
                  />
                ) : phase === "intro" || phase === "creating" ? (
                  <>
                    <ol className="space-y-3">
                      {[
                        { icon: <Sparkles className="size-4" />, title: "Create a link", text: "It's copied for you, ready to paste." },
                        { icon: <Send className="size-4" />, title: "Your customer fills it in", text: "Name, phone and address - from any phone." },
                        { icon: <UserCheck className="size-4" />, title: "Saved automatically", text: "They appear in Customers, and the link closes." },
                      ].map((s, i) => (
                        <li key={s.title} className="animate-row-in flex items-start gap-3 rounded-2xl bg-canvas p-3" style={{ animationDelay: `${i * 70}ms` }}>
                          <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-white text-brand shadow-sm">{s.icon}</span>
                          <span>
                            <span className="block text-[14px] font-bold">{s.title}</span>
                            <span className="block text-[12.5px] text-muted">{s.text}</span>
                          </span>
                        </li>
                      ))}
                    </ol>
                    <p className="mt-4 flex items-center gap-2 text-[12.5px] text-muted">
                      <Hourglass className="size-3.5 shrink-0" /> Each link stays open for 30 minutes and works only once.
                    </p>
                    {error && <p className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-[13px] font-medium text-red-600">{error}</p>}
                    <Button variant="primary" onClick={create} disabled={phase === "creating"} className="group mt-5 h-12 w-full text-[15px]">
                      {phase === "creating" ? (
                        <>
                          <Loader2 className="size-5 animate-spin" /> Creating link…
                        </>
                      ) : (
                        <>
                          <Sparkles className="size-5 transition-transform duration-500 group-hover:rotate-180" /> Create form link
                        </>
                      )}
                    </Button>
                  </>
                ) : phase === "live" && live ? (
                  <>
                    {/* countdown ring + status */}
                    <div className="flex items-center gap-4">
                      <div className="relative size-24 shrink-0">
                        <svg viewBox="0 0 100 100" className="size-full -rotate-90">
                          <circle cx="50" cy="50" r="44" fill="none" strokeWidth="8" className="stroke-line" />
                          <circle
                            cx="50"
                            cy="50"
                            r="44"
                            fill="none"
                            strokeWidth="8"
                            strokeLinecap="round"
                            stroke="currentColor"
                            className={cx("transition-[stroke-dashoffset] duration-1000 ease-linear", tone)}
                            strokeDasharray={2 * Math.PI * 44}
                            strokeDashoffset={2 * Math.PI * 44 * (1 - frac)}
                          />
                        </svg>
                        <div className="absolute inset-0 grid place-items-center text-center">
                          <div>
                            <div className={cx("font-display text-xl font-extrabold tabular-nums leading-none", tone)}>{clock(left)}</div>
                            <div className="mt-1 text-[10px] font-bold uppercase tracking-wider text-muted">left</div>
                          </div>
                        </div>
                      </div>
                      <div className="min-w-0">
                        <p className="flex items-center gap-2 font-display text-[16px] font-extrabold">
                          <span className="relative flex size-2.5">
                            <span className="absolute inline-flex size-full animate-ping rounded-full bg-lime" />
                            <span className="relative inline-flex size-2.5 rounded-full bg-brand" />
                          </span>
                          Link is live
                        </p>
                        <p className="mt-1 text-[13px] text-muted">
                          Waiting for your customer
                          <span className="form-dots" aria-hidden>
                            <span>.</span>
                            <span>.</span>
                            <span>.</span>
                          </span>
                        </p>
                        <p className="mt-1 text-[12px] text-faint">It closes the moment they send it.</p>
                      </div>
                    </div>

                    {/* the link */}
                    <div className="mt-5">
                      <div className="mb-1.5 flex items-center justify-between">
                        <span className="text-[12.5px] font-bold text-body">Form link</span>
                        {copied && (
                          <span key={copied} className="animate-search-pop flex items-center gap-1 text-[12px] font-bold text-brand">
                            <Check className="size-3.5" /> {copied === "auto" ? "Copied to clipboard" : "Copied"}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 rounded-2xl border border-line bg-canvas p-1.5 pl-3.5">
                        <Link2 className="size-4 shrink-0 text-faint" />
                        <input
                          ref={linkBox}
                          readOnly
                          value={live.url}
                          onFocus={(e) => e.currentTarget.select()}
                          className="min-w-0 flex-1 bg-transparent font-mono text-[12.5px] text-body outline-none"
                          aria-label="Form link"
                        />
                        <button
                          onClick={() => copy(live.url, "manual")}
                          className={cx(
                            "flex h-9 shrink-0 items-center gap-1.5 rounded-xl px-3 text-[13px] font-bold transition-all active:scale-95",
                            copied ? "bg-soft text-brand" : "bg-deep text-lime hover:shadow-lg hover:shadow-deep/20",
                          )}
                        >
                          {copied ? <Check key="c" className="animate-search-pop size-4" /> : <Copy className="size-4" />}
                          {copied ? "Copied" : "Copy"}
                        </button>
                      </div>
                    </div>

                    {/* send it */}
                    <div className="mt-3 grid grid-cols-3 gap-2">
                      <a
                        href={`https://wa.me/?text=${encodeURIComponent(message)}`}
                        target="_blank"
                        rel="noreferrer"
                        className="flex flex-col items-center gap-1 rounded-2xl bg-[#e7f8ee] py-3 text-[12.5px] font-bold text-[#128c4a] transition hover:-translate-y-0.5 hover:shadow-md active:scale-95"
                      >
                        <MessageCircle className="size-5" /> WhatsApp
                      </a>
                      <button onClick={share} className="flex flex-col items-center gap-1 rounded-2xl bg-aqua-soft py-3 text-[12.5px] font-bold text-aqua-deep transition hover:-translate-y-0.5 hover:shadow-md active:scale-95">
                        <Share2 className="size-5" /> Share
                      </button>
                      <a
                        href={live.url}
                        target="_blank"
                        rel="noreferrer"
                        className="flex flex-col items-center gap-1 rounded-2xl bg-canvas py-3 text-[12.5px] font-bold text-body transition hover:-translate-y-0.5 hover:shadow-md active:scale-95"
                      >
                        <ExternalLink className="size-5" /> Preview
                      </a>
                    </div>

                    <div className="mt-5 flex items-center justify-between border-t border-line pt-4">
                      <button onClick={cancel} className="text-[13px] font-semibold text-muted transition hover:text-red-600">
                        Cancel link
                      </button>
                      <button onClick={create} className="group flex items-center gap-1.5 text-[13px] font-bold text-brand">
                        <RefreshCw className="size-3.5 transition-transform duration-500 group-hover:rotate-180" /> New link
                      </button>
                    </div>
                  </>
                ) : phase === "used" ? (
                  <State
                    icon={
                      <svg viewBox="0 0 52 52" className="size-14" aria-hidden>
                        <circle className="form-check-ring" cx="26" cy="26" r="24" fill="none" stroke="currentColor" strokeWidth="3" />
                        <path className="form-check-tick" d="M15 27 L23 35 L38 18" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    }
                    tone="bg-soft text-brand"
                    title={`${who} is in!`}
                    text="They filled in the form and were added to your customers. The link is now closed."
                    action={
                      <Button variant="primary" onClick={create} className="mt-5">
                        <Sparkles className="size-4" /> Create another link
                      </Button>
                    }
                  />
                ) : (
                  <State
                    icon={<Hourglass className="form-hourglass size-8" />}
                    tone="bg-amber-50 text-amber-600"
                    title="Link expired"
                    text="Nobody filled it in within 30 minutes, so it closed. Make a fresh one whenever you're ready."
                    action={
                      <Button variant="primary" onClick={create} className="mt-5">
                        <RefreshCw className="size-4" /> Create new link
                      </Button>
                    }
                  />
                )}
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}

function State({ icon, tone, title, text, action }: { icon: React.ReactNode; tone: string; title: string; text: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center py-4 text-center">
      <div className={cx("form-badge grid size-20 place-items-center rounded-full", tone)}>{icon}</div>
      <h3 className="mt-4 font-display text-xl font-extrabold">{title}</h3>
      <p className="mt-1.5 max-w-xs text-[13.5px] text-muted">{text}</p>
      {action}
    </div>
  );
}
