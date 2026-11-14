import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import "../public/cp-ai-signature/dist/ai-team-signature.css";
import { AppIcon } from "./component/signature/BrandMarks";
import { CpaiSplash } from "./component/signature/CpaiSplash";
import app from "../package.json";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/** Next.js writes the build ID to .next/BUILD_ID (the folder is absent before the first build or dev run). */
function readBuildId() {
  try {
    return readFileSync(join(process.cwd(), ".next", "BUILD_ID"), "utf8").trim();
  } catch {
    return "dev";
  }
}
const BUILD_ID = readBuildId();

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Robot Monitoring",
  description: "3D view of the robot combined room and its machines.",
  icons: { icon: [{ url: "/favicon.svg", type: "image/svg+xml" }] },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      {/* App shell is exactly one viewport tall (no page scroll). Pages that are taller, like
          /design, scroll inside the content area; the footer stays pinned at the bottom. */}
      <body className="flex h-dvh flex-col overflow-hidden">
        <CpaiSplash />
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">{children}</div>
        <footer className="hud-bar flex shrink-0 items-center gap-3 border-t border-brand/50 px-4 py-2 text-xs tracking-wider text-muted sm:px-8">
          <AppIcon className="size-7" />
          Developed by CP-Innovation · AI Team (Wannachol ,Nattaporn ) ID: AU004 · v{app.version} | BuildID: {BUILD_ID} 
        </footer>
      </body>
    </html>
  );
}
