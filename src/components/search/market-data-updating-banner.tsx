"use client";

import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type MarketDataUpdatingBannerProps = {
  className?: string;
};

/** Shared copy for route loading, in-flight scrape, and stale-cache refresh. */
export function MarketDataUpdatingBanner({ className }: MarketDataUpdatingBannerProps) {
  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-xl border border-border/80 bg-surface-alt/35 px-4 py-3 text-sm",
        className,
      )}
      role="status"
      aria-live="polite"
    >
      <Loader2 className="mt-0.5 h-4 w-4 shrink-0 animate-spin text-primary" aria-hidden />
      <p className="leading-relaxed">
        <span className="font-medium text-foreground">This card&apos;s market data is being updated.</span>{" "}
        <span className="text-muted-foreground">Results will appear automatically when ready.</span>
      </p>
    </div>
  );
}
