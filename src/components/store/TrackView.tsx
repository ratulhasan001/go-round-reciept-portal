"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AlertCircle, Check, Download, FileText, Hourglass, Loader2, PartyPopper, Search, Truck } from "lucide-react";
import { ORDER_HINT, ORDER_LABEL, ORDER_STEPS, PAY_LABEL, cleanCode, fmtWhen, payState, tk, waLink } from "@/lib/site";
import { DEFAULT_SHOP } from "@/lib/seed";
import type { Invoice, Shop } from "@/lib/types";
import type { OrderView } from "@/lib/server/orders";
import { recentOrders, useShop } from "./StoreContext";
import { PaymentInfo } from "./PaymentInfo";
import { ProductImage } from "./ProductImage";
import { WhatsAppIcon } from "./Icons";
import { Panel, SeaField, SeaInput, btn, cx } from "./ui";

/** Order status for guests: find an order by the payment's transaction id (or, before paying, by order code + phone). */
export function TrackView() {
  const params = useSearchParams();
  const { shop, online } = useShop();
  const [mode, setMode] = useState<"trx" | "code">("trx");
  const [trxId, setTrxId] = useState("");
  const [code, setCode] = useState(params.get("code") ?? "");
  const [phone, setPhone] = useState("");
  const [order, setOrder] = useState<OrderView | null>(null);
  const [state, setState] = useState<"idle" | "busy" | "missing" | "short" | "error">("idle");
  const placed = params.get("placed") === "1";

  const look = useCallback(async (body: { trxId: string } | { code: string; phone: string }) => {
    setState("busy");
    try {
      const res = await fetch("/api/site/track", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
      const b = await res.json().catch(() => ({}));
      if (res.ok && b.order) {
        setOrder(b.order);
        setState("idle");
      } else setState(res.status === 404 ? "missing" : "error");
    } catch {
      setState("error");
    }
  }, []);

  // an order placed on this browser (or opened from a link with its code) fills itself in
  useEffect(() => {
    const c = cleanCode(params.get("code") ?? "");
    const mine = recentOrders().find((o) => o.code === c);
    if (c && mine) void look({ code: c, phone: mine.phone }); // eslint-disable-line react-hooks/set-state-in-effect -- one-time lookup for an order placed here
  }, [params, look]);

  if (order) return <OrderCard order={order} placed={placed} onChange={setOrder} phone={order.customer.phone} onBack={() => setOrder(null)} />;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === "trx") {
      if (trxId.replace(/[\s-]/g, "").length < 6) return setState("short");
      void look({ trxId });
    } else if (code.trim() && phone.trim()) void look({ code, phone });
  };

  return (
    <Panel className="mx-auto max-w-lg">
      <form onSubmit={submit} className="grid gap-4">
        {mode === "trx" ? (
          <SeaField label="Transaction ID" hint="from your bKash or bank message" htmlFor="t-trx">
            <SeaInput
              id="t-trx"
              value={trxId}
              onChange={(e) => {
                setTrxId(e.target.value.toUpperCase());
                if (state !== "busy") setState("idle");
              }}
              placeholder="e.g. 9KL7XQ2M4P"
              autoCapitalize="characters"
              autoComplete="off"
              spellCheck={false}
              className="text-center font-mono text-[18px] tracking-[0.12em]"
              required
              autoFocus
            />
          </SeaField>
        ) : (
          <>
            <SeaField label="Order code" hint="e.g. GR7K3F9Q" htmlFor="t-code">
              <SeaInput id="t-code" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} autoCapitalize="characters" autoComplete="off" required />
            </SeaField>
            <SeaField label="WhatsApp number used for the order" htmlFor="t-phone">
              <SeaInput id="t-phone" type="tel" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="01XXXXXXXXX" required />
            </SeaField>
          </>
        )}
        {state === "short" && <p className="text-[13.5px] font-semibold text-red-600">Please type the full transaction ID.</p>}
        {state === "missing" && (
          <p className="text-[13.5px] font-semibold text-red-600">
            {mode === "trx"
              ? "We couldn't find an order paid with that transaction ID. Please check it against your bKash or bank message."
              : "We couldn't find an order with that code and number. Please check both."}
          </p>
        )}
        {state === "error" && <p className="text-[13.5px] font-semibold text-red-600">Something went wrong. Please try again.</p>}
        {!online && <p className="text-[13.5px] font-semibold text-sea-muted">Order status isn&apos;t available yet - please ask us on WhatsApp.</p>}
        <button type="submit" disabled={state === "busy" || !online} className={btn("primary", "lg", "w-full")}>
          {state === "busy" ? <Loader2 className="size-4 animate-spin" /> : <Search className="size-4" />} Check order status
        </button>
        <button
          type="button"
          onClick={() => {
            setMode(mode === "trx" ? "code" : "trx");
            setState("idle");
          }}
          className="text-center text-[13.5px] font-bold text-sea-teal hover:underline"
        >
          {mode === "trx" ? "Haven't paid yet? Use your order code instead" : "Paid already? Use your transaction ID instead"}
        </button>
        <p className="text-center text-[13px] text-sea-muted">
          Can&apos;t find it?{" "}
          <a href={waLink(shop.site.whatsapp, "Hi! I'd like to check my order status.")} target="_blank" rel="noopener noreferrer" className="font-bold text-sea-teal hover:underline">
            Ask us on WhatsApp
          </a>
        </p>
      </form>
    </Panel>
  );
}

