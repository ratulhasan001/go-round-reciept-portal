"use client";

import { useEffect, useRef } from "react";
import { ArrowRight, Check, CopyX, FileQuestion, RefreshCw, TicketPercent, TicketPlus, TicketX, Truck, X } from "lucide-react";
import { useStore } from "@/lib/store";
import { fmtDate, todayISO, uid } from "@/lib/calc";
import type { CouponCode } from "@/lib/types";
import { COUPON_SAMPLE_CSV, couponStatus, normCode, offerFromCode, offerLabel, planCouponImport, readCouponFile, type CouponStatus } from "@/lib/coupons";
import { ListEditor } from "@/components/ListEditor";
import { ImportDialog } from "@/components/ImportDialog";
import { Input, cx } from "@/components/ui";

const STATUS: Record<CouponStatus, { label: string; chip: string; lead: string }> = {
  available: { label: "Available", chip: "bg-soft text-brand", lead: "bg-soft text-brand" },
  given: { label: "Given", chip: "bg-aqua-soft text-aqua-deep", lead: "bg-aqua-soft text-aqua-deep" },
  used: { label: "Used", chip: "bg-canvas text-muted", lead: "bg-canvas text-faint" },
  expired: { label: "Expired", chip: "bg-red-50 text-red-600", lead: "bg-red-50 text-red-500" },
};
const OFFERS = [1, 2, 3, 4, 5, 10, 15, 20];

const daysLeft = (iso: string) => Math.round((Date.parse(iso) - Date.parse(todayISO())) / 86_400_000);
const byCode = (a: CouponCode, b: CouponCode) => a.code.localeCompare(b.code, undefined, { numeric: true, sensitivity: "base" });
const updated = (c: CouponCode) => c.updatedAt ?? 0;
// the calendar icon is hidden to leave room for the full date; clicking the field opens the picker instead
const dateCls = "h-10 min-w-0 cursor-pointer px-2 text-[13px] tabular-nums [&::-webkit-calendar-picker-indicator]:hidden";
const openPicker = (e: React.MouseEvent<HTMLInputElement>) => {
  try {
    e.currentTarget.showPicker?.();
  } catch {
    /* not supported, or not allowed right now */
  }
};

