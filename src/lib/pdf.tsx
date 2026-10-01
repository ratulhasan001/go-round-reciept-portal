"use client";

import { Circle, Document, Font, Image, Page, Path, StyleSheet, Svg, Text, View, pdf } from "@react-pdf/renderer";
import type { Invoice, Shop } from "./types";
import { amountInWords, bdt, computeTotals, courierName, filledItems, fmtDate, lineAmount, money } from "./calc";
import { STATUS_LABEL, T, WAVE_BACK, WAVE_FRONT, initials, logoUrl } from "./theme";
import { drawSeal, drawSignature, sealFor } from "./seal";
import { WATERMARK_OPACITY, makeWatermark } from "./watermark";

type Style = Parameters<typeof StyleSheet.create>[0][string];

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
  // the receipt fonts have no emoji, so draw them as images (e.g. a 🎉 in the notes); skipped quietly when offline
  Font.registerEmojiSource({ format: "png", url: "https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/72x72/" });
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
  seal: { width: 150, height: 83, alignSelf: "flex-start", marginTop: 12, marginLeft: 6 },
  sign: { width: 180, height: 115, alignSelf: "center", marginTop: 12 },
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

/**
 * Tighter layouts, tried in turn until the receipt fits on one A4 page.
 * The last level lets the lower block break across pages, for receipts too long for any single page.
 */
const FIT = [
  {},
  {
    page: { paddingTop: 44, paddingBottom: 108 },
    rule: { marginTop: 14, marginBottom: 14 },
    table: { marginTop: 16 },
    tr: { paddingVertical: 6 },
    lower: { marginTop: 14 },
    words: { marginBottom: 10 },
    seal: { width: 130, height: 72, marginTop: 8 },
    sign: { width: 150, height: 96, marginTop: 6 },
  },
  {
    page: { paddingTop: 40, paddingBottom: 104 },
    logo: { width: 56, height: 56 },
    rule: { marginTop: 10, marginBottom: 10 },
    table: { marginTop: 12 },
    tr: { paddingVertical: 4 },
    lower: { marginTop: 10 },
    words: { marginBottom: 8, padding: 8 },
    seal: { width: 110, height: 61, marginTop: 6 },
    sign: { width: 125, height: 80, marginTop: 4 },
  },
  {
    page: { paddingTop: 36, paddingBottom: 102 },
    logo: { width: 48, height: 48 },
    rule: { marginTop: 8, marginBottom: 8 },
    kv: { marginBottom: 2.5 },
    sumCard: { padding: 9 },
    table: { marginTop: 10 },
    th: { paddingVertical: 5 },
    tr: { paddingVertical: 3 },
    td: { fontSize: 8.2 },
    lower: { marginTop: 8 },
    words: { marginBottom: 6, padding: 7 },
    payRow: { paddingVertical: 3 },
    totRow: { paddingVertical: 3 },
    grand: { paddingVertical: 5, marginVertical: 2 },
    balRow: { paddingVertical: 4 },
    seal: { width: 96, height: 53, marginTop: 4 },
    sign: { width: 105, height: 67, marginTop: 2 },
  },
  {
    page: { paddingTop: 32, paddingBottom: 100 },
    logo: { width: 42, height: 42 },
    rule: { marginTop: 6, marginBottom: 6 },
    kv: { marginBottom: 1.5 },
    sumCard: { padding: 7 },
    table: { marginTop: 8 },
    th: { paddingVertical: 4 },
    tr: { paddingVertical: 1.5 },
    td: { fontSize: 7.6 },
    lower: { marginTop: 6 },
    words: { marginBottom: 4, padding: 6 },
    payRow: { paddingVertical: 2 },
    totRow: { paddingVertical: 2 },
    grand: { paddingVertical: 4, marginVertical: 2 },
    balRow: { paddingVertical: 3 },
    seal: { width: 84, height: 46, marginTop: 2 },
    sign: { width: 90, height: 58, marginTop: 0 },
  },
] satisfies Partial<Record<keyof typeof s, Style>>[];
const LAST_FIT = FIT.length; // FIT.length itself = tightest layout, allowed to run onto a second page

