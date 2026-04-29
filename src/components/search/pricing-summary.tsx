import { Info } from "lucide-react";
import { Lock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { formatUpdatedAt, formatUsd, formatUsdSpan, formatUsdWhole } from "@/lib/format";
import type { CardMarketView } from "@/lib/market/card-market-view";
import { CONDITION_OPTIONS } from "@/lib/normalize";
import type { AccessTier } from "@/lib/billing/access";
import {
  buildMarketSignalLine,
  confidenceDisplayLabel,
  confidenceTooltip,
  shouldShowWideSpreadClarification,
  trendDisplayLabel,
  trendTooltip,
  WIDE_SPREAD_NOTE,
  WIDE_SPREAD_NOTE_SHORT,
} from "@/lib/pricing/pricing-snapshot-copy";
import { soldSampleStrengthLabel } from "@/lib/pricing/sold-sample-strength";
import { PremiumInsightsTeaser } from "@/components/search/premium-insights-teaser";

type Props = {
  data: CardMarketView;
  tier: AccessTier;
};

function conditionLabel(bucket: string): string {
  return CONDITION_OPTIONS.find((c) => c.value === bucket)?.label ?? bucket;
}

function roundToNearest(amount: number, step: number): number {
  if (!Number.isFinite(amount) || !Number.isFinite(step) || step <= 0) return amount;
  return Math.round(amount / step) * step;
}

export function PricingSummary({ data, tier }: Props) {
  const ins = data.snapshotInsights;
  const showExcludedNote = Array.isArray(data.avgExcludedPrices) && data.avgExcludedPrices.length > 0;
  const isCollector = tier === "collector";
  const showWideSpread = shouldShowWideSpreadClarification({
    avgPrice: data.avgPrice,
    medianPrice: data.medianPrice,
    lowPrice: data.lowPrice,
    highPrice: data.highPrice,
    fairPriceLow: ins.fairPriceLow,
    fairPriceHigh: ins.fairPriceHigh,
    listingsCount: data.listingsCount,
  });
  const marketSignal = buildMarketSignalLine({
    showWideSpread,
    confidence: ins.confidence,
    trend: ins.trend,
  });
  const showPremiumTeaser = !isCollector;

  const freeRoundingStep = 5;
  const typicalLow = isCollector ? ins.fairPriceLow : roundToNearest(ins.fairPriceLow, freeRoundingStep);
  const typicalHigh = isCollector ? ins.fairPriceHigh : roundToNearest(ins.fairPriceHigh, freeRoundingStep);
  const lowerEndDeals = isCollector ? ins.goodDealUnder : roundToNearest(ins.goodDealUnder, freeRoundingStep);
  const higherEndListings = isCollector ? ins.sellTarget : roundToNearest(ins.sellTarget, freeRoundingStep);

  return (
    <Card className="border-border/60 bg-gradient-to-br from-primary/[0.08] via-card to-card shadow-lg shadow-black/30">
      <CardContent className="space-y-5 px-3 pb-3 pt-3 sm:space-y-6 sm:px-4 sm:pb-4 sm:pt-4">
        {data.listingsCount === 0 ? (
          <div>
            <p className="text-sm font-medium text-foreground">
              {data.conditionBucket.startsWith("raw_")
                ? "No matching sold listings found for this condition."
                : "No sold listings in this snapshot"}
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Try another set or condition, or check back later.
            </p>
          </div>
        ) : (
          <>
            {/* 1 Headline */}
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                Estimated market value
              </p>
              <p className="mt-1 text-3xl font-semibold tracking-tight text-primary sm:text-4xl lg:text-5xl">
                {formatUsd(data.avgPrice)}
              </p>
              {!isCollector ? (
                <p className="mt-1 text-[11px] leading-snug text-muted-foreground">
                  Quick estimate from recent sales. Unlock exact comps to verify.
                </p>
              ) : null}
            </div>

            {/* 2 Market snapshot cards */}
            <div className="space-y-3 sm:space-y-3.5">
              <div className="space-y-0.5">
                <div className="flex items-center gap-1.5">
                  <h3 className="text-xs font-semibold tracking-tight text-foreground sm:text-[13px]">
                    Recent market snapshot
                  </h3>
                  <button
                    type="button"
                    className="shrink-0 rounded-full text-muted-foreground/65 outline-none transition-colors hover:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                    title="Based on recent sold listings. Prices may vary."
                    aria-label="Based on recent sold listings. Prices may vary."
                  >
                    <Info className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
                  </button>
                </div>
                <p className="text-[11px] leading-snug text-muted-foreground sm:text-xs">
                  Based on recent sold listings, not active listings.
                </p>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-3 lg:gap-4">
                <div className="rounded-lg border border-primary/25 bg-primary/[0.05] p-3.5">
                  <p className="text-[11px] font-medium text-foreground">Typical range</p>
                  <p className="mt-1 text-lg font-bold tracking-tight text-primary sm:text-xl">
                    {formatUsdSpan(typicalLow, typicalHigh)}
                  </p>
                  <p className="mt-1.5 text-[10px] leading-snug text-muted-foreground">
                    {isCollector ? "Based on recent sales" : "Snapshot range (upgrade to verify comps)"}
                  </p>
                </div>
                <div className="rounded-lg border border-border/50 bg-card/50 p-3.5">
                  <p className="text-[11px] font-medium text-muted-foreground">Lower-end deals</p>
                  <p className="mt-1 text-lg font-semibold tabular-nums text-emerald-600 dark:text-emerald-400 sm:text-xl">
                    {formatUsd(lowerEndDeals)}
                  </p>
                  <p className="mt-1.5 text-[10px] leading-snug text-muted-foreground">Occasionally seen</p>
                </div>
                <div className="rounded-lg border border-border/50 bg-card/50 p-3.5">
                  <p className="text-[11px] font-medium text-muted-foreground">Higher-end listings</p>
                  <p className="mt-1 text-lg font-semibold tabular-nums text-foreground sm:text-xl">
                    {formatUsdWhole(higherEndListings)}
                    <span className="text-sm font-semibold">+</span>
                  </p>
                  <p className="mt-1.5 text-[10px] leading-snug text-muted-foreground">If condition is strong</p>
                </div>
              </div>
              <p
                className="text-[10px] leading-relaxed text-muted-foreground/85 sm:text-[11px]"
                role="note"
              >
                Estimates are based on recent sold listings and may vary by condition and timing. Not financial advice.
              </p>
            </div>

            {/* 3 Chips (secondary) */}
            <div className="flex flex-wrap items-center gap-1.5">
              <span
                className="inline-flex cursor-default items-center rounded-md border border-border/50 bg-muted/15 px-2 py-1 text-[11px] text-muted-foreground"
                title={confidenceTooltip(ins.confidence)}
              >
                {confidenceDisplayLabel(ins.confidence)}
              </span>
              {ins.trend ? (
                <span
                  className="inline-flex cursor-default items-center rounded-md border border-border/50 bg-muted/15 px-2 py-1 text-[11px] text-muted-foreground"
                  title={trendTooltip(ins.trend)}
                >
                  {trendDisplayLabel(ins.trend)}
                </span>
              ) : null}
              {!isCollector ? (
                <button
                  type="button"
                  className="inline-flex items-center gap-1 rounded-md border border-border/50 bg-muted/10 px-2 py-1 text-[11px] text-muted-foreground transition-colors hover:text-foreground"
                  title="Collector shows the comp-by-comp context behind this estimate."
                >
                  <Lock className="h-3.5 w-3.5" aria-hidden />
                  What’s behind this estimate?
                </button>
              ) : null}
            </div>

            {/* 4 Supporting stats */}
            <div className="grid grid-cols-2 gap-2 border-t border-border/40 pt-4 sm:grid-cols-4 sm:gap-3">
              <div>
                <p className="flex items-center gap-1 text-[10px] text-muted-foreground">
                  {!isCollector ? <Lock className="h-3 w-3 shrink-0" aria-hidden /> : null}
                  <span>Median</span>
                </p>
                {isCollector ? (
                  <p className="mt-0.5 text-sm font-medium tabular-nums text-foreground/80">{formatUsd(data.medianPrice)}</p>
                ) : (
                  <p className="mt-0.5 text-sm font-medium text-muted-foreground">See where most sales land</p>
                )}
              </div>
              <div>
                <p className="flex items-center gap-1 text-[10px] text-muted-foreground">
                  {!isCollector ? <Lock className="h-3 w-3 shrink-0" aria-hidden /> : null}
                  <span>Low</span>
                </p>
                {isCollector ? (
                  <p className="mt-0.5 text-sm font-medium tabular-nums text-foreground/80">{formatUsd(data.lowPrice)}</p>
                ) : (
                  <p className="mt-0.5 text-sm font-medium text-muted-foreground">
                    One sale ran lower. Unlock to see why.
                  </p>
                )}
              </div>
              <div>
                <p className="flex items-center gap-1 text-[10px] text-muted-foreground">
                  {!isCollector ? <Lock className="h-3 w-3 shrink-0" aria-hidden /> : null}
                  <span>High</span>
                </p>
                {isCollector ? (
                  <p className="mt-0.5 text-sm font-medium tabular-nums text-foreground/80">{formatUsd(data.highPrice)}</p>
                ) : (
                  <p className="mt-0.5 text-sm font-medium text-muted-foreground">
                    Another sold higher. Compare listings.
                  </p>
                )}
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground">Sample</p>
                <p className="mt-0.5 text-sm font-medium text-foreground/80">
                  {isCollector
                    ? `Based on ${data.usableCompCount} matching sale${data.usableCompCount === 1 ? "" : "s"}`
                    : `${data.listingsCount} sale${data.listingsCount === 1 ? "" : "s"}`}
                </p>
                {isCollector && data.listingsCount > 0 ? (
                  <p className="mt-0.5 text-[10px] text-muted-foreground">
                    {soldSampleStrengthLabel(data.soldSampleStrength)}
                  </p>
                ) : null}
              </div>
            </div>

            {data.limitedSampleNote ? (
              <p className="text-[10px] leading-snug text-muted-foreground">{data.limitedSampleNote}</p>
            ) : null}

            {/* 5 Condition + updated */}
            <div className="flex flex-col gap-0.5 border-t border-border/40 pt-3 text-[11px] text-muted-foreground sm:flex-row sm:items-baseline sm:justify-between sm:gap-4">
              <span>
                <span className="text-muted-foreground">Condition</span>{" "}
                <span className="font-medium text-foreground">{conditionLabel(data.conditionBucket)}</span>
              </span>
              <span>
                Updated <span className="text-foreground">{formatUpdatedAt(data.lastUpdated)}</span>
              </span>
            </div>

            {/* 6 Collapsed transparency */}
            <details className="group rounded-lg border border-border/50 bg-muted/10">
              <summary className="cursor-pointer list-none px-3 py-2.5 text-[11px] text-muted-foreground outline-none transition-colors hover:text-foreground sm:px-3.5 [&::-webkit-details-marker]:hidden">
                <span className="font-medium text-foreground/90">
                  Based on{" "}
                  {isCollector ? data.usableCompCount : data.listingsCount} recent sold listing
                  {(isCollector ? data.usableCompCount : data.listingsCount) === 1 ? "" : "s"}
                </span>
                <span className="ml-1.5 text-muted-foreground underline decoration-dotted underline-offset-2 group-open:hidden">
                  Details
                </span>
                <span className="ml-1.5 hidden text-muted-foreground group-open:inline">Hide</span>
              </summary>
              <div className="space-y-2 border-t border-border/40 px-3 py-3 text-[11px] leading-relaxed text-muted-foreground sm:px-3.5">
                <p>{ins.explainLine}</p>
                {ins.headlineUsesCleanedComps && ins.cleanedNote ? <p>{ins.cleanedNote}</p> : null}
                {showWideSpread ? (
                  <p className="hidden sm:block">{WIDE_SPREAD_NOTE}</p>
                ) : null}
                {showWideSpread ? <p className="sm:hidden">{WIDE_SPREAD_NOTE_SHORT}</p> : null}
                {showExcludedNote && isCollector ? (
                  <p>
                    <span className="font-medium text-foreground">Outliers excluded from headline:</span>{" "}
                    {data.avgExcludedPrices!.map((p) => formatUsd(p)).join(", ")}
                  </p>
                ) : null}
                {showExcludedNote && !isCollector ? (
                  <p className="inline-flex items-start gap-2 rounded-md border border-border/50 bg-muted/10 px-2 py-1.5">
                    <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
                    <span>
                      We softened or excluded{" "}
                      <span className="font-medium text-foreground">{data.avgExcludedPrices!.length}</span> unusual sale
                      {data.avgExcludedPrices!.length === 1 ? "" : "s"} in this snapshot. Unlock to see which comps.
                    </span>
                  </p>
                ) : null}
                {marketSignal ? <p className="font-medium text-foreground/90">{marketSignal}</p> : null}
              </div>
            </details>

            {showPremiumTeaser ? (
              <PremiumInsightsTeaser variant={tier === "preview" ? "preview" : "starter"} />
            ) : null}
          </>
        )}
        <p className="text-[10px] leading-snug text-muted-foreground sm:text-[11px]">
          {data.listingsCount === 0
            ? "Adjust filters or try again if you expected sales."
            : tier === "collector"
              ? "Sold listings below."
              : "Collector shows full listings and refresh context."}
        </p>
      </CardContent>
    </Card>
  );
}
