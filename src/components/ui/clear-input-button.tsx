"use client";

import { X } from "lucide-react";
import { cn } from "@/lib/utils";

type ClearInputButtonProps = {
  onClear: () => void;
  className?: string;
  "aria-label"?: string;
};

/** Sits at the right edge of a text field; use with a relative wrapper and extra input padding (e.g. pr-9). */
export function ClearInputButton({
  onClear,
  className,
  "aria-label": ariaLabel = "Clear field",
}: ClearInputButtonProps) {
  return (
    <button
      type="button"
      onMouseDown={(e) => e.preventDefault()}
      onClick={() => onClear()}
      className={cn(
        "absolute right-1.5 top-1/2 z-[5] flex size-7 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        className,
      )}
      aria-label={ariaLabel}
    >
      <X className="size-4 shrink-0" strokeWidth={2} aria-hidden />
    </button>
  );
}
