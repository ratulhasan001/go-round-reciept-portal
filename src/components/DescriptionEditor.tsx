"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  Bold, Eraser, Heading1, Heading2, Italic, List, ListOrdered, Maximize2, Minimize2, Pilcrow, Redo2, Smile, Strikethrough, Underline, Undo2,
} from "lucide-react";
import { richHtml } from "@/lib/site";
import { cx } from "./ui";

// A small Word-style box for product descriptions: bold, lists, headings and emoji, with a full-screen view for
// longer texts. It writes HTML; the website shows it through richHtml() (src/lib/site.ts), which keeps only the
// formatting, so pasted text from Word or a web page can't bring anything else along.

type Cmd = "bold" | "italic" | "underline" | "strikeThrough" | "insertUnorderedList" | "insertOrderedList";
const STATE: Cmd[] = ["bold", "italic", "underline", "strikeThrough", "insertUnorderedList", "insertOrderedList"];

const EMOJI: { label: string; list: string[] }[] = [
  { label: "Aquarium", list: ["🐠", "🐟", "🐡", "🦐", "🦀", "🐌", "🐢", "🐸", "🦞", "🐙", "🪸", "🌿", "🌱", "🍃", "🪴", "🌾", "🍀", "☘️", "🌳", "🪷", "💧", "🫧", "🌊", "🪨", "🏝️", "💡", "🌡️", "🧪", "🧫", "🔬"] },
  { label: "Smileys", list: ["😀", "😃", "😄", "😁", "😊", "🙂", "😉", "😍", "🥰", "😎", "🤩", "😇", "🤗", "🤔", "😮", "😢", "🥳", "😋", "🙏", "👍", "👌", "👏", "💪", "🙌", "✌️", "🤝", "👉", "👆", "☝️", "✋"] },
  { label: "Symbols", list: ["✅", "✔️", "☑️", "❌", "⚠️", "❗", "⭐", "🌟", "✨", "🔥", "💯", "🆕", "🆓", "🎉", "🎁", "💥", "❤️", "💚", "💙", "💛", "🧡", "💜", "➡️", "⬅️", "⬆️", "⬇️", "📌", "📍", "🔹", "🔸"] },
  { label: "Shop", list: ["🛒", "🛍️", "📦", "🚚", "🛵", "🚀", "⏰", "📅", "💰", "💵", "💳", "🏷️", "📞", "📱", "💬", "📝", "🔖", "🧾", "🎯", "🔧", "🛠️", "⚙️", "🔌", "🔋", "💎", "📏", "⚖️", "🧴", "🫙", "🧽"] },
];
const RECENT_KEY = "go-round-receipts:recent-emoji";

const readRecent = (): string[] => {
  try {
    const v = JSON.parse(localStorage.getItem(RECENT_KEY) ?? "[]");
    return Array.isArray(v) ? v.filter((x) => typeof x === "string").slice(0, 16) : [];
  } catch {
    return [];
  }
};

/** The description as it should be saved: "" when nothing is written. */
const valueOf = (el: HTMLElement) => (el.textContent?.trim() || el.querySelector("li") ? el.innerHTML : "");

export function DescriptionEditor({ value, onChange, placeholder }: { value: string; onChange: (html: string) => void; placeholder?: string }) {
  const [full, setFull] = useState(false);
  const [version, setVersion] = useState(0); // remounts the small box with the text written in the big one
  return (
    <>
      <Box key={version} value={value} onChange={onChange} placeholder={placeholder} onExpand={() => setFull(true)} />
      {full &&
        createPortal(
          <FullScreen
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            onClose={() => {
              setFull(false);
              setVersion((v) => v + 1);
            }}
          />,
          document.body,
        )}
    </>
  );
}

