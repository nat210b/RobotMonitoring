"use client";

import { useEffect, useState } from "react";

/** Turns "var(--brand)" (or a bare "--brand") into the colour it currently has; any other CSS colour is returned as is. */
export function resolveColor(color: string): string {
  const match = /^var\((--[\w-]+)\)$/.exec(color.trim()) ?? /^(--[\w-]+)$/.exec(color.trim());
  if (!match) return color;
  return getComputedStyle(document.documentElement).getPropertyValue(match[1]).trim() || color;
}

/** Number that goes up whenever the page theme changes, so canvas charts can redraw with the new colours. */
export function useThemeVersion(): number {
  const [version, setVersion] = useState(0);
  useEffect(() => {
    const bump = () => setVersion((v) => v + 1);
    const observer = new MutationObserver(bump);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    media.addEventListener("change", bump);
    return () => {
      observer.disconnect();
      media.removeEventListener("change", bump);
    };
  }, []);
  return version;
}
