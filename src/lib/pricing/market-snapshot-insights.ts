function medianPrice(prices: number[]): number | null {
  const valid = prices.filter((p) => Number.isFinite(p) && p > 0);
  if (valid.length === 0) return null;
  const s = [...valid].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 === 0 ? (s[mid - 1]! + s[mid]!) / 2 : s[mid]!;
}

export type MarketConfidence = "high" | "medium" | "low";

export type MarketTrend = "stable" | "rising" | "dropping" | "volatile";

export type MarketSnapshotInsights = {
  fairPriceLow: number;
  fairPriceHigh: number;
  goodDealUnder: number;
  sellTarget: number;
  confidence: MarketConfidence;
  trend: MarketTrend | null;
  /** True when the headline estimate intentionally down-weighted at least one stored comp. */
  headlineUsesCleanedComps: boolean;
  /** Plain-language explanation (no “real-time” / guarantee wording). */
  explainLine: string;
  /** Optional second line when cleaning was applied. */
  cleanedNote?: string;
};

function roundUsd(amount: number): number {
  return Math.round(amount * 100) / 100;
}

function mean(nums: number[]): number {
  if (nums.length === 0) return 0;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

function stdDev(nums: number[]): number {
  if (nums.length < 2) return 0;
  const m = mean(nums);
  const v = mean(nums.map((x) => (x - m) ** 2));
  return Math.sqrt(v);
}

function decisionBands(cleaned: number[]): {
  fairPriceLow: number;
  fairPriceHigh: number;
  goodDealUnder: number;
  sellTarget: number;
} {
  const sorted = [...cleaned].sort((a, b) => a - b);
  const lowC = sorted[0]!;
  const highC = sorted[sorted.length - 1]!;
  const spread = Math.max(highC - lowC, 0);
  const mid = sorted.length % 2 === 1 ? sorted[(sorted.length - 1) / 2]! : (sorted[sorted.length / 2 - 1]! + sorted[sorted.length / 2]!) / 2;

  const pull = spread * 0.22;
  let fairLow = roundUsd(Math.max(lowC, mid - pull));
  let fairHigh = roundUsd(Math.min(highC, mid + pull));
  if (fairLow >= fairHigh) {
    fairLow = roundUsd(lowC);
    fairHigh = roundUsd(highC);
  }

  const underStep = Math.max(1, spread * 0.12, mid * 0.03);
  const goodDealUnder = roundUsd(Math.max(0.5, fairLow - underStep));

  const overStep = Math.max(1, spread * 0.08, mid * 0.025);
  const sellTarget = roundUsd(highC + overStep);

  return { fairPriceLow: fairLow, fairPriceHigh: fairHigh, goodDealUnder, sellTarget };
}

function confidenceFromCleaned(cleaned: number[], listingCount: number): MarketConfidence {
  const m = mean(cleaned);
  const cv = m > 0 ? stdDev(cleaned) / m : 0;
  if (listingCount >= 4 && cv < 0.11) return "high";
  if (listingCount >= 3 && cv < 0.22) return "medium";
  if (cv < 0.32) return "medium";
  return "low";
}

function inferTrend(input: {
  pricesByRecency: number[];
  displayedAvg: number;
  priorScrapeAvg: number | null;
}): MarketTrend | null {
  const { pricesByRecency, displayedAvg, priorScrapeAvg } = input;
  const n = pricesByRecency.length;
  if (n < 3) return null;

  const recentN = Math.min(2, Math.floor(n / 2));
  const olderN = Math.min(2, Math.floor(n / 2));
  if (recentN < 1 || olderN < 1) return null;

  const recent = pricesByRecency.slice(0, recentN);
  const older = pricesByRecency.slice(Math.max(0, n - olderN));
  const recentAvg = mean(recent);
  const olderAvg = mean(older);
  const denom = Math.max(olderAvg, 1);
  const sliceDelta = (recentAvg - olderAvg) / denom;

  let priorDelta: number | null = null;
  if (priorScrapeAvg != null && priorScrapeAvg > 0) {
    priorDelta = (displayedAvg - priorScrapeAvg) / priorScrapeAvg;
  }

  const strongSlice = Math.abs(sliceDelta) >= 0.06;
  const strongPrior = priorDelta != null && Math.abs(priorDelta) >= 0.04;

  if (priorDelta != null && strongPrior && strongSlice) {
    const sameSign = sliceDelta * priorDelta > 0;
    if (!sameSign && (Math.abs(sliceDelta) >= 0.08 || Math.abs(priorDelta) >= 0.06)) {
      return "volatile";
    }
  }

  if (!strongPrior && !strongSlice) {
    return "stable";
  }

  const score = (sliceDelta + (priorDelta ?? sliceDelta)) / (priorDelta != null ? 2 : 1);
  if (score > 0.035) return "rising";
  if (score < -0.035) return "dropping";

  if (strongSlice && strongPrior && Math.abs(sliceDelta - (priorDelta ?? 0)) > 0.07) {
    return "volatile";
  }

  return "stable";
}

function formatUsdPlain(n: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n);
}

