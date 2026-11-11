"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Copy, Download, ExternalLink, IdCard, QrCode } from "lucide-react";
import { useStore } from "@/lib/store";
import { absolute, publicLinks } from "@/lib/site";
import { logoUrl } from "@/lib/theme";
import type { Employee } from "@/lib/types";
import { saveBlob } from "@/lib/download";
import { Modal } from "./Modal";
import { Button, useToast } from "./ui";

const INK = "#113A2D";
const TEAL = "#1F7FA8";
const CREAM = "#F3EFE6";

export const verifyUrl = (e: Employee) => absolute(publicLinks(window.location.host).staff(e.code), window.location.origin);
const fileName = (e: Employee, what: string) => `${(e.name.trim() || "staff").replace(/[^\w-]+/g, "_")}-${what}.png`;

const loadImage = (src: string) =>
  new Promise<HTMLImageElement | null>((resolve) => {
    if (!src) return resolve(null);
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });

/** A printable staff ID card (CR80 proportions, 1012 x 638 px ≈ 300 dpi) with the verification QR. */
async function renderCard(e: Employee, shop: { name: string; logo: string }) {
  await document.fonts?.load('600 40px "Fraunces"').catch(() => null);
  const sans = getComputedStyle(document.body).fontFamily; // Manrope, under the name next/font gave it
  const W = 1012;
  const H = 638;
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const g = c.getContext("2d")!;
  g.fillStyle = CREAM;
  g.fillRect(0, 0, W, H);
  // green rule + grass strip along the bottom, as on the visiting card
  g.fillStyle = "#5E9E39";
  g.fillRect(56, 214, 48, 4);
  const greens = ["#1E5A45", "#2F6B3A", "#4C8C3A", "#6FAE45", "#8CBF5A"];
  for (let x = 0; x < W; x += 9) {
    g.strokeStyle = greens[(x * 7) % greens.length]!;
    g.globalAlpha = 0.55;
    g.lineWidth = 3;
    g.beginPath();
    g.moveTo(x, H);
    g.quadraticCurveTo(x + ((x * 13) % 20) - 10, H - 30, x + ((x * 17) % 24) - 12, H - 40 - ((x * 31) % 50));
    g.stroke();
  }
  g.globalAlpha = 1;

  const logo = await loadImage(logoUrl(shop.logo));
  if (logo) g.drawImage(logo, 56, 52, 96, 96);
  g.fillStyle = INK;
  g.font = '600 46px "Fraunces", Georgia, serif';
  g.fillText(shop.name, logo ? 170 : 56, 116);

  g.font = `800 17px ${sans}`;
  g.fillStyle = "rgba(17,58,45,0.6)";
  g.fillText("S T A F F   I D", 56, 196);

  const name = e.name.trim() || "Staff member";
  let size = 50;
  g.font = `400 ${size}px "Fraunces", Georgia, serif`;
  while (g.measureText(name).width > 520 && size > 28) g.font = `400 ${(size -= 2)}px "Fraunces", Georgia, serif`;
  g.fillStyle = INK;
  g.fillText(name, 56, 290);
  if (e.role.trim()) {
    g.font = 'italic 400 34px "Fraunces", Georgia, serif';
    g.fillStyle = TEAL;
    g.fillText(e.role.trim(), 56, 342);
  }
  g.font = `600 20px ${sans}`;
  g.fillStyle = "rgba(17,58,45,0.7)";
  g.fillText("Scan the code to check this person works with us.", 56, 410);

  const qr = await QRCode.toDataURL(verifyUrl(e), { errorCorrectionLevel: "M", margin: 1, width: 340, color: { dark: INK, light: "#FFFFFF" } });
  const img = await loadImage(qr);
  g.fillStyle = "#FFFFFF";
  g.beginPath();
  g.roundRect(W - 56 - 360, 120, 360, 360, 28);
  g.fill();
  if (img) g.drawImage(img, W - 56 - 350, 130, 340, 340);
  g.font = `800 16px ${sans}`;
  g.fillStyle = TEAL;
  g.textAlign = "center";
  g.fillText("SCAN TO VERIFY", W - 56 - 180, 512);
  // the code itself, for typing in at verify.goroundbd.com when a camera isn't handy
  g.font = '600 22px ui-monospace, "SF Mono", Menlo, monospace';
  g.fillStyle = INK;
  g.fillText(e.code, W - 56 - 180, 546);
  return new Promise<Blob>((r) => c.toBlob((b) => r(b!), "image/png"));
}

