"use client";

import { useCallback, useEffect, useState } from "react";

export type Theme = "light" | "dark";

export type Settings = {
  /** Tinted floor + outline round each section. */
  showHighlight: boolean;
  /** One name badge per section. Off whenever machine status is on. */
  showSectionNames: boolean;
  /** A red power icon over each machine that is off. */
  showPowerIcons: boolean;
  /** A status badge over each machine. */
  showMachineStatus: boolean;
  theme: Theme;
};

const KEY = "robot-monitoring-settings";

const systemTheme = (): Theme => (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");

const DEFAULTS: Omit<Settings, "theme"> = { showHighlight: true, showSectionNames: true, showPowerIcons: true, showMachineStatus: false };

/** Room view + theme settings, remembered in localStorage and applied to <html data-theme>. */
export function useSettings() {
  const [settings, setSettings] = useState<Settings>({ ...DEFAULTS, theme: "light" });

  // Load after mount (the server can't know the saved or system values).
  useEffect(() => {
    let saved: Partial<Settings> = {};
    try {
      saved = JSON.parse(localStorage.getItem(KEY) ?? "{}");
    } catch {}
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSettings({ ...DEFAULTS, ...saved, theme: saved.theme ?? systemTheme() });
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = settings.theme;
  }, [settings.theme]);

  const update = useCallback((patch: Partial<Settings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      // Machine status and section names share the badge spot: turning one on turns the other off.
      if (patch.showMachineStatus) next.showSectionNames = false;
      else if (patch.showSectionNames) next.showMachineStatus = false;
      try {
        localStorage.setItem(KEY, JSON.stringify(next));
      } catch {}
      return next;
    });
  }, []);

  return [settings, update] as const;
}