export function ReceiptDocument({
  inv, shop, seal, sign, watermark, fit = 0, onPages,
}: {
  inv: Invoice;
  shop: Shop;
  seal?: string;
  sign?: string;
  watermark?: string | null;
  fit?: number;
  onPages?: (n: number) => void;
}) {
  const f: Partial<Record<keyof typeof s, Style>> = FIT[Math.min(fit, FIT.length - 1)];
  const t = computeTotals(inv);
  const items = filledItems(inv);
  const payments = inv.payments.filter((p) => p.amount);
  const st = T.status[t.status];
  const contact = [shop.address, [shop.phone, shop.email].filter(Boolean).join("  ·  "), shop.website].filter(Boolean);
  const logo = logoUrl(shop.logo);

  return (
    <Document title={`Invoice ${inv.number}`} author={shop.name} subject={`Invoice for ${inv.customer.name}`} creator={shop.name}>
      <Page size="A4" orientation="portrait" style={[s.page, f.page ?? {}]}>
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
              <Image src={logo} style={[s.logo, f.logo ?? {}]} />
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

        <View style={[s.rule, f.rule ?? {}]}>
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
            <KV style={f.kv} k="Invoice date" v={fmtDate(inv.date)} />
            <KV style={f.kv} k="Last payment" v={fmtDate(t.lastPayment)} />
            <KV style={f.kv} k="Items" v={String(items.length)} />
            {inv.extras?.enabled && <KV style={f.kv} k="Payment via" v={inv.extras.payVia} />}
            {inv.extras?.enabled && inv.extras.courier !== "None" && <KV style={f.kv} k="Courier" v={courierName(inv.extras)} />}
          </View>
          <View style={[s.sumCard, f.sumCard ?? {}]}>
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
        <View style={[s.table, f.table ?? {}]}>
          <View style={[s.th, f.th ?? {}]} fixed>
            <Text style={[s.thTxt, s.cSl]}>#</Text>
            <Text style={[s.thTxt, s.cDesc]}>DESCRIPTION</Text>
            <Text style={[s.thTxt, s.cRate]}>UNIT PRICE</Text>
            <Text style={[s.thTxt, s.cQty]}>QTY</Text>
            <Text style={[s.thTxt, s.cAmt]}>AMOUNT (BDT)</Text>
          </View>
          {items.map((it, i) => (
            <View key={it.id} style={[s.tr, f.tr ?? {}]} wrap={false}>
              <Text style={[s.td, f.td ?? {}, s.cSl, { color: T.faint }]}>{String(i + 1).padStart(2, "0")}</Text>
              <Text style={[s.td, f.td ?? {}, s.cDesc, { fontWeight: 700 }]}>{it.description}</Text>
              <Text style={[s.td, f.td ?? {}, s.cRate]}>{money(it.price)}</Text>
              <Text style={[s.td, f.td ?? {}, s.cQty]}>{it.qty}</Text>
              <Text style={[s.td, f.td ?? {}, s.cAmt, { fontWeight: 800 }]}>{money(lineAmount(it))}</Text>
            </View>
          ))}
        </View>

        {/* words / payments + totals */}
        <View style={[s.lower, f.lower ?? {}]} wrap={fit >= LAST_FIT}>
          <View style={{ flex: 1.25 }}>
            <View style={[s.words, f.words ?? {}]}>
              <Text style={[s.label, { color: T.aquaDeep }]}>AMOUNT IN WORDS</Text>
              <Text style={s.wordsTxt}>{amountInWords(t.grandTotal)}</Text>
            </View>
            {payments.length > 0 && (
              <View style={{ marginBottom: 12 }}>
                <Text style={s.label}>PAYMENT HISTORY</Text>
                {payments.map((p) => (
                  <View key={p.id} style={[s.payRow, f.payRow ?? {}]}>
                    <Text style={{ width: "28%", fontSize: 8.2 }}>{fmtDate(p.date)}</Text>
                    <Text style={{ width: "22%", fontSize: 8.2, fontWeight: 800, color: T.ink }}>{p.method}</Text>
                    <Text style={{ width: "28%", fontSize: 8.2, color: T.muted }}>{[p.advance && "Advance", p.note].filter(Boolean).join(" · ")}</Text>
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
              <Image src={seal} style={[s.seal, f.seal ?? {}]} />
            ) : null}
          </View>
          <View style={{ flex: 1 }}>
            <Row style={f.totRow} k="Subtotal" v={money(t.subtotal)} />
            <Row style={f.totRow} k="Delivery charge" v={money(inv.delivery)} />
            <Row style={f.totRow} k={t.discountLabel} v={t.discountTotal ? `– ${money(t.discountTotal)}` : money(0)} />
            {t.couponTotal ? <Row style={f.totRow} k={t.couponLabel} v={`– ${money(t.couponTotal)}`} /> : null}
            {t.charges.map((c, i) => (
              <Row key={i} style={f.totRow} k={c.label} v={money(c.amount)} />
            ))}
            <View style={[s.grand, f.grand ?? {}]}>
              <Text style={s.grandTxt}>Grand Total</Text>
              <Text style={s.grandTxt}>{money(t.grandTotal)}</Text>
            </View>
            <Row style={f.totRow} k="Paid" v={`– ${money(t.paid)}`} />
            <View style={[s.balRow, f.balRow ?? {}]}>
              <Text style={s.balK}>{t.due < 0 ? "Credit / change" : "Balance due"}</Text>
              <Text style={s.balV}>{bdt(Math.abs(t.due))}</Text>
            </View>
            {sign ? (
              // eslint-disable-next-line jsx-a11y/alt-text -- react-pdf Image has no alt
              <Image src={sign} style={[s.sign, f.sign ?? {}]} />
            ) : null}

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
              <Text style={s.verifySub}>Signed and sealed by the authorised signatory.</Text>
            </View>
          </View>
          <View style={s.footBottom}>
            <Text style={s.tiny}>
              {shop.name} · Receipt {inv.number} · Issued {fmtDate(inv.date)}
            </Text>
            <Text style={s.tiny} render={({ pageNumber, totalPages }) => {
                onPages?.(totalPages);
                return `Page ${pageNumber} of ${totalPages}`;
              }}
            />
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

function KV({ k, v, style }: { k: string; v: string; style?: Style }) {
  return (
    <View style={[s.kv, style ?? {}]}>
      <Text style={s.kvK}>{k}</Text>
      <Text style={s.kvV}>{v}</Text>
    </View>
  );
}

function Row({ k, v, style }: { k: string; v: string; style?: Style }) {
  return (
    <View style={[s.totRow, style ?? {}]}>
      <Text style={s.totK}>{k}</Text>
      <Text style={s.totV}>{v}</Text>
    </View>
  );
}

export async function renderPdfBlob(inv: Invoice, shop: Shop) {
  registerFonts();
  const spec = sealFor(inv, shop);
  const [seal, sign, watermark] = await Promise.all([
    spec ? drawSeal(spec) : undefined,
    drawSignature(shop),
    shop.watermark ? makeWatermark(shop.logo) : null,
  ]);
  // keep it to one page: re-render tighter until it fits
  for (let fit = 0; ; fit++) {
    let pages = 1;
    const blob = await pdf(
      <ReceiptDocument inv={inv} shop={shop} seal={seal} sign={sign} watermark={watermark} fit={fit} onPages={(n) => (pages = n)} />,
    ).toBlob();
    if (pages <= 1 || fit >= LAST_FIT) return blob;
  }
}