function FullScreen({ value, onChange, placeholder, onClose }: { value: string; onChange: (html: string) => void; placeholder?: string; onClose: () => void }) {
  const close = useRef(onClose);
  useEffect(() => {
    close.current = onClose;
  });
  useEffect(() => {
    // Escape closes only this view, not the product dialog under it
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.stopImmediatePropagation();
      close.current();
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, []);
  return (
    <div className="fixed inset-0 z-[60] grid place-items-center bg-deep/50 p-2 backdrop-blur-sm sm:p-6" role="dialog" aria-modal="true" aria-label="Write description">
      <div className="animate-modal-in flex h-full max-h-[920px] w-full max-w-4xl flex-col overflow-hidden rounded-3xl bg-canvas shadow-2xl">
        <Box value={value} onChange={onChange} placeholder={placeholder} big onExpand={onClose} />
      </div>
    </div>
  );
}

function Box({
  value, onChange, placeholder, big, onExpand,
}: {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  big?: boolean;
  onExpand: () => void;
}) {
  const box = useRef<HTMLDivElement>(null);
  const saved = useRef<Range | null>(null);
  const [active, setActive] = useState<Record<string, boolean>>({});
  const [block, setBlock] = useState("");
  const [empty, setEmpty] = useState(!value.trim());
  const [emoji, setEmoji] = useState(false);

  // uncontrolled: filled once (older plain-text descriptions become paragraphs here)
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    el.innerHTML = richHtml(value);
    if (big) {
      el.focus();
      const r = document.createRange();
      r.selectNodeContents(el);
      r.collapse(false);
      document.getSelection()?.removeAllRanges();
      document.getSelection()?.addRange(r);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- first value only
  }, []);

  const emit = () => {
    const el = box.current;
    if (!el) return;
    const v = valueOf(el);
    setEmpty(!v);
    onChange(v);
  };

  // remember the caret while the toolbar has focus, and light up the buttons for the text under it
  useEffect(() => {
    const onSel = () => {
      const sel = document.getSelection();
      const el = box.current;
      if (!sel || !sel.rangeCount || !el || !el.contains(sel.anchorNode)) return;
      saved.current = sel.getRangeAt(0).cloneRange();
      const next: Record<string, boolean> = {};
      for (const c of STATE) {
        try {
          next[c] = document.queryCommandState(c);
        } catch {
          next[c] = false;
        }
      }
      setActive(next);
      try {
        setBlock(String(document.queryCommandValue("formatBlock") || "").toLowerCase());
      } catch {
        setBlock("");
      }
    };
    document.addEventListener("selectionchange", onSel);
    return () => document.removeEventListener("selectionchange", onSel);
  }, []);

  const restore = () => {
    const el = box.current;
    if (!el) return;
    el.focus();
    let r = saved.current;
    if (!r || !el.contains(r.startContainer)) {
      r = document.createRange();
      r.selectNodeContents(el);
      r.collapse(false);
    }
    const sel = document.getSelection();
    sel?.removeAllRanges();
    sel?.addRange(r);
  };

  const run = (cmd: string, arg?: string) => {
    restore();
    document.execCommand(cmd, false, arg);
    emit();
    document.dispatchEvent(new Event("selectionchange"));
  };
  const heading = (tag: "h3" | "h4") => run("formatBlock", block === tag ? "div" : tag);

  const insertEmoji = (e: string) => {
    run("insertText", e);
    try {
      localStorage.setItem(RECENT_KEY, JSON.stringify([e, ...readRecent().filter((x) => x !== e)].slice(0, 16)));
    } catch {
      /* private mode */
    }
  };

  const sep = <span aria-hidden className="mx-0.5 h-5 w-px shrink-0 bg-line" />;
  const i = "size-[17px]";

  return (
    <div className={cx("relative flex flex-col overflow-visible", big ? "h-full" : "rounded-xl border border-line bg-white focus-within:border-brand focus-within:ring-4 focus-within:ring-brand/10")}>
      {big && (
        <div className="flex items-center justify-between gap-3 border-b border-line bg-white px-5 py-3">
          <div>
            <p className="text-[16px] font-extrabold">Product description</p>
            <p className="text-[12.5px] text-muted">Saved as you type · Esc to go back</p>
          </div>
          <button type="button" onClick={onExpand} className="inline-flex h-10 items-center gap-2 rounded-xl bg-deep px-4 text-[13.5px] font-bold text-lime transition hover:brightness-110 active:scale-95">
            <Minimize2 className="size-4" /> Done
          </button>
        </div>
      )}

      {/* toolbar */}
      <div className="relative">
      <div className={cx("flex items-center gap-0.5 overflow-x-auto border-b border-line bg-canvas/70 px-1.5 py-1.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden", !big && "rounded-t-xl")} role="toolbar" aria-label="Formatting">
        <Tool label="Undo (Ctrl+Z)" icon={<Undo2 className={i} />} onClick={() => run("undo")} />
        <Tool label="Redo (Ctrl+Y)" icon={<Redo2 className={i} />} onClick={() => run("redo")} />
        {sep}
        <Tool label="Heading" icon={<Heading1 className={i} />} onClick={() => heading("h3")} on={block === "h3"} />
        <Tool label="Subheading" icon={<Heading2 className={i} />} onClick={() => heading("h4")} on={block === "h4"} />
        <Tool label="Normal text" icon={<Pilcrow className={i} />} onClick={() => run("formatBlock", "div")} on={block === "div" || block === "p"} />
        {sep}
        <Tool label="Bold (Ctrl+B)" icon={<Bold className={i} />} onClick={() => run("bold")} on={active.bold} />
        <Tool label="Italic (Ctrl+I)" icon={<Italic className={i} />} onClick={() => run("italic")} on={active.italic} />
        <Tool label="Underline (Ctrl+U)" icon={<Underline className={i} />} onClick={() => run("underline")} on={active.underline} />
        <Tool label="Strikethrough" icon={<Strikethrough className={i} />} onClick={() => run("strikeThrough")} on={active.strikeThrough} />
        {sep}
        <Tool label="Bullet list" icon={<List className={i} />} onClick={() => run("insertUnorderedList")} on={active.insertUnorderedList} />
        <Tool label="Numbered list" icon={<ListOrdered className={i} />} onClick={() => run("insertOrderedList")} on={active.insertOrderedList} />
        {sep}
        <Tool label="Emoji" icon={<Smile className={i} />} onClick={() => setEmoji((v) => !v)} on={emoji} />
        <Tool
          label="Clear formatting"
          icon={<Eraser className={i} />}
          onClick={() => {
            run("removeFormat");
            run("formatBlock", "div");
          }}
        />
        <span className="ml-auto" />
        {!big && <Tool label="Open full screen" icon={<Maximize2 className={i} />} onClick={onExpand} />}
      </div>

      {emoji && <EmojiPanel onPick={insertEmoji} onClose={() => setEmoji(false)} />}
      </div>

      {/* the text */}
      <div className={cx("relative min-h-0", big && "flex-1 overflow-y-auto bg-canvas px-3 py-4 sm:px-8 sm:py-8")}>
        <div className={cx(big && "mx-auto min-h-full max-w-2xl rounded-2xl bg-white px-6 py-7 shadow-sm ring-1 ring-line sm:px-10 sm:py-10")}>
          <div className="relative">
            {empty && <span className={cx("pointer-events-none absolute left-0 top-0 text-faint", !big && "px-3.5 py-3")}>{placeholder}</span>}
            <div
              ref={box}
              contentEditable
              suppressContentEditableWarning
              role="textbox"
              aria-multiline="true"
              aria-label="Product description"
              onInput={emit}
              onBlur={emit}
              onKeyDown={(e) => {
                // keep Tab for moving between fields, except inside lists where it indents
                if (e.key === "Tab" && (document.queryCommandState("insertUnorderedList") || document.queryCommandState("insertOrderedList"))) {
                  e.preventDefault();
                  run(e.shiftKey ? "outdent" : "indent");
                }
              }}
              onPaste={(e) => {
                // only the formatting survives a paste from Word or a web page
                e.preventDefault();
                const html = e.clipboardData.getData("text/html");
                const text = e.clipboardData.getData("text/plain");
                document.execCommand("insertHTML", false, html ? richHtml(html.replace(/<(style|script|head)[\s\S]*?<\/\1>/gi, "")) : richHtml(text));
                emit();
              }}
              className={cx(
                "rich-desc outline-none text-[15px] leading-relaxed text-body",
                big ? "min-h-[50vh] text-[16px]" : "max-h-80 min-h-36 overflow-y-auto px-3.5 py-3",
              )}
            />
          </div>
        </div>
      </div>
      {!big && <p className="px-3 pb-2 pt-1 text-[11.5px] text-faint">Tip: on a computer, Win + . (Windows) or Ctrl + Cmd + Space (Mac) opens the full emoji keyboard.</p>}
    </div>
  );
}

