"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowDown, ArrowUp, Check, Copy, ExternalLink, HelpCircle, Landmark, Megaphone, MessageCircle, Plus, Store, Trash2, Truck, BookOpen } from "lucide-react";
import { useStore } from "@/lib/store";
import { DEFAULT_ABOUT, DEFAULT_FAQ, siteSettings, absolute, publicLinks } from "@/lib/site";
import { uid } from "@/lib/calc";
import type { SiteSettings } from "@/lib/types";
import { SectionIcon } from "@/components/nav";
import { Button, Card, Field, Input, SectionTitle, Select, Switch, Textarea, cx, useToast } from "@/components/ui";

export default function WebsitePage() {
  const { shop, setShop, products, mode, ready } = useStore();
  const toast = useToast();
  const s = siteSettings(shop);
  const set = (patch: Partial<SiteSettings>) => setShop({ ...shop, site: { ...s, ...patch } });

  // the store's full address, read after mount (it depends on where the app is opened from)
  const [origin, setOrigin] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setOrigin(window.location.origin), 0);
    return () => clearTimeout(t);
  }, []);
  const storeLink = origin ? publicLinks(new URL(origin).host).store() : "/store";
  const storeUrl = origin ? absolute(storeLink, origin) : "";
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);

  const onSiteCount = products.filter((p) => p.onSite !== false && p.name.trim() && p.price > 0).length;
  const withPhoto = products.filter((p) => p.onSite !== false && p.images?.length).length;
  const bankEmpty = !s.bank.accountNumber.trim();

  return (
    <div className="animate-fade-up">
      <div className="mb-6 flex items-center gap-3">
        <SectionIcon section="website" className="size-11 rounded-2xl bg-deep text-lime shadow-lg shadow-deep/20" />
        <div>
          <h1 className="font-display text-2xl font-extrabold sm:text-3xl">Website</h1>
          <p className="text-sm text-muted">Everything customers see on your online store. Changes save automatically.</p>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <div className="flex flex-col gap-5">
          {/* status */}
          <Card className="p-5 sm:p-6">
            <SectionTitle icon={<Store className="size-4" />} title="Store" hint={`${onSiteCount} products on the website · ${withPhoto} with photos`} />
            <label className="flex cursor-pointer items-center justify-between gap-3 rounded-xl bg-canvas px-4 py-3">
              <span>
                <span className="block text-[14.5px] font-bold">{s.open ? "Taking orders" : "Orders paused"}</span>
                <span className="block text-[12.5px] text-muted">
                  {s.open ? "Customers can check out on the website." : "Customers can browse, but checkout asks them to message you on WhatsApp."}
                </span>
              </span>
              <Switch checked={s.open} label="Taking orders" onChange={(v) => set({ open: v })} />
            </label>
            {ready && mode !== "cloud" && (
              <p className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-[12.5px] text-amber-800">
                This copy of the app saves on this device only. The website shows sample products and can&apos;t take orders until the cloud database is connected.
              </p>
            )}

            <div className="mt-4">
              <Field label="Store link">
                <div className="flex gap-2">
                  <Input readOnly value={storeUrl} onFocus={(e) => e.target.select()} aria-label="Store link" />
                  <Button
                    aria-label="Copy store link"
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(storeUrl);
                        setCopied(true);
                        clearTimeout(timer.current);
                        timer.current = setTimeout(() => setCopied(false), 1600);
                      } catch {
                        toast("Could not copy - your browser blocked the clipboard", "err");
                      }
                    }}
                  >
                    {copied ? <Check className="size-4 text-brand" /> : <Copy className="size-4" />}
                  </Button>
                  <a href={storeLink} target="_blank" rel="noopener" className="inline-flex h-10 shrink-0 items-center gap-2 rounded-xl bg-deep px-4 text-sm font-semibold text-white hover:bg-ink">
                    Open <ExternalLink className="size-3.5" />
                  </a>
                </div>
              </Field>
            </div>

            <div className="mt-4">
              <Field label="Announcement bar (optional)">
                <div className="relative">
                  <Megaphone className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-faint" />
                  <Input className="pl-9" value={s.announcement} placeholder="e.g. Free delivery on orders over ৳3,000 this week" onChange={(e) => set({ announcement: e.target.value })} />
                </div>
              </Field>
              <p className="mt-1.5 text-[12px] text-muted">A thin line above the store menu. Leave empty to hide it.</p>
            </div>
          </Card>

          {/* contact */}
          <Card className="p-5 sm:p-6">
            <SectionTitle icon={<MessageCircle className="size-4" />} title="Contact" hint="The WhatsApp button and Contact page use these" />
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="WhatsApp number">
                <Input type="tel" inputMode="tel" value={s.whatsapp} placeholder="+880 1…" onChange={(e) => set({ whatsapp: e.target.value })} />
              </Field>
              <Field label="Facebook page link">
                <Input type="url" value={s.facebook} placeholder="https://facebook.com/…" onChange={(e) => set({ facebook: e.target.value })} />
              </Field>
            </div>
            <div className="mt-4">
              <Field label="Address on the website">
                <Input value={s.address} placeholder="e.g. Dhaka/Khulna, Bangladesh" onChange={(e) => set({ address: e.target.value })} />
              </Field>
            </div>
            <p className="mt-3 text-[12px] text-muted">Shop name, phone and email come from Settings. Receipts keep the address in Settings.</p>
          </Card>

          {/* payments */}
          <Card className="p-5 sm:p-6">
            <SectionTitle icon={<Landmark className="size-4" />} title="Payments" hint="Shown to customers at checkout and on the order tracking page" />
            <p className="mb-2 text-[12px] font-bold uppercase tracking-wide text-pink-700">bKash</p>
            <div className="grid gap-4 sm:grid-cols-[1fr_170px]">
              <Field label="bKash number">
                <Input type="tel" inputMode="tel" value={s.bkash.number} placeholder="01XXXXXXXXX" onChange={(e) => set({ bkash: { ...s.bkash, number: e.target.value } })} />
              </Field>
              <Field label="Account type">
                <Select value={s.bkash.type} onChange={(e) => set({ bkash: { ...s.bkash, type: e.target.value as SiteSettings["bkash"]["type"] } })}>
                  <option value="Personal">Personal (Send Money)</option>
                  <option value="Merchant">Merchant (Payment)</option>
                  <option value="Agent">Agent (Cash In)</option>
                </Select>
              </Field>
            </div>
            <p className="mb-2 mt-5 text-[12px] font-bold uppercase tracking-wide text-aqua-deep">Bank transfer</p>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Bank name">
                <Input value={s.bank.bank} placeholder="e.g. Dutch-Bangla Bank" onChange={(e) => set({ bank: { ...s.bank, bank: e.target.value } })} />
              </Field>
              <Field label="Account name">
                <Input value={s.bank.accountName} placeholder="e.g. Go Round" onChange={(e) => set({ bank: { ...s.bank, accountName: e.target.value } })} />
              </Field>
              <Field label="Account number">
                <Input inputMode="numeric" value={s.bank.accountNumber} placeholder="Account number" onChange={(e) => set({ bank: { ...s.bank, accountNumber: e.target.value } })} />
              </Field>
              <Field label="Branch">
                <Input value={s.bank.branch} placeholder="Optional" onChange={(e) => set({ bank: { ...s.bank, branch: e.target.value } })} />
              </Field>
              <Field label="Routing number">
                <Input inputMode="numeric" value={s.bank.routing} placeholder="Optional" onChange={(e) => set({ bank: { ...s.bank, routing: e.target.value } })} />
              </Field>
            </div>
            {bankEmpty && (
              <p className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-[12.5px] text-amber-800">
                No account number yet: customers who choose bank transfer are asked to message you on WhatsApp for the bank details.
              </p>
            )}
          </Card>
        </div>

        <div className="flex flex-col gap-5">
          {/* delivery */}
          <Card className="p-5 sm:p-6">
            <SectionTitle icon={<Truck className="size-4" />} title="Delivery" hint="Customers pick one at checkout; the fee is added to their order" />
            <ul className="flex flex-col gap-2">
              {s.zones.map((z, i) => (
                <li key={z.id} className="flex items-center gap-2">
                  <Input
                    aria-label="Delivery area name"
                    value={z.name}
                    placeholder="e.g. Inside Dhaka"
                    onChange={(e) => set({ zones: s.zones.map((x) => (x.id === z.id ? { ...x, name: e.target.value } : x)) })}
                  />
                  <div className="relative w-32 shrink-0">
                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[13px] font-semibold text-muted">৳</span>
                    <Input
                      type="number"
                      inputMode="decimal"
                      min={0}
                      aria-label={`${z.name || "Delivery"} fee`}
                      className="pl-7 text-right font-semibold"
                      value={z.fee || ""}
                      placeholder="0"
                      onChange={(e) => set({ zones: s.zones.map((x) => (x.id === z.id ? { ...x, fee: Math.max(0, Number(e.target.value) || 0) } : x)) })}
                    />
                  </div>
                  <button
                    type="button"
                    disabled={s.zones.length === 1}
                    onClick={() => set({ zones: s.zones.filter((_, j) => j !== i) })}
                    className="grid size-10 shrink-0 place-items-center rounded-xl text-faint transition hover:bg-red-50 hover:text-red-600 disabled:pointer-events-none disabled:opacity-30"
                    aria-label={`Remove ${z.name || "delivery area"}`}
                  >
                    <Trash2 className="size-4" />
                  </button>
                </li>
              ))}
            </ul>
            <Button size="sm" className="mt-3" onClick={() => set({ zones: [...s.zones, { id: uid(), name: "", fee: shop.defaultDelivery }] })}>
              <Plus className="size-3.5" /> Add delivery area
            </Button>
            <div className="mt-5">
              <Field label="Delivery note (product pages and Contact us)">
                <Textarea rows={2} value={s.deliveryNote} onChange={(e) => set({ deliveryNote: e.target.value })} />
              </Field>
            </div>
            <div className="mt-5 max-w-xs">
              <Field label="Free delivery on orders from (৳)">
                <Input
                  type="number"
                  inputMode="decimal"
                  min={0}
                  value={s.freeDeliveryOver || ""}
                  placeholder="0 = never free"
                  onChange={(e) => set({ freeDeliveryOver: Math.max(0, Number(e.target.value) || 0) })}
                />
              </Field>
            </div>
          </Card>

          {/* about */}
          <Card className="p-5 sm:p-6">
            <SectionTitle
              icon={<BookOpen className="size-4" />}
              title="About us page"
              hint="A blank line starts a new paragraph"
              action={
                s.about !== DEFAULT_ABOUT ? (
                  <Button size="sm" variant="ghost" onClick={() => set({ about: DEFAULT_ABOUT })}>
                    Reset
                  </Button>
                ) : undefined
              }
            />
            <Textarea rows={9} value={s.about} onChange={(e) => set({ about: e.target.value })} />
          </Card>

          {/* faq */}
          <Card className="p-5 sm:p-6">
            <SectionTitle
              icon={<HelpCircle className="size-4" />}
              title="FAQ page"
              hint={`${s.faq.length} question${s.faq.length === 1 ? "" : "s"}`}
              action={
                JSON.stringify(s.faq) !== JSON.stringify(DEFAULT_FAQ) ? (
                  <Button size="sm" variant="ghost" onClick={() => set({ faq: DEFAULT_FAQ })}>
                    Reset
                  </Button>
                ) : undefined
              }
            />
            <FaqEditor faq={s.faq} onChange={(faq) => set({ faq })} />
          </Card>
        </div>
      </div>
    </div>
  );
}

