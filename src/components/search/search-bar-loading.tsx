"use client";

import { useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { SearchBarShell } from "@/components/search/search-bar-shell";
import { searchBarWidthClassName } from "@/components/search/search-bar-layout";
import { CardSearchFields } from "@/components/search/card-search-fields";
import { Button } from "@/components/ui/button";
import { normalizeConditionBucket } from "@/lib/normalize";

export function SearchBarLoading() {
  const sp = useSearchParams();
  const defaults = useMemo(() => {
    const name = (sp.get("name") ?? "").trim();
    const setName = (sp.get("setName") ?? "").trim();
    const cardNumber = (sp.get("cardNumber") ?? "").trim();
    const condition = normalizeConditionBucket((sp.get("condition") ?? "raw_nm").trim() || "raw_nm");
    return { name, setName, cardNumber, condition };
  }, [sp]);

  return (
    <div className="sticky top-14 z-30 w-full border-b border-border/60 bg-background/95 backdrop-blur-md sm:top-16">
      <div className="w-full py-4 sm:py-5">
        <div className={searchBarWidthClassName}>
          <SearchBarShell
            fieldsSlot={
              <CardSearchFields
                idPrefix="loading"
                defaults={defaults}
                viewerPlanId="starter"
                actionsSlot={
                  <Button type="button" disabled className="min-h-11 min-w-[8.5rem] rounded-full px-8 shadow-sm">
                    See results
                  </Button>
                }
              />
            }
          />
        </div>
      </div>
    </div>
  );
}