export default function CouponsPage() {
  const { coupons, setCoupons } = useStore();
  const latest = useRef(coupons);
  useEffect(() => {
    latest.current = coupons;
  });
  const status = (c: CouponCode) => couponStatus(c);

  return (
    <ListEditor<CouponCode>
      title="Coupons"
      subtitle="Your coupon sheet - who got which code, how long it's valid, and when it was used."
      icon={<TicketPercent className="size-5" />}
      noun="Coupon"
      rows={coupons}
      onChange={setCoupons}
      tableFrom="2xl"
      blank={() => ({ id: uid(), code: "", pct: 0, freeDelivery: false, name: "", phone: "", validFrom: "", validTo: "", usedOn: "", updatedAt: Date.now() })}
      touch={(c) => ({ ...c, updatedAt: Date.now() })}
      filters={[
        { label: "Available", test: (c) => status(c) === "available" },
        { label: "Given", test: (c) => status(c) === "given" },
        { label: "Used", test: (c) => status(c) === "used" },
        { label: "Expired", test: (c) => status(c) === "expired" },
      ]}
      sorts={[
        { label: "Recently updated", compare: (a, b) => updated(b) - updated(a) },
        { label: "Code A → Z", compare: byCode },
        { label: "Name A → Z", compare: (a, b) => (!a.name.trim() ? 1 : 0) - (!b.name.trim() ? 1 : 0) || a.name.localeCompare(b.name) || byCode(a, b) },
        {
          label: "Expiring soonest",
          // coupons that can still expire first (soonest end date on top); used / open-ended ones after
          compare: (a, b) => {
            const k = (c: CouponCode) => (c.usedOn || !c.validTo ? "9999" : c.validTo);
            return k(a).localeCompare(k(b)) || byCode(a, b);
          },
        },
        { label: "Biggest offer", compare: (a, b) => Number(b.freeDelivery) - Number(a.freeDelivery) || b.pct - a.pct || byCode(a, b) },
        { label: "Recently used", compare: (a, b) => b.usedOn.localeCompare(a.usedOn) || byCode(a, b) },
      ]}
      actions={
        <ImportDialog
          title="Import coupons"
          hint="Your coupon sheet (.xlsx or CSV) - codes already saved are skipped."
          columns={["Code", "Name", "Phone Number", "Validity", "Using Date"]}
          notes="The offer comes from the code's ending, using the legend in the Code heading - e.g. (a-1%)…(e-5%)(fd-free delivery). Validity like “21-04-26 to 21-06-26” is read as day-month-year. A code that's already saved only gets missing details filled in."
          sample={{ name: "coupons-sample.csv", csv: COUPON_SAMPLE_CSV }}
          noun={["coupon", "coupons"]}
          read={async (file) => {
            const { rows, legend } = await readCouponFile(file);
            const plan = planCouponImport(latest.current, rows, legend);
            const stats = [
              { label: "New codes", value: plan.add.length, icon: <TicketPlus className="size-4" />, tone: "bg-soft text-brand" },
              { label: "Details filled in", value: plan.update.length, icon: <RefreshCw className="size-4" />, tone: "bg-aqua-soft text-aqua-deep" },
              { label: "Already saved", value: plan.duplicates, icon: <CopyX className="size-4" />, tone: "bg-amber-50 text-amber-700" },
              { label: "No code, skipped", value: plan.invalid, icon: <TicketX className="size-4" />, tone: "bg-red-50 text-red-600" },
            ];
            if (plan.unknownOffer)
              stats.push({ label: "Unknown ending (no offer)", value: plan.unknownOffer, icon: <FileQuestion className="size-4" />, tone: "bg-violet-50 text-violet-700" });
            return {
              total: plan.total,
              changes: plan.add.length + plan.update.length,
              stats,
              listTitle: "New codes",
              list: plan.add.map((c) => ({ id: c.id, primary: c.code, secondary: `${offerLabel(c)}${c.name ? ` · ${c.name}` : ""}` })),
              apply: () => {
                const changed = new Map(plan.update.map((c) => [c.id, c]));
                setCoupons([...plan.add, ...latest.current.map((c) => changed.get(c.id) ?? c)]);
                const parts = [plan.add.length && `${plan.add.length} added`, plan.update.length && `${plan.update.length} updated`].filter(Boolean);
                return `Coupons ${parts.join(", ")}`;
              },
            };
          }}
        />
      }
      lead={(c) => {
        const s = status(c);
        return (
          <span key={s + c.freeDelivery} title={STATUS[s].label} className={cx("animate-lead-pop grid size-9 place-items-center rounded-xl", STATUS[s].lead)}>
            {c.freeDelivery ? <Truck className="size-[18px]" /> : <TicketPercent className="size-[18px]" />}
          </span>
        );
      }}
      columns={[
        {
          key: "code",
          label: "Code",
          type: "custom",
          width: "165px",
          render: (c, update) => {
            const dup = !!c.code.trim() && latest.current.some((x) => x.id !== c.id && normCode(x.code) === normCode(c.code));
            return (
              <Input
                aria-label="Coupon code"
                placeholder="GR00-00-00-00a"
                value={c.code}
                title={dup ? "Another coupon already has this code" : undefined}
                className={cx("font-semibold tracking-wide", dup && "border-red-300 bg-red-50 text-red-700")}
                onChange={(e) => {
                  const code = e.target.value;
                  const offer = offerFromCode(code);
                  update(offer ? { code, ...offer } : { code });
                }}
              />
            );
          },
        },
        {
          key: "pct",
          label: "Offer",
          type: "custom",
          width: "130px",
          render: (c, update) => {
            const value = c.freeDelivery ? "fd" : String(c.pct);
            const pcts = OFFERS.includes(c.pct) || c.freeDelivery ? OFFERS : [...OFFERS, c.pct].sort((a, b) => a - b);
            return (
              <div className="relative">
                <span key={value} className="animate-lead-pop pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2">
                  {c.freeDelivery ? <Truck className="size-4 text-aqua-deep" /> : <TicketPercent className={cx("size-4", c.pct ? "text-brand" : "text-faint")} />}
                </span>
                <select
                  aria-label="Offer"
                  value={value}
                  onChange={(e) => update(e.target.value === "fd" ? { freeDelivery: true, pct: 0 } : { freeDelivery: false, pct: Number(e.target.value) })}
                  className={cx(
                    "h-10 w-full cursor-pointer appearance-none rounded-xl border pl-8 pr-2 text-[13px] font-bold transition focus:outline-none focus:ring-4 focus:ring-brand/10",
                    c.freeDelivery ? "border-aqua/40 bg-aqua-soft text-aqua-deep" : c.pct ? "border-lime/50 bg-soft text-brand" : "border-line bg-white text-muted",
                  )}
                >
                  <option value="0">No offer</option>
                  {pcts.map((p) => (
                    <option key={p} value={p}>
                      {p}% off
                    </option>
                  ))}
                  <option value="fd">Free delivery</option>
                </select>
              </div>
            );
          },
        },
        { key: "name", label: "Given to", placeholder: "Customer name", width: "minmax(130px,1fr)" },
        { key: "phone", label: "Phone", type: "tel", placeholder: "01XXXXXXXXX", width: "135px" },
        {
          key: "validTo",
          label: "Valid from → to",
          type: "custom",
          width: "268px",
          render: (c, update) => (
            <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-1">
              <Input type="date" aria-label="Valid from" className={dateCls} onClick={openPicker} value={c.validFrom} onChange={(e) => update({ validFrom: e.target.value })} />
              <ArrowRight className="size-3.5 text-faint" />
              <Input
                type="date"
                aria-label="Valid until"
                onClick={openPicker}
                className={cx(dateCls, !c.usedOn && c.validTo && c.validTo < todayISO() && "border-red-200 text-red-600")}
                value={c.validTo}
                min={c.validFrom || undefined}
                onChange={(e) => update({ validTo: e.target.value })}
              />
            </div>
          ),
        },
        {
          key: "usedOn",
          label: "Status",
          type: "custom",
          width: "150px",
          render: (c, update) => {
            const s = status(c);
            if (s === "used")
              return (
                <div key="used" className="animate-label-swap flex h-10 items-center gap-1 rounded-xl border border-line bg-canvas pl-2" title={c.usedInvoice ? `Used on receipt ${c.usedInvoice}` : undefined}>
                  <Check className="size-4 shrink-0 text-brand" />
                  <input
                    type="date"
                    aria-label="Used on"
                    value={c.usedOn}
                    onClick={openPicker}
                    onChange={(e) => update({ usedOn: e.target.value })}
                    className="min-w-0 flex-1 cursor-pointer bg-transparent text-[12.5px] font-semibold tabular-nums text-ink focus:outline-none [&::-webkit-calendar-picker-indicator]:hidden"
                  />
                  <button
                    type="button"
                    onClick={() => update({ usedOn: "", usedInvoice: undefined })}
                    className="grid size-8 shrink-0 place-items-center rounded-lg text-faint transition hover:bg-white hover:text-red-600"
                    aria-label="Mark as not used"
                    title="Mark as not used"
                  >
                    <X className="size-4" />
                  </button>
                </div>
              );
            const left = c.validTo ? daysLeft(c.validTo) : null;
            const soon = s !== "expired" && left !== null && left <= 7;
            return (
              <div key={s} className="animate-label-swap flex h-10 items-center gap-1.5">
                <span
                  className={cx("flex h-8 min-w-0 flex-1 items-center justify-center truncate rounded-lg px-2 text-[12.5px] font-bold", soon ? "bg-amber-50 text-amber-700" : STATUS[s].chip)}
                  title={c.validTo ? `Valid until ${fmtDate(c.validTo)}` : undefined}
                >
                  {soon ? (left === 0 ? "Ends today" : `${left}d left`) : STATUS[s].label}
                </span>
                <button
                  type="button"
                  onClick={() => update({ usedOn: todayISO() })}
                  className="grid size-8 shrink-0 place-items-center rounded-lg border border-line text-muted transition hover:border-lime hover:bg-soft hover:text-brand active:scale-90"
                  aria-label="Mark as used today"
                  title="Mark as used today"
                >
                  <Check className="size-4" />
                </button>
              </div>
            );
          },
        },
      ]}
    />
  );
}
