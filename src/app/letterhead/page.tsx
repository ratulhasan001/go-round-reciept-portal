"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Download, Eye, FileText, FileType2, NotebookPen, Printer, RotateCcw } from "lucide-react";
import { useStore } from "@/lib/store";
import { type Letter, blankLetter, downloadLetter, downloadLetterDocx, emptyLetter, isBlank, loadDraft, printLetter, saveDraft } from "@/lib/letter";
import { Button, Card, Field, Input, SectionTitle, Switch, Textarea, cx, useToast } from "@/components/ui";
import { SectionIcon } from "@/components/nav";
import LetterheadPreview from "@/components/LetterheadPreview";
import RichEditor from "@/components/RichEditor";

type Job = "" | "pdf" | "docx" | "print" | "blank-pdf" | "blank-docx" | "blank-print";

export default function LetterheadPage() {
  const { shop, products } = useStore();
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
  useEffect(() => {
    if (!letter) return;
    if (first.current) return void (first.current = false);
    const t = setTimeout(() => saveDraft(letter), 300);
    return () => clearTimeout(t);
  }, [letter]);

  if (!letter) return <div className="grid h-[60vh] place-items-center text-muted">Loading…</div>;
  const update = (p: Partial<Letter>) => setLetter((l) => (l ? { ...l, ...p } : l));

  const run = async (job: Job) => {
    if (!job || busy) return;
    const blank = job.startsWith("blank");
    const l = blank ? emptyLetter : letter;
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
    setLetter(blankLetter());
    setEditorKey((k) => k + 1);
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
            <p className="truncate text-[12.5px] text-muted">{isBlank(letter) ? "Blank letterhead - type below to write a letter" : "Draft saved on this device"}</p>
          </div>
          <div className="hidden items-center gap-2 md:flex">
            <Button onClick={reset} variant="ghost" title="Clear everything and start a new letter">
              <RotateCcw className="size-4" /> New
            </Button>
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
                <Input placeholder="e.g. GR/2026/014" value={letter.ref} onChange={(e) => update({ ref: e.target.value })} />
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
          </Card>
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