export function OrderCard({ order, placed, onChange, phone, onBack }: { order: OrderView; placed?: boolean; onChange?: (o: OrderView) => void; phone?: string; onBack?: () => void }) {
  const { shop } = useShop();
  const stepIdx = ORDER_STEPS.indexOf(order.status);
  const cancelled = order.status === "cancelled";
  const when = (s: string) => order.history.findLast((h) => h.status === s)?.at;
  const pay = payState(order);
  const waiting = !cancelled && pay === "submitted";

  // while the shop is checking the payment, look for the approval every 30 seconds
  useEffect(() => {
    if (!onChange || !phone || cancelled || pay === "verified") return;
    const id = setInterval(async () => {
      if (document.visibilityState !== "visible") return;
      const res = await fetch("/api/site/track", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ code: order.code, phone }) }).catch(() => null);
      const b = res?.ok ? await res.json().catch(() => null) : null;
      if (b?.order && b.order.updatedAt !== order.updatedAt) onChange(b.order);
    }, 30_000);
    return () => clearInterval(id);
  }, [onChange, phone, cancelled, pay, order.code, order.updatedAt]);

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <div className="grid gap-6">
        {placed && (
          <div className="sea-sheet-in flex items-start gap-4 rounded-[28px] bg-sea-ink p-6 text-sea-cream">
            <PartyPopper className="mt-1 size-7 shrink-0 text-sea-sprout" />
            <div>
              <p className="font-serif text-[26px] leading-tight">Thank you, {order.customer.name.split(" ")[0]}!</p>
              <p className="mt-1 text-[14.5px] text-sea-cream/80">
                Your order <b className="text-white">{order.code}</b> is in. We&apos;ll check your payment and approve it - your receipt will then be ready right here. Keep this code to come back any time.
              </p>
            </div>
          </div>
        )}

        <Panel>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="store-eyebrow">Order {order.code}</p>
              <p className="mt-2 font-serif text-[30px] leading-tight">{cancelled ? <em className="text-red-700">Cancelled</em> : ORDER_LABEL[order.status]}</p>
              <p className="mt-1 text-[14px] text-sea-body">
                {order.status === "placed" ? (pay === "submitted" ? "Your payment is waiting for our approval." : pay === "rejected" ? "We couldn't find your payment yet." : "Waiting for your payment.") : ORDER_HINT[order.status]}
              </p>
            </div>
            <p className="text-[12.5px] font-semibold text-sea-muted">Placed {fmtWhen(order.createdAt)}</p>
          </div>

          {!cancelled && (
            <ol className="mt-7 grid grid-cols-4 gap-1">
              {ORDER_STEPS.map((s, i) => {
                const done = i <= stepIdx;
                const t = when(s);
                return (
                  <li key={s} className="flex flex-col">
                    <span className={cx("h-1.5 rounded-full transition-colors duration-700", done ? "bg-sea-leaf" : "bg-sea-line")} />
                    <span className={cx("mt-2.5 flex items-center gap-1 text-[12px] font-extrabold sm:text-[13px]", done ? "text-sea-ink" : "text-sea-muted")}>
                      {done && <Check className="size-3.5 shrink-0 text-sea-leaf" strokeWidth={3} />}
                      {ORDER_LABEL[s]}
                    </span>
                    {t && done && <span className="text-[11px] text-sea-muted">{new Date(t).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</span>}
                  </li>
                );
              })}
            </ol>
          )}
          {order.tracking && (
            <p className="mt-6 flex items-start gap-2.5 rounded-2xl bg-sea-teal-soft px-4 py-3 text-[14px] text-sea-ink">
              <Truck className="mt-0.5 size-[18px] shrink-0 text-sea-teal" />
              <span className="whitespace-pre-line">{order.tracking}</span>
            </p>
          )}
        </Panel>

        {waiting && (
          <div className="flex items-start gap-4 rounded-[28px] border border-amber-200 bg-amber-50 p-5 sm:p-6">
            <Hourglass className="mt-0.5 size-7 shrink-0 animate-[spin_3s_ease-in-out_infinite] text-amber-600" />
            <div>
              <p className="font-serif text-[22px] leading-tight text-sea-ink">Waiting for approval</p>
              <p className="mt-1 text-[14px] leading-relaxed text-sea-body">
                We&apos;re checking your {tk(order.total)} {order.payment.method} payment
                {order.payment.trxId && (
                  <>
                    {" "}
                    (TrxID <b>{order.payment.trxId}</b>)
                  </>
                )}{" "}
                by hand. Once it&apos;s approved, your receipt appears on this page - no need to refresh.
              </p>
            </div>
          </div>
        )}

        {!cancelled && pay === "verified" && <ReceiptBlock order={order} phone={phone} />}

        {!cancelled && pay !== "verified" && <PaymentBlock key={`${pay}-${order.payment.submittedAt ?? 0}`} order={order} phone={phone} onChange={onChange} />}

        <Panel>
          <h2 className="font-serif text-[22px]">Items</h2>
          <ul className="mt-4 grid gap-3">
            {order.items.map((i) => (
              <li key={i.productId} className="flex items-center gap-3">
                <span className="size-14 shrink-0 overflow-hidden rounded-xl ring-1 ring-sea-line">
                  <ProductImage src={i.image} name={i.name} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="line-clamp-2 text-[14.5px] font-bold">{i.name}</span>
                  <span className="text-[13px] text-sea-muted">
                    {i.qty} × {tk(i.price)}
                  </span>
                </span>
                <span className="text-[14.5px] font-extrabold tabular-nums">{tk(i.price * i.qty)}</span>
              </li>
            ))}
          </ul>
          <dl className="mt-5 grid gap-1.5 border-t border-sea-line pt-4 text-[14px]">
            <div className="flex justify-between">
              <dt>Subtotal</dt>
              <dd className="font-bold tabular-nums">{tk(order.subtotal)}</dd>
            </div>
            <div className="flex justify-between">
              <dt>Delivery · {order.zone}</dt>
              <dd className="font-bold tabular-nums">{order.delivery ? tk(order.delivery) : "Free"}</dd>
            </div>
            <div className="mt-1 flex justify-between text-[17px]">
              <dt className="font-extrabold">Total</dt>
              <dd className="font-extrabold tabular-nums">{tk(order.total)}</dd>
            </div>
          </dl>
        </Panel>
      </div>

      <aside className="grid content-start gap-4 lg:sticky lg:top-24">
        <Panel>
          <h2 className="store-eyebrow">Delivering to</h2>
          <p className="mt-3 text-[15px] font-bold">{order.customer.name}</p>
          <p className="text-[14px] text-sea-body">{order.customer.phone}</p>
          <p className="mt-1 whitespace-pre-line text-[14px] text-sea-body">{order.customer.address}</p>
        </Panel>
        <a href={waLink(shop.site.whatsapp, `Hi! I have a question about my order ${order.code}.`)} target="_blank" rel="noopener noreferrer" className={btn("outline", "lg", "w-full")}>
          <WhatsAppIcon className="size-5 text-wa" /> Questions? WhatsApp us
        </a>
        {onBack && (
          <button onClick={onBack} className="text-[13.5px] font-bold text-sea-muted hover:text-sea-ink">
            Check another order
          </button>
        )}
      </aside>
    </div>
  );
}

