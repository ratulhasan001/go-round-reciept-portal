"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight, Loader2, LogOut, Package } from "lucide-react";
import { ORDER_LABEL, PAY_LABEL, fmtWhen, payState, tk } from "@/lib/site";
import type { OrderView } from "@/lib/server/orders";
import { useShop } from "./StoreContext";
import { OrderCard } from "./TrackView";
import { Panel, SeaField, SeaInput, SeaTextarea, btn, cx } from "./ui";
import { useSavedContact } from "./useSavedContact";

interface Account {
  id: string;
  name: string;
  phone: string;
  email: string;
  address: string;
}

async function post(body: Record<string, unknown>) {
  const res = await fetch("/api/site/account", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }).catch(() => null);
  const b = await res?.json().catch(() => ({}));
  return { ok: !!res?.ok, fields: (b?.fields ?? {}) as Record<string, string>, message: (b?.message as string) ?? (res ? "" : "You seem to be offline.") };
}

export function AccountView() {
  const { online } = useShop();
  const [data, setData] = useState<{ account: Account | null; orders: OrderView[] } | null>(null);
  const load = useCallback(async () => {
    const b = await fetch("/api/site/account", { cache: "no-store" })
      .then((r) => r.json())
      .catch(() => null);
    setData({ account: b?.account ?? null, orders: b?.orders ?? [] });
  }, []);
  useEffect(() => {
    void load(); // eslint-disable-line react-hooks/set-state-in-effect -- load the account once
  }, [load]);

  if (!data) return <div className="mx-auto h-80 max-w-lg animate-pulse rounded-[28px] bg-sea-sand/50" />;
  if (!online) return <Panel className="mx-auto max-w-lg text-center text-[15px] text-sea-body">Accounts are coming soon. You can still order as a guest.</Panel>;
  if (!data.account) return <SignIn onDone={load} />;
  return <Dashboard account={data.account} orders={data.orders} reload={load} />;
}

