import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

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
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">{children}</div>
        <footer className="shrink-0 border-t border-line bg-surface px-4 py-2 text-center text-xs text-muted sm:px-8">
          Powered by : TH-CP1-Innovation Team (Wannachol ,Nattaporn )
        </footer>
      </body>
    </html>
  );
}
