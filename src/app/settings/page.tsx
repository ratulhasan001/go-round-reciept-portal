"use client";

import { useRef, useState } from "react";
import { DatabaseBackup, ImagePlus, Percent, RotateCcw, Settings, Store, Upload, FileCog, X } from "lucide-react";
import { useStore } from "@/lib/store";
import { DEFAULT_LOGO } from "@/lib/theme";
import type { Shop } from "@/lib/types";
import { COURIERS, PAYMENT_METHODS } from "@/lib/types";
import { Button, Card, Field, Input, Label, SectionTitle, Textarea, useToast } from "@/components/ui";

/** Shrinks the uploaded logo so it stays small in browser storage and in files. */
function resizeImage(file: File, max = 320): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const k = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement("canvas");
      c.width = Math.round(img.width * k);
      c.height = Math.round(img.height * k);
      c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(img.src);
      resolve(c.toDataURL("image/png"));
    };
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}

export default function SettingsPage() {
  const store = useStore();
  const { shop, setShop } = store;
  const toast = useToast();
  const logoRef = useRef<HTMLInputElement>(null);
  const importRef = useRef<HTMLInputElement>(null);
  const [confirmReset, setConfirmReset] = useState(false);

  const set = <K extends keyof Shop>(k: K, v: Shop[K]) => setShop({ ...shop, [k]: v });
  const text = (k: keyof Shop, label: string, placeholder = "") => (
    <Field label={label}>
      <Input value={String(shop[k] ?? "")} placeholder={placeholder} onChange={(e) => set(k, e.target.value as never)} />
    </Field>
  );

  const exportData = () => {
    const blob = new Blob([store.exportBackup()], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `go-round-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    toast("Backup downloaded");
  };

  return (
    <div className="animate-fade-up">
      <div className="mb-6 flex items-center gap-3">
        <div className="grid size-11 shrink-0 place-items-center rounded-2xl bg-deep text-lime">
          <Settings className="size-5" />
        </div>
        <div>
          <h1 className="font-display text-2xl font-extrabold sm:text-3xl">Settings</h1>
          <p className="text-sm text-muted">Set these once - every receipt uses them. Changes save automatically.</p>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <Card className="p-5 sm:p-6">
          <SectionTitle icon={<Store className="size-4" />} title="Shop profile" hint="Shown at the top of every receipt" />
          <div className="mb-5 flex items-center gap-4">
            <div className="grid size-20 shrink-0 place-items-center overflow-hidden rounded-2xl border border-dashed border-line bg-canvas">
              {shop.logo ? (
                // eslint-disable-next-line @next/next/no-img-element -- data URL
                <img src={shop.logo} alt="Shop logo" className="size-full object-contain" />
              ) : (
                <ImagePlus className="size-6 text-faint" />
              )}
            </div>
            <div className="flex min-w-0 flex-col gap-2">
              <div className="flex flex-wrap gap-2">
                <Button size="sm" onClick={() => logoRef.current?.click()}>
                  <Upload className="size-3.5" /> {shop.logo ? "Change logo" : "Upload logo"}
                </Button>
                {shop.logo && (
                  <Button size="sm" variant="ghost" onClick={() => set("logo", "")}>
                    <X className="size-3.5" /> Remove
                  </Button>
                )}
                {shop.logo !== DEFAULT_LOGO && (
                  <Button size="sm" variant="ghost" onClick={() => set("logo", DEFAULT_LOGO)}>
                    <RotateCcw className="size-3.5" /> Go Round logo
                  </Button>
                )}
              </div>
              <p className="text-[12px] text-muted">PNG or JPG. Without a logo, your initials are used.</p>
              {shop.logo && (
                <label className="mt-1 flex cursor-pointer items-center gap-2.5 text-[13px] font-semibold text-body">
                  <button
                    type="button"
                    role="switch"
                    aria-checked={shop.watermark}
                    onClick={() => set("watermark", !shop.watermark)}
                    className={`relative h-5 w-9 shrink-0 rounded-full transition ${shop.watermark ? "bg-brand" : "bg-line"}`}
                  >
                    <span className={`absolute top-0.5 size-4 rounded-full bg-white shadow transition-all ${shop.watermark ? "left-[18px]" : "left-0.5"}`} />
                  </button>
                  Faint logo watermark behind receipts
                </label>
              )}
            </div>
            <input
              ref={logoRef}
              type="file"
              accept="image/png,image/jpeg"
              hidden
              onChange={async (e) => {
                const f = e.target.files?.[0];
                e.target.value = "";
                if (!f) return;
                try {
                  set("logo", await resizeImage(f));
                  toast("Logo updated");
                } catch {
                  toast("Could not read that image", "err");
                }
              }}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {text("name", "Shop name", "Go Round")}
            {text("tagline", "Tagline", "What you sell")}
            <div className="sm:col-span-2">{text("address", "Address", "Area, City")}</div>
            {text("phone", "Phone", "+880 …")}
            {text("email", "Email", "Optional")}
            <div className="sm:col-span-2">{text("website", "Website / Facebook page", "Optional")}</div>
          </div>
        </Card>

        <div className="flex flex-col gap-5">
          <Card className="p-5 sm:p-6">
            <SectionTitle icon={<FileCog className="size-4" />} title="Receipt defaults" />
            <div className="grid gap-4 sm:grid-cols-3">
              {text("invoicePrefix", "Number prefix", "GR-")}
              <Field label="Next number">
                <Input type="number" min={1} value={shop.nextNumber} onChange={(e) => set("nextNumber", Math.max(1, Number(e.target.value) || 1))} />
              </Field>
              <Field label="Delivery charge">
                <Input type="number" min={0} value={shop.defaultDelivery || ""} placeholder="0" onChange={(e) => set("defaultDelivery", Number(e.target.value) || 0)} />
              </Field>
              <p className="-mt-2 text-[12px] text-muted sm:col-span-3">
                Next receipt will be <b className="text-ink">{shop.invoicePrefix}{String(shop.nextNumber).padStart(4, "0")}</b>
              </p>
              <div className="sm:col-span-3">{text("thankYou", "Thank-you message")}</div>
              <Field label="Terms / footnote" className="sm:col-span-3">
                <Textarea rows={2} value={shop.terms} onChange={(e) => set("terms", e.target.value)} />
              </Field>
            </div>
          </Card>

          <Card className="p-5 sm:p-6">
            <SectionTitle icon={<Percent className="size-4" />} title="Additional charge rates" hint="Used when “Additional charges” is switched on in a receipt. Old receipts keep the rate they were made with." />
            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <Label>Payment channel (%)</Label>
                <div className="flex flex-col gap-2">
                  {PAYMENT_METHODS.map((m) => (
                    <RateInput key={m} label={m} value={shop.rates.pay[m]} onChange={(v) => set("rates", { ...shop.rates, pay: { ...shop.rates.pay, [m]: v } })} />
                  ))}
                </div>
              </div>
              <div>
                <Label>Courier (%)</Label>
                <div className="flex flex-col gap-2">
                  {COURIERS.filter((c) => c !== "None" && c !== "Other").map((c) => (
                    <RateInput key={c} label={c} value={shop.rates.courier[c]} onChange={(v) => set("rates", { ...shop.rates, courier: { ...shop.rates.courier, [c]: v } })} />
                  ))}
                </div>
                <p className="mt-3 text-[12px] leading-relaxed text-muted">Percentages are calculated on subtotal + delivery − discount. Use “Other charges” in a receipt for fixed amounts.</p>
              </div>
            </div>
          </Card>

          <Card className="p-5 sm:p-6">
            <SectionTitle icon={<DatabaseBackup className="size-4" />} title="Backup & data" hint="Data is stored in this browser. Download a backup regularly, or to move to another device." />
            <div className="flex flex-wrap gap-2">
              <Button variant="dark" onClick={exportData}>
                <DatabaseBackup className="size-4" /> Download backup
              </Button>
              <Button onClick={() => importRef.current?.click()}>
                <Upload className="size-4" /> Restore backup
              </Button>
              <Button
                variant="danger"
                onClick={() => {
                  if (!confirmReset) {
                    setConfirmReset(true);
                    setTimeout(() => setConfirmReset(false), 3000);
                    return;
                  }
                  store.resetAll();
                  setConfirmReset(false);
                  toast("Reset to sample data");
                }}
              >
                <RotateCcw className="size-4" /> {confirmReset ? "Click again - this erases everything" : "Reset"}
              </Button>
              <input
                ref={importRef}
                type="file"
                accept="application/json,.json"
                hidden
                onChange={async (e) => {
                  const f = e.target.files?.[0];
                  e.target.value = "";
                  if (!f) return;
                  try {
                    store.importBackup(await f.text());
                    toast("Backup restored");
                  } catch (err) {
                    toast(err instanceof Error ? err.message : "Invalid backup file", "err");
                  }
                }}
              />
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

function RateInput({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center gap-3 rounded-xl bg-canvas py-1.5 pl-3 pr-1.5">
      <span className="mr-auto text-[14px] font-semibold">{label}</span>
      <div className="relative w-24">
        <Input
          type="number"
          inputMode="decimal"
          min={0}
          step={0.1}
          aria-label={`${label} charge percent`}
          className="h-9 pr-7 text-right font-semibold"
          value={value || ""}
          placeholder="0"
          onChange={(e) => onChange(Math.max(0, Number(e.target.value) || 0))}
        />
        <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[13px] font-semibold text-muted">%</span>
      </div>
    </div>
  );
}
