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
  return (
    <Card className="border-border/60 bg-gradient-to-br from-primary/[0.08] via-card to-card shadow-lg shadow-black/30">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          Pricing snapshot
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Average and range use the 5 most recent sold listings from the latest market update (the same 5 used for your tier).
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Average sold
          </p>
          <p className="mt-1 text-4xl font-semibold tracking-tight text-primary sm:text-5xl">
            {formatUsd(data.avgPrice)}
          </p>
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
        <div className="flex flex-col gap-1 border-t border-border/60 pt-4 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <span>
            Condition:{" "}
            <span className="font-medium text-foreground">{conditionLabel(data.conditionBucket)}</span>
          </span>
          <span>Last updated {formatUpdatedAt(data.lastUpdated)}</span>
        </div>
        <p className="text-xs text-muted-foreground">
          {tier === "starter"
            ? "Starter includes 3 visible sold listings. Upgrade to Collector to see the full 5-listing market snapshot."
            : tier === "preview"
              ? "Preview mode includes 1 visible sold listing. Create a free account to see more results."
              : "Full 5-listing market snapshot is shown below."}
        </p>
      </CardContent>
    </Card>
  );
}
