"use client";

import type { Shop } from "./types";
import { todayISO } from "./calc";
import { saveBlob } from "./download";
import { hasText } from "./richtext";

/** A letter written on the shop letterhead. Every field may be left empty (a blank letterhead to write on by hand). */
export interface Letter {
  ref: string;
  date: string; // yyyy-mm-dd, "" = no date printed
  to: string; // recipient, one line per row
  subject: string;
  body: string; // HTML from the formatting editor (read with parseRich)
  signed: boolean; // CEO signature and company seal under the letter
}

export const blankLetter = (): Letter => ({ ref: "", date: todayISO(), to: "", subject: "", body: "", signed: true });
export const emptyLetter: Letter = { ref: "", date: "", to: "", subject: "", body: "", signed: false };

export const isBlank = (l: Letter) => !l.ref.trim() && !l.to.trim() && !l.subject.trim() && !hasText(l.body);

/** Address / phone · email / website, as on the receipt. */
export const contactLines = (shop: Shop) =>
  [shop.address, [shop.phone, shop.email].filter(Boolean).join("  ·  "), shop.website].filter(Boolean);

const fileName = (l: Letter, ext: "pdf" | "docx") => `${baseName(l)}.${ext}`;
const baseName = (l: Letter) => {
  if (isBlank(l)) return "Letterhead";
  const tag = (l.ref || l.subject || l.date).replace(/[^\w-]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 40);
  return `Letter${tag ? "-" + tag : ""}`;
};

export async function downloadLetter(letter: Letter, shop: Shop) {
  const { renderLetterBlob } = await import("./letterPdf");
  saveBlob(await renderLetterBlob(letter, shop), fileName(letter, "pdf"));
}

export async function downloadLetterDocx(letter: Letter, shop: Shop) {
  const { renderLetterDocx } = await import("./letterDocx");
  saveBlob(await renderLetterDocx(letter, shop), fileName(letter, "docx"));
}

/** Opens the A4 PDF in a new tab so the browser's print dialog prints it exactly. */
export async function printLetter(letter: Letter, shop: Shop) {
  const win = window.open("", "_blank");
  const { renderLetterBlob } = await import("./letterPdf");
  const url = URL.createObjectURL(await renderLetterBlob(letter, shop));
  if (win) win.location.href = url;
  else window.location.href = url;
}

// the draft is kept on this device only, so a half-written letter survives a reload
const DRAFT_KEY = "go-round:letter-draft";

export function loadDraft(): Letter {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (raw) return { ...blankLetter(), ...(JSON.parse(raw) as Partial<Letter>) };
  } catch {
    /* storage blocked or bad JSON: start fresh */
  }
  return blankLetter();
}

export function saveDraft(l: Letter) {
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(l));
  } catch {
    /* storage full or blocked: the draft just isn't kept */
  }
}
