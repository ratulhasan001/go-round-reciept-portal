"use client";

import { useEffect, useRef, useState } from "react";
import type { Shop } from "@/lib/types";
import type { Letter } from "@/lib/letter";
import { contactLines } from "@/lib/letter";
import { fmtDate } from "@/lib/calc";
import { T, initials } from "@/lib/theme";
import { AQ } from "@/lib/aquascape";
import { SIGNATORY, drawSignature } from "@/lib/seal";
import { WATERMARK_OPACITY, makeWatermark } from "@/lib/watermark";
import { FishBand, GrassBand } from "./AquascapeArt";
import { BASE_SIZE, CELL_LINE_HEIGHT, LINE_HEIGHT, RECEIPT_TABLE, cellAlign, cellText, faceInfo, parseRich, receiptRows, type Block, type Para, type Run, type Table } from "@/lib/richtext";

// Mirrors src/lib/letterPdf.tsx 1:1 - laid out in PDF points (A4 = 595 x 842) and scaled to fit.
const W = 595;
const H = 842;
const serif = { fontFamily: "Fraunces, Georgia, serif", fontWeight: 600 } as const;
const metaK: React.CSSProperties = { fontSize: 6.8, fontWeight: 800, letterSpacing: 1.4, color: AQ.muted };
const metaV: React.CSSProperties = { fontSize: 9.5, fontWeight: 700, color: AQ.ink, marginBottom: 6 };

export default function LetterheadPreview({ letter, shop }: { letter: Letter; shop: Shop }) {
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

  const contact = contactLines(shop);
  const to = letter.to.trim();

  return (
    <div ref={wrap} className="w-full min-w-0 overflow-hidden" style={{ height: pageH * scale }}>
      <div
        ref={page}
        className="relative isolate origin-top-left overflow-hidden rounded-[3px] shadow-[0_24px_60px_-16px_rgba(14,42,35,0.28)] ring-1 ring-black/5"
        style={{ width: W, minHeight: H, transform: `scale(${scale})`, background: AQ.paper, fontFamily: "var(--font-manrope)", fontSize: 10, color: T.body, padding: "54px 40px 92px", lineHeight: 1.25 }}
      >
        {wmUrl && (
          // eslint-disable-next-line @next/next/no-img-element -- generated data URL
          <img src={wmUrl} alt="" aria-hidden style={{ position: "absolute", width: 380, height: 380, left: 107.6, top: 250, objectFit: "contain", opacity: WATERMARK_OPACITY, zIndex: -1, pointerEvents: "none" }} />
        )}
        <FishBand />
        <GrassBand />

        {/* header, as on the receipt */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14, maxWidth: 360 }}>
            {shop.logo ? (
              // eslint-disable-next-line @next/next/no-img-element -- logo may be a user-uploaded data URL
              <img src={shop.logo} alt="" style={{ width: 68, height: 68, objectFit: "contain" }} />
            ) : (
              <div style={{ width: 60, height: 60, borderRadius: 30, border: `4px solid ${T.leaf}`, display: "grid", placeItems: "center", ...serif, fontSize: 20, color: AQ.ink }}>
                {initials(shop.name)}
              </div>
            )}
            <div>
              <div style={{ ...serif, fontSize: 25, color: AQ.ink, letterSpacing: -0.6, lineHeight: 1.1 }}>{shop.name}</div>
              {shop.tagline && <div style={{ fontSize: 6.4, color: AQ.muted, fontWeight: 800, letterSpacing: 1.6, marginTop: 2, textTransform: "uppercase" }}>{shop.tagline}</div>}
              {contact.length > 0 && <div style={{ fontSize: 8, color: T.muted, marginTop: 5, lineHeight: 1.45, whiteSpace: "pre-line" }}>{contact.join("\n")}</div>}
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            {letter.ref.trim() && (
              <>
                <div style={metaK}>REF.</div>
                <div style={metaV}>{letter.ref.trim()}</div>
              </>
            )}
            {letter.date && (
              <>
                <div style={metaK}>DATE</div>
                <div style={metaV}>{fmtDate(letter.date)}</div>
              </>
            )}
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", margin: "20px 0 26px", height: 2, gap: 4 }}>
          <div style={{ width: 36, height: 1.6, background: AQ.green, borderRadius: 1 }} />
          <div style={{ flex: 1, height: 0.6, background: AQ.line }} />
        </div>

        {to && (
          <div>
            <div style={{ fontSize: 7, fontWeight: 800, letterSpacing: 1.6, color: T.muted, marginBottom: 5 }}>TO</div>
            <div style={{ fontSize: 10, color: AQ.ink, lineHeight: 1.5, whiteSpace: "pre-line" }}>{to}</div>
          </div>
        )}
        {letter.subject.trim() && <div style={{ ...serif, fontSize: 13, color: AQ.ink, marginTop: 20 }}>Subject: {letter.subject.trim()}</div>}
        <RichBody blocks={parseRich(letter.body)} />
        {letter.signed && (
          <div style={{ width: 180, height: 115, margin: "18px -8px 0 auto" }}>
            {signUrl && (
              // eslint-disable-next-line @next/next/no-img-element -- generated data URL
              <img src={signUrl} alt={`Signed by ${SIGNATORY.name}, ${SIGNATORY.title}, with the ${shop.name} seal`} style={{ width: "100%", height: "100%" }} />
            )}
          </div>
        )}

        <div style={{ position: "absolute", left: 40, right: 40, bottom: 44, fontSize: 6.8, color: T.faint, lineHeight: 1.4 }}>{[shop.name, ...contact].join("  ·  ")}</div>
      </div>
    </div>
  );
}

