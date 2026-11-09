"use client";

import { useEffect, useRef, useState } from "react";
import type { Invoice, Shop } from "@/lib/types";
import { amountInWords, bdt, computeTotals, courierName, filledItems, fmtDate, lineAmount, money, rewardNote } from "@/lib/calc";
import { STATUS_LABEL, T, initials } from "@/lib/theme";
import { AQ } from "@/lib/aquascape";
import { FishBand, GrassBand } from "./AquascapeArt";
import { SIGNATORY, drawSeal, drawSignature, sealFor } from "@/lib/seal";
import { WATERMARK_OPACITY, makeWatermark } from "@/lib/watermark";

// Mirrors src/lib/pdf.tsx 1:1 - the page is laid out in PDF points (A4 = 595 x 842) and scaled to fit.
const W = 595;
const H = 842;
const display = { fontFamily: "Fraunces, Georgia, serif", fontWeight: 600 } as const;
const italic = { fontFamily: "Fraunces, Georgia, serif", fontStyle: "italic", fontWeight: 400 } as const;
const label: React.CSSProperties = { fontSize: 7, fontWeight: 800, letterSpacing: 1.6, color: T.muted, marginBottom: 6 };

export default function ReceiptPreview({ inv, shop }: { inv: Invoice; shop: Shop }) {
  const wrap = useRef<HTMLDivElement>(null);
  const page = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [pageH, setPageH] = useState(H);

  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      setScale(el.clientWidth / W);
      if (page.current) setPageH(page.current.offsetHeight);
    });
    ro.observe(el);
    if (page.current) ro.observe(page.current);
    return () => ro.disconnect();
  }, []);

  const spec = sealFor(inv, shop);
  const specKey = spec ? JSON.stringify(spec) : "";
  const [seal, setSeal] = useState<{ key: string; url: string } | null>(null);
  useEffect(() => {
    if (!specKey) return;
    let live = true;
    drawSeal(JSON.parse(specKey)).then((url) => live && setSeal({ key: specKey, url }));
    return () => {
      live = false;
    };
  }, [specKey]);
  const sealUrl = seal && seal.key === specKey ? seal.url : null;

  const signKey = `${shop.name}\n${shop.logo}`;
  const [sign, setSign] = useState<{ key: string; url: string } | null>(null);
  useEffect(() => {
    let live = true;
    const [name, logo] = signKey.split("\n");
    drawSignature({ name, logo }).then((url) => live && setSign({ key: signKey, url }));
    return () => {
      live = false;
    };
  }, [signKey]);
  const signUrl = sign && sign.key === signKey ? sign.url : null;

  const wmKey = shop.watermark ? shop.logo : "";
  const [wm, setWm] = useState<{ key: string; url: string | null } | null>(null);
  useEffect(() => {
    if (!wmKey) return;
    let live = true;
    makeWatermark(wmKey).then((url) => live && setWm({ key: wmKey, url }));
    return () => {
      live = false;
    };
  }, [wmKey]);
  const wmUrl = wmKey && wm?.key === wmKey ? wm.url : null;

  const t = computeTotals(inv);
  const reward = rewardNote(inv);
  const items = filledItems(inv);
  const payments = inv.payments.filter((p) => p.amount);
  const st = T.status[t.status];
  const contact = [shop.address, [shop.phone, shop.email].filter(Boolean).join("  ·  "), shop.website].filter(Boolean);

  return (
    <div ref={wrap} className="w-full min-w-0 overflow-hidden" style={{ height: pageH * scale }}>
      <div
        ref={page}
        className="relative isolate origin-top-left overflow-hidden rounded-[3px] shadow-[0_24px_60px_-16px_rgba(14,42,35,0.28)] ring-1 ring-black/5"
        style={{ width: W, minHeight: H, transform: `scale(${scale})`, background: AQ.paper, fontFamily: "var(--font-manrope)", fontSize: 9, color: T.body, padding: "54px 40px 130px", lineHeight: 1.25 }}
      >
        {wmUrl && (
          // eslint-disable-next-line @next/next/no-img-element -- generated data URL
          <img src={wmUrl} alt="" aria-hidden style={{ position: "absolute", width: 380, height: 380, left: 107.6, top: 250, objectFit: "contain", opacity: WATERMARK_OPACITY, zIndex: -1, pointerEvents: "none" }} />
        )}
        <FishBand />
        <GrassBand />

        {/* header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14, maxWidth: 330 }}>
            {shop.logo ? (
              // eslint-disable-next-line @next/next/no-img-element -- logo may be a user-uploaded data URL
              <img src={shop.logo} alt="" style={{ width: 68, height: 68, objectFit: "contain" }} />
            ) : (
              <div style={{ width: 60, height: 60, borderRadius: 30, border: `4px solid ${T.leaf}`, display: "grid", placeItems: "center", ...display, fontWeight: 800, fontSize: 20, color: T.ink }}>
                {initials(shop.name)}
              </div>
            )}
            <div>
              <div style={{ ...display, fontSize: 25, color: AQ.ink, letterSpacing: -0.6, lineHeight: 1.1 }}>{shop.name}</div>
              {shop.tagline && <div style={{ fontSize: 6.4, color: AQ.muted, fontWeight: 800, letterSpacing: 1.6, marginTop: 2, textTransform: "uppercase" }}>{shop.tagline}</div>}
              {contact.length > 0 && <div style={{ fontSize: 8, color: T.muted, marginTop: 5, lineHeight: 1.45, whiteSpace: "pre-line" }}>{contact.join("\n")}</div>}
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ ...display, fontSize: 26, color: AQ.ink, letterSpacing: 3, marginRight: -3, lineHeight: 1.15 }}>INVOICE</div>
            <div style={{ fontSize: 9.5, fontWeight: 800, color: AQ.blue, letterSpacing: 0.6, marginTop: 1 }}>No. {inv.number || "—"}</div>
            <div style={{ display: "inline-block", marginTop: 7, padding: "3px 9px", borderRadius: 9, fontSize: 7.5, fontWeight: 800, letterSpacing: 0.8, background: st.bg, color: st.fg }}>
              {STATUS_LABEL[t.status].toUpperCase()}
            </div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", margin: "20px 0", height: 2, gap: 4 }}>
          <div style={{ width: 36, height: 1.6, background: AQ.green, borderRadius: 1 }} />
          <div style={{ flex: 1, height: 0.6, background: AQ.line }} />
        </div>

        {/* meta */}
        <div style={{ display: "flex", gap: 16 }}>
          <div style={{ flex: 1.3, minWidth: 0 }}>
            <div style={label}>BILLED TO</div>
            <div style={{ fontFamily: "var(--font-manrope), sans-serif", fontWeight: 700, fontSize: 13, color: AQ.ink, marginBottom: 3 }}>{inv.customer.name || "—"}</div>
            {inv.customer.phone && <div style={{ fontSize: 8.5, lineHeight: 1.45 }}>{inv.customer.phone}</div>}
            {inv.customer.address && <div style={{ fontSize: 8.5, lineHeight: 1.45 }}>{inv.customer.address}</div>}
          </div>
          <div style={{ flex: 1 }}>
            <div style={label}>DETAILS</div>
            <KV k="Invoice date" v={fmtDate(inv.date)} />
            <KV k="Last payment" v={fmtDate(t.lastPayment)} />
            <KV k="Items" v={String(items.length)} />
            {inv.extras?.enabled && <KV k="Payment via" v={inv.extras.payVia} />}
            {inv.extras?.enabled && inv.extras.courier !== "None" && <KV k="Courier" v={courierName(inv.extras)} />}
          </div>
          <div style={{ flex: 1.15, border: `0.8px solid ${AQ.line}`, borderRadius: 8, padding: 12, background: AQ.panel }}>
            <div style={label}>INVOICE TOTAL</div>
            <div style={{ fontFamily: "var(--font-manrope), sans-serif", fontWeight: 800, fontSize: 16, color: AQ.ink, letterSpacing: -0.2, marginBottom: 8, lineHeight: 1.1, fontVariantNumeric: "tabular-nums" }}>{bdt(t.grandTotal)}</div>
            <SumRow k="Paid" v={money(t.paid)} />
            <SumRow k={t.due < 0 ? "Credit" : "Balance due"} v={money(Math.abs(t.due))} />
          </div>
        </div>

        {/* items */}
        <div style={{ marginTop: 24 }}>
          <div style={{ display: "flex", background: AQ.sage, borderRadius: 6, padding: "7px 8px", fontSize: 7, fontWeight: 800, letterSpacing: 1.2, color: AQ.ink }}>
            <span style={{ width: "7%" }}>#</span>
            <span style={{ width: "47%" }}>DESCRIPTION</span>
            <span style={{ width: "16%", textAlign: "right" }}>UNIT PRICE</span>
            <span style={{ width: "10%", textAlign: "center" }}>QTY</span>
            <span style={{ width: "20%", textAlign: "right" }}>AMOUNT (BDT)</span>
          </div>
          {items.length === 0 && <div style={{ padding: "14px 8px", color: T.faint, borderBottom: `0.6px solid ${AQ.line}` }}>Add items to see them here…</div>}
          {items.map((it, i) => (
            <div key={it.id} style={{ display: "flex", alignItems: "center", padding: "8px 8px", borderBottom: `0.6px solid ${AQ.line}`, color: T.ink }}>
              <span style={{ width: "7%", color: T.faint }}>{String(i + 1).padStart(2, "0")}</span>
              <span style={{ width: "47%", fontWeight: 700, paddingRight: 8 }}>{it.description}</span>
              <span style={{ width: "16%", textAlign: "right" }}>{money(it.price)}</span>
              <span style={{ width: "10%", textAlign: "center" }}>{it.qty}</span>
              <span style={{ width: "20%", textAlign: "right", fontWeight: 800 }}>{money(lineAmount(it))}</span>
            </div>
          ))}
        </div>

        {/* lower */}
        <div style={{ display: "flex", gap: 26, marginTop: 20 }}>
          <div style={{ flex: 1.25, minWidth: 0 }}>
            <div style={{ background: AQ.blueSoft, borderRadius: 6, padding: 10, marginBottom: 14, borderLeft: `3px solid ${AQ.blue}` }}>
              <div style={{ ...label, color: T.aquaDeep }}>AMOUNT IN WORDS</div>
              <div style={{ fontSize: 8.5, color: T.ink, fontWeight: 700, lineHeight: 1.4 }}>{amountInWords(t.grandTotal)}</div>
            </div>
            {payments.length > 0 && (
              <div style={{ marginBottom: 12 }}>
                <div style={label}>PAYMENT HISTORY</div>
                {payments.map((p) => (
                  <div key={p.id} style={{ display: "flex", padding: "4.5px 0", borderBottom: `0.5px solid ${AQ.line}`, fontSize: 8.2 }}>
                    <span style={{ width: "28%" }}>{fmtDate(p.date)}</span>
                    <span style={{ width: "22%", fontWeight: 800, color: T.ink }}>{p.method}</span>
                    <span style={{ width: "28%", color: T.muted }}>{[p.advance && "Advance", p.note].filter(Boolean).join(" · ")}</span>
                    <span style={{ width: "22%", textAlign: "right", fontWeight: 800, color: T.ink }}>{money(p.amount)}</span>
                  </div>
                ))}
              </div>
            )}
            {inv.notes && (
              <div>
                <div style={label}>NOTES</div>
                <div style={{ fontSize: 8.5, lineHeight: 1.45, whiteSpace: "pre-wrap" }}>{inv.notes}</div>
              </div>
            )}
            {reward && (
              <div style={{ background: AQ.sage, borderRadius: 6, padding: 9, marginTop: 10, borderLeft: `3px solid ${AQ.green}` }}>
                <div style={{ ...display, fontSize: 10.5, color: AQ.ink, marginBottom: 2 }}>{reward.title}</div>
                <div style={{ fontSize: 8.2, color: T.ink, lineHeight: 1.45 }}>{reward.text}</div>
              </div>
            )}
            {spec && (
              <div style={{ width: 150, height: 83, margin: "12px 0 0 6px" }}>
                {sealUrl && (
                  // eslint-disable-next-line @next/next/no-img-element -- generated data URL
                  <img src={sealUrl} alt={`${spec.kind} seal`} style={{ width: "100%", height: "100%" }} />
                )}
              </div>
            )}
          </div>
          <div style={{ flex: 1 }}>
            <Row k="Subtotal" v={money(t.subtotal)} />
            <Row k="Delivery charge" v={money(inv.delivery)} />
            <Row k={t.discountLabel} v={t.discountTotal ? `– ${money(t.discountTotal)}` : money(0)} />
            {t.couponTotal ? <Row k={t.couponLabel} v={`– ${money(t.couponTotal)}`} /> : null}
            {t.charges.map((c, i) => (
              <Row key={i} k={c.label} v={money(c.amount)} />
            ))}
            <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 8px", margin: "4px 0", background: AQ.sage, borderRadius: 6, ...display, fontSize: 13, color: AQ.ink }}>
              <span>Grand Total</span>
              <span>{money(t.grandTotal)}</span>
            </div>
            <Row k="Paid" v={`– ${money(t.paid)}`} />
            <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 8px", marginTop: 2, borderTop: `0.8px solid ${AQ.line}`, color: T.ink }}>
              <span style={{ fontSize: 9, fontWeight: 700 }}>{t.due < 0 ? "Credit / change" : "Balance due"}</span>
              <span style={{ fontSize: 10, fontWeight: 800 }}>{bdt(Math.abs(t.due))}</span>
            </div>
            <div style={{ width: 180, height: 115, margin: "12px auto 0" }}>
              {signUrl && (
                // eslint-disable-next-line @next/next/no-img-element -- generated data URL
                <img src={signUrl} alt={`Signed by ${SIGNATORY.name}, ${SIGNATORY.title}, with the ${shop.name} seal`} style={{ width: "100%", height: "100%" }} />
              )}
            </div>
          </div>
        </div>

        {/* footer */}
        <div style={{ position: "absolute", left: 40, right: 40, bottom: 44 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
            <div>
              <div style={{ ...italic, fontSize: 14, color: AQ.blue }}>{shop.thankYou}</div>
              {shop.terms && <div style={{ fontSize: 7, color: T.muted, marginTop: 3, maxWidth: 300, lineHeight: 1.4 }}>{shop.terms}</div>}
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 4, fontSize: 8.5, fontWeight: 800, color: AQ.ink }}>
                <svg width={10} height={10} viewBox="0 0 20 20" aria-hidden>
                  <circle cx="10" cy="10" r="10" fill={T.leafDeep} />
                  <path d="M5.5 10.5 L8.6 13.4 L14.5 7" stroke={T.white} strokeWidth={2.2} fill="none" />
                </svg>
                Electronically issued receipt
              </div>
              <div style={{ fontSize: 7, color: T.muted, marginTop: 2 }}>Signed and sealed by the authorised signatory.</div>
            </div>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 12, fontSize: 6.8, color: T.faint }}>
            <span>
              {shop.name} · Receipt {inv.number} · Issued {fmtDate(inv.date)}
            </span>
            <span>Page 1 of 1</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function KV({ k, v }: { k: string; v: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4.5, fontSize: 8.5 }}>
      <span style={{ color: T.muted }}>{k}</span>
      <span style={{ color: T.ink, fontWeight: 700 }}>{v}</span>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "5px 8px", fontSize: 9 }}>
      <span style={{ color: T.muted }}>{k}</span>
      <span style={{ color: T.ink, fontWeight: 700 }}>{v}</span>
    </div>
  );
}

function SumRow({ k, v }: { k: string; v: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", paddingTop: 4, marginTop: 3, borderTop: `0.5px solid ${AQ.line}`, fontSize: 8.5 }}>
      <span style={{ color: T.muted }}>{k}</span>
      <span style={{ color: T.ink, fontWeight: 700 }}>{v}</span>
    </div>
  );
}
