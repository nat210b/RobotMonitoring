"use client";

import type { ReactNode } from "react";
import { Button, OptionCard, Sidebar } from "../ui";
import type { Settings } from "./useSettings";

const icon = (d: ReactNode) => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    {d}
  </svg>
);
export const GearIcon = () =>
  icon(
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h0a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51h0a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v0a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </>,
  );
const CloseIcon = () => icon(<path d="M18 6 6 18M6 6l12 12" />);
const SunIcon = () =>
  icon(
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
    </>,
  );
const MoonIcon = () => icon(<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />);
const LayersIcon = () => icon(<path d="m12 2 10 5-10 5L2 7zM2 17l10 5 10-5M2 12l10 5 10-5" />);
const TagIcon = () =>
  icon(
    <>
      <path d="M20.59 13.41 13.42 20.58a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
      <circle cx="7" cy="7" r="1" />
    </>,
  );
const PulseIcon = () => icon(<path d="M22 12h-4l-3 9L9 3l-3 9H2" />);

const Heading = ({ title }: { title: string }) => <h3 className="mb-3 text-base font-semibold">{title}</h3>;

const bar = "h-1.5 rounded-full";

/** Settings drawer: room-view toggles and theme, laid out as grids of option cards. */
export function SettingsPanel({ settings, onChange, onClose, className }: { settings: Settings; onChange: (patch: Partial<Settings>) => void; onClose: () => void; className?: string }) {
  return (
    <Sidebar
      side="right"
      className={className}
      title={
        <span className="block">
          <span className="block text-xs font-normal text-muted">Preferences</span>
          <span className="block text-xl font-medium">Settings</span>
        </span>
      }
      actions={
        <Button variant="secondary" size="sm" onClick={onClose} aria-label="Close settings">
          <CloseIcon />
        </Button>
      }
    >
      <section>
        <Heading title="Room view" />
        <div className="grid grid-cols-3 gap-2">
          <OptionCard
            label="Sections"
            icon={<LayersIcon />}
            selected={settings.showHighlight}
            onClick={() => onChange({ showHighlight: !settings.showHighlight })}
            preview={<span className="h-8 w-14 rounded border border-dashed border-brand bg-brand/25" />}
          />
          <OptionCard
            label="Names"
            icon={<TagIcon />}
            selected={settings.showSectionNames}
            onClick={() => onChange({ showSectionNames: !settings.showSectionNames })}
            preview={<span className="rounded-full bg-brand px-2 py-0.5 text-[10px] font-bold text-white">UPG</span>}
          />
          <OptionCard
            label="Status"
            icon={<PulseIcon />}
            selected={settings.showMachineStatus}
            onClick={() => onChange({ showMachineStatus: !settings.showMachineStatus })}
            preview={<span className="rounded-full bg-brand px-2 py-0.5 text-[10px] font-bold text-white">PASS</span>}
          />
        </div>
      </section>

      <section className="mt-6">
        <Heading title="Theme" />
        <div className="grid grid-cols-2 gap-2">
          <OptionCard
            label="Light"
            icon={<SunIcon />}
            selected={settings.theme === "light"}
            onClick={() => onChange({ theme: "light" })}
            preview={
              <span className="flex w-full flex-col gap-1 bg-[#f5f7f4] p-2">
                <span className={`${bar} w-6 bg-white`} />
                <span className={`${bar} w-full bg-[#b9c2b6]`} />
                <span className={`${bar} w-full bg-[#b9c2b6]`} />
              </span>
            }
          />
          <OptionCard
            label="Dark"
            icon={<MoonIcon />}
            selected={settings.theme === "dark"}
            onClick={() => onChange({ theme: "dark" })}
            preview={
              <span className="flex w-full flex-col gap-1 bg-[#161e2a] p-2">
                <span className={`${bar} w-6 bg-[#2b3544]`} />
                <span className={`${bar} w-full bg-[#4a5565]`} />
                <span className={`${bar} w-full bg-[#4a5565]`} />
              </span>
            }
          />
        </div>
      </section>
    </Sidebar>
  );
}
