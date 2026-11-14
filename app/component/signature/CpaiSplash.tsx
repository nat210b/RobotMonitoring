"use client";

import Script from "next/script";
import { useEffect } from "react";

/**
 * Opening animation from the CP-INNOVATION | AI TEAM Splash Motion kit (files in public/cp-ai-signature/dist).
 * The CP monogram appears in the middle of the screen, then flies to #cpai-header-mark in the navbar.
 * It plays on every open and refresh, and waits for markAppReady() (called once the first data has loaded).
 */
const SPLASH_OPTIONS = {
  assetBase: "/cp-ai-signature/assets",
  target: "#cpai-header-mark",
  mainTarget: "#main-content",
  locale: "en",
  readyMode: "manual", // wait for markAppReady() instead of the window load event
  minDisplayMs: 1800,
  longWaitMs: 12000,
  oncePerSession: false, // every open and refresh, not just the first of the session
};

type SplashApi = { init: (options: object) => unknown; ready: () => void };
const api = () => (window as unknown as { CPAISplash?: SplashApi }).CPAISplash;
const READY_EVENT = "app:ready";

/** Tell the splash the app has what it needs to show. Safe to call more than once, or before the splash starts. */
export function markAppReady() {
  (window as unknown as { __appReady?: boolean }).__appReady = true;
  window.dispatchEvent(new Event(READY_EVENT));
}

/** True when the light theme is showing: data-theme="light", or no data-theme and a light system setting. */
function isLightTheme() {
  const set = document.documentElement.dataset.theme;
  return set ? set === "light" : !window.matchMedia("(prefers-color-scheme: dark)").matches;
}

let started = false; // React strict mode mounts effects twice in development; start the splash only once

export function CpaiSplash() {
  useEffect(() => {
    if (started) return;
    const start = () => {
      const splash = api();
      if (!splash || started) return;
      started = true;
      // The light theme gets the navy / blue monogram; the splash also flies this same image to the header.
      splash.init({ ...SPLASH_OPTIONS, ...(isLightTheme() && { monogramUrl: `${SPLASH_OPTIONS.assetBase}/cp-monogram-light.svg` }) });
      const ready = () => api()?.ready();
      if ((window as unknown as { __appReady?: boolean }).__appReady) ready();
      else window.addEventListener(READY_EVENT, ready, { once: true });
    };
    start(); // the script may already be loaded
    window.addEventListener("cpai:script-loaded", start, { once: true });
  }, []);

  return (
    <>
      <link rel="stylesheet" href="/cp-ai-signature/dist/cpai-splash.css" />
      <Script src="/cp-ai-signature/dist/ai-team-signature.js" />
      <Script src="/cp-ai-signature/dist/cpai-splash.js" strategy="afterInteractive" onLoad={() => window.dispatchEvent(new Event("cpai:script-loaded"))} />
    </>
  );
}
