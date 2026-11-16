"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { cn } from "./cn";

export interface ModalProps {
  open: boolean;
  /** Called when the dialog closes for any reason (Esc, back gesture, close button). */
  onClose: () => void;
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  /** Pinned under the scrolling body, always visible (actions, status). */
  footer?: ReactNode;
  /** Tailwind width class (a literal, so Tailwind can see it). */
  width?: string;
  /** Tailwind height class (a literal). Default: as tall as the content, up to 80% of the screen. */
  height?: string;
  className?: string;
}

/**
 * Modal dialog on the native <dialog> element opened with showModal(): the browser makes the page inert,
 * keeps focus inside, handles Esc and returns focus to the button that opened it.
 */
export function Modal({ open, onClose, title, description, children, footer, width = "w-[26rem]", height = "max-h-[80dvh]", className }: ModalProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    else if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onClose={onClose}
      className={cn(
        // Always a 1rem margin plus the device safe area (notches, rounded corners, home bar) on every side
        "hud m-auto max-h-[calc(100dvh-2rem-env(safe-area-inset-top)-env(safe-area-inset-bottom))] max-w-[calc(100%-2rem-env(safe-area-inset-left)-env(safe-area-inset-right))] flex-col border border-brand/50 bg-surface p-0 text-foreground shadow-lg",
        "open:flex overflow-hidden overscroll-contain backdrop:overflow-hidden backdrop:overscroll-contain backdrop:bg-black/60",
        width,
        height,
        className,
      )}
    >
      <div className="flex shrink-0 items-start justify-between gap-4 border-b border-line px-5 py-4">
        <div className="min-w-0">
          <h2 id={titleId} className="hud-title text-base font-semibold">{title}</h2>
          {description && <p className="mt-0.5 text-sm text-muted">{description}</p>}
        </div>
        <button type="button" onClick={() => ref.current?.close()} aria-label="Close" className="shrink-0 px-2 text-muted hover:text-foreground">
          ✕
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-5">{children}</div>
      {footer && <div className="shrink-0 border-t border-line bg-surface px-5 py-3">{footer}</div>}
    </dialog>
  );
}