const runStyle = (r: Run): React.CSSProperties => ({
  fontFamily: (r.face ?? "sans") === "sans" && r.i ? "SansItalic, var(--font-manrope), sans-serif" : faceInfo(r.face).css,
  fontWeight: r.b ? 700 : 400,
  fontStyle: r.i ? "italic" : "normal",
  fontSize: r.size ?? BASE_SIZE,
  color: r.color,
  background: r.bg,
  textDecoration: [r.u && "underline", r.s && "line-through"].filter(Boolean).join(" ") || undefined,
  whiteSpace: "pre-wrap",
});

function HtmlPara({ p, inCell, bold }: { p: Para; inCell?: boolean; bold?: boolean }) {
  const size = Math.max(inCell ? 1 : BASE_SIZE, ...p.runs.map((r) => r.size ?? BASE_SIZE));
  const lh = p.lh ?? (inCell ? CELL_LINE_HEIGHT : LINE_HEIGHT);
  const box: React.CSSProperties = { fontSize: size, lineHeight: lh, textAlign: p.align, minHeight: `${lh}em` };
  const gap = p.after ? { marginBottom: p.after } : {};
  const runs = p.runs.map((r, j) => (
    <span key={j} style={runStyle(bold ? { ...r, b: true } : r)}>
      {r.text}
    </span>
  ));
  if (p.kind === "p") return <div style={{ ...box, ...gap }}>{runs}</div>;
  return (
    <div style={{ display: "flex", paddingLeft: inCell ? 0 : 6, ...gap }}>
      <span style={{ ...box, width: 14, flexShrink: 0 }}>{p.kind === "bullet" ? "\u2022" : `${p.n}.`}</span>
      <div style={{ ...box, flex: 1 }}>{runs}</div>
    </div>
  );
}

/** The formatted letter body - mirrors RichBody in src/lib/letterPdf.tsx. */
function RichBody({ blocks }: { blocks: Block[] }) {
  if (!blocks.length) return null;
  const line = `0.6px solid ${AQ.ink}`;
  return (
    <div style={{ marginTop: 16, color: T.body }}>
      {blocks.map((b, i) => {
        if (b.kind === "hr") return <div key={i} style={{ height: 0.8, background: AQ.line, margin: "8px 0" }} />;
        if (b.kind === "table" && b.look === "receipt") return <ReceiptTable key={i} t={b} />;
        if (b.kind === "table")
          return (
            <div key={i} style={{ margin: "6px 0", borderTop: line, borderLeft: line }}>
              {b.rows.map((row, r) => (
                <div key={r} style={{ display: "flex" }}>
                  {row.map((cell, c) => (
                    <div key={c} style={{ flex: b.widths ? `0 0 ${b.widths[c]! * 100}%` : 1, minWidth: 0, padding: 5, borderRight: line, borderBottom: line, background: cell.head ? AQ.sage : undefined }}>
                      {cell.paras.length ? cell.paras.map((p, k) => <HtmlPara key={k} p={p} inCell bold={cell.head} />) : <div style={{ fontSize: BASE_SIZE, lineHeight: CELL_LINE_HEIGHT }}>&nbsp;</div>}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          );
        return <HtmlPara key={i} p={b} />;
      })}
    </div>
  );
}

/** A product table drawn like the receipt's items table - mirrors PdfReceiptTable in src/lib/letterPdf.tsx. */
function ReceiptTable({ t }: { t: Table }) {
  const flex = (c: number) => (t.widths ? `0 0 ${t.widths[c]! * 100}%` : 1);
  return (
    <div style={{ margin: "6px 0" }}>
      {receiptRows(t).map(({ kind, cells }, r) => (
        <div
          key={r}
          style={
            kind === "item"
              ? { display: "flex", alignItems: "center", padding: "8px 8px", borderBottom: `0.6px solid ${AQ.line}`, color: T.ink }
              : { display: "flex", alignItems: "center", padding: kind === "head" ? "7px 8px" : "8px 8px", marginTop: kind === "total" ? 4 : 0, background: AQ.sage, borderRadius: 6 }
          }
        >
          {cells.map((c, k) => (
            <div key={k} style={{ flex: flex(k), minWidth: 0, textAlign: cellAlign(c), paddingRight: k === 1 ? 8 : 0 }}>
              {kind === "head" ? (
                <span style={{ fontSize: RECEIPT_TABLE.head, fontWeight: 800, letterSpacing: 1.2, color: AQ.ink }}>{cellText(c)}</span>
              ) : kind === "total" ? (
                <span style={{ fontFamily: "Fraunces, Georgia, serif", fontWeight: 600, fontSize: RECEIPT_TABLE.total, color: AQ.ink }}>{cellText(c)}</span>
              ) : c.paras.length ? (
                c.paras.map((p, j) => <HtmlPara key={j} p={{ ...p, runs: p.runs.map((x) => ({ ...x, size: x.size ?? RECEIPT_TABLE.item })) }} inCell />)
              ) : (
                <span>&nbsp;</span>
              )}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
