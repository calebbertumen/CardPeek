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
  listingsCount: number;
  /** Sold & completed search on eBay for the same keyword used for these comps. */
  ebaySoldSearchUrl: string | null;
};

export function ListingCards({ listings, tier, listingsCount, ebaySoldSearchUrl }: Props) {
  const desiredCount = 5;
  const visibleCount = tier === "collector" ? desiredCount : 0;
  const visible = listings.slice(0, Math.max(0, visibleCount));
  const hasAnySales = listingsCount > 0;
  const previewCount = hasAnySales ? Math.min(desiredCount, Math.max(3, listingsCount)) : 0;
  // Collector should never see "locked" placeholders; if fewer than 5 sales exist,
  // show only what we have.
  const lockedCount = tier === "collector" ? 0 : previewCount;
  const isLockedTier = tier === "starter" || tier === "preview";

  return (
    <ul className="space-y-4">
      {visible.map((listing) => {
        return (
          <li key={`${listing.position}-${listing.listingUrl}`}>
            <Card className="overflow-hidden border-border/80 shadow-sm transition-[border-color,box-shadow] hover:border-primary/35 hover:shadow-lg hover:shadow-black/25">
              <CardHeader className="space-y-2 pb-3">
                <div className="flex min-w-0 flex-1 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0 flex-1 space-y-1">
                      <p className="text-xs font-medium text-muted-foreground">Listing {listing.position}</p>
                      <h3 className="text-base font-medium leading-snug text-foreground">{listing.title}</h3>
                    </div>
                    <div className="flex shrink-0 flex-col items-start gap-2 sm:items-end">
                      <p className="text-xl font-semibold tracking-tight text-primary">{formatUsd(listing.soldPrice)}</p>
                      {listing.listingUrl.trim() ? (
                        <Button variant="outline" size="sm" className="rounded-full" asChild>
                          <a href={listing.listingUrl} target="_blank" rel="noopener noreferrer">
                            View
                            <ExternalLink className="ml-1.5 h-3.5 w-3.5" aria-hidden />
                          </a>
                        </Button>
                      ) : null}
                    </div>
                </div>
              </CardHeader>
              <CardContent className="border-t border-border/60 bg-surface-alt/40 pt-3">
                <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-muted-foreground">
                  <span>
                    Sold{" "}
                    <span className="font-medium text-foreground">
                      {formatSoldDate(listing.soldDate)}{" "}
                      <span className="text-muted-foreground">(local time)</span>
                    </span>
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
        );
      })}

      {!hasAnySales ? (
        <li>
          <p className="rounded-2xl border border-dashed border-border/80 bg-surface-alt/50 px-4 py-12 text-center text-sm text-muted-foreground">
            No recent sales found for this card yet.
          </p>
        </li>
      ) : null}

      {hasAnySales && isLockedTier ? (
        <li>
          <div className="rounded-2xl border border-border/80 bg-surface-alt/30 px-4 py-3 text-sm text-muted-foreground sm:px-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p>
                Average and range are based on real recent sales. Listing details are locked on Free.
              </p>
              <button
                type="button"
                className="text-xs font-medium text-foreground underline underline-offset-4"
                title="To keep CardPeek cost-efficient, Free shows the pricing summary while Collector unlocks the underlying sold listings used to calculate it."
              >
                Why locked?
              </button>
            </div>
          </div>
        </li>
      ) : null}

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
                        {tier === "preview" ? "Create a free account to unlock Starter." : "Upgrade to Collector to view sold listings."}
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

      {hasAnySales && ebaySoldSearchUrl && tier === "collector" ? (
        <li className="pt-1">
          <Button variant="outline" className="w-full rounded-full sm:w-auto" asChild>
            <a href={ebaySoldSearchUrl} target="_blank" rel="noopener noreferrer">
              View sold search on eBay
              <ExternalLink className="ml-2 h-4 w-4" aria-hidden />
            </a>
          </Button>
        </li>
      ) : null}

      {hasAnySales && (tier === "starter" || tier === "preview") ? (
        <li>
          <div className="rounded-2xl border border-border/80 bg-surface-alt/30 px-4 py-4 sm:px-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-1">
                <p className="text-sm font-medium text-foreground">
                  {tier === "preview" ? "Create a free account to keep exploring" : "Unlock sold listings"}
                </p>
                <p className="text-sm text-muted-foreground">
                  {tier === "preview"
                    ? "Free accounts unlock more searches and a more detailed market snapshot."
                    : "Upgrade to Collector to see the actual eBay sales behind the price."}
                </p>
              </div>
              <div className="shrink-0">
                <Button asChild className="w-full rounded-full px-6 sm:w-auto">
                  <Link href={tier === "preview" ? "/register?callbackUrl=/search" : "/pricing"}>
                    {tier === "preview" ? "Create free account" : "Upgrade to Collector"}
                  </Link>
                </Button>
                <div className="mt-2 text-center sm:text-right">
                  <Link
                    href={tier === "preview" ? "/login?callbackUrl=/search" : "/pricing"}
                    className="text-xs font-medium text-muted-foreground underline underline-offset-4 hover:text-foreground"
                  >
                    {tier === "preview" ? "Log in" : "Compare plans"}
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </li>
      ) : null}
    </ul>
  );
}
