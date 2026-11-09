"use client";

import { Document, Image, Page, StyleSheet, Text, View, pdf } from "@react-pdf/renderer";
import type { Shop } from "./types";
import type { Letter } from "./letter";
import { contactLines } from "./letter";
import { fmtDate } from "./calc";
import { T, initials, logoUrl } from "./theme";
import { AQ } from "./aquascape";
import { PdfFishBand, PdfGrassBand } from "./pdfArt";
import { registerFonts } from "./pdf";
import { drawSignature } from "./seal";
import { WATERMARK_OPACITY, makeWatermark } from "./watermark";
import { BASE_SIZE, CELL_LINE_HEIGHT, LINE_HEIGHT, RECEIPT_TABLE, cellAlign, cellText, faceInfo, parseRich, receiptRows, type Block, type Para, type Run, type Table } from "./richtext";

// Same page, header and artwork as the receipt (src/lib/pdf.tsx); mirrored by src/components/LetterheadPreview.tsx.
const s = StyleSheet.create({
  page: { fontFamily: "Manrope", fontSize: 10, color: T.body, backgroundColor: AQ.paper, paddingTop: 54, paddingBottom: 92, paddingHorizontal: 40 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  brand: { flexDirection: "row", alignItems: "center", gap: 14, maxWidth: 360 },
  logo: { width: 68, height: 68, objectFit: "contain" },
  mono: { width: 60, height: 60, borderRadius: 30, borderWidth: 4, borderColor: T.leaf, alignItems: "center", justifyContent: "center" },
  monoTxt: { fontFamily: "Fraunces", fontWeight: 600, fontSize: 20, color: AQ.ink },
  shopName: { fontFamily: "Fraunces", fontWeight: 600, fontSize: 25, color: AQ.ink, letterSpacing: -0.6 },
  tagline: { fontSize: 6.4, color: AQ.muted, fontWeight: 800, letterSpacing: 1.6, marginTop: 2 },
  contact: { fontSize: 8, color: T.muted, marginTop: 5, lineHeight: 1.45 },
  metaK: { fontSize: 6.8, fontWeight: 800, letterSpacing: 1.4, color: AQ.muted, textAlign: "right" },
  metaV: { fontSize: 9.5, fontWeight: 700, color: AQ.ink, textAlign: "right", marginBottom: 6 },
  rule: { flexDirection: "row", alignItems: "center", marginTop: 20, marginBottom: 26, height: 2 },
  label: { fontSize: 7, fontWeight: 800, letterSpacing: 1.6, color: T.muted, marginBottom: 5 },
  to: { fontSize: 10, color: AQ.ink, lineHeight: 1.5 },
  subject: { fontFamily: "Fraunces", fontWeight: 600, fontSize: 13, color: AQ.ink, marginTop: 20 },
  body: { marginTop: 16 },
  para: { fontSize: BASE_SIZE, color: T.body, lineHeight: LINE_HEIGHT },
  sign: { width: 180, height: 115, marginTop: 18, alignSelf: "flex-end", marginRight: -8 },
  watermark: { position: "absolute", width: 380, height: 380, left: 107.6, top: 250, objectFit: "contain", opacity: WATERMARK_OPACITY },
  footer: { position: "absolute", left: 40, right: 40, bottom: 44, flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", gap: 20 },
  footL: { fontSize: 6.8, color: T.faint, lineHeight: 1.4, flex: 1 },
  footR: { fontSize: 6.8, color: T.faint },
});

export function LetterDocument({ letter, shop, sign, watermark }: { letter: Letter; shop: Shop; sign?: string; watermark?: string | null }) {
  const logo = logoUrl(shop.logo);
  const contact = contactLines(shop);
  const to = letter.to.trim();
  return (
    <Document title={letter.subject || `${shop.name} letterhead`} author={shop.name} creator={shop.name}>
      <Page size="A4" orientation="portrait" style={s.page}>
        {watermark ? (
          // eslint-disable-next-line jsx-a11y/alt-text -- react-pdf Image has no alt
          <Image src={watermark} style={s.watermark} fixed />
        ) : null}
        <PdfFishBand />
        <PdfGrassBand />

        {/* header, as on the receipt */}
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
              {shop.tagline ? <Text style={s.tagline}>{shop.tagline.toUpperCase()}</Text> : null}
              {contact.length > 0 && <Text style={s.contact}>{contact.join("\n")}</Text>}
            </View>
          </View>
          <View>
            {letter.ref.trim() ? (
              <>
                <Text style={s.metaK}>REF.</Text>
                <Text style={s.metaV}>{letter.ref.trim()}</Text>
              </>
            ) : null}
            {letter.date ? (
              <>
                <Text style={s.metaK}>DATE</Text>
                <Text style={s.metaV}>{fmtDate(letter.date)}</Text>
              </>
            ) : null}
          </View>
        </View>

        <View style={s.rule}>
          <View style={{ width: 36, height: 1.6, backgroundColor: AQ.green, borderRadius: 1 }} />
          <View style={{ flex: 1, height: 0.6, backgroundColor: AQ.line, marginLeft: 4 }} />
        </View>

        {to ? (
          <View wrap={false}>
            <Text style={s.label}>TO</Text>
            <Text style={s.to}>{to}</Text>
          </View>
        ) : null}
        {letter.subject.trim() ? <Text style={s.subject}>Subject: {letter.subject.trim()}</Text> : null}
        <RichBody blocks={parseRich(letter.body)} />
        {sign ? (
          <View wrap={false}>
            {/* eslint-disable-next-line jsx-a11y/alt-text -- react-pdf Image has no alt */}
            <Image src={sign} style={s.sign} />
          </View>
        ) : null}

        <View style={s.footer} fixed>
          <Text style={s.footL}>{[shop.name, ...contact].join("  ·  ")}</Text>
          <Text style={s.footR} render={({ pageNumber, totalPages }) => (totalPages > 1 ? `Page ${pageNumber} of ${totalPages}` : "")} />
        </View>
      </Page>
    </Document>
  );
}

export async function renderLetterBlob(letter: Letter, shop: Shop) {
  registerFonts();
  const [sign, watermark] = await Promise.all([letter.signed ? drawSignature(shop) : undefined, shop.watermark ? makeWatermark(shop.logo) : null]);
  return pdf(<LetterDocument letter={letter} shop={shop} sign={sign} watermark={watermark} />).toBlob();
}

const runStyle = (r: Run) => ({
  fontFamily: (r.face ?? "sans") === "sans" && r.i ? "SansItalic" : faceInfo(r.face).pdf,
  fontWeight: r.b ? 700 : 400,
  fontStyle: r.i ? ("italic" as const) : ("normal" as const),
  fontSize: r.size ?? BASE_SIZE,
  ...(r.color ? { color: r.color } : {}),
  ...(r.bg ? { backgroundColor: r.bg } : {}),
  ...(r.u || r.s ? { textDecoration: [r.u && "underline", r.s && "line-through"].filter(Boolean).join(" ") as "underline" } : {}),
});

function PdfPara({ p, inCell }: { p: Para; inCell?: boolean }) {
  const size = Math.max(inCell ? 1 : BASE_SIZE, ...p.runs.map((r) => r.size ?? BASE_SIZE));
  const lh = { lineHeight: p.lh ?? (inCell ? CELL_LINE_HEIGHT : LINE_HEIGHT) };
  const gap = p.after ? { marginBottom: p.after } : {};
  const text = (
    <Text style={[s.para, { textAlign: p.align, fontSize: size }, lh, p.kind !== "p" ? { flex: 1 } : gap]}>
      {p.runs.length ? p.runs.map((r, j) => <Text key={j} style={runStyle(r)}>{r.text}</Text>) : " "}
    </Text>
  );
  if (p.kind === "p") return text;
  return (
    <View style={[{ flexDirection: "row", paddingLeft: inCell ? 0 : 6 }, gap]} wrap={false}>
      <Text style={[s.para, { width: 14, fontSize: size }, lh]}>{p.kind === "bullet" ? "\u2022" : `${p.n}.`}</Text>
      {text}
    </View>
  );
}

/** The formatted letter body: paragraphs, lists with a hanging marker, tables and lines. */
function RichBody({ blocks }: { blocks: Block[] }) {
  if (!blocks.length) return null;
  return (
    <View style={s.body}>
      {blocks.map((b, i) => {
        if (b.kind === "hr") return <View key={i} style={{ height: 0.8, backgroundColor: AQ.line, marginVertical: 8 }} />;
        if (b.kind === "table" && b.look === "receipt") return <PdfReceiptTable key={i} t={b} />;
        if (b.kind === "table")
          return (
            <View key={i} style={{ marginVertical: 6, borderTopWidth: 0.6, borderLeftWidth: 0.6, borderColor: AQ.ink }}>
              {b.rows.map((row, r) => (
                <View key={r} style={{ flexDirection: "row" }} wrap={false}>
                  {row.map((cell, c) => (
                    <View
                      key={c}
                      style={{ ...(b.widths ? { width: `${b.widths[c]! * 100}%` } : { flex: 1 }), padding: 5, borderRightWidth: 0.6, borderBottomWidth: 0.6, borderColor: AQ.ink, backgroundColor: cell.head ? AQ.sage : undefined }}
                    >
                      {cell.paras.length ? (
                        cell.paras.map((p, k) => <PdfPara key={k} p={cell.head ? { ...p, runs: p.runs.map((x) => ({ ...x, b: true })) } : p} inCell />)
                      ) : (
                        <Text style={s.para}> </Text>
                      )}
                    </View>
                  ))}
                </View>
              ))}
            </View>
          );
        return <PdfPara key={i} p={b} />;
      })}
    </View>
  );
}

/** A product table drawn like the receipt's items table (same sizes as src/lib/pdf.tsx). */
function PdfReceiptTable({ t }: { t: Table }) {
  const w = (c: number) => (t.widths ? { width: `${t.widths[c]! * 100}%` } : { flex: 1 });
  return (
    <View style={{ marginVertical: 6 }}>
      {receiptRows(t).map(({ kind, cells }, r) => (
        <View
          key={r}
          wrap={false}
          style={
            kind === "item"
              ? { flexDirection: "row", alignItems: "center", paddingVertical: 8, paddingHorizontal: 8, borderBottomWidth: 0.6, borderBottomColor: AQ.line }
              : { flexDirection: "row", alignItems: "center", paddingVertical: kind === "head" ? 7 : 8, paddingHorizontal: 8, marginTop: kind === "total" ? 4 : 0, backgroundColor: AQ.sage, borderRadius: 6 }
          }
        >
          {cells.map((c, k) => (
            <View key={k} style={[w(k), k === 1 ? { paddingRight: 8 } : {}]}>
              {kind === "head" ? (
                <Text style={{ fontSize: RECEIPT_TABLE.head, fontWeight: 800, letterSpacing: 1.2, color: AQ.ink, textAlign: cellAlign(c) }}>{cellText(c)}</Text>
              ) : kind === "total" ? (
                <Text style={{ fontFamily: "Fraunces", fontWeight: 600, fontSize: RECEIPT_TABLE.total, color: AQ.ink, textAlign: cellAlign(c) }}>{cellText(c)}</Text>
              ) : c.paras.length ? (
                c.paras.map((p, j) => <PdfPara key={j} p={{ ...p, runs: p.runs.map((x) => ({ ...x, size: x.size ?? RECEIPT_TABLE.item, color: x.color ?? T.ink })) }} inCell />)
              ) : (
                <Text style={s.para}> </Text>
              )}
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}