/** The staff member's verification QR code: preview, download (QR alone or a printable ID card) and the link it opens. */
export function StaffQrDialog({ employee, onClose }: { employee: Employee | null; onClose: () => void }) {
  const { shop, mode } = useStore();
  const toast = useToast();
  const [svg, setSvg] = useState("");
  const url = employee ? verifyUrl(employee) : "";

  useEffect(() => {
    if (!url) return;
    let alive = true;
    void QRCode.toString(url, { type: "svg", errorCorrectionLevel: "M", margin: 1, color: { dark: INK, light: "#FFFFFF" } }).then((s) => alive && setSvg(s));
    return () => {
      alive = false;
    };
  }, [url]);

  if (!employee) return null;
  const e = employee;
  return (
    <Modal
      open
      onClose={onClose}
      icon={<QrCode className="size-5" />}
      title={e.name.trim() || "New staff member"}
      subtitle="Verification QR code - anyone who scans it sees whether this person works for you"
      footer={
        <div className="flex flex-wrap gap-2">
          <Button
            className="flex-1"
            onClick={async () => {
              saveBlob(await (await fetch(await QRCode.toDataURL(url, { errorCorrectionLevel: "M", margin: 2, width: 1024, color: { dark: INK, light: "#FFFFFF" } }))).blob(), fileName(e, "QR"));
              toast("QR code downloaded");
            }}
          >
            <Download className="size-4" /> QR code
          </Button>
          <Button
            variant="dark"
            className="flex-1"
            onClick={async () => {
              saveBlob(await renderCard(e, shop), fileName(e, "ID-card"));
              toast("ID card downloaded - print it at card size (85.6 × 54 mm)");
            }}
          >
            <IdCard className="size-4" /> ID card
          </Button>
        </div>
      }
    >
      <div className="flex flex-col items-center gap-4 p-5">
        {/* the QR is an SVG made by the qrcode library from this page's own link, never from user input */}
        <div className="size-60 rounded-2xl bg-white p-2 shadow-sm ring-1 ring-line [&_svg]:size-full" dangerouslySetInnerHTML={{ __html: svg }} />
        <p className="text-center text-[13px] text-muted">
          {e.role.trim() ? `${e.role.trim()} · ` : ""}
          {e.active === false ? <b className="text-red-600">Marked as former - the page says they no longer work here</b> : "Active - the page shows them as verified staff"}
        </p>
        <div className="flex w-full items-center gap-2 rounded-xl bg-canvas p-1.5 pl-3">
          <span className="min-w-0 flex-1 truncate font-mono text-[12px] text-body">{url}</span>
          <Button
            size="sm"
            onClick={() => {
              void navigator.clipboard?.writeText(url).then(() => toast("Link copied"));
            }}
          >
            <Copy className="size-3.5" /> Copy
          </Button>
          <a href={url} target="_blank" rel="noopener" className="grid size-8 place-items-center rounded-lg text-muted hover:bg-white hover:text-ink" aria-label="Open verification page">
            <ExternalLink className="size-4" />
          </a>
        </div>
        {mode !== "cloud" && <p className="text-center text-[12px] text-amber-700">The verification page needs the database, so it only works on the live site.</p>}
        <p className="text-center text-[12px] text-faint">The QR opens the verify page on your website, so it keeps working however you open this panel.</p>
      </div>
    </Modal>
  );
}
