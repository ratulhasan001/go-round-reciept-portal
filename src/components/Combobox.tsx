"use client";

import { useId, useMemo, useState } from "react";
import { Input, cx } from "./ui";

export interface Option {
  id: string;
  label: string;
  meta?: string;
}

/** Free-text input with smart suggestions. Picking a suggestion calls onPick. */
export function Combobox({
  value,
  onChange,
  onPick,
  options,
  placeholder,
  className,
  inputClassName,
  autoFocus,
  onEnter,
  ariaLabel,
}: {
  value: string;
  onChange: (v: string) => void;
  onPick: (o: Option) => void;
  options: Option[];
  placeholder?: string;
  className?: string;
  inputClassName?: string;
  autoFocus?: boolean;
  onEnter?: () => void;
  ariaLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const [hi, setHi] = useState(0);
  const listId = useId();

  const matches = useMemo(() => {
    const q = value.trim().toLowerCase();
    const list = q ? options.filter((o) => o.label.toLowerCase().includes(q) || o.meta?.toLowerCase().includes(q)) : options;
    return list.filter((o) => o.label.toLowerCase() !== q).slice(0, 8);
  }, [value, options]);

  const show = open && matches.length > 0;

  const pick = (o: Option) => {
    onPick(o);
    setOpen(false);
  };

  return (
    <div className={cx("relative", className)}>
      <Input
        value={value}
        autoFocus={autoFocus}
        placeholder={placeholder}
        aria-label={ariaLabel}
        role="combobox"
        aria-expanded={show}
        aria-controls={listId}
        autoComplete="off"
        className={inputClassName}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
          setHi(0);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 120)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown" && show) {
            e.preventDefault();
            setHi((h) => Math.min(h + 1, matches.length - 1));
          } else if (e.key === "ArrowUp" && show) {
            e.preventDefault();
            setHi((h) => Math.max(h - 1, 0));
          } else if (e.key === "Enter") {
            e.preventDefault();
            if (show && matches[hi]) pick(matches[hi]);
            else onEnter?.();
          } else if (e.key === "Escape") setOpen(false);
        }}
      />
      {show && (
        <ul id={listId} role="listbox" className="absolute left-0 right-0 top-full z-40 mt-1.5 max-h-72 overflow-auto rounded-xl border border-line bg-white p-1 shadow-xl shadow-black/10">
          {matches.map((o, i) => (
            <li
              key={o.id}
              role="option"
              aria-selected={i === hi}
              onMouseDown={(e) => {
                e.preventDefault();
                pick(o);
              }}
              onMouseEnter={() => setHi(i)}
              className={cx("flex cursor-pointer items-center justify-between gap-3 rounded-lg px-3 py-2 text-sm", i === hi ? "bg-soft text-ink" : "text-body")}
            >
              <span className="truncate font-semibold">{o.label}</span>
              {o.meta ? <span className="shrink-0 text-[12px] text-muted">{o.meta}</span> : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