function FaqEditor({ faq, onChange }: { faq: SiteSettings["faq"]; onChange: (f: SiteSettings["faq"]) => void }) {
  const move = (i: number, d: -1 | 1) => {
    const next = [...faq];
    [next[i], next[i + d]] = [next[i + d]!, next[i]!];
    onChange(next);
  };
  const iconBtn = "grid size-8 place-items-center rounded-lg text-faint transition hover:bg-canvas hover:text-ink disabled:pointer-events-none disabled:opacity-30";
  return (
    <div className="flex flex-col gap-3">
      {faq.map((f, i) => (
        <div key={i} className={cx("rounded-2xl border border-line p-3")}>
          <div className="flex items-center gap-1">
            <span className="mr-auto text-[12px] font-bold text-muted">Q{i + 1}</span>
            <button type="button" className={iconBtn} disabled={i === 0} onClick={() => move(i, -1)} aria-label="Move up">
              <ArrowUp className="size-4" />
            </button>
            <button type="button" className={iconBtn} disabled={i === faq.length - 1} onClick={() => move(i, 1)} aria-label="Move down">
              <ArrowDown className="size-4" />
            </button>
            <button type="button" className={cx(iconBtn, "hover:bg-red-50 hover:text-red-600")} onClick={() => onChange(faq.filter((_, j) => j !== i))} aria-label="Remove question">
              <Trash2 className="size-4" />
            </button>
          </div>
          <Input className="mt-1 font-semibold" value={f.q} placeholder="Question" aria-label={`Question ${i + 1}`} onChange={(e) => onChange(faq.map((x, j) => (j === i ? { ...x, q: e.target.value } : x)))} />
          <Textarea className="mt-2" rows={2} value={f.a} placeholder="Answer" aria-label={`Answer ${i + 1}`} onChange={(e) => onChange(faq.map((x, j) => (j === i ? { ...x, a: e.target.value } : x)))} />
        </div>
      ))}
      <Button size="sm" className="self-start" onClick={() => onChange([...faq, { q: "", a: "" }])}>
        <Plus className="size-3.5" /> Add question
      </Button>
    </div>
  );
}