function SignIn({ onDone }: { onDone: () => void }) {
  const { links } = useShop();
  const params = useSearchParams();
  const router = useRouter();
  const [tab, setTab] = useState<"login" | "register">("login");
  const [f, setF] = useState({ name: "", phone: "", email: "", address: "", password: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setF((x) => ({ ...x, [k]: e.target.value }));
  // ordered before as a guest? the account starts with the details we already have for this number
  const saved = useSavedContact(f.phone, tab === "register", (c) => {
    if (!c.account) setF((x) => ({ ...x, name: x.name.trim() ? x.name : c.name, email: x.email.trim() ? x.email : c.email, address: x.address.trim() ? x.address : c.address }));
  });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErrors({});
    setMsg("");
    const r = await post({ action: tab, ...f });
    setBusy(false);
    if (!r.ok) {
      setErrors(r.fields);
      setMsg(r.message);
      return;
    }
    if (params.get("next") === "checkout") router.push(links.store("/checkout"));
    else onDone();
  };

  return (
    <Panel className="mx-auto max-w-lg">
      <div className="mb-6 grid grid-cols-2 rounded-full bg-sea-sand/70 p-1" role="tablist">
        {(["login", "register"] as const).map((t) => (
          <button
            key={t}
            role="tab"
            aria-selected={tab === t}
            onClick={() => {
              setTab(t);
              setErrors({});
            }}
            className={cx("h-10 rounded-full text-[14px] font-bold transition", tab === t ? "bg-white text-sea-ink shadow-sm" : "text-sea-muted")}
          >
            {t === "login" ? "Log in" : "Create account"}
          </button>
        ))}
      </div>
      <form onSubmit={submit} className="grid gap-4" noValidate>
        <SeaField label="Mobile number" error={errors.phone} htmlFor="a-phone">
          <SeaInput id="a-phone" type="tel" inputMode="tel" autoComplete="tel" placeholder="01XXXXXXXXX" value={f.phone} onChange={set("phone")} invalid={!!errors.phone} />
        </SeaField>
        {tab === "register" && saved && (
          <p role="status" className="rounded-2xl bg-sea-leaf/10 px-4 py-3 text-[13.5px] font-semibold text-sea-ink">
            {saved.account ? (
              <>
                This number already has an account.{" "}
                <button type="button" onClick={() => setTab("login")} className="font-bold text-sea-teal underline underline-offset-4">
                  Log in instead
                </button>
              </>
            ) : (
              <>Welcome back, {saved.name.split(" ")[0]}! We filled in the details from your earlier orders - your past orders will show in your account too.</>
            )}
          </p>
        )}
        {tab === "register" && (
          <>
            <SeaField label="Full name" error={errors.name} htmlFor="a-name">
              <SeaInput id="a-name" autoComplete="name" value={f.name} onChange={set("name")} invalid={!!errors.name} />
            </SeaField>
            <SeaField label="Email" hint="optional" error={errors.email} htmlFor="a-email">
              <SeaInput id="a-email" type="email" autoComplete="email" value={f.email} onChange={set("email")} invalid={!!errors.email} />
            </SeaField>
            <SeaField label="Delivery address" hint="optional" htmlFor="a-address">
              <SeaTextarea id="a-address" rows={2} autoComplete="street-address" value={f.address} onChange={set("address")} />
            </SeaField>
          </>
        )}
        <SeaField label="Password" hint={tab === "register" ? "at least 6 characters" : undefined} error={errors.password} htmlFor="a-pw">
          <SeaInput id="a-pw" type="password" autoComplete={tab === "login" ? "current-password" : "new-password"} value={f.password} onChange={set("password")} invalid={!!errors.password} />
        </SeaField>
        {msg && <p className="text-[13.5px] font-semibold text-red-600">{msg}</p>}
        <button type="submit" disabled={busy} className={btn("primary", "lg", "w-full")}>
          {busy && <Loader2 className="size-4 animate-spin" />} {tab === "login" ? "Log in" : "Create account"}
        </button>
        {tab === "login" && <p className="text-center text-[13px] text-sea-muted">Forgot your password? Message us on WhatsApp and we&apos;ll send you a new one.</p>}
        <p className="text-center text-[13px] text-sea-muted">
          No account needed to order -{" "}
          <Link href={links.store("/products")} className="font-bold text-sea-teal hover:underline">
            shop as a guest
          </Link>
        </p>
      </form>
    </Panel>
  );
}

function Dashboard({ account, orders, reload }: { account: Account; orders: OrderView[]; reload: () => void }) {
  const { links } = useShop();
  const [open, setOpen] = useState<OrderView | null>(null);
  const [tab, setTab] = useState<"orders" | "details">("orders");

  if (open)
    return (
      <div>
        <button onClick={() => setOpen(null)} className="mb-6 inline-flex items-center gap-1 text-[13.5px] font-bold text-sea-muted hover:text-sea-ink">
          <ChevronLeft className="size-4" /> All orders
        </button>
        <OrderCard order={open} phone={open.customer.phone} onChange={(o) => setOpen(o)} />
      </div>
    );

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <p className="font-serif text-[26px]">
          Hello, <em className="text-sea-teal">{account.name.split(" ")[0]}</em>
        </p>
        <button
          onClick={async () => {
            await post({ action: "logout" });
            reload();
          }}
          className={btn("ghost", "sm")}
        >
          <LogOut className="size-4" /> Log out
        </button>
      </div>
      <div className="mb-6 flex gap-2">
        {(["orders", "details"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={cx("h-10 rounded-full px-5 text-[14px] font-bold transition", tab === t ? "bg-sea-ink text-white" : "border border-sea-line bg-sea-paper")}>
            {t === "orders" ? `My orders (${orders.length})` : "My details"}
          </button>
        ))}
      </div>
      {tab === "orders" ? (
        orders.length ? (
          <ul className="grid gap-3">
            {orders.map((o) => (
              <li key={o.id}>
                <button onClick={() => setOpen(o)} className="flex w-full items-center gap-4 rounded-[22px] border border-sea-line bg-sea-paper p-4 text-left transition hover:border-sea-ink/30">
                  <span className="grid size-11 shrink-0 place-items-center rounded-full bg-sea-teal-soft text-sea-teal">
                    <Package className="size-5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[15px] font-extrabold">
                      {o.code} <span className="font-semibold text-sea-muted">· {tk(o.total)}</span>
                    </span>
                    <span className="block text-[13px] text-sea-muted">
                      {fmtWhen(o.createdAt)} · {o.items.length} item{o.items.length === 1 ? "" : "s"}
                    </span>
                  </span>
                  <span className="hidden text-right sm:block">
                    <span className="block text-[13px] font-extrabold">{ORDER_LABEL[o.status]}</span>
                    <span className="block text-[12px] text-sea-muted">{o.status === "cancelled" ? "" : PAY_LABEL[payState(o)]}</span>
                  </span>
                  <ChevronRight className="size-5 text-sea-muted" />
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <Panel className="text-center">
            <p className="font-serif text-[22px]">No orders yet</p>
            <Link href={links.store("/products")} className={btn("primary", "md", "mt-5")}>
              Start shopping
            </Link>
          </Panel>
        )
      ) : (
        <Details account={account} reload={reload} />
      )}
    </div>
  );
}

function Details({ account, reload }: { account: Account; reload: () => void }) {
  const [f, setF] = useState({ name: account.name, phone: account.phone, email: account.email, address: account.address });
  const [pw, setPw] = useState({ password: "", next: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState("");
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setF((x) => ({ ...x, [k]: e.target.value }));

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Panel>
        <h2 className="mb-5 font-serif text-[22px]">Your details</h2>
        <form
          className="grid gap-4"
          onSubmit={async (e) => {
            e.preventDefault();
            const r = await post({ action: "update", ...f });
            setErrors(r.fields);
            if (r.ok) {
              setSaved("details");
              reload();
            }
          }}
        >
          <SeaField label="Full name" error={errors.name}>
            <SeaInput value={f.name} onChange={set("name")} invalid={!!errors.name} />
          </SeaField>
          <SeaField label="Mobile number" error={errors.phone}>
            <SeaInput type="tel" value={f.phone} onChange={set("phone")} invalid={!!errors.phone} />
          </SeaField>
          <SeaField label="Email" hint="optional" error={errors.email}>
            <SeaInput type="email" value={f.email} onChange={set("email")} invalid={!!errors.email} />
          </SeaField>
          <SeaField label="Delivery address">
            <SeaTextarea rows={3} value={f.address} onChange={set("address")} />
          </SeaField>
          <button className={btn("primary", "md", "justify-self-start")}>Save</button>
          {saved === "details" && <p className="text-[13px] font-semibold text-sea-leaf">Saved.</p>}
        </form>
      </Panel>
      <Panel>
        <h2 className="mb-5 font-serif text-[22px]">Change password</h2>
        <form
          className="grid gap-4"
          onSubmit={async (e) => {
            e.preventDefault();
            const r = await post({ action: "password", ...pw });
            setErrors(r.fields);
            if (r.ok) {
              setSaved("password");
              setPw({ password: "", next: "" });
            }
          }}
        >
          <SeaField label="Current password" error={errors.password}>
            <SeaInput type="password" autoComplete="current-password" value={pw.password} onChange={(e) => setPw((x) => ({ ...x, password: e.target.value }))} invalid={!!errors.password} />
          </SeaField>
          <SeaField label="New password" hint="at least 6 characters" error={errors.next}>
            <SeaInput type="password" autoComplete="new-password" value={pw.next} onChange={(e) => setPw((x) => ({ ...x, next: e.target.value }))} invalid={!!errors.next} />
          </SeaField>
          <button className={btn("outline", "md", "justify-self-start")}>Update password</button>
          {saved === "password" && <p className="text-[13px] font-semibold text-sea-leaf">Password changed.</p>}
        </form>
      </Panel>
    </div>
  );
}
