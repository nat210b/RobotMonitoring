"use client";

import { useEffect, useRef, type RefObject } from "react";

/**
 * Closes a floating panel (drawer, popover, menu) when the user presses anywhere outside it or hits
 * Escape. Put the returned ref on the panel. Elements marked `data-dismiss-ignore` (e.g. the button
 * that toggles the panel) don't count as "outside", so pressing them doesn't close and reopen it.
 */
export function useDismiss<T extends HTMLElement>(onDismiss: () => void, enabled = true): RefObject<T | null> {
  const ref = useRef<T>(null);
  const dismiss = useRef(onDismiss);
  useEffect(() => {
    dismiss.current = onDismiss;
  }, [onDismiss]);

  useEffect(() => {
    if (!enabled) return;
    const onPointer = (e: PointerEvent) => {
      const target = e.target as Element | null;
      if (!target || ref.current?.contains(target) || target.closest("[data-dismiss-ignore]")) return;
      dismiss.current();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") dismiss.current();
    };
    document.addEventListener("pointerdown", onPointer, true);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer, true);
      document.removeEventListener("keydown", onKey);
    };
  }, [enabled]);

  return ref;
}
