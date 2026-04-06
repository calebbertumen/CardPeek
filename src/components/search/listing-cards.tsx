import { ExternalLink, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { formatSoldDate, formatUsd } from "@/lib/format";
import type { CardMarketView } from "@/lib/market/card-market-view";
import Link from "next/link";
import type { AccessTier } from "@/lib/billing/access";

type Props = {
  listings: CardMarketView["listings"];
  tier: AccessTier;
};

export function ListingCards({ listings, tier }: Props) {
  if (listings.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-border/80 bg-surface-alt/50 px-4 py-12 text-center text-sm text-muted-foreground">
        No sold listings found for this bucket yet.
      </p>
    );
  }

  const lockedCount = tier === "preview" ? 4 : tier === "starter" ? 2 : 0;

  return (
    <ul className="space-y-4">
      {listings.map((listing) => (
        <li key={listing.position}>
          <Card className="overflow-hidden border-border/80 shadow-sm transition-[border-color,box-shadow] hover:border-primary/35 hover:shadow-lg hover:shadow-black/25">
            <CardHeader className="space-y-2 pb-3">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 flex-1 space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">Listing {listing.position}</p>
                  <h3 className="text-base font-medium leading-snug text-foreground">{listing.title}</h3>
                </div>
                <div className="flex shrink-0 flex-col items-start gap-2 sm:items-end">
                  <p className="text-xl font-semibold tracking-tight text-primary">{formatUsd(listing.soldPrice)}</p>
                  <Button variant="outline" size="sm" className="rounded-full" asChild>
                    <a href={listing.listingUrl} target="_blank" rel="noopener noreferrer">
                      View
                      <ExternalLink className="ml-1.5 h-3.5 w-3.5" aria-hidden />
                    </a>
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="border-t border-border/60 bg-surface-alt/40 pt-3">
              <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-muted-foreground">
                <span>
                  Sold <span className="font-medium text-foreground">{formatSoldDate(listing.soldDate)}</span>
                </span>
                {listing.conditionLabel ? (
                  <span>
                    Condition{" "}
                    <span className="font-medium text-foreground">{listing.conditionLabel}</span>
                  </span>
                ) : null}
                {listing.gradeLabel ? (
                  <span>
                    Grade <span className="font-medium text-foreground">{listing.gradeLabel}</span>
                  </span>
                ) : null}
              </div>
            </CardContent>
          </Card>
        </li>
      ))}

      {lockedCount > 0
        ? Array.from({ length: lockedCount }).map((_, i) => (
            <li key={`locked-${i}`}>
              <Card className="overflow-hidden border-border/80 bg-card shadow-sm">
                <CardHeader className="space-y-2 pb-3">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0 flex-1 space-y-1">
                      <p className="text-xs font-medium text-muted-foreground">Locked listing</p>
                      <div className="flex items-center gap-2">
                        <Lock className="h-4 w-4 text-muted-foreground" aria-hidden />
                        <p className="text-base font-medium text-foreground">Unlock full market snapshot</p>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {tier === "preview" ? "Create a free account to see more results." : "See all 5 recent sold listings."}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-col items-start gap-2 sm:items-end">
                      <div className="h-7 w-28 rounded-md bg-surface-alt/60 blur-[1px]" aria-hidden />
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="border-t border-border/60 bg-surface-alt/40 pt-3">
                  <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-muted-foreground">
                    <span className="rounded-md bg-surface-alt/60 px-2 py-1 blur-[1px]" aria-hidden>
                      Sold — —
                    </span>
                    <span className="rounded-md bg-surface-alt/60 px-2 py-1 blur-[1px]" aria-hidden>
                      Condition — —
                    </span>
                  </div>
                </CardContent>
              </Card>
            </li>
          ))
        : null}

      {tier === "starter" || tier === "preview" ? (
        <li>
          <div className="rounded-2xl border border-border/80 bg-surface-alt/30 px-4 py-4 sm:px-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-1">
                <p className="text-sm font-medium text-foreground">
                  {tier === "preview" ? "Create a free account to keep exploring" : "Unlock the full picture of what your card is worth"}
                </p>
                <p className="text-sm text-muted-foreground">
                  {tier === "preview"
                    ? "Free accounts unlock more searches and a more detailed market snapshot."
                    : "Collector shows every recent sold listing we store, with priority data updates and deal alerts."}
                </p>
              </div>
              <Button asChild className="shrink-0 rounded-full px-6">
                <Link href={tier === "preview" ? "/register?callbackUrl=/search" : "/pricing"}>
                  {tier === "preview" ? "Create free account" : "Upgrade to Collector"}
                </Link>
              </Button>
            </div>
          </div>
        </li>
      ) : null}
    </ul>
  );
}
