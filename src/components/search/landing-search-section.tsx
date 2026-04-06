"use client";

import { useRouter } from "next/navigation";
import { useCallback } from "react";
import { Button } from "@/components/ui/button";
import { CardSearchFields } from "@/components/search/card-search-fields";
import { cn } from "@/lib/utils";
import { SearchBarShell } from "@/components/search/search-bar-shell";

type LandingSearchSectionProps = {
  /** Extra classes on the search card (e.g. solid white on colored hero) */
  shellClassName?: string;
  viewerPlanId?: "starter" | "collector";
};

export function LandingSearchSection({ shellClassName, viewerPlanId = "starter" }: LandingSearchSectionProps = {}) {
  const router = useRouter();

  const onSubmit = useCallback(
    (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      const fd = new FormData(e.currentTarget);
      const name = fd.get("name")?.toString().trim();
      if (!name) return;

      const params = new URLSearchParams();
      params.set("name", name);
      const setName = fd.get("setName")?.toString().trim();
      const cardNumber = fd.get("cardNumber")?.toString().trim();
      const condition = fd.get("condition")?.toString().trim() || "raw_nm";
      if (setName) params.set("setName", setName);
      if (cardNumber) params.set("cardNumber", cardNumber);
      if (condition && condition !== "raw_nm") params.set("condition", condition);

      router.push(`/search?${params.toString()}`);
    },
    [router],
  );

  return (
    <SearchBarShell
      id="search"
      className={cn("scroll-mt-24", shellClassName)}
      fieldsSlot={
        <form onSubmit={onSubmit}>
          <CardSearchFields
            idPrefix="home"
            viewerPlanId={viewerPlanId}
            actionsSlot={
              <Button type="submit" className="min-h-11 min-w-[8.5rem] rounded-full px-8 shadow-sm">
                See results
              </Button>
            }
          />
        </form>
      }
    />
  );
}
