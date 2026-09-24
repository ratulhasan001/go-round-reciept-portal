"use client";

import { Circle, Document, Font, Image, Page, Path, StyleSheet, Svg, Text, View, pdf } from "@react-pdf/renderer";
import type { Invoice, Shop } from "./types";
import { amountInWords, bdt, computeTotals, courierName, filledItems, fmtDate, lineAmount, money } from "./calc";
import { STATUS_LABEL, T, WAVE_BACK, WAVE_FRONT, initials, logoUrl } from "./theme";
import { drawSeal, sealFor } from "./seal";
import { WATERMARK_OPACITY, makeWatermark } from "./watermark";

let fontsReady = false;
function registerFonts() {
  if (fontsReady) return;
  const base = `${window.location.origin}/fonts`;
  Font.register({
    family: "Manrope",
    fonts: [400, 500, 600, 700, 800].map((w) => ({ src: `${base}/Manrope-${w}.ttf`, fontWeight: w })),
  });
  Font.register({
    family: "Bricolage",
    fonts: [500, 700, 800].map((w) => ({ src: `${base}/Bricolage-${w}.ttf`, fontWeight: w })),
  });
  Font.registerHyphenationCallback((w) => [w]);
  fontsReady = true;
}

// top edge: water hanging from the top of the page
const TOP_BACK = "M0 0 H595 V24 C 500 38, 410 10, 300 24 S 110 40, 0 22 Z";
const TOP_FRONT = "M0 0 H595 V12 C 485 26, 380 0, 290 14 S 95 26, 0 10 Z";