function PaymentBlock({ order, phone, onChange }: { order: OrderView; phone?: string; onChange?: (o: OrderView) => void }) {
  const { shop } = useShop();
  const pay = payState(order);
  const [editing, setEditing] = useState(pay === "awaiting" || pay === "rejected");
  const [method, setMethod] = useState(order.payment.method);
  const [trxId, setTrxId] = useState(order.payment.trxId ?? "");
  const [sender, setSender] = useState(order.payment.sender ?? "");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr("");
    const res = await fetch("/api/site/pay", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ code: order.code, phone: phone || order.customer.phone, method, trxId, sender }),
    }).catch(() => null);
    const b = await res?.json().catch(() => ({}));
    setBusy(false);
    if (res?.ok && b.order) {
      onChange?.(b.order);
      setEditing(false);
    } else setErr(b?.fields?.trxId ?? b?.message ?? "Couldn't save. Please try again.");
  };

  return (
    <Panel>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-serif text-[22px]">Payment</h2>
        <span
          className={cx(
            "rounded-full px-3 py-1 text-[12.5px] font-extrabold",
            pay === "verified" ? "bg-sea-sprout/25 text-sea-moss" : pay === "submitted" ? "bg-sea-teal-soft text-sea-teal" : pay === "rejected" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-800",
          )}
        >
          {PAY_LABEL[pay]}
        </span>
      </div>
      {pay === "verified" ? (
        <p className="mt-3 text-[14.5px] text-sea-body">
          We received {tk(order.total)} by {order.payment.method}. Thank you!
        </p>
      ) : editing && onChange ? (
        <form onSubmit={save} className="mt-4 grid gap-4">
          {pay === "rejected" && (
            <p className="flex items-start gap-2 rounded-2xl bg-red-50 px-4 py-3 text-[13.5px] font-semibold text-red-700">
              <AlertCircle className="mt-0.5 size-4 shrink-0" />
              We couldn&apos;t find a payment with transaction ID {order.payment.trxId}. Please check the number in your {order.payment.method === "bKash" ? "bKash message" : "bank app"} and send it again.
            </p>
          )}
          <div className="flex gap-2">
            {(["bKash", "Bank Transfer"] as const).map((m) => (
              <button type="button" key={m} onClick={() => setMethod(m)} className={cx("h-10 rounded-full px-4 text-[13.5px] font-bold transition", method === m ? "bg-sea-ink text-white" : "border border-sea-line bg-white")}>
                {m}
              </button>
            ))}
          </div>
          <PaymentInfo shop={shop} method={method} amount={order.total} code={order.code} />
          <div className="grid gap-4 sm:grid-cols-2">
            <SeaField label={method === "bKash" ? "Transaction ID (TrxID)" : "Transaction / reference no."} error={err} htmlFor="p-trx">
              <SeaInput id="p-trx" value={trxId} onChange={(e) => setTrxId(e.target.value.toUpperCase())} autoCapitalize="characters" required invalid={!!err} />
            </SeaField>
            <SeaField label="Paid from" hint="optional" htmlFor="p-sender">
              <SeaInput id="p-sender" value={sender} onChange={(e) => setSender(e.target.value)} placeholder={method === "bKash" ? "Your bKash number" : "Account name"} />
            </SeaField>
          </div>
          <button type="submit" disabled={busy || !trxId.trim()} className={btn("teal", "lg", "w-full sm:w-auto sm:justify-self-start")}>
            {busy && <Loader2 className="size-4 animate-spin" />} I&apos;ve paid - send details
          </button>
        </form>
      ) : (
        <div className="mt-3 text-[14.5px] text-sea-body">
          <p>
            {order.payment.method}
            {order.payment.trxId && (
              <>
                {" "}
                · TrxID <b className="text-sea-ink">{order.payment.trxId}</b>
              </>
            )}
            {order.payment.submittedAt && <span className="text-sea-muted"> · sent {fmtWhen(order.payment.submittedAt)}</span>}
          </p>
          <p className="mt-1 text-[13.5px] text-sea-muted">We&apos;ll approve your order as soon as we see the payment.</p>
          {onChange && (
            <button onClick={() => setEditing(true)} className="mt-3 text-[13.5px] font-bold text-sea-teal hover:underline">
              Change payment details
            </button>
          )}
        </div>
      )}
    </Panel>
  );
}

