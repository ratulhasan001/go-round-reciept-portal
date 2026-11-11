"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Landmark, Loader2, Lock, ShoppingBag, Smartphone } from "lucide-react";
import { deliveryFee, needsTrxAtCheckout, tk, waLink } from "@/lib/site";
import type { OrderPayMethod } from "@/lib/types";
import { ProductImage } from "./ProductImage";
import { rememberOrder, useShop } from "./StoreContext";
import { useFreshCart } from "./CartView";
import { PaymentInfo } from "./PaymentInfo";
import { WhatsAppIcon } from "./Icons";
import { useSavedContact } from "./useSavedContact";
import { Panel, SeaField, SeaInput, SeaTextarea, btn, cx } from "./ui";

interface Me {
  name: string;
  phone: string;
  email: string;
  address: string;
}

export function CheckoutView() {
  const { shop, online, lines, subtotal, ready, clear, refresh, links } = useShop();
  const router = useRouter();
  const note = useFreshCart();
  const s = shop.site;
  const [me, setMe] = useState<Me | null | undefined>(undefined);
  const [f, setF] = useState({ name: "", phone: "", email: "", address: "", note: "", zone: s.zones[0]?.id ?? "", method: "bKash" as OrderPayMethod, trxId: "", sender: "", password: "", website: "" });
  const [makeAccount, setMakeAccount] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [problem, setProblem] = useState("");
  const [busy, setBusy] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  // logged in? fill in the saved details
  useEffect(() => {
    fetch("/api/site/account")
      .then((r) => (r.ok ? r.json() : null))
      .then((b) => {
        const a = b?.account as Me | null | undefined;
        setMe(a ?? null);
        if (a) setF((x) => ({ ...x, name: x.name || a.name, phone: x.phone || a.phone, email: x.email || a.email, address: x.address || a.address }));
      })
      .catch(() => setMe(null));
  }, []);

  // a returning guest: typing their number brings back the details they gave us last time (blank fields only)
  const saved = useSavedContact(f.phone, me === null, (c) => {
    if (c.account) return;
    setF((x) => ({ ...x, name: x.name.trim() ? x.name : c.name, email: x.email.trim() ? x.email : c.email, address: x.address.trim() ? x.address : c.address }));
    setErrors(({ name: _n, address: _a, email: _e, ...rest }) => (void _n, void _a, void _e, rest));
  });

  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setF((x) => ({ ...x, [k]: e.target.value }));
    if (errors[k]) setErrors(({ [k]: _drop, ...rest }) => (void _drop, rest));
  };
  const { zone, fee } = deliveryFee(s, f.zone, subtotal);
  const total = subtotal + fee;

  if (!ready) return <div className="h-96 animate-pulse rounded-[28px] bg-sea-sand/50" />;
  if (!lines.length)
    return (
      <div className="grid place-items-center rounded-[28px] border border-dashed border-sea-line px-6 py-20 text-center">
        <ShoppingBag className="size-9 text-sea-muted" />
        <p className="mt-4 font-serif text-[26px]">Your cart is empty</p>
        <Link href={links.store("/products")} className={btn("primary", "lg", "mt-6")}>
          Go to the shop
        </Link>
      </div>
    );
  if (!s.open || !online)
    return (
      <Panel className="mx-auto max-w-xl text-center">
        <p className="font-serif text-[26px]">{!s.open ? "Online orders are paused" : "Online ordering is coming soon"}</p>
        <p className="mt-2 text-[15px] text-sea-body">Please send us your order on WhatsApp - we&apos;ll take it from there.</p>
        <a
          href={waLink(s.whatsapp, `Hi! I'd like to order:\n${lines.map((l) => `• ${l.name} × ${l.qty}`).join("\n")}`)}
          target="_blank"
          rel="noopener noreferrer"
          className={btn("primary", "lg", "mt-6")}
        >
          <WhatsAppIcon className="size-5 text-wa" /> Order on WhatsApp
        </a>
      </Panel>
    );

  const trxNeeded = needsTrxAtCheckout(s, f.method);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    if (trxNeeded && !f.trxId.trim()) {
      setErrors((x) => ({ ...x, trxId: "Please pay first, then type the transaction ID here." }));
      formRef.current?.querySelector<HTMLElement>('[name="trxId"]')?.focus();
      return;
    }
    setBusy(true);
    setProblem("");
    try {
      const res = await fetch("/api/site/orders", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...f, password: !me && makeAccount ? f.password : "", items: lines.map((l) => ({ id: l.id, qty: l.qty })) }),
      });
      const b = await res.json().catch(() => ({}));
      if (res.ok && b.order) {
        rememberOrder(b.order.code, b.order.customer.phone);
        clear();
        router.push(`${links.orderStatus(b.order.code)}&placed=1`);
        return;
      }
      if (b.fields) {
        setErrors(b.fields);
        const first = Object.keys(b.fields)[0];
        formRef.current?.querySelector<HTMLElement>(`[name="${first}"]`)?.focus();
      } else if (b.error === "unavailable" && Array.isArray(b.ids)) {
        const products = await fetch("/api/site/products").then((r) => r.json()).catch(() => null);
        if (products?.products) refresh(products.products);
        setProblem(b.message);
      } else setProblem(b.message ?? "Something went wrong. Please try again.");
    } catch {
      setProblem("You seem to be offline. Check your connection and try again.");
    }
    setBusy(false);
  };

  const methodCard = (m: OrderPayMethod, icon: React.ReactNode, hint: string) => (
    <label
      className={cx(
        "flex cursor-pointer items-center gap-3 rounded-2xl border bg-white p-4 transition",
        f.method === m ? "border-sea-ink ring-2 ring-sea-ink/10" : "border-sea-line hover:border-sea-ink/30",
      )}
    >
      <input type="radio" name="method" value={m} checked={f.method === m} onChange={() => setF((x) => ({ ...x, method: m }))} className="sr-only" />
      <span className={cx("grid size-10 shrink-0 place-items-center rounded-full", f.method === m ? "bg-sea-ink text-white" : "bg-sea-sand text-sea-ink")}>{icon}</span>
      <span className="min-w-0">
        <span className="block text-[15px] font-extrabold">{m}</span>
        <span className="block text-[12.5px] text-sea-muted">{hint}</span>
      </span>
      <span className={cx("ml-auto size-5 shrink-0 rounded-full border-2", f.method === m ? "border-[6px] border-sea-ink" : "border-sea-line")} />
    </label>
  );

  return (
    <form ref={formRef} onSubmit={submit} noValidate className="grid gap-8 lg:grid-cols-[1fr_380px]">
      <div className="grid gap-6">
        {note && <p className="rounded-2xl bg-amber-50 px-4 py-3 text-[13.5px] font-semibold text-amber-800">{note}</p>}

        <Panel>
          <div className="mb-5 flex flex-wrap items-baseline justify-between gap-2">
            <div>
              <h2 className="font-serif text-[24px]">1. Customer form</h2>
              <p className="mt-1 text-[13px] text-sea-muted">
                {me === null ? "Start with your number - if you've ordered before, we'll fill in the rest." : "Your details go straight into our customer list, so we know where to send your order."}
              </p>
            </div>
            {me === null && (
              <Link href={`${links.store("/account")}?next=checkout`} className="text-[13.5px] font-bold text-sea-teal hover:underline">
                Have an account? Log in
              </Link>
            )}
            {me && <span className="text-[13px] font-semibold text-sea-leaf">Logged in as {me.name}</span>}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <SeaField label="WhatsApp number" hint="for order updates" error={errors.phone} htmlFor="c-phone">
              <SeaInput id="c-phone" name="phone" type="tel" inputMode="tel" autoComplete="tel" placeholder="01XXXXXXXXX" value={f.phone} onChange={set("phone")} invalid={!!errors.phone} required />
            </SeaField>
            <SeaField label="Full name" error={errors.name} htmlFor="c-name">
              <SeaInput id="c-name" name="name" autoComplete="name" value={f.name} onChange={set("name")} invalid={!!errors.name} required />
            </SeaField>
            {saved && (
              <p role="status" className="rounded-2xl bg-sea-leaf/10 px-4 py-3 text-[13.5px] font-semibold text-sea-ink sm:col-span-2">
                {saved.account ? (
                  <>
                    This number has an account.{" "}
                    <Link href={`${links.store("/account")}?next=checkout`} className="font-bold text-sea-teal underline underline-offset-4">
                      Log in
                    </Link>{" "}
                    to use your saved details - or just fill them in below.
                  </>
                ) : (
                  <>Welcome back, {saved.name.split(" ")[0]}! We filled in the details you gave us last time - change anything that&apos;s different.</>
                )}
              </p>
            )}
            <SeaField label="Delivery address" error={errors.address} className="sm:col-span-2" htmlFor="c-address">
              <SeaTextarea id="c-address" name="address" autoComplete="street-address" rows={3} placeholder="House, road, area, city" value={f.address} onChange={set("address")} invalid={!!errors.address} required />
            </SeaField>
            <SeaField label="Email" hint="optional" error={errors.email} htmlFor="c-email">
              <SeaInput id="c-email" name="email" type="email" autoComplete="email" value={f.email} onChange={set("email")} invalid={!!errors.email} />
            </SeaField>
            <SeaField label="Note for us" hint="optional" htmlFor="c-note">
              <SeaInput id="c-note" name="note" value={f.note} onChange={set("note")} placeholder="e.g. call before delivery" />
            </SeaField>
          </div>
          {/* bots fill this in, people never see it */}
          <input name="website" value={f.website} onChange={set("website")} tabIndex={-1} autoComplete="off" className="absolute -left-[9999px] size-px opacity-0" aria-hidden />

          {me === null && (
            <div className="mt-5 rounded-2xl bg-white p-4 ring-1 ring-sea-line">
              <label className="flex cursor-pointer items-center gap-3 text-[14px] font-bold">
                <input type="checkbox" checked={makeAccount} onChange={(e) => setMakeAccount(e.target.checked)} className="size-[18px] accent-sea-ink" />
                Create an account for faster checkout next time
              </label>
              {makeAccount && (
                <SeaField label="Choose a password" hint="at least 6 characters" error={errors.password} className="mt-3" htmlFor="c-pw">
                  <SeaInput id="c-pw" name="password" type="password" autoComplete="new-password" value={f.password} onChange={set("password")} invalid={!!errors.password} />
                </SeaField>
              )}
            </div>
          )}
        </Panel>

        {s.zones.length > 1 && (
          <Panel>
            <h2 className="mb-5 font-serif text-[24px]">2. Delivery</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {s.zones.map((z) => (
                <label key={z.id} className={cx("flex cursor-pointer items-center justify-between gap-3 rounded-2xl border bg-white p-4 transition", f.zone === z.id ? "border-sea-ink ring-2 ring-sea-ink/10" : "border-sea-line hover:border-sea-ink/30")}>
                  <input type="radio" name="zone" value={z.id} checked={f.zone === z.id} onChange={() => setF((x) => ({ ...x, zone: z.id }))} className="sr-only" />
                  <span className="text-[15px] font-bold">{z.name}</span>
                  <span className="text-[14px] font-extrabold tabular-nums">{tk(z.fee)}</span>
                </label>
              ))}
            </div>
          </Panel>
        )}

        <Panel>
          <h2 className="mb-5 font-serif text-[24px]">{s.zones.length > 1 ? "3" : "2"}. Payment</h2>
          {errors.method && <p className="mb-3 text-[13px] font-semibold text-red-600">{errors.method}</p>}
          <div className="grid gap-3 sm:grid-cols-2">
            {methodCard("bKash", <Smartphone className="size-5" />, "Send money from your bKash")}
            {methodCard("Bank Transfer", <Landmark className="size-5" />, "From any bank account or app")}
          </div>
          <div className="mt-4">
            <PaymentInfo shop={shop} method={f.method} amount={total} />
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <SeaField label={f.method === "bKash" ? "Transaction ID (TrxID)" : "Transaction / reference no."} hint={trxNeeded ? "required" : "add it after you pay"} error={errors.trxId} htmlFor="c-trx">
              <SeaInput id="c-trx" name="trxId" autoCapitalize="characters" placeholder={f.method === "bKash" ? "e.g. 9KL7XQ2M4P" : ""} value={f.trxId} onChange={set("trxId")} invalid={!!errors.trxId} />
            </SeaField>
            <SeaField label={f.method === "bKash" ? "Paid from (bKash number)" : "Paid from (account name)"} hint="optional" htmlFor="c-sender">
              <SeaInput id="c-sender" name="sender" value={f.sender} onChange={set("sender")} />
            </SeaField>
          </div>
          <ol className="mt-4 grid gap-2 rounded-2xl bg-white p-4 text-[13px] leading-relaxed text-sea-body ring-1 ring-sea-line sm:grid-cols-3">
            {[
              trxNeeded ? `Pay ${tk(total)} and type the transaction ID above` : "Place the order, ask us for the bank details, then send the reference",
              "We check the payment by hand and approve your order",
              "Your receipt is then ready to download on your order page",
            ].map((t, i) => (
              <li key={i} className="flex gap-2">
                <span className="grid size-5 shrink-0 place-items-center rounded-full bg-sea-ink text-[11px] font-extrabold text-white">{i + 1}</span>
                {t}
              </li>
            ))}
          </ol>
        </Panel>
      </div>

      <aside className="lg:sticky lg:top-24 lg:self-start">
        <div className="rounded-[28px] border border-sea-line bg-sea-paper p-6">
          <h2 className="font-serif text-[22px]">Order summary</h2>
          <ul className="mt-4 grid max-h-72 gap-3 overflow-y-auto pr-1">
            {lines.map((l) => (
              <li key={l.id} className="flex items-center gap-3">
                <span className="relative size-12 shrink-0 overflow-hidden rounded-xl ring-1 ring-sea-line">
                  <ProductImage src={l.image} name={l.name} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="line-clamp-1 text-[13.5px] font-bold">{l.name}</span>
                  <span className="text-[12.5px] text-sea-muted">
                    {l.qty} × {tk(l.price)}
                  </span>
                </span>
                <span className="text-[13.5px] font-extrabold tabular-nums">{tk(l.price * l.qty)}</span>
              </li>
            ))}
          </ul>
          <dl className="mt-5 grid gap-2 border-t border-sea-line pt-4 text-[14px]">
            <div className="flex justify-between">
              <dt className="text-sea-body">Subtotal</dt>
              <dd className="font-bold tabular-nums">{tk(subtotal)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sea-body">Delivery · {zone}</dt>
              <dd className="font-bold tabular-nums">{fee ? tk(fee) : "Free"}</dd>
            </div>
            <div className="mt-2 flex justify-between border-t border-sea-line pt-3 text-[18px]">
              <dt className="font-extrabold">Total</dt>
              <dd className="font-extrabold tabular-nums">{tk(total)}</dd>
            </div>
          </dl>
          {problem && (
            <p className="mt-4 rounded-xl bg-red-50 px-3 py-2.5 text-[13px] font-semibold text-red-700" role="alert">
              {problem}
            </p>
          )}
          <button type="submit" disabled={busy} className={btn("primary", "lg", "mt-5 w-full")}>
            {busy ? <Loader2 className="size-4 animate-spin" /> : <Lock className="size-4" />} Place order · {tk(total)}
          </button>
          <p className="mt-3 text-center text-[12px] leading-relaxed text-sea-muted">We approve your payment by hand, then your receipt is ready to download.</p>
        </div>
      </aside>
    </form>
  );
}
