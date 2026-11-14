"use client";
/* eslint-disable @next/next/no-img-element */

import packageJson from "../../../package.json";

declare global {
  interface Window {
    CPInnovationSignature?: { openAbout: (options: Record<string, string>) => void };
  }
}

/** App icon (public/app-icon.svg). */
export function AppIcon({ className = "size-9" }: { className?: string }) {
  return <img src="/app-icon.svg" alt="" className={className} />;
}

/** "Built by AI Team" badge: the light or dark artwork follows the theme (see .theme-light-only in globals.css). */
export function TeamBadge({ className = "h-9 w-auto" }: { className?: string }) {
  const openAbout = () =>
    window.CPInnovationSignature?.openAbout({
      baseUrl: "/cp-ai-signature/assets",
      locale: "th",
      product: "Robot Monitoring",
      appId: "AU004",
      version: packageJson.version,
      developedBy: "AI Team (Wannachol ,Nattaporn )",
      maintainedBy: "AI Team",
      department: "CP-Innovation",
    });
  return (
    <button
      type="button"
      aria-label="About CP-Innovation AI Team"
      onClick={openAbout}
      className="cursor-pointer border-0 bg-transparent p-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
    >
      <img src="/badge-light.svg" alt="" className={`theme-light-only ${className}`} />
      <img src="/badge-dark.svg" alt="" className={`theme-dark-only ${className}`} />
    </button>
  );
}

/** Wide "CP-INNOVATION | AI TEAM" logo (public/brand-light.svg / brand-dark.svg), following the theme. */
export function BrandLogo({ className = "h-9 w-auto" }: { className?: string }) {
  return (
    <>
      <img src="/brand-light.svg" alt="CP-Innovation AI Team" className={`theme-light-only ${className}`} />
      <img src="/brand-dark.svg" alt="CP-Innovation AI Team" className={`theme-dark-only ${className}`} />
    </>
  );
}
