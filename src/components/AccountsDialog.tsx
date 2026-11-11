"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Copy, KeyRound, Loader2, MessageCircle, Search, Trash2, UserRound, UsersRound } from "lucide-react";
import { useStore } from "@/lib/store";
import { waLink, absolute, publicLinks } from "@/lib/site";
import { Modal } from "./Modal";
import { Button, Input, cx, useToast } from "./ui";

interface Account {
  id: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  createdAt: string;
  orders: number;
}

/** "Website accounts" button + dialog: customers who made an account on the store, with password resets. */
export function AccountsDialog() {
  const { mode, shop } = useStore();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [accounts, setAccounts] = useState<Account[] | null>(null);
  const [error, setError] = useState("");
  const [q, setQ] = useState("");
  const [reset, setReset] = useState<{ id: string; password: string } | null>(null);
  const [confirmDel, setConfirmDel] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const delTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(delTimer.current), []);

  const load = useCallback(async () => {
    setError("");
    const res = await fetch("/api/accounts", { cache: "no-store" }).catch(() => null);
    const body = res?.ok ? ((await res.json().catch(() => null)) as { accounts?: Account[] } | null) : null;
    if (!body?.accounts) setError("Couldn't load the accounts. Check your connection and try again.");
    else setAccounts(body.accounts);
  }, []);

  useEffect(() => {
    if (!open || mode !== "cloud") return;
    const t = setTimeout(() => void load(), 0);
    return () => clearTimeout(t);
  }, [open, mode, load]);

  const act = async (a: Account, action: "reset" | "delete") => {
    if (action === "delete" && confirmDel !== a.id) {
      setConfirmDel(a.id);
      clearTimeout(delTimer.current);
      delTimer.current = setTimeout(() => setConfirmDel(null), 3000);
      return;
    }
    setBusy(a.id);
    const res = await fetch("/api/accounts", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: a.id, action }) }).catch(() => null);
    const body = res?.ok ? ((await res.json().catch(() => null)) as { password?: string } | null) : null;
    setBusy(null);
    if (!body) return toast("That didn't work - try again", "err");
    if (action === "reset" && body.password) setReset({ id: a.id, password: body.password });
    if (action === "delete") {
      setConfirmDel(null);
      setAccounts((list) => list?.filter((x) => x.id !== a.id) ?? null);
      toast(`${a.name}'s account deleted`);
    }
  };

  const term = q.trim().toLowerCase();
  const digits = q.replace(/\D/g, "");
  const shown = (accounts ?? []).filter(
    (a) => !term || a.name.toLowerCase().includes(term) || a.email.toLowerCase().includes(term) || (digits.length >= 3 && a.phone.replace(/\D/g, "").includes(digits)),
  );

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <UsersRound className="size-4" /> Website accounts
      </Button>
      <Modal
        open={open}
        onClose={() => {
          setOpen(false);
          setReset(null);
        }}
        width="max-w-xl"
        icon={<UsersRound className="size-5" />}
        title="Website accounts"
        subtitle={accounts ? `${accounts.length} customer${accounts.length === 1 ? "" : "s"} with an account on your store` : "Customers who made an account on your store"}
      >
        <div className="p-5">
          {mode !== "cloud" ? (
            <p className="rounded-xl bg-amber-50 px-4 py-3 text-[13.5px] text-amber-800">
              Customer accounts need the cloud database. This copy of the app saves on this device only, so there are no website accounts here.
            </p>
          ) : error ? (
            <div className="flex flex-col items-start gap-3">
              <p className="text-[13.5px] text-red-700">{error}</p>
              <Button size="sm" onClick={() => void load()}>
                Try again
              </Button>
            </div>
          ) : !accounts ? (
            <div className="grid place-items-center py-10 text-muted">
              <Loader2 className="size-5 animate-spin" />
            </div>
          ) : accounts.length === 0 ? (
            <p className="py-8 text-center text-[13.5px] text-muted">No accounts yet. Customers can make one at checkout or on the store&apos;s account page - guests can order without one.</p>
          ) : (
            <>
              <div className="relative mb-3">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-faint" />
                <Input className="pl-9" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, phone or email" aria-label="Search accounts" />
              </div>
              <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line">
                {shown.map((a) => (
                  <li key={a.id} className="p-3.5">
                    <div className="flex items-start gap-3">
                      <span className="grid size-9 shrink-0 place-items-center rounded-full bg-soft text-brand">
                        <UserRound className="size-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[14px] font-bold">{a.name}</p>
                        <p className="truncate text-[12.5px] text-muted">
                          {a.phone}
                          {a.email ? ` · ${a.email}` : ""}
                        </p>
                        <p className="text-[12px] text-muted">
                          {a.orders} order{a.orders === 1 ? "" : "s"} · joined {new Date(a.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                        </p>
                      </div>
                      <div className="flex shrink-0 gap-1">
                        <Button size="sm" variant="ghost" loading={busy === a.id} onClick={() => void act(a, "reset")} title="Give a new temporary password">
                          <KeyRound className="size-3.5" /> <span className="hidden sm:inline">Reset password</span>
                        </Button>
                        <button
                          type="button"
                          onClick={() => void act(a, "delete")}
                          className={cx(
                            "grid h-8 min-w-8 place-items-center rounded-xl px-2 text-[12px] font-semibold transition",
                            confirmDel === a.id ? "bg-red-600 text-white" : "text-faint hover:bg-red-50 hover:text-red-600",
                          )}
                          aria-label={confirmDel === a.id ? "Tap again to delete" : `Delete ${a.name}'s account`}
                        >
                          {confirmDel === a.id ? "Delete?" : <Trash2 className="size-3.5" />}
                        </button>
                      </div>
                    </div>
                    {reset?.id === a.id && (
                      <div className="mt-3 rounded-xl bg-aqua-soft p-3">
                        <p className="text-[12.5px] text-aqua-deep">New temporary password - it&apos;s only shown now. Send it to {a.name.split(" ")[0]}; they can change it on their account page.</p>
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          <code className="rounded-lg bg-white px-3 py-1.5 font-mono text-[15px] font-bold tracking-wider text-ink">{reset.password}</code>
                          <Button
                            size="sm"
                            onClick={async () => {
                              try {
                                await navigator.clipboard.writeText(reset.password);
                                toast("Password copied");
                              } catch {
                                toast("Could not copy - your browser blocked the clipboard", "err");
                              }
                            }}
                          >
                            <Copy className="size-3.5" /> Copy
                          </Button>
                          <a
                            href={waLink(
                              a.phone,
                              `Hello ${a.name.split(" ")[0]}, your new ${shop.name} password is: ${reset.password}\nLog in with your phone number at ${absolute(publicLinks(window.location.host).store("/account"), window.location.origin)} and change it from your account page.`,
                            )}
                            target="_blank"
                            rel="noopener"
                            className="inline-flex h-8 items-center gap-1.5 rounded-xl bg-[#25D366] px-3 text-[13px] font-semibold text-white hover:brightness-95"
                          >
                            <MessageCircle className="size-3.5" /> Send on WhatsApp
                          </a>
                        </div>
                      </div>
                    )}
                  </li>
                ))}
                {shown.length === 0 && <li className="p-6 text-center text-[13px] text-muted">No accounts match your search.</li>}
              </ul>
            </>
          )}
        </div>
      </Modal>
    </>
  );
}
