"use client";

import type { Letter, Shop } from "./types";
import { todayISO, uid } from "./calc";
import { saveBlob } from "./download";
import { hasText } from "./richtext";

export type { Letter };

export const blankLetter = (ref = ""): Letter => ({ id: uid(), ref, date: todayISO(), to: "", subject: "", body: "", signed: true });
/** The bare letterhead (header, fish and grass only), to print and write on by hand. */
export const emptyLetter: Letter = { id: "", ref: "", date: "", to: "", subject: "", body: "", signed: false };

/** Nothing written yet (the automatic reference number alone doesn't count). */
export const isBlank = (l: Letter) => !l.to.trim() && !l.subject.trim() && !hasText(l.body);

// ---------- reference numbers: GR-0001, GR-0002… ----------

export const LETTER_PREFIX = "GR-";
const refNumber = (ref: string) => {
  const m = new RegExp(`^${LETTER_PREFIX}(\\d+)$`, "i").exec(ref.trim());
  return m ? Number(m[1]) : 0;
};
export const formatRef = (n: number) => `${LETTER_PREFIX}${String(n).padStart(4, "0")}`;
/** One past the highest reference used so far, so deleting the newest letter frees its number again. */
export const nextLetterRef = (letters: Letter[], skipId?: string) =>
  formatRef(Math.max(0, ...letters.filter((l) => l.id !== skipId).map((l) => refNumber(l.ref))) + 1);

/** The letterhead's contact block, under the shop name (and in the footer). */
export const LETTERHEAD_ADDRESS = "Dhaka/Khulna, Bangladesh";
export const LETTERHEAD_PHONE = "+8801309372143";
export const contactLines = (shop: Shop) =>
  [`Address: ${LETTERHEAD_ADDRESS}`, `Contact: ${LETTERHEAD_PHONE}`, [shop.email, shop.website].filter(Boolean).join("  ·  ")].filter(Boolean);

/** A one-line summary for lists. */
export const letterTitle = (l: Letter) => l.subject.trim() || l.to.trim().split("\n")[0] || "Untitled letter";

const fileName = (l: Letter, ext: "pdf" | "docx") => `${baseName(l)}.${ext}`;
const baseName = (l: Letter) => {
  if (isBlank(l) && !l.ref.trim()) return "Letterhead";
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
    if (raw) {
      const l = { ...blankLetter(), ...(JSON.parse(raw) as Partial<Letter>) };
      return l.id ? l : { ...l, id: uid() }; // drafts from before letters were saved had no id
    }
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