function daySpanLabel(oldest: Date, newest: Date): string | null {
  const ms = newest.getTime() - oldest.getTime();
  if (!Number.isFinite(ms) || ms < 0) return null;
  const days = Math.max(1, Math.round(ms / 86_400_000));
  if (days <= 14) return `${days} days`;
  if (days <= 45) return `${Math.round(days / 7)} weeks`;
  return `${Math.round(days / 30)} months`;
}

/**
 * Decision-support labels (fair / deal / sell), confidence, and a lightweight trend hint derived only from
 * the stored snapshot rows plus the prior scrape’s average when present. Heuristics only, not investment advice.
 */
export function buildMarketSnapshotInsights(input: {
  listings: Array<{ soldPrice: number; soldDate: Date; position: number }>;
  /** Low / high from the stored snapshot (selected comps). */
  snapshotLow: number;
  snapshotHigh: number;
  priorScrapeAvgPrice: number | null;
}): MarketSnapshotInsights | null {
  const rows = [...input.listings].sort((a, b) => a.position - b.position);
  if (rows.length === 0) return null;

  const pricesChronological = rows.map((r) => r.soldPrice);
  const displayed = medianPrice(pricesChronological);
  if (displayed == null) return null;

  const bands = decisionBands(pricesChronological);
  const confidence = confidenceFromCleaned(pricesChronological, rows.length);
  const headlineUsesCleanedComps = true;

  const pricesByRecency = [...rows].sort((a, b) => a.position - b.position).map((r) => r.soldPrice);
  const trend = inferTrend({
    pricesByRecency,
    displayedAvg: displayed,
    priorScrapeAvg: input.priorScrapeAvgPrice,
  });

  const dates = rows.map((r) => r.soldDate.getTime());
  const oldest = new Date(Math.min(...dates));
  const newest = new Date(Math.max(...dates));
  const span = daySpanLabel(oldest, newest);

  const n = rows.length;
  const lowShown = input.snapshotLow;
  const highShown = input.snapshotHigh;

  let explainLine = `Based on ${n} selected recent eBay sold sale${n === 1 ? "" : "s"} from ${formatUsdPlain(lowShown)} to ${formatUsdPlain(highShown)}. Uses sold prices, not active listings.`;
  if (span) {
    explainLine = `Based on ${n} selected recent eBay sold sale${n === 1 ? "" : "s"} from ${formatUsdPlain(lowShown)} to ${formatUsdPlain(highShown)} over about the last ${span}. Uses sold prices, not active listings.`;
  }

  const cleanedNote =
    "Estimates rank recent sold listings for fit to this card and condition, then use a median headline.";

  return {
    ...bands,
    confidence,
    trend,
    headlineUsesCleanedComps,
    explainLine,
    cleanedNote,
  };
}
