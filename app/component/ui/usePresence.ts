"use client";

import { useEffect, useState } from "react";

/**
 * Keeps a panel mounted long enough to animate in and out (drawers, popovers). `mounted` says whether to
 * render it; `visible` says whether it should be in its shown state. Opening mounts it hidden and flips
 * `visible` on the next frame, so a CSS transition plays; closing flips `visible` off at once and unmounts
 * after `ms`, when the exit transition has finished.
 */
export function usePresence(open: boolean, ms: number) {
  const [mounted, setMounted] = useState(open);
  const [entered, setEntered] = useState(open);
  if (open && !mounted) setMounted(true); // mount straight away on open (adjusting state while rendering)

  useEffect(() => {
    if (open) {
      if (entered) return;
      let inner = 0;
      // two frames: the first paints the hidden state, the second starts the transition from it
      const outer = requestAnimationFrame(() => (inner = requestAnimationFrame(() => setEntered(true))));
      return () => {
        cancelAnimationFrame(outer);
        cancelAnimationFrame(inner);
      };
    }
    if (!mounted) return;
    const timer = setTimeout(() => {
      setMounted(false);
      setEntered(false);
    }, ms);
    return () => clearTimeout(timer);
  }, [open, mounted, entered, ms]);

  return { mounted: mounted || open, visible: open && entered };
}
