"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  AlertTriangle, ArrowLeft, BadgeCheck, BadgePercent, Banknote, CheckCheck, CircleHelp, Download, Eye, FileSpreadsheet, FileText, MessageCircle, Minus, NotebookPen, Plus,
  Printer, PlusCircle, Receipt, Save, Share2, ShoppingBag, TicketPercent, Trash2, Truck, UserRound, Zap,
} from "lucide-react";
import Link from "next/link";
import { useStore } from "@/lib/store";
import type { Coupon, Extras, Invoice, LineItem, ManualCharge, Payment } from "@/lib/types";
import { COURIERS, PAYMENT_METHODS } from "@/lib/types";
import { bdt, computeTotals, fmtDate, lineAmount, money, pct, todayISO, uid } from "@/lib/calc";
import { canShareFiles, downloadExcel, downloadPdf, printPdf, sharePdf, whatsappUrl } from "@/lib/download";
import { Button, Card, Chip, Field, Input, Label, SectionTitle, Select, StatusBadge, Switch, Textarea, cx, useClientValue, useToast } from "./ui";
import { Combobox } from "./Combobox";
import { couponProblem, normCode, offerLabel } from "@/lib/coupons";
import ReceiptPreview from "./ReceiptPreview";

const blankItem = (): LineItem => ({ id: uid(), description: "", price: 0, qty: 1 });
const numOrZero = (v: string) => (v === "" ? 0 : Number(v));
type Job = "" | "pdf" | "xlsx" | "print" | "share";

