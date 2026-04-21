import { formatUsdSpan } from "@/lib/format";
import type { MarketConfidence, MarketTrend } from "@/lib/pricing/market-snapshot-insights";

/** Full wide-spread note (expanded transparency). */
export const WIDE_SPREAD_NOTE =
  "That wide low to high span is every stored comp together. Titles and condition can pull the ends apart. The fair band below is a tighter read of what’s typical.";

/** Shorter wide-spread note for narrow screens. */
export const WIDE_SPREAD_NOTE_SHORT =
  "That wide span mixes every comp; the fair band below is the tighter typical read.";

/**
 * When raw low to high is very wide vs the headline or vs the fair band, the big number can look “wrong”
 * without context. This flags that case for a short clarifying line (heuristic, not statistical rigor).
 */
export function shouldShowWideSpreadClarification(input: {
  avgPrice: number;
  medianPrice: number;
  lowPrice: number;
  highPrice: number;
  fairPriceLow: number;
  fairPriceHigh: number;
  listingsCount: number;
}): boolean {
  if (input.listingsCount < 2) return false;
  const raw = input.highPrice - input.lowPrice;
  if (!Number.isFinite(raw) || raw <= 0) return false;

  const anchor = Math.max(input.avgPrice, input.medianPrice, 1);
  const fairW = Math.max(input.fairPriceHigh - input.fairPriceLow, 0.01);

  // Range is large relative to the headline anchor (mixed comps, grades, etc.).
  if (raw / anchor >= 0.55) return true;
  // Raw range is much wider than the tightened fair band.
  if (raw / fairW >= 2.1) return true;
  return false;
}

/** One plain-English line derived from the fair band (and listing count). */
export function buildBuyerSummaryLine(input: {
  fairPriceLow: number;
  fairPriceHigh: number;
  listingsCount: number;
}): string {
  const { fairPriceLow, fairPriceHigh, listingsCount } = input;
  if (listingsCount <= 0) return "";
  if (listingsCount === 1) {
    return "With only one recent sale in this snapshot, use this as a rough hint until more comps land.";
  }
  const band = formatUsdSpan(fairPriceLow, fairPriceHigh);
  return `Most buyers are landing around ${band} lately. That’s a practical typical range to plan around.`;
}

/** Display labels: interpreted, not raw tags. */
export function confidenceDisplayLabel(confidence: MarketConfidence): string {
  if (confidence === "high") return "Tight consistency";
  if (confidence === "medium") return "Moderate consistency";
  return "Wide spread";
}

export function trendDisplayLabel(trend: MarketTrend): string {
  if (trend === "stable") return "Sales clustering tightly";
  if (trend === "rising") return "Prices trending up in this snapshot";
  if (trend === "dropping") return "Prices trending down in this snapshot";
  return "Mixed signals vs last snapshot";
}

export function confidenceTooltip(confidence: MarketConfidence): string {
  if (confidence === "high")
    return "Recent sold prices agree with each other. This snapshot is easier to act on quickly.";
  if (confidence === "medium")
    return "Some variation between sales. Use the fair band plus the listings below to sanity-check.";
  return "Sold prices jump around in this small set. Treat the fair band as your anchor, not any single sale.";
}

export function trendTooltip(trend: MarketTrend): string {
  if (trend === "stable") return "Newer and older comps in this snapshot land in a similar range.";
  if (trend === "rising") return "Recent sales skew higher than slightly older comps in this snapshot.";
  if (trend === "dropping") return "Recent sales skew lower than slightly older comps in this snapshot.";
  return "Recent comps and the last saved snapshot don’t line up. Worth scanning the sale list.";
}

/** One optional subtle market-signal line (honest, rule-based). At most one line. */
export function buildMarketSignalLine(input: {
  showWideSpread: boolean;
  confidence: MarketConfidence;
  trend: MarketTrend | null;
}): string | null {
  const { showWideSpread, confidence, trend } = input;
  if (trend === "volatile") {
    return "Recent sales and the prior snapshot don’t agree. Read the listings before you decide.";
  }
  if (showWideSpread && trend === "dropping") {
    return "Wide sold range with a lower skew. Titles and condition may be mixed in this snapshot.";
  }
  if (confidence === "low" && showWideSpread) {
    return "Sold prices are scattered. Lean on the fair band rather than any single outlier.";
  }
  if (trend === "dropping") {
    return "Newer comps in this snapshot are lower than older ones.";
  }
  if (trend === "rising") {
    return "Newer comps in this snapshot are higher than older ones.";
  }
  return null;
}
