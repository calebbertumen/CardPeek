"use client";

import type { ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const searchBarCardClassName =
  "w-full max-w-none !overflow-visible border-border/80 bg-card shadow-md shadow-black/25 sm:rounded-xl";

export type SearchBarShellProps = {
  id?: string;
  className?: string;
  fieldsSlot: ReactNode;
  footerSlot?: ReactNode;
};

/**
 * Shared chrome for every card-style search bar in the app (shadow, padding).
 * Wrap with a div using {@link searchBarWidthClassName} where responsive width is needed.
 */
export function SearchBarShell({ id, className, fieldsSlot, footerSlot }: SearchBarShellProps) {
  return (
    <Card id={id} className={cn(searchBarCardClassName, className)}>
      <CardContent className="pt-1 pb-1 sm:pb-5">
        <div className="text-left">{fieldsSlot}</div>
        {footerSlot}
      </CardContent>
    </Card>
  );
}