const s = StyleSheet.create({
  page: { fontFamily: "Manrope", fontSize: 9, color: T.body, paddingTop: 52, paddingBottom: 118, paddingHorizontal: 40 },
  topWave: { position: "absolute", top: 0, left: 0 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  brand: { flexDirection: "row", alignItems: "center", gap: 14, maxWidth: 330 },
  logo: { width: 68, height: 68, objectFit: "contain" },
  mono: { width: 60, height: 60, borderRadius: 30, borderWidth: 4, borderColor: T.leaf, alignItems: "center", justifyContent: "center" },
  monoTxt: { fontFamily: "Bricolage", fontWeight: 800, fontSize: 20, color: T.ink },
  shopName: { fontFamily: "Bricolage", fontWeight: 800, fontSize: 23, color: T.ink, letterSpacing: -0.4 },
  tagline: { fontSize: 8.5, color: T.leafDeep, fontWeight: 700, marginTop: 1 },
  contact: { fontSize: 8, color: T.muted, marginTop: 5, lineHeight: 1.45 },
  title: { fontFamily: "Bricolage", fontWeight: 800, fontSize: 30, color: T.ink, letterSpacing: 1, textAlign: "right" },
  invNo: { fontSize: 10, fontWeight: 800, color: T.aquaDeep, textAlign: "right", marginTop: 1 },
  pill: { alignSelf: "flex-end", marginTop: 7, paddingHorizontal: 9, paddingVertical: 3, borderRadius: 9, fontSize: 7.5, fontWeight: 800, letterSpacing: 0.8 },
  rule: { flexDirection: "row", marginTop: 20, marginBottom: 20, height: 2 },
  label: { fontSize: 7, fontWeight: 800, letterSpacing: 1.6, color: T.muted, marginBottom: 6 },
  billName: { fontFamily: "Bricolage", fontWeight: 700, fontSize: 13.5, color: T.ink, marginBottom: 3 },
  small: { fontSize: 8.5, color: T.body, lineHeight: 1.45 },
  kv: { flexDirection: "row", justifyContent: "space-between", marginBottom: 4.5 },
  kvK: { fontSize: 8.5, color: T.muted },
  kvV: { fontSize: 8.5, color: T.ink, fontWeight: 700 },
  sumCard: { flex: 1.15, borderWidth: 0.8, borderColor: T.line, borderRadius: 8, padding: 12, backgroundColor: "#FAFCFA" },
  sumAmt: { fontFamily: "Bricolage", fontWeight: 800, fontSize: 17, color: T.ink, letterSpacing: -0.3, marginBottom: 8 },
  sumRow: { flexDirection: "row", justifyContent: "space-between", paddingTop: 4, borderTopWidth: 0.5, borderTopColor: T.line, marginTop: 3 },
  table: { marginTop: 24 },
  th: { flexDirection: "row", backgroundColor: T.leafSoft, borderRadius: 6, paddingVertical: 7, paddingHorizontal: 8 },
  thTxt: { fontSize: 7, fontWeight: 800, letterSpacing: 1.2, color: T.leafDeep },
  tr: { flexDirection: "row", paddingVertical: 8, paddingHorizontal: 8, borderBottomWidth: 0.6, borderBottomColor: T.line, alignItems: "center" },
  td: { fontSize: 9, color: T.ink },
  cSl: { width: "7%" },
  cDesc: { width: "47%", paddingRight: 8 },
  cRate: { width: "16%", textAlign: "right" },
  cQty: { width: "10%", textAlign: "center" },
  cAmt: { width: "20%", textAlign: "right" },
  lower: { flexDirection: "row", gap: 26, marginTop: 20 },
  words: { backgroundColor: T.aquaSoft, borderRadius: 6, padding: 10, marginBottom: 14, borderLeftWidth: 3, borderLeftColor: T.aqua },
  wordsTxt: { fontSize: 8.5, color: T.ink, fontWeight: 700, lineHeight: 1.4 },
  payRow: { flexDirection: "row", paddingVertical: 4.5, borderBottomWidth: 0.5, borderBottomColor: T.line },
  totRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 5, paddingHorizontal: 8 },
  totK: { fontSize: 9, color: T.muted },
  totV: { fontSize: 9, color: T.ink, fontWeight: 700 },
  grand: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 8, paddingHorizontal: 8, marginVertical: 4, backgroundColor: T.leafSoft, borderRadius: 6 },
  grandTxt: { fontFamily: "Bricolage", fontWeight: 700, fontSize: 12.5, color: T.ink },
  balRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 6, paddingHorizontal: 8, marginTop: 2, borderTopWidth: 0.8, borderTopColor: T.line },
  balK: { fontSize: 9, fontWeight: 700, color: T.ink },
  balV: { fontSize: 10, fontWeight: 800, color: T.ink },
  seal: { width: 108, height: 108, alignSelf: "flex-start", marginTop: 12, marginLeft: 6 },
  watermark: { position: "absolute", width: 380, height: 380, left: 107.6, top: 250, objectFit: "contain", opacity: WATERMARK_OPACITY },
  footer: { position: "absolute", left: 40, right: 40, bottom: 44 },
  footTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end" },
  thanks: { fontFamily: "Bricolage", fontWeight: 700, fontSize: 13, color: T.leafDeep },
  terms: { fontSize: 7, color: T.muted, marginTop: 3, maxWidth: 300, lineHeight: 1.4 },
  verify: { alignItems: "flex-end" },
  verifyTop: { flexDirection: "row", alignItems: "center", gap: 4 },
  verifyK: { fontSize: 8.5, fontWeight: 800, color: T.leafDeep },
  verifySub: { fontSize: 7, color: T.muted, marginTop: 2 },
  footBottom: { flexDirection: "row", justifyContent: "space-between", marginTop: 12 },
  tiny: { fontSize: 6.8, color: T.faint },
  botWave: { position: "absolute", bottom: 0, left: 0 },
});

