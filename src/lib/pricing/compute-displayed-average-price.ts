export type PriceComputationResult = {
  displayedAveragePrice: number | null;
  pricingMethod: "single" | "mean_2" | "mean_3" | "mean_4" | "trimmed_mean_5" | "none";
  /** Count of valid prices after sanitization. */
  listingCount: number;
  /** Prices that were included in the displayed average calculation. */
  includedPrices: number[];
  /** Prices excluded by the averaging rule (e.g. trimmed ends for 5 listings). */
  excludedPrices: number[];
};

function roundUsd(amount: number): number {
  return Math.round(amount * 100) / 100;
}

function sanitizePrices(prices: number[]): number[] {
  return prices.filter((p) => Number.isFinite(p) && p > 0);
}

/**
 * Compute a currency-friendly displayed average from recent sold prices with lightweight
 * outlier protection when there are exactly 5 valid prices (trim lowest & highest).
 */
export function computeDisplayedAveragePrice(prices: number[]): PriceComputationResult {
  const valid = sanitizePrices(prices);
  const n = valid.length;

  if (n === 0) {
    return {
      displayedAveragePrice: null,
      pricingMethod: "none",
      listingCount: 0,
      includedPrices: [],
      excludedPrices: [],
    };
  }

  if (n === 1) {
    return {
      displayedAveragePrice: roundUsd(valid[0]!),
      pricingMethod: "single",
      listingCount: 1,
      includedPrices: [valid[0]!],
      excludedPrices: [],
    };
  }

  // For 5 listings: trim the extremes.
  if (n === 5) {
    const sorted = [...valid].sort((a, b) => a - b);
    const excludedPrices = [sorted[0]!, sorted[4]!];
    const includedPrices = sorted.slice(1, 4);
    const avg = includedPrices.reduce((a, b) => a + b, 0) / includedPrices.length;
    return {
      displayedAveragePrice: roundUsd(avg),
      pricingMethod: "trimmed_mean_5",
      listingCount: 5,
      includedPrices,
      excludedPrices,
    };
  }

  // For 2–4 listings: simple mean of all valid prices (easy to adjust later).
  const sum = valid.reduce((a, b) => a + b, 0);
  const avg = sum / n;
  const pricingMethod = ((): PriceComputationResult["pricingMethod"] => {
    if (n === 2) return "mean_2";
    if (n === 3) return "mean_3";
    if (n === 4) return "mean_4";
    // Defensive fallback: if upstream ever changes count, keep behavior predictable.
    return "mean_4";
  })();

  return {
    displayedAveragePrice: roundUsd(avg),
    pricingMethod,
    listingCount: n,
    includedPrices: [...valid],
    excludedPrices: [],
  };
}

