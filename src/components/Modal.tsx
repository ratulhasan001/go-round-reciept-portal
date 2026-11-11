"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { cx } from "./ui";

/**
 * A dialog portalled to <body> (the page wrapper is animated with a transform, which would trap a fixed element).
 * "center" is a card in the middle of the screen; "side" is a panel on the right on wide screens and a full-screen
 * sheet on phones. Escape or the backdrop closes it, and the page behind doesn't scroll while it's open.
 */
export function Modal({
  open,
  onClose,
  title,
  subtitle,
  icon,
  variant = "center",
  width = "max-w-lg",
  footer,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  icon?: React.ReactNode;
  variant?: "center" | "side";
  width?: string;
  footer?: React.ReactNode;
  children: React.ReactNode;
}) {
  const close = useRef(onClose);
  useEffect(() => {
    close.current = onClose;
  });

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close.current();
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open || typeof document === "undefined") return null;
  const side = variant === "side";

  return createPortal(
    <div className={cx("fixed inset-0 z-50", side ? "flex justify-end" : "grid place-items-center p-4")} role="dialog" aria-modal="true">
      <div className="animate-backdrop-in absolute inset-0 bg-deep/50 backdrop-blur-sm" onClick={() => close.current()} />
      <div
        className={cx(
          "relative flex w-full flex-col overflow-hidden bg-white shadow-2xl",
          side ? "animate-modal-in h-dvh sm:max-w-xl sm:rounded-l-3xl" : cx("animate-modal-in max-h-[92dvh] rounded-3xl", width),
        )}
      >
        <div className="flex items-start gap-3 border-b border-line px-5 py-4">
          {icon ? <div className="grid size-10 shrink-0 place-items-center rounded-2xl bg-deep text-lime">{icon}</div> : null}
          <div className="min-w-0 flex-1">
            <h2 className="truncate font-display text-lg font-extrabold text-ink">{title}</h2>
            {subtitle ? <div className="text-[13px] text-muted">{subtitle}</div> : null}
          </div>
          <button
            type="button"
            onClick={() => close.current()}
            className="grid size-9 shrink-0 place-items-center rounded-xl text-muted transition hover:bg-canvas hover:text-ink active:scale-90"
            aria-label="Close"
          >
            <X className="size-5" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">{children}</div>
        {footer ? <div className="border-t border-line bg-white px-5 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">{footer}</div> : null}
      </div>
    </div>,
    document.body,
  );
}