function Tool({ label, icon, onClick, on = false }: { label: string; icon: React.ReactNode; onClick: () => void; on?: boolean }) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={on}
      onMouseDown={(e) => e.preventDefault()} // keep the caret in the text
      onClick={onClick}
      className={cx("grid size-9 shrink-0 place-items-center rounded-lg transition active:scale-90", on ? "bg-deep text-lime" : "text-body hover:bg-white hover:text-ink")}
    >
      {icon}
    </button>
  );
}

function EmojiPanel({ onPick, onClose }: { onPick: (e: string) => void; onClose: () => void }) {
  const [recent] = useState(readRecent);
  const tabs = recent.length ? [{ label: "Recent", list: recent }, ...EMOJI] : EMOJI;
  const [tab, setTab] = useState(0);
  const panel = useRef<HTMLDivElement>(null);
  const done = useRef(onClose);
  useEffect(() => {
    done.current = onClose;
  });
  useEffect(() => {
    const away = (e: PointerEvent) => {
      const t = e.target as HTMLElement;
      if (!panel.current?.contains(t) && !t.closest('[aria-label="Emoji"]')) done.current();
    };
    document.addEventListener("pointerdown", away);
    return () => document.removeEventListener("pointerdown", away);
  }, []);

  return (
    <div ref={panel} className="absolute left-2 right-2 top-full z-20 mt-1 rounded-2xl border border-line bg-white p-2 shadow-xl sm:left-auto sm:w-[360px]" onMouseDown={(e) => e.preventDefault()}>
      <div className="flex gap-1 overflow-x-auto pb-2 [scrollbar-width:none]">
        {tabs.map((t, i) => (
          <button
            key={t.label}
            type="button"
            onClick={() => setTab(i)}
            className={cx("h-8 shrink-0 rounded-full px-3 text-[12.5px] font-bold transition", i === tab ? "bg-deep text-lime" : "bg-canvas text-body hover:text-ink")}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="grid max-h-56 grid-cols-8 gap-0.5 overflow-y-auto">
        {tabs[tab]!.list.map((e) => (
          <button key={e} type="button" onClick={() => onPick(e)} className="grid aspect-square place-items-center rounded-lg text-[22px] transition hover:scale-110 hover:bg-canvas active:scale-95" aria-label={`Insert ${e}`}>
            {e}
          </button>
        ))}
      </div>
    </div>
  );
}
