"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Copy, Download, Eye, FileText, FileType2, FolderOpen, History, NotebookPen, Pencil, Printer, RotateCcw, Save, Search, Trash2 } from "lucide-react";
import { useStore } from "@/lib/store";
import { type Letter, blankLetter, downloadLetter, downloadLetterDocx, emptyLetter, isBlank, letterTitle, loadDraft, nextLetterRef, printLetter, saveDraft } from "@/lib/letter";
import { fmtDate, todayISO, uid } from "@/lib/calc";
import { Button, Card, Field, Input, SectionTitle, Switch, Textarea, cx, useToast } from "@/components/ui";
import { SectionIcon } from "@/components/nav";
import LetterheadPreview from "@/components/LetterheadPreview";
import RichEditor from "@/components/RichEditor";

type Job = "" | "pdf" | "docx" | "print" | "blank-pdf" | "blank-docx" | "blank-print";

// the saved copy and the one being edited differ only in their timestamps
const sameLetter = (a: Letter, b: Letter) => JSON.stringify({ ...a, createdAt: 0, updatedAt: 0 }) === JSON.stringify({ ...b, createdAt: 0, updatedAt: 0 });

export default function LetterheadPage() {
  const { shop, products, letters, saveLetter, deleteLetter, ready } = useStore();
  const toast = useToast();
  // the draft lives in this browser, so a half-written letter survives a reload (read after mount: no storage on the server)
  const [letter, setLetter] = useState<Letter | null>(null);
  const [editorKey, setEditorKey] = useState(0);
  const [busy, setBusy] = useState<Job>("");
  const [mobileTab, setMobileTab] = useState<"edit" | "preview">("edit");

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time load from localStorage after hydration
    setLetter(loadDraft());
  }, []);
  const first = useRef(true);
  const stored = letter ? letters.find((l) => l.id === letter.id) : undefined;

  // a new letter gets the next reference number (GR-0001, GR-0002…) once the saved letters are loaded
  const refFilled = useRef(false);
  useEffect(() => {
    if (!ready || !letter || refFilled.current) return;
    refFilled.current = true;
    if (!stored && !letter.ref.trim()) setLetter({ ...letter, ref: nextLetterRef(letters) }); // eslint-disable-line react-hooks/set-state-in-effect -- one-time fill after load
  }, [ready, letter, stored, letters]);

  // keep the draft on this device, and once the letter is saved, keep the saved copy up to date as you type
  useEffect(() => {
    if (!letter) return;
    if (first.current) return void (first.current = false);
    const t = setTimeout(() => {
      saveDraft(letter);
      if (stored && !sameLetter(stored, letter)) saveLetter({ ...letter, createdAt: stored.createdAt });
    }, 300);
    return () => clearTimeout(t);
  }, [letter, stored, saveLetter]);

  if (!letter) return <div className="grid h-[60vh] place-items-center text-muted">Loading…</div>;
  const update = (p: Partial<Letter>) => setLetter((l) => (l ? { ...l, ...p } : l));

  /** Saves the letter to the list (a new letter whose number was taken meanwhile gets the next free one). */
  const persist = (l: Letter) => {
    const taken = !stored && letters.some((x) => x.id !== l.id && x.ref.trim() && x.ref.trim().toLowerCase() === l.ref.trim().toLowerCase());
    const saved = saveLetter(taken ? { ...l, ref: nextLetterRef(letters) } : l);
    if (taken) setLetter(saved);
    return saved;
  };

  const save = () => {
    const saved = persist(letter);
    toast(stored ? `${saved.ref || "Letter"} saved` : `${saved.ref || "Letter"} saved to your letters`);
  };

  const open = (l: Letter) => {
    setLetter(l);
    setEditorKey((k) => k + 1);
    setMobileTab("edit");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const run = async (job: Job) => {
    if (!job || busy) return;
    const blank = job.startsWith("blank");
    // a written letter is kept in the saved letters when it is printed or downloaded
    const l = blank ? emptyLetter : isBlank(letter) && !stored ? letter : persist(letter);
    setBusy(job);
    try {
      if (job.endsWith("pdf")) await downloadLetter(l, shop);
      else if (job.endsWith("docx")) await downloadLetterDocx(l, shop);
      else await printLetter(l, shop);
      const what = blank || isBlank(l) ? "Blank letterhead" : "Letter";
      toast(job.endsWith("print") ? "Opening print-ready A4 PDF…" : `${what} downloaded as ${job.endsWith("docx") ? "Word" : "PDF"}`);
    } catch (e) {
      console.error(e);
      toast("Something went wrong generating the file", "err");
    } finally {
      setBusy("");
    }
  };

  const reset = () => {
    open(blankLetter(nextLetterRef(letters)));
    toast("Started a new letter");
  };

  return (
    <div>
      {/* top bar */}
      <div className="sticky top-(--nav-h,0px) z-20 -mx-4 -mt-5 mb-5 border-b border-line bg-canvas/90 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6 lg:-mx-10 lg:-mt-8 lg:px-10">
        <div className="flex items-center gap-3">
          <Link href="/" transitionTypes={["nav-back"]} className="grid size-9 shrink-0 place-items-center rounded-xl text-muted transition hover:-translate-x-0.5 hover:bg-black/5" aria-label="Back to home">
            <ArrowLeft className="size-5" />
          </Link>
          <SectionIcon section="letterhead" className="size-10 rounded-xl bg-teal-50 text-teal-700 shadow-md shadow-deep/10" />
          <div className="mr-auto min-w-0">
            <h1 className="truncate font-display text-xl font-bold sm:text-2xl">Letterhead</h1>
            <p className="truncate text-[12.5px] text-muted">
              {stored ? `${letter.ref || "Letter"} · saved automatically` : isBlank(letter) ? "Blank letterhead - type below to write a letter" : "Draft on this device - not saved yet"}
            </p>
          </div>
          <div className="hidden items-center gap-2 md:flex">
            <Button onClick={reset} variant="ghost" title="Clear everything and start a new letter">
              <RotateCcw className="size-4" /> New
            </Button>
            {!stored && (
              <Button onClick={save} title="Save this letter to your letters">
                <Save className="size-4" /> Save
              </Button>
            )}
            <Button onClick={() => run("print")} loading={busy === "print"}>
              {busy !== "print" && <Printer className="size-4" />} Print
            </Button>
            <Button onClick={() => run("docx")} loading={busy === "docx"} title="Download as a Word document you can keep editing">
              {busy !== "docx" && <FileType2 className="size-4 text-aqua-deep" />} Word
            </Button>
            <Button variant="primary" onClick={() => run("pdf")} loading={busy === "pdf"}>
              {busy !== "pdf" && <Download className="size-4" />} PDF
            </Button>
          </div>
        </div>
      </div>

      {/* mobile edit / preview switch */}
      <div className="mb-5 grid grid-cols-2 rounded-xl bg-black/5 p-1 xl:hidden">
        {(["edit", "preview"] as const).map((k) => (
          <button
            key={k}
            onClick={() => setMobileTab(k)}
            className={cx("flex items-center justify-center gap-2 rounded-lg py-2 text-sm font-semibold transition", mobileTab === k ? "bg-white text-ink shadow-sm" : "text-muted")}
          >
            {k === "edit" ? <NotebookPen className="size-4" /> : <Eye className="size-4" />}
            {k === "edit" ? "Write" : "Preview"}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,460px)] 2xl:grid-cols-[minmax(0,1fr)_580px]">
        {/* ---------------- form ---------------- */}
        <div className={cx("flex flex-col gap-5", mobileTab === "preview" && "hidden xl:flex")}>
          <Card className="p-5 sm:p-6">
            <SectionTitle icon={<FileText className="size-4" />} title="Blank letterhead" hint="The header, fish and grass only - to print and write on by hand" />
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => run("blank-print")} loading={busy === "blank-print"}>
                {busy !== "blank-print" && <Printer className="size-4" />} Print blank
              </Button>
              <Button onClick={() => run("blank-docx")} loading={busy === "blank-docx"}>
                {busy !== "blank-docx" && <FileType2 className="size-4 text-aqua-deep" />} Blank Word
              </Button>
              <Button onClick={() => run("blank-pdf")} loading={busy === "blank-pdf"}>
                {busy !== "blank-pdf" && <Download className="size-4 text-brand" />} Blank PDF
              </Button>
            </div>
          </Card>

          <Card className="p-5 sm:p-6">
            <SectionTitle icon={<NotebookPen className="size-4" />} title="Letter" hint="Everything is optional - leave a field empty and it is left off the page" />
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Reference no.">
                <Input placeholder={nextLetterRef(letters, letter.id)} value={letter.ref} onChange={(e) => update({ ref: e.target.value })} />
              </Field>
              <Field label="Date">
                <Input type="date" value={letter.date} onChange={(e) => update({ date: e.target.value })} />
              </Field>
              <Field label="To" className="sm:col-span-2">
                <Textarea rows={3} placeholder={"Name\nDesignation, Company\nAddress"} value={letter.to} onChange={(e) => update({ to: e.target.value })} />
              </Field>
              <Field label="Subject" className="sm:col-span-2">
                <Input placeholder="e.g. Quotation for aquarium plants" value={letter.subject} onChange={(e) => update({ subject: e.target.value })} />
              </Field>
            </div>
            <div className="mt-4">
              <div className="mb-1.5 text-[12px] font-semibold uppercase tracking-wide text-muted">Body</div>
              <RichEditor key={editorKey} value={letter.body} onChange={(body) => update({ body })} products={products} placeholder="Dear Sir / Madam, …" />
            </div>
            <div className="mt-4 flex items-center gap-2.5 rounded-xl bg-canvas px-3 py-2.5">
              <div className="mr-auto text-[13px]">
                <div className="font-semibold text-ink">Signature and company seal</div>
                <div className="text-[11.5px] text-muted">Signed by the CEO under the letter</div>
              </div>
              <Switch label="Signature and company seal" checked={letter.signed} onChange={(signed) => update({ signed })} />
            </div>
            <div className="mt-4 flex flex-wrap gap-2 md:hidden">
              {!stored && (
                <Button onClick={save}>
                  <Save className="size-4" /> Save letter
                </Button>
              )}
              <Button variant="ghost" onClick={reset}>
                <RotateCcw className="size-4" /> New letter
              </Button>
            </div>
          </Card>

          <SavedLetters
            letters={letters}
            current={letter.id}
            onOpen={open}
            onDuplicate={(l) => {
              open({ ...l, id: uid(), ref: nextLetterRef(letters), date: todayISO(), createdAt: undefined, updatedAt: undefined });
              toast(`Copied ${l.ref || "the letter"} - save to keep it`);
            }}
            onDownload={async (l) => {
              try {
                await downloadLetter(l, shop);
                toast(`PDF downloaded · ${l.ref || letterTitle(l)}`);
              } catch {
                toast("Could not generate the file", "err");
              }
            }}
            onDelete={(l) => {
              deleteLetter(l.id);
              if (l.id === letter.id) setLetter({ ...letter, id: uid(), createdAt: undefined, updatedAt: undefined });
              toast(`${l.ref || "Letter"} deleted`);
            }}
          />
        </div>

        {/* ---------------- preview ---------------- */}
        <div className={cx(mobileTab === "edit" && "hidden xl:block")}>
          <div className="xl:sticky xl:top-[calc(var(--nav-h,0px)+6rem)]">
            <div className="mb-3 flex items-center gap-2 text-[12px] font-semibold uppercase tracking-wide text-muted">
              <FileText className="size-4" /> Live preview · A4 portrait
            </div>
            <LetterheadPreview letter={letter} shop={shop} />
          </div>
        </div>
      </div>

      {/* mobile action bar */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-white/95 px-3 pt-2.5 pb-[calc(0.625rem+env(safe-area-inset-bottom))] backdrop-blur md:hidden">
        <div className="grid grid-cols-3 gap-2">
          <Button onClick={() => run("print")} loading={busy === "print"}>
            {busy !== "print" && <Printer className="size-4" />} Print
          </Button>
          <Button onClick={() => run("docx")} loading={busy === "docx"}>
            {busy !== "docx" && <FileType2 className="size-4 text-aqua-deep" />} Word
          </Button>
          <Button variant="primary" onClick={() => run("pdf")} loading={busy === "pdf"}>
            {busy !== "pdf" && <Download className="size-4" />} PDF
          </Button>
        </div>
      </div>
      <div className="h-16 md:hidden" />
    </div>
  );
}

/** Every saved letter, newest first - open one to keep editing it, like a receipt. */
function SavedLetters({
  letters, current, onOpen, onDuplicate, onDownload, onDelete,
}: {
  letters: Letter[];
  current: string;
  onOpen: (l: Letter) => void;
  onDuplicate: (l: Letter) => void;
  onDownload: (l: Letter) => Promise<void>;
  onDelete: (l: Letter) => void;
}) {
  const [q, setQ] = useState("");
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [busy, setBusy] = useState("");

  const rows = useMemo(
    () => [...letters].sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0) || b.ref.localeCompare(a.ref)),
    [letters],
  );
  const s = q.trim().toLowerCase();
  const visible = rows.filter((l) => !s || [l.ref, l.subject, l.to].some((x) => x.toLowerCase().includes(s)));

  const del = (l: Letter) => {
    if (confirmId !== l.id) {
      setConfirmId(l.id);
      setTimeout(() => setConfirmId((c) => (c === l.id ? null : c)), 3000);
      return;
    }
    setConfirmId(null);
    onDelete(l);
  };

  return (
    <Card className="p-5 sm:p-6">
      <SectionTitle icon={<History className="size-4" />} title="Saved letters" hint={letters.length ? `${letters.length} letter${letters.length === 1 ? "" : "s"} - open one to keep editing it` : "Letters you save, print or download are kept here"} />
      {letters.length > 0 && (
        <div className="relative mb-3">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-faint" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search reference, subject, recipient"
            className="h-10 w-full rounded-xl border border-line bg-canvas pl-9 pr-3 text-sm placeholder:text-faint focus:border-brand focus:bg-white focus:outline-none focus:ring-4 focus:ring-brand/10"
          />
        </div>
      )}
      {letters.length === 0 ? (
        <div className="flex items-center gap-3 rounded-xl bg-canvas px-4 py-5 text-[13px] text-muted">
          <FolderOpen className="size-5 shrink-0 text-faint" /> No saved letters yet. Your first one will be GR-0001.
        </div>
      ) : visible.length === 0 ? (
        <div className="rounded-xl bg-canvas px-4 py-5 text-center text-[13px] text-muted">No letters match “{q}”.</div>
      ) : (
        <ul className="divide-y divide-line">
          {visible.map((l) => (
            <li key={l.id} className={cx("flex items-center gap-3 py-3", l.id === current && "-mx-2 rounded-xl bg-soft/60 px-2")}>
              <button onClick={() => onOpen(l)} className="min-w-0 flex-1 text-left">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[12.5px] font-bold text-brand">{l.ref || "No ref."}</span>
                  {l.date && <span className="text-[12px] text-faint">{fmtDate(l.date)}</span>}
                  {l.id === current && <span className="rounded-full bg-brand/10 px-2 py-0.5 text-[10.5px] font-semibold text-brand">Editing</span>}
                </div>
                <div className="truncate text-[13.5px] font-semibold text-ink">{letterTitle(l)}</div>
              </button>
              <div className="flex shrink-0 items-center gap-1">
                <IconBtn title="Open and edit" onClick={() => onOpen(l)}>
                  <Pencil className="size-4" />
                </IconBtn>
                <IconBtn title="Download PDF" busy={busy === l.id} onClick={async () => (setBusy(l.id), await onDownload(l), setBusy(""))}>
                  <Download className="size-4" />
                </IconBtn>
                <IconBtn title="Duplicate as a new letter" onClick={() => onDuplicate(l)}>
                  <Copy className="size-4" />
                </IconBtn>
                <IconBtn title={confirmId === l.id ? "Tap again to delete" : "Delete"} danger={confirmId === l.id} onClick={() => del(l)}>
                  <Trash2 className="size-4" />
                </IconBtn>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

function IconBtn({ title, onClick, busy, danger, children }: { title: string; onClick: () => void; busy?: boolean; danger?: boolean; children: React.ReactNode }) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      onClick={onClick}
      disabled={busy}
      className={cx("grid size-9 place-items-center rounded-lg transition", danger ? "bg-red-50 text-red-600" : "text-muted hover:bg-black/5 hover:text-ink", busy && "animate-pulse")}
    >
      {children}
    </button>
  );
}
