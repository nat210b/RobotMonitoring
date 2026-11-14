"use client";

import Script from "next/script";
import { useEffect, useRef, useState } from "react";

/**
 * Wrappers for the AI Team signature kit (ported from public/SignatureComponents.jsx). They mount the one shared
 * browser component `window.CPInnovationSignature`, so the kit's files must be served from /cp-ai-signature:
 *   public/cp-ai-signature/dist/ai-team-signature.css and .js, and public/cp-ai-signature/assets/.
 */
export type SignatureConfig = {
  baseUrl?: string;
  theme?: "light" | "dark";
  locale?: string;
  product?: string;
  version?: string;
  appId?: string;
  department?: string;
  developedBy?: string;
  maintainedBy?: string;
  projectOwner?: string;
  contact?: string;
  releaseDate?: string;
};

type SignatureApi = Record<"mountLogo" | "mountBadge" | "mountFooter", (el: HTMLElement, options: object) => void | (() => void)>;

export const SIGNATURE_KIT = { css: "/cp-ai-signature/dist/ai-team-signature.css", js: "/cp-ai-signature/dist/ai-team-signature.js" } as const;

/** Loads the kit's stylesheet and script once; `status` is "ready" when window.CPInnovationSignature exists. */
export function SignatureKit({ onStatus }: { onStatus: (status: "ready" | "missing") => void }) {
  return (
    <>
      <link rel="stylesheet" href={SIGNATURE_KIT.css} />
      <Script
        src={SIGNATURE_KIT.js}
        strategy="afterInteractive"
        onReady={() => onStatus((window as unknown as { CPInnovationSignature?: SignatureApi }).CPInnovationSignature ? "ready" : "missing")}
        onError={() => onStatus("missing")}
      />
    </>
  );
}

function useSignature(type: "logo" | "badge" | "footer", config: SignatureConfig, ready: boolean) {
  const element = useRef<HTMLSpanElement>(null);
  const {
    baseUrl = "/cp-ai-signature/assets", theme = "dark", locale = "en", product = "", version = "", appId = "",
    department = "CP-Innovation", developedBy = "AI Team", maintainedBy = "AI Team", projectOwner = "", contact = "", releaseDate = "",
  } = config;
  useEffect(() => {
    const api = (window as unknown as { CPInnovationSignature?: SignatureApi }).CPInnovationSignature;
    if (!ready || !api || !element.current) return;
    const key = type === "logo" ? "mountLogo" : type === "footer" ? "mountFooter" : "mountBadge";
    const cleanup = api[key](element.current, { baseUrl, theme, locale, product, version, appId, department, developedBy, maintainedBy, projectOwner, contact, releaseDate });
    return typeof cleanup === "function" ? cleanup : undefined;
  }, [ready, type, baseUrl, theme, locale, product, version, appId, department, developedBy, maintainedBy, projectOwner, contact, releaseDate]);
  return element;
}

type Props = SignatureConfig & { ready: boolean };

export function SignatureLogo({ ready, ...config }: Props) {
  return <span className="cpait-slot" ref={useSignature("logo", config, ready)} />;
}
export function SignatureBadge({ ready, ...config }: Props) {
  return <span className="cpait-slot" ref={useSignature("badge", config, ready)} />;
}
export function SignatureFooter({ ready, ...config }: Props) {
  return <span className="cpait-slot" ref={useSignature("footer", config, ready)} />;
}

/** Page-level state for the kit: render <SignatureKit onStatus={setStatus}/> once and pass `status === "ready"` to the wrappers. */
export function useSignatureStatus() {
  return useState<"loading" | "ready" | "missing">("loading");
}
