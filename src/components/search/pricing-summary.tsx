import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatUpdatedAt, formatUsd } from "@/lib/format";
import type { CardMarketView } from "@/lib/market/card-market-view";
import { CONDITION_OPTIONS } from "@/lib/normalize";
import type { AccessTier } from "@/lib/billing/access";

type Props = {
  data: CardMarketView;
  tier: AccessTier;
};

function conditionLabel(bucket: string): string {
  return CONDITION_OPTIONS.find((c) => c.value === bucket)?.label ?? bucket;
}

export function PricingSummary({ data, tier }: Props) {
  const showOutlierNote =
    tier === "collector" && Array.isArray(data.avgExcludedPrices) && data.avgExcludedPrices.length > 0;

  return (
    <Card className="border-border/60 bg-gradient-to-br from-primary/[0.08] via-card to-card shadow-lg shadow-black/30">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          Pricing snapshot
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Average and range are calculated from recent sold listings in the latest market update.
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {data.listingsCount === 0 ? (
          <div>
            <p className="text-sm font-medium text-foreground">No sold listings in this snapshot</p>
            <p className="mt-2 text-sm text-muted-foreground">
              The latest market update completed but didn&apos;t return matching sales for this card and condition.
              Try another set or condition, or check back later.
            </p>
          </div>
        ) : (
          <>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Average sold
              </p>
              <p className="mt-1 text-4xl font-semibold tracking-tight text-primary sm:text-5xl">
                {formatUsd(data.avgPrice)}
              </p>
              {showOutlierNote ? (
                <p className="mt-1 text-xs text-muted-foreground">
                  Outliers excluded from average:{" "}
                  <span className="font-medium text-foreground">
                    {data.avgExcludedPrices!.map((p) => formatUsd(p)).join(", ")}
                  </span>
                </p>
              ) : null}
            </div>
            <div className="grid grid-cols-2 gap-4 border-t border-border/60 pt-4 sm:grid-cols-4">
              <div>
                <p className="text-xs text-muted-foreground">Median</p>
                <p className="mt-0.5 text-lg font-semibold text-primary">{formatUsd(data.medianPrice)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Low</p>
                <p className="mt-0.5 text-lg font-semibold text-primary">{formatUsd(data.lowPrice)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">High</p>
                <p className="mt-0.5 text-lg font-semibold text-primary">{formatUsd(data.highPrice)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Listings</p>
                <p className="mt-0.5 text-lg font-semibold text-foreground">{data.listingsCount}</p>
              </div>
            </div>
          </>
        )}
        <div className="flex flex-col gap-1 border-t border-border/60 pt-4 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <span>
            Condition:{" "}
            <span className="font-medium text-foreground">{conditionLabel(data.conditionBucket)}</span>
          </span>
          <span>Last updated {formatUpdatedAt(data.lastUpdated)}</span>
        </div>
        <p className="text-xs text-muted-foreground">
          {data.listingsCount === 0
            ? "Run another search or adjust filters if you expected to see sales here."
            : tier === "collector"
              ? "The 5 most recent sold listings are shown below."
              : "Sold listing details are locked on Free. Upgrade to Collector to see the actual sales behind the estimate."}
        </p>
      </CardContent>
    </Card>
  );
}