export default function Editor() {
  const store = useStore();
  const { shop, invoices, ready } = store;
  const params = useSearchParams();
  const [inv, setInv] = useState<Invoice | null>(null);
  const [dirty, setDirty] = useState(false);
  const initKey = useRef("");

  const id = params.get("id");
  const copy = params.get("copy");

  // build the draft once the store has loaded
  useEffect(() => {
    if (!ready) return;
    const key = `${id}|${copy}`;
    if (initKey.current === key) return;
    initKey.current = key;
    const existing = id ? invoices.find((i) => i.id === id) : null;
    const source = copy ? invoices.find((i) => i.id === copy) : null;
    let draft: Invoice;
    if (existing) draft = structuredClone(existing);
    else if (source)
      draft = {
        ...structuredClone(source),
        id: uid(),
        number: store.nextInvoiceNumber(),
        date: todayISO(),
        payments: [],
        items: source.items.map((i) => ({ ...i, id: uid() })),
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
    else
      draft = {
        id: uid(),
        number: store.nextInvoiceNumber(),
        date: todayISO(),
        customer: { name: "", phone: "", address: "" },
        items: [blankItem()],
        delivery: shop.defaultDelivery,
        discount: 0,
        payments: [],
        notes: "",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
    setInv(draft);
    setDirty(false);
  }, [ready, id, copy, invoices, shop.defaultDelivery, store]);

  if (!inv) return <div className="grid h-[60vh] place-items-center text-muted">Loading…</div>;
  return <EditorForm inv={inv} setInv={setInv} dirty={dirty} setDirty={setDirty} onFirstSave={(savedId) => (initKey.current = `${savedId}|null`)} />;
}

function EditorForm({
  inv, setInv, dirty, setDirty, onFirstSave,
}: {
  inv: Invoice;
  setInv: Dispatch<SetStateAction<Invoice | null>>;
  dirty: boolean;
  setDirty: (d: boolean) => void;
  onFirstSave: (id: string) => void;
}) {
  const store = useStore();
  const { shop, products, customers, invoices, coupons } = store;
  const router = useRouter();
  const toast = useToast();
  const [busy, setBusy] = useState<Job>("");
  const [mobileTab, setMobileTab] = useState<"edit" | "preview">("edit");
  const shareable = useClientValue(canShareFiles, false);
  const lastDescRef = useRef<HTMLDivElement>(null);
  const actions = useRef<{ save: () => void; run: (j: Job) => void }>(null);
  const isSaved = invoices.some((i) => i.id === inv.id);

  // receipts that already exist save themselves while you type
  useEffect(() => {
    if (!dirty || !isSaved) return;
    const h = setTimeout(() => actions.current?.save(), 700);
    return () => clearTimeout(h);
  }, [inv, dirty, isSaved]);

  // warn before leaving a brand-new receipt that was never saved
  useEffect(() => {
    if (!dirty || isSaved) return;
    const h = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", h);
    return () => window.removeEventListener("beforeunload", h);
  }, [dirty, isSaved]);

  // Ctrl/Cmd + S = save, Ctrl/Cmd + P = print the A4 PDF
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey)) return;
      const k = e.key.toLowerCase();
      if (k === "s") {
        e.preventDefault();
        actions.current?.save();
      } else if (k === "p") {
        e.preventDefault();
        actions.current?.run("print");
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);

  const productOpts = useMemo(() => products.map((p) => ({ id: p.id, label: p.name, meta: `৳ ${money(p.price)}${p.inStock === false ? " · Out of stock" : ""}` })), [products]);
  const customerOpts = useMemo(() => customers.map((c) => ({ id: c.id, label: c.name, meta: c.phone })), [customers]);

  // most-sold products first, for the quick-add chips
  const quickProducts = useMemo(() => {
    const count = new Map<string, number>();
    for (const i of invoices) for (const it of i.items) count.set(it.description.toLowerCase(), (count.get(it.description.toLowerCase()) ?? 0) + (Number(it.qty) || 1));
    return [...products].filter((p) => p.name.trim() && p.inStock !== false).sort((a, b) => (count.get(b.name.toLowerCase()) ?? 0) - (count.get(a.name.toLowerCase()) ?? 0)).slice(0, 8);
  }, [products, invoices]);

  const t = computeTotals(inv);

  const update = (patch: Partial<Invoice>) => {
    setInv((d) => (d ? { ...d, ...patch } : d));
    setDirty(true);
  };
  const setItem = (idx: number, patch: Partial<LineItem>) => update({ items: inv.items.map((it, i) => (i === idx ? { ...it, ...patch } : it)) });
  const setPay = (idx: number, patch: Partial<Payment>) => update({ payments: inv.payments.map((p, i) => (i === idx ? { ...p, ...patch } : p)) });
  const addItem = () => {
    update({ items: [...inv.items, blankItem()] });
    setTimeout(() => lastDescRef.current?.querySelector("input")?.focus(), 30);
  };
  const quickAdd = (name: string, price: number) => {
    const at = inv.items.findIndex((i) => i.description.toLowerCase() === name.toLowerCase());
    if (at >= 0) return setItem(at, { qty: (Number(inv.items[at].qty) || 0) + 1 });
    const empty = inv.items.findIndex((i) => !i.description.trim() && !i.price);
    const item = { id: uid(), description: name, price, qty: 1 };
    update({ items: empty >= 0 ? inv.items.map((it, i) => (i === empty ? item : it)) : [...inv.items, item] });
  };
  const ex: Extras = inv.extras ?? {
    enabled: false,
    payVia: "Cash",
    payRate: shop.rates.pay.Cash,
    courier: "None",
    courierRate: 0,
    manual: [],
  };
  const setEx = (patch: Partial<Extras>) => update({ extras: { ...ex, ...patch } });
  const cp: Coupon = inv.coupon ?? { code: "", pct: 0, amount: 0 };
  // the typed code's entry in the coupon sheet, and why it can't be used (if so)
  const sheetCoupon = cp.code.trim() ? coupons.find((c) => normCode(c.code) === normCode(cp.code)) : undefined;
  const sheetProblem = sheetCoupon ? couponProblem(sheetCoupon, inv.number, inv.customer, inv.date) : "";
  const setManual = (id: string, patch: Partial<ManualCharge>) => setEx({ manual: ex.manual.map((m) => (m.id === id ? { ...m, ...patch } : m)) });
  const rateHint = (r: number) => (r > 0 ? `+${pct(r)}` : "No charge");

  const addPayment = (amount = 0, note = "") =>
    update({ payments: [...inv.payments, { id: uid(), date: todayISO(), method: ex.enabled ? ex.payVia : "Cash", amount, note }] });

  const save = (silent = false) => {
    const clean: Invoice = { ...inv, items: inv.items.filter((i) => i.description.trim() || i.price) };
    if (clean.items.length === 0) clean.items = [blankItem()];
    const saved = store.saveInvoice(clean);
    setDirty(false);
    if (!isSaved) {
      setInv(saved);
      onFirstSave(saved.id);
      router.replace(`/new?id=${saved.id}`, { scroll: false });
    }
    if (!silent) toast(`Receipt ${saved.number} saved`);
    return saved;
  };

  const run = async (kind: Job) => {
    if (!kind || busy) return;
    if (!inv.customer.name.trim()) toast("Tip: add the customer's name before sharing", "err");
    const saved = save(true);
    setBusy(kind);
    try {
      if (kind === "pdf") await downloadPdf(saved, shop);
      else if (kind === "xlsx") await downloadExcel(saved, shop);
      else if (kind === "share") await sharePdf(saved, shop);
      else await printPdf(saved, shop);
      if (kind === "pdf" || kind === "xlsx") toast(`${kind === "pdf" ? "PDF" : "Excel"} downloaded · ${saved.number}`);
      if (kind === "print") toast("Opening print-ready A4 PDF…");
    } catch (e) {
      if ((e as Error)?.name !== "AbortError") {
        console.error(e);
        toast("Something went wrong generating the file", "err");
      }
    } finally {
      setBusy("");
    }
  };

  const openWhatsApp = () => {
    if (!inv.customer.phone.trim()) return toast("Add the customer's phone number first", "err");
    save(true);
    window.open(whatsappUrl(inv, shop), "_blank", "noopener");
  };

  // refresh the keyboard-shortcut handlers after every render
  useEffect(() => void (actions.current = { save: () => save(isSaved), run }));

  const statusLine = dirty ? (isSaved ? "Saving…" : "Not saved yet") : isSaved ? "Saved automatically" : "Fill in the details - the preview updates live";

  return (
    <div>
      {/* top bar */}
      <div className="sticky top-[57px] z-20 -mx-4 mb-5 border-b border-line bg-canvas/90 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6 lg:top-0 lg:-mx-10 lg:px-10">
        <div className="flex items-center gap-3">
          <Link href="/" className="grid size-9 shrink-0 place-items-center rounded-xl text-muted hover:bg-black/5" aria-label="Back to receipts">
            <ArrowLeft className="size-5" />
          </Link>
          <div className="mr-auto min-w-0">
            <div className="flex items-center gap-2.5">
              <h1 className="truncate font-display text-xl font-bold sm:text-2xl">{isSaved ? inv.number : "New receipt"}</h1>
              <StatusBadge status={t.status} />
            </div>
            <p className="truncate text-[12.5px] text-muted">{statusLine}</p>
          </div>
          <Button onClick={() => save()} variant={isSaved ? "secondary" : "primary"} className="md:hidden" aria-label="Save">
            <Save className="size-4" />
          </Button>
          <div className="hidden items-center gap-2 md:flex">
            <Button onClick={() => save()} title="Save (Ctrl/⌘ + S)">
              <Save className="size-4" /> Save
            </Button>
            <Button onClick={() => run("print")} loading={busy === "print"} title="Print (Ctrl/⌘ + P)">
              {busy !== "print" && <Printer className="size-4" />} Print
            </Button>
            <Button onClick={openWhatsApp} title="Send a WhatsApp message to the customer">
              <MessageCircle className="size-4 text-[#25D366]" /> WhatsApp
            </Button>
            <Button onClick={() => run("xlsx")} loading={busy === "xlsx"}>
              {busy !== "xlsx" && <FileSpreadsheet className="size-4 text-brand" />} Excel
            </Button>
            <Button variant="primary" onClick={() => run("pdf")} loading={busy === "pdf"}>
              {busy !== "pdf" && <Download className="size-4" />} PDF
            </Button>
          </div>
        </div>
      </div>

      {/* mobile edit / preview switch */}
      <div className="mb-5 grid grid-cols-2 rounded-xl bg-black/5 p-1 xl:hidden">
        {(["edit", "preview"] as const).map((k) => (
          <button
            key={k}
            onClick={() => setMobileTab(k)}
            className={cx("flex items-center justify-center gap-2 rounded-lg py-2 text-sm font-semibold transition", mobileTab === k ? "bg-white text-ink shadow-sm" : "text-muted")}
          >
            {k === "edit" ? <NotebookPen className="size-4" /> : <Eye className="size-4" />}
            {k === "edit" ? "Details" : "Preview"}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,460px)] 2xl:grid-cols-[minmax(0,1fr)_580px]">
        {/* ---------------- form ---------------- */}
        <div className={cx("flex flex-col gap-5", mobileTab === "preview" && "hidden xl:flex")}>
          <Card className="p-5 sm:p-6">
            <SectionTitle icon={<Receipt className="size-4" />} title="Receipt" hint="Number is generated automatically" />
            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              <Field label="Invoice no.">
                <Input value={inv.number} onChange={(e) => update({ number: e.target.value })} />
              </Field>
              <Field label="Invoice date">
                <Input type="date" value={inv.date} onChange={(e) => update({ date: e.target.value })} />
              </Field>
            </div>
          </Card>

          <Card className="p-5 sm:p-6">
            <SectionTitle icon={<UserRound className="size-4" />} title="Customer" hint="Start typing - saved customers fill in automatically" />
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Name">
                <Combobox
                  value={inv.customer.name}
                  placeholder="e.g. Amit Biswas"
                  ariaLabel="Customer name"
                  options={customerOpts}
                  onChange={(v) => update({ customer: { ...inv.customer, name: v } })}
                  onPick={(o) => {
                    const c = customers.find((x) => x.id === o.id)!;
                    update({ customer: { name: c.name, phone: c.phone, address: c.address } });
                  }}
                />
              </Field>
              <Field label="Phone">
                <Input type="tel" inputMode="tel" placeholder="01XXXXXXXXX" value={inv.customer.phone} onChange={(e) => update({ customer: { ...inv.customer, phone: e.target.value } })} />
              </Field>
              <Field label="Address" className="sm:col-span-2">
                <Input placeholder="Area, City" value={inv.customer.address} onChange={(e) => update({ customer: { ...inv.customer, address: e.target.value } })} />
              </Field>
            </div>
          </Card>

          <Card className="@container p-5 sm:p-6">
            <SectionTitle
              icon={<ShoppingBag className="size-4" />}
              title="Items"
              hint="Tap a product to add it, or type to search."
              action={
                <div className="text-right">
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-muted">Subtotal</div>
                  <div className="font-display text-lg font-bold">{money(t.subtotal)}</div>
                </div>
              }
            />
            {quickProducts.length > 0 && (
              <div className="-mx-1 mb-4 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none]">
                <span className="flex shrink-0 items-center gap-1 text-[11.5px] font-bold uppercase tracking-wide text-muted">
                  <Zap className="size-3.5 text-lime" /> Quick add
                </span>
                {quickProducts.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => quickAdd(p.name, p.price)}
                    className="shrink-0 rounded-full border border-line bg-white px-3 py-1.5 text-[13px] font-semibold text-body transition hover:border-lime hover:bg-soft active:scale-95"
                  >
                    {p.name} <span className="font-medium text-muted">· {money(p.price)}</span>
                  </button>
                ))}
              </div>
            )}
            <div className="hidden grid-cols-[minmax(0,1fr)_110px_118px_100px_36px] gap-2 px-1 pb-2 text-[11.5px] font-semibold uppercase tracking-wide text-muted @xl:grid">
              <span>Description</span>
              <span className="text-right">Unit price</span>
              <span className="text-center">Qty</span>
              <span className="text-right">Amount</span>
              <span />
            </div>
            <div className="flex flex-col gap-3 @xl:gap-2">
              {inv.items.map((it, idx) => (
                <div
                  key={it.id}
                  ref={idx === inv.items.length - 1 ? lastDescRef : undefined}
                  className="grid grid-cols-2 items-center gap-2 rounded-xl border border-line p-3 @xl:grid-cols-[minmax(0,1fr)_110px_118px_100px_36px] @xl:border-0 @xl:p-0"
                >
                  <Combobox
                    className="col-span-2 @xl:col-span-1"
                    value={it.description}
                    placeholder="Product or service"
                    ariaLabel={`Item ${idx + 1} description`}
                    options={productOpts}
                    onChange={(v) => setItem(idx, { description: v })}
                    onPick={(o) => {
                      const p = products.find((x) => x.id === o.id)!;
                      setItem(idx, { description: p.name, price: p.price });
                    }}
                    onEnter={() => idx === inv.items.length - 1 && addItem()}
                  />
                  <Input
                    type="number"
                    inputMode="decimal"
                    min={0}
                    aria-label="Unit price"
                    className="text-right"
                    value={it.price || ""}
                    placeholder="Price"
                    onChange={(e) => setItem(idx, { price: numOrZero(e.target.value) })}
                  />
                  <div className="flex h-10 items-center rounded-xl border border-line bg-white">
                    <button className="grid h-full w-8 shrink-0 place-items-center text-muted hover:text-ink" onClick={() => setItem(idx, { qty: Math.max(1, (Number(it.qty) || 1) - 1) })} aria-label="Decrease quantity">
                      <Minus className="size-3.5" />
                    </button>
                    <input
                      type="number"
                      inputMode="decimal"
                      aria-label="Quantity"
                      className="h-full w-full min-w-0 bg-transparent text-center text-[14px] font-semibold focus:outline-none"
                      value={it.qty || ""}
                      onChange={(e) => setItem(idx, { qty: numOrZero(e.target.value) })}
                    />
                    <button className="grid h-full w-8 shrink-0 place-items-center text-muted hover:text-ink" onClick={() => setItem(idx, { qty: (Number(it.qty) || 0) + 1 })} aria-label="Increase quantity">
                      <Plus className="size-3.5" />
                    </button>
                  </div>
                  <div className="col-span-2 flex items-center justify-between gap-2 @xl:contents">
                  <div className="truncate font-display text-[15px] font-bold @xl:text-right">
                    <span className="mr-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted @xl:hidden">Amount</span>
                    {money(lineAmount(it))}
                  </div>
                  <button
                    onClick={() => update({ items: inv.items.length > 1 ? inv.items.filter((_, i) => i !== idx) : [blankItem()] })}
                    className="grid size-9 place-items-center rounded-lg text-faint hover:bg-red-50 hover:text-red-600"
                    aria-label="Remove item"
                  >
                    <Trash2 className="size-4" />
                  </button>
                  </div>
                </div>
              ))}
            </div>
            <Button variant="ghost" className="mt-3 text-brand" onClick={addItem}>
              <Plus className="size-4" /> Add item
            </Button>
          </Card>

          <Card className="@container p-5 sm:p-6">
            <SectionTitle icon={<Banknote className="size-4" />} title="Charges & payments" hint="Paid, due and status update by themselves" />
            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              <Field label="Delivery (BDT)">
                <Input type="number" inputMode="decimal" value={inv.delivery || ""} placeholder="0" onChange={(e) => update({ delivery: numOrZero(e.target.value) })} />
              </Field>
            </div>

            <div className="mt-5 grid gap-3 @2xl:grid-cols-2">
              {/* discount */}
              <div className="rounded-2xl border border-line p-4">
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2 font-display text-[15px] font-bold">
                    <BadgePercent className="size-[18px] text-brand" /> Discount
                  </div>
                  <span className={cx("text-[13.5px] font-bold", t.discountTotal ? "text-brand" : "text-faint")}>– {money(t.discountTotal)}</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <SuffixInput suffix="%" label="Discount percent" value={inv.discountPct || 0} onChange={(v) => update({ discountPct: Math.min(100, v) })} />
                  <SuffixInput suffix="BDT" label="Discount amount" value={inv.discount || 0} onChange={(v) => update({ discount: v })} />
                </div>
                <FreeDelivery
                  checked={!!inv.discountFreeDelivery}
                  delivery={inv.delivery}
                  onChange={(v) => update({ discountFreeDelivery: v })}
                />
                <div className="mt-2 flex gap-1.5">
                  {[5, 10, 15].map((pc) => (
                    <button
                      key={pc}
                      onClick={() => update({ discountPct: inv.discountPct === pc ? 0 : pc })}
                      className={cx("rounded-lg px-2 py-1 text-[12px] font-bold transition", inv.discountPct === pc ? "bg-brand text-white" : "bg-canvas text-muted hover:bg-soft hover:text-brand")}
                      title={`${pc}% of subtotal`}
                    >
                      {pc}%
                    </button>
                  ))}
                </div>
              </div>

              {/* coupon */}
              <div className="rounded-2xl border border-line p-4">
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2 font-display text-[15px] font-bold">
                    <TicketPercent className="size-[18px] text-aqua-deep" /> Coupon
                  </div>
                  <span className={cx("text-[13.5px] font-bold", t.couponTotal ? "text-aqua-deep" : "text-faint")}>– {money(t.couponTotal)}</span>
                </div>
                <Input
                  placeholder="Coupon code (optional)"
                  aria-label="Coupon code"
                  className="mb-2 uppercase placeholder:normal-case"
                  value={cp.code}
                  onChange={(e) => {
                    const code = e.target.value;
                    const hit = code.trim() ? coupons.find((c) => normCode(c.code) === normCode(code)) : undefined;
                    // a code from the coupon sheet brings its offer with it
                    update({ coupon: hit ? { ...cp, code, pct: hit.pct, freeDelivery: hit.freeDelivery } : { ...cp, code } });
                  }}
                />
                {cp.code.trim() && coupons.length > 0 && (
                  <div
                    key={sheetCoupon ? sheetCoupon.id + sheetProblem : "none"}
                    className={cx(
                      "animate-label-swap -mt-1 mb-2 flex items-center gap-1.5 text-[12px] font-semibold",
                      !sheetCoupon ? "text-muted" : sheetProblem ? "text-red-600" : "text-brand",
                    )}
                    role="status"
                  >
                    {!sheetCoupon ? (
                      <>
                        <CircleHelp className="size-3.5 shrink-0" /> Not in the coupon sheet
                      </>
                    ) : sheetProblem ? (
                      <>
                        <AlertTriangle className="size-3.5 shrink-0" /> {sheetProblem}
                      </>
                    ) : (
                      <>
                        <BadgeCheck className="size-3.5 shrink-0" /> {offerLabel(sheetCoupon)}
                        {sheetCoupon.validTo ? ` · valid till ${fmtDate(sheetCoupon.validTo)}` : ""}
                        {sheetCoupon.name.trim() ? ` · ${sheetCoupon.name.trim()}` : ""}
                      </>
                    )}
                  </div>
                )}
                <div className="grid grid-cols-2 gap-2">
                  <SuffixInput suffix="%" label="Coupon percent" value={cp.pct} onChange={(v) => update({ coupon: { ...cp, pct: Math.min(100, v) } })} />
                  <SuffixInput suffix="BDT" label="Coupon amount" value={cp.amount} onChange={(v) => update({ coupon: { ...cp, amount: v } })} />
                </div>
                <FreeDelivery
                  checked={!!cp.freeDelivery}
                  delivery={inv.delivery}
                  note={cp.freeDelivery && inv.discountFreeDelivery ? "Already free via discount" : undefined}
                  onChange={(v) => update({ coupon: { ...cp, freeDelivery: v } })}
                />
              </div>
            </div>
            <p className="mt-2 text-[11.5px] text-muted">Discount % is on the subtotal; coupon % is on the subtotal after discount. Use %, BDT, free delivery, or any combination.</p>

            {/* additional charges */}
            <div className={cx("mt-5 rounded-2xl border transition", ex.enabled ? "border-brand/30 bg-soft/40" : "border-line")}>
              <div className="flex items-center gap-3 p-4">
                <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-white text-brand shadow-sm">
                  <PlusCircle className="size-[18px]" />
                </div>
                <div className="mr-auto min-w-0">
                  <div className="font-display text-[15px] font-bold">Additional charges</div>
                  <div className="text-[12.5px] text-muted">bKash fee, courier charge, or any other charge</div>
                </div>
                <Switch label="Additional charges" checked={ex.enabled} onChange={(v) => setEx({ enabled: v })} />
              </div>

              {ex.enabled && (
                <div className="flex flex-col gap-5 border-t border-line/80 p-4">
                  <div>
                    <Label>Payment via</Label>
                    <div className="grid grid-cols-2 gap-2 @md:grid-cols-4">
                      {PAYMENT_METHODS.map((m) => (
                        <Chip key={m} active={ex.payVia === m} hint={rateHint(shop.rates.pay[m])} onClick={() => setEx({ payVia: m, payRate: shop.rates.pay[m] })}>
                          {m}
                        </Chip>
                      ))}
                    </div>
                  </div>

                  <div>
                    <Label>Courier</Label>
                    <div className="grid grid-cols-2 gap-2 @md:grid-cols-4">
                      {COURIERS.map((c) => (
                        <Chip
                          key={c}
                          active={ex.courier === c}
                          hint={c === "None" ? "No courier" : c === "Other" ? "Enter manually" : rateHint(shop.rates.courier[c])}
                          onClick={() => setEx({ courier: c, courierRate: c === "Other" ? (ex.courier === "Other" ? ex.courierRate : 0) : shop.rates.courier[c] })}
                        >
                          {c}
                        </Chip>
                      ))}
                    </div>
                    {ex.courier === "Other" && (
                      <div className="mt-2 grid grid-cols-2 gap-2 rounded-xl bg-white p-2.5 shadow-sm">
                        <Input
                          className="col-span-2"
                          placeholder="Courier name (e.g. RedX, Sundarban)"
                          aria-label="Courier name"
                          value={ex.courierName ?? ""}
                          onChange={(e) => setEx({ courierName: e.target.value })}
                        />
                        <SuffixInput suffix="%" label="Courier charge percent" value={ex.courierRate} onChange={(v) => setEx({ courierRate: Math.min(100, v) })} />
                        <SuffixInput suffix="BDT" label="Courier charge amount" value={ex.courierFixed ?? 0} onChange={(v) => setEx({ courierFixed: v })} />
                      </div>
                    )}
                  </div>

                  <div>
                    <div className="mb-1.5 flex items-center justify-between">
                      <Label>Other charges</Label>
                      <Button size="sm" variant="ghost" className="-mt-1.5 text-brand" onClick={() => setEx({ manual: [...ex.manual, { id: uid(), label: "", amount: 0 }] })}>
                        <Plus className="size-4" /> Add charge
                      </Button>
                    </div>
                    {ex.manual.length === 0 && <div className="rounded-xl border border-dashed border-line bg-white/60 py-3 text-center text-[13px] text-muted">e.g. Packaging, Express delivery, Installation…</div>}
                    <div className="flex flex-col gap-2">
                      {ex.manual.map((m) => (
                        <div key={m.id} className="grid grid-cols-[minmax(0,1fr)_110px_36px] items-center gap-2">
                          <Input placeholder="Charge name" aria-label="Charge name" value={m.label} onChange={(e) => setManual(m.id, { label: e.target.value })} />
                          <Input type="number" inputMode="decimal" placeholder="Amount" aria-label="Charge amount" className="text-right" value={m.amount || ""} onChange={(e) => setManual(m.id, { amount: numOrZero(e.target.value) })} />
                          <button onClick={() => setEx({ manual: ex.manual.filter((x) => x.id !== m.id) })} className="grid size-9 place-items-center rounded-lg text-faint hover:bg-red-50 hover:text-red-600" aria-label="Remove charge">
                            <Trash2 className="size-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-xl bg-white p-3.5 text-[13.5px] shadow-sm">
                    {t.charges.length === 0 ? (
                      <div className="text-muted">No extra charges for the selected options.</div>
                    ) : (
                      t.charges.map((c, i) => (
                        <div key={i} className="flex justify-between py-0.5">
                          <span className="text-body">{c.label}</span>
                          <span className="font-semibold">{money(c.amount)}</span>
                        </div>
                      ))
                    )}
                    <div className="mt-1.5 flex justify-between border-t border-line pt-1.5 font-bold">
                      <span>Additional charges</span>
                      <span className="text-brand">+ {money(t.chargesTotal)}</span>
                    </div>
                    <div className="mt-1 text-[11.5px] text-muted">Percentages apply to the product total {money(t.subtotal)} only (not delivery, discount or coupon).</div>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-6 flex flex-wrap items-center justify-between gap-2">
              <div className="text-[12px] font-semibold uppercase tracking-wide text-muted">Payments received</div>
              <div className="flex gap-2">
                {t.due > 0 && (
                  <Button size="sm" variant="ghost" className="text-brand" onClick={() => addPayment(t.due, "Full settlement")}>
                    <CheckCheck className="size-4" /> Mark fully paid
                  </Button>
                )}
                <Button size="sm" onClick={() => addPayment()}>
                  <Plus className="size-4" /> Add payment
                </Button>
              </div>
            </div>
            <div className="mt-3 flex flex-col gap-2">
              {inv.payments.length === 0 && (
                <div className="rounded-xl border border-dashed border-line py-6 text-center text-sm text-muted">
                  No payments yet - this receipt shows as <b>Unpaid</b>.
                </div>
              )}
              {inv.payments.map((p, idx) => (
                <div key={p.id} className="grid grid-cols-2 items-center gap-2 rounded-xl bg-canvas p-2.5 @2xl:grid-cols-[150px_140px_130px_minmax(0,1fr)_36px]">
                  <Input type="date" aria-label="Payment date" value={p.date} onChange={(e) => setPay(idx, { date: e.target.value })} />
                  <Select aria-label="Payment method" value={p.method} onChange={(e) => setPay(idx, { method: e.target.value as Payment["method"] })}>
                    {(PAYMENT_METHODS.includes(p.method) ? PAYMENT_METHODS : [...PAYMENT_METHODS, p.method]).map((m) => (
                      <option key={m}>{m}</option>
                    ))}
                  </Select>
                  <Input type="number" inputMode="decimal" aria-label="Amount" className="text-right font-semibold" placeholder="Amount" value={p.amount || ""} onChange={(e) => setPay(idx, { amount: numOrZero(e.target.value) })} />
                  <Input aria-label="Note" placeholder="Note (optional)" value={p.note} onChange={(e) => setPay(idx, { note: e.target.value })} />
                  <button
                    onClick={() => update({ payments: inv.payments.filter((_, i) => i !== idx) })}
                    className="col-span-2 flex h-9 items-center justify-center gap-1.5 rounded-lg text-[13px] font-semibold text-faint hover:bg-red-50 hover:text-red-600 @2xl:col-span-1 @2xl:size-9"
                    aria-label="Remove payment"
                  >
                    <Trash2 className="size-4" />
                    <span className="@2xl:hidden">Remove</span>
                  </button>
                </div>
              ))}
            </div>

            {/* live summary */}
            <div className="mt-6 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-line bg-line @lg:grid-cols-4">
              {[
                ["Grand total", money(t.grandTotal), "text-ink"],
                ["Paid", money(t.paid), "text-brand"],
                [t.due < 0 ? "Credit" : "Balance due", money(Math.abs(t.due)), t.due > 0 ? "text-red-700" : "text-brand"],
                ["Status", "", ""],
              ].map(([k, v, c]) => (
                <div key={k} className="bg-white p-3.5">
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-muted">{k}</div>
                  {k === "Status" ? (
                    <div className="mt-1">
                      <StatusBadge status={t.status} />
                    </div>
                  ) : (
                    <div className={cx("font-display text-lg font-bold", c)}>{v}</div>
                  )}
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-5 sm:p-6">
            <SectionTitle icon={<NotebookPen className="size-4" />} title="Notes" hint="Printed on the receipt (optional)" />
            <Textarea rows={3} placeholder="e.g. Delivery charge includes 150 tk up-down rent." value={inv.notes} onChange={(e) => update({ notes: e.target.value })} />
          </Card>
        </div>

        {/* ---------------- preview ---------------- */}
        <div className={cx(mobileTab === "edit" && "hidden xl:block")}>
          <div className="xl:sticky xl:top-28">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-wide text-muted">
                <FileText className="size-4" /> Live preview · A4 portrait
              </div>
              <div className="text-[12px] font-semibold text-muted">{bdt(Math.max(t.due, 0))} due</div>
            </div>
            <ReceiptPreview inv={inv} shop={shop} />
          </div>
        </div>
      </div>

      {/* mobile action bar (above the bottom navigation) */}
      <div className="fixed inset-x-0 bottom-[calc(64px+env(safe-area-inset-bottom))] z-30 border-t border-line bg-white/95 px-3 py-2.5 backdrop-blur md:hidden">
        <div className={cx("grid gap-2", shareable ? "grid-cols-[auto_auto_1fr_1fr]" : "grid-cols-[auto_1fr_1fr]")}>
          {shareable && (
            <Button onClick={() => run("share")} loading={busy === "share"} aria-label="Share PDF to WhatsApp or other apps">
              {busy !== "share" && <Share2 className="size-4" />}
            </Button>
          )}
          <Button onClick={openWhatsApp} aria-label="Send WhatsApp message">
            <MessageCircle className="size-4 text-[#25D366]" />
          </Button>
          <Button onClick={() => run("xlsx")} loading={busy === "xlsx"}>
            {busy !== "xlsx" && <FileSpreadsheet className="size-4 text-brand" />} Excel
          </Button>
          <Button variant="primary" onClick={() => run("pdf")} loading={busy === "pdf"}>
            {busy !== "pdf" && <Download className="size-4" />} PDF
          </Button>
        </div>
      </div>
      <div className="h-16 md:hidden" />
    </div>
  );
}

function SuffixInput({ suffix, label, value, onChange }: { suffix: string; label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div className="relative">
      <Input
        type="number"
        inputMode="decimal"
        min={0}
        aria-label={label}
        placeholder="0"
        className="pr-12 text-right font-semibold"
        value={value || ""}
        onChange={(e) => onChange(Math.max(0, numOrZero(e.target.value)))}
      />
      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[12px] font-bold text-muted">{suffix}</span>
    </div>
  );
}

function FreeDelivery({ checked, delivery, note, onChange }: { checked: boolean; delivery: number; note?: string; onChange: (v: boolean) => void }) {
  return (
    <div className="mt-3 flex items-center gap-2.5 rounded-xl bg-canvas px-3 py-2">
      <Truck className="size-4 shrink-0 text-muted" />
      <div className="mr-auto min-w-0 text-[13px]">
        <div className="font-semibold text-ink">Free delivery</div>
        <div className="truncate text-[11.5px] text-muted">{note ?? (delivery ? `Waives the ${money(delivery)} delivery charge` : "No delivery charge on this receipt")}</div>
      </div>
      <Switch label="Free delivery" checked={checked} onChange={onChange} />
    </div>
  );
}
