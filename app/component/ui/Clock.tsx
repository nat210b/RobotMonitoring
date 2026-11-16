"use client";

import { useEffect, useState } from "react";
import { cn } from "./cn";

/**
 * HUD live clock: glowing monospace digits with a blinking separator in an angular, bracketed chip, and the
 * date in spaced capitals under it. Updates every second. Starts empty and fills in after mount, because
 * reading the time while rendering would freeze it into the prerendered page.
 */
export function Clock({ className }: { className?: string }) {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    const tick = () => setNow(new Date());
    const first = setTimeout(tick, 0);
    const timer = setInterval(tick, 1000);
    return () => {
      clearTimeout(first);
      clearInterval(timer);
    };
  }, []);

  const pad = (v: number) => String(v).padStart(2, "0");
  const parts = now ? [pad(now.getHours()), pad(now.getMinutes()), pad(now.getSeconds())] : ["--", "--", "--"];
  const date = now ? now.toLocaleDateString("en-GB", { weekday: "short", day: "2-digit", month: "short", year: "numeric" }).replace(/,/g, "") : " ";

  return (
    <time
      dateTime={now?.toISOString()}
      aria-label={now ? now.toLocaleString("en-GB") : "Clock"}
      className={cn(
        "relative block border border-brand/50 bg-brand/5 px-3 py-1 text-center leading-none tabular-nums",
        "[clip-path:polygon(8px_0,100%_0,100%_calc(100%-8px),calc(100%-8px)_100%,0_100%,0_8px)]",
        className,
      )}
    >
      {/* corner ticks */}
      <span aria-hidden className="absolute top-0 left-2 h-px w-3 bg-brand" />
      <span aria-hidden className="absolute right-2 bottom-0 h-px w-3 bg-brand" />
      <span className="flex items-center justify-center gap-1.5 font-mono text-xl font-bold text-brand [text-shadow:0_0_10px_var(--brand)]">
        <span aria-hidden className="mr-1 size-1.5 animate-pulse bg-brand shadow-[0_0_6px_var(--brand)] motion-reduce:animate-none" />
        {parts.map((p, i) => (
          <span key={i} className="flex items-center gap-1.5">
            {i > 0 && <span aria-hidden className="animate-pulse text-brand/70 motion-reduce:animate-none">:</span>}
            {p}
          </span>
        ))}
      </span>
      <span className="mt-1 block text-[9px] font-semibold tracking-[0.25em] text-muted uppercase">{date}</span>
    </time>
  );
}