/** The receipt the shop made when it approved the payment, as the same A4 PDF the shop prints. */
function ReceiptBlock({ order, phone }: { order: OrderView; phone?: string }) {
  const [state, setState] = useState<"idle" | "busy" | "missing" | "error">("idle");
  const download = async () => {
    setState("busy");
    try {
      const res = await fetch("/api/site/receipt", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ code: order.code, phone: phone || order.customer.phone }) });
      if (res.status === 409) return setState("missing");
      const b = (await res.json()) as { invoice: Invoice; shop: Partial<Shop> };
      const { downloadPdf } = await import("@/lib/download");
      await downloadPdf(b.invoice, { ...DEFAULT_SHOP, ...b.shop });
      setState("idle");
    } catch {
      setState("error");
    }
  };
  return (
    <div className="flex flex-wrap items-center gap-4 rounded-[28px] border border-sea-sprout/50 bg-[#eef5e6] p-5 sm:p-6">
      <span className="grid size-12 shrink-0 place-items-center rounded-full bg-sea-ink text-sea-sprout">
        <FileText className="size-6" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-serif text-[22px] leading-tight">Payment approved</p>
        <p className="mt-0.5 text-[14px] text-sea-body">
          {state === "missing" || !order.invoiceNumber
            ? "Your receipt is being prepared - it will be here shortly."
            : `Your receipt ${order.invoiceNumber} is ready.`}
          {state === "error" && <span className="block font-semibold text-red-600">Couldn&apos;t download it. Please try again.</span>}
        </p>
      </div>
      {order.invoiceNumber && state !== "missing" && (
        <button onClick={download} disabled={state === "busy"} className={btn("primary", "lg", "w-full sm:w-auto")}>
          {state === "busy" ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />} Download receipt
        </button>
      )}
    </div>
  );
}