export function ReceiptDocument({ inv, shop, seal, watermark }: { inv: Invoice; shop: Shop; seal?: string; watermark?: string | null }) {
  const t = computeTotals(inv);
  const items = filledItems(inv);
  const payments = inv.payments.filter((p) => p.amount);
  const st = T.status[t.status];
  const contact = [shop.address, [shop.phone, shop.email].filter(Boolean).join("  ·  "), shop.website].filter(Boolean);
  const logo = logoUrl(shop.logo);

  return (
    <Document title={`Invoice ${inv.number}`} author={shop.name} subject={`Invoice for ${inv.customer.name}`} creator={shop.name}>
      <Page size="A4" orientation="portrait" style={s.page}>
        {watermark ? (
          // eslint-disable-next-line jsx-a11y/alt-text -- react-pdf Image has no alt
          <Image src={watermark} style={s.watermark} fixed />
        ) : null}
        <Svg width={595} height={42} viewBox="0 0 595 42" style={s.topWave} fixed>
          <Path d={TOP_BACK} fill={T.aqua} fillOpacity={0.28} />
          <Path d={TOP_FRONT} fill={T.aqua} />
        </Svg>

        {/* header */}
        <View style={s.header}>
          <View style={s.brand}>
            {logo ? (
              // eslint-disable-next-line jsx-a11y/alt-text -- react-pdf Image has no alt
              <Image src={logo} style={s.logo} />
            ) : (
              <View style={s.mono}>
                <Text style={s.monoTxt}>{initials(shop.name)}</Text>
              </View>
            )}
            <View>
              <Text style={s.shopName}>{shop.name}</Text>
              {shop.tagline ? <Text style={s.tagline}>{shop.tagline}</Text> : null}
              {contact.length > 0 && <Text style={s.contact}>{contact.join("\n")}</Text>}
            </View>
          </View>
          <View>
            <Text style={s.title}>INVOICE</Text>
            <Text style={s.invNo}>No. {inv.number}</Text>
            <Text style={[s.pill, { backgroundColor: st.bg, color: st.fg }]}>{STATUS_LABEL[t.status].toUpperCase()}</Text>
          </View>
        </View>

        <View style={s.rule}>
          <View style={{ flex: 3, backgroundColor: T.leaf, borderRadius: 1 }} />
          <View style={{ flex: 1, backgroundColor: T.aqua, borderRadius: 1, marginLeft: 3 }} />
        </View>

        {/* meta */}
        <View style={{ flexDirection: "row", gap: 16 }}>
          <View style={{ flex: 1.3 }}>
            <Text style={s.label}>BILLED TO</Text>
            <Text style={s.billName}>{inv.customer.name || "—"}</Text>
            {inv.customer.phone ? <Text style={s.small}>{inv.customer.phone}</Text> : null}
            {inv.customer.address ? <Text style={s.small}>{inv.customer.address}</Text> : null}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.label}>DETAILS</Text>
            <KV k="Invoice date" v={fmtDate(inv.date)} />
            <KV k="Last payment" v={fmtDate(t.lastPayment)} />
            <KV k="Items" v={String(items.length)} />
            {inv.extras?.enabled && <KV k="Payment via" v={inv.extras.payVia} />}
            {inv.extras?.enabled && inv.extras.courier !== "None" && <KV k="Courier" v={courierName(inv.extras)} />}
          </View>
          <View style={s.sumCard}>
            <Text style={s.label}>INVOICE TOTAL</Text>
            <Text style={s.sumAmt}>{bdt(t.grandTotal)}</Text>
            <View style={s.sumRow}>
              <Text style={s.kvK}>Paid</Text>
              <Text style={s.kvV}>{money(t.paid)}</Text>
            </View>
            <View style={s.sumRow}>
              <Text style={s.kvK}>{t.due < 0 ? "Credit" : "Balance due"}</Text>
              <Text style={s.kvV}>{money(Math.abs(t.due))}</Text>
            </View>
          </View>
        </View>

        {/* items */}
        <View style={s.table}>
          <View style={s.th} fixed>
            <Text style={[s.thTxt, s.cSl]}>#</Text>
            <Text style={[s.thTxt, s.cDesc]}>DESCRIPTION</Text>
            <Text style={[s.thTxt, s.cRate]}>UNIT PRICE</Text>
            <Text style={[s.thTxt, s.cQty]}>QTY</Text>
            <Text style={[s.thTxt, s.cAmt]}>AMOUNT (BDT)</Text>
          </View>
          {items.map((it, i) => (
            <View key={it.id} style={s.tr} wrap={false}>
              <Text style={[s.td, s.cSl, { color: T.faint }]}>{String(i + 1).padStart(2, "0")}</Text>
              <Text style={[s.td, s.cDesc, { fontWeight: 700 }]}>{it.description}</Text>
              <Text style={[s.td, s.cRate]}>{money(it.price)}</Text>
              <Text style={[s.td, s.cQty]}>{it.qty}</Text>
              <Text style={[s.td, s.cAmt, { fontWeight: 800 }]}>{money(lineAmount(it))}</Text>
            </View>
          ))}
        </View>

        {/* words / payments + totals */}
        <View style={s.lower} wrap={false}>
          <View style={{ flex: 1.25 }}>
            <View style={s.words}>
              <Text style={[s.label, { color: T.aquaDeep }]}>AMOUNT IN WORDS</Text>
              <Text style={s.wordsTxt}>{amountInWords(t.grandTotal)}</Text>
            </View>
            {payments.length > 0 && (
              <View style={{ marginBottom: 12 }}>
                <Text style={s.label}>PAYMENT HISTORY</Text>
                {payments.map((p) => (
                  <View key={p.id} style={s.payRow}>
                    <Text style={{ width: "28%", fontSize: 8.2 }}>{fmtDate(p.date)}</Text>
                    <Text style={{ width: "22%", fontSize: 8.2, fontWeight: 800, color: T.ink }}>{p.method}</Text>
                    <Text style={{ width: "28%", fontSize: 8.2, color: T.muted }}>{p.note}</Text>
                    <Text style={{ width: "22%", fontSize: 8.2, textAlign: "right", fontWeight: 800, color: T.ink }}>{money(p.amount)}</Text>
                  </View>
                ))}
              </View>
            )}
            {inv.notes ? (
              <View>
                <Text style={s.label}>NOTES</Text>
                <Text style={s.small}>{inv.notes}</Text>
              </View>
            ) : null}
            {seal ? (
              // eslint-disable-next-line jsx-a11y/alt-text -- react-pdf Image has no alt
              <Image src={seal} style={s.seal} />
            ) : null}
          </View>
          <View style={{ flex: 1 }}>
            <Row k="Subtotal" v={money(t.subtotal)} />
            <Row k="Delivery charge" v={money(inv.delivery)} />
            <Row k={t.discountLabel} v={t.discountTotal ? `– ${money(t.discountTotal)}` : money(0)} />
            {t.couponTotal ? <Row k={t.couponLabel} v={`– ${money(t.couponTotal)}`} /> : null}
            {t.charges.map((c, i) => (
              <Row key={i} k={c.label} v={money(c.amount)} />
            ))}
            <View style={s.grand}>
              <Text style={s.grandTxt}>Grand Total</Text>
              <Text style={s.grandTxt}>{money(t.grandTotal)}</Text>
            </View>
            <Row k="Paid" v={`– ${money(t.paid)}`} />
            <View style={s.balRow}>
              <Text style={s.balK}>{t.due < 0 ? "Credit / change" : "Balance due"}</Text>
              <Text style={s.balV}>{bdt(Math.abs(t.due))}</Text>
            </View>

          </View>
        </View>

        {/* footer on every page */}
        <View style={s.footer} fixed>
          <View style={s.footTop}>
            <View>
              <Text style={s.thanks}>{shop.thankYou}</Text>
              {shop.terms ? <Text style={s.terms}>{shop.terms}</Text> : null}
            </View>
            <View style={s.verify}>
              <View style={s.verifyTop}>
                <Svg width={10} height={10} viewBox="0 0 20 20">
                  <Circle cx="10" cy="10" r="10" fill={T.leafDeep} />
                  <Path d="M5.5 10.5 L8.6 13.4 L14.5 7" stroke={T.white} strokeWidth={2.2} fill="none" />
                </Svg>
                <Text style={s.verifyK}>Electronically issued receipt</Text>
              </View>
              <Text style={s.verifySub}>System-generated and valid without a signature.</Text>
            </View>
          </View>
          <View style={s.footBottom}>
            <Text style={s.tiny}>
              {shop.name} · Receipt {inv.number} · Issued {fmtDate(inv.date)}
            </Text>
            <Text style={s.tiny} render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
          </View>
        </View>
        <Svg width={595} height={40} viewBox="0 0 595 40" style={s.botWave} fixed>
          <Path d={WAVE_BACK} fill={T.leaf} fillOpacity={0.3} />
          <Path d={WAVE_FRONT} fill={T.leaf} />
        </Svg>
      </Page>
    </Document>
  );
}

function KV({ k, v }: { k: string; v: string }) {
  return (
    <View style={s.kv}>
      <Text style={s.kvK}>{k}</Text>
      <Text style={s.kvV}>{v}</Text>
    </View>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <View style={s.totRow}>
      <Text style={s.totK}>{k}</Text>
      <Text style={s.totV}>{v}</Text>
    </View>
  );
}

export async function renderPdfBlob(inv: Invoice, shop: Shop) {
  registerFonts();
  const spec = sealFor(inv, shop);
  const [seal, watermark] = await Promise.all([spec ? drawSeal(spec) : undefined, shop.watermark ? makeWatermark(shop.logo) : null]);
  return pdf(<ReceiptDocument inv={inv} shop={shop} seal={seal} watermark={watermark} />).toBlob();
}
